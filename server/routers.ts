import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { extractContent, truncateText } from "./services/fileExtraction";
import { extractAndUploadCover } from "./services/coverExtraction";
import { generateInsight } from "./services/insightGeneration";
import { streamBookInsightsWithClaude, isClaudeConfigured } from "./services/claudeService";
import { generatePremiumInsight, convertToLegacyFormat } from "./services/premiumInsightPipeline";
import { streamPremiumInsight, StreamingProgress } from "./services/streamingPremiumPipeline";
import { generateAudioNarration, getVoiceOptions, estimateAudioDuration, VoiceId } from "./services/audioGeneration";
import { generatePremiumPDF, generateMarkdownExport, generatePlainTextExport, generateHTMLExport } from "./services/pdfExport";
import { storagePut } from "./storage";
import { VISUAL_TYPE_INFO } from "../shared/types";
import { getDebugLogs, clearDebugLogs, debugLog, logExtraction, logGeneration, logError, logAPI } from "./services/debugLogger";

// Default anonymous user ID for no-login access
const ANONYMOUS_USER_ID = 1;

// Helper to get user ID (uses authenticated user or falls back to anonymous)
function getUserId(ctx: { user?: { id: number } | null }): number {
  return ctx.user?.id || ANONYMOUS_USER_ID;
}

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Books router - all public procedures
  books: router({
    // Upload and process a book file
    upload: publicProcedure
      .input(z.object({
        filename: z.string(),
        mimeType: z.string(),
        fileData: z.string(), // Base64 encoded file data
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          logExtraction('Starting book upload', { filename: input.filename, mimeType: input.mimeType, size: input.fileData.length });
          
          const userId = getUserId(ctx);
          const buffer = Buffer.from(input.fileData, "base64");
          logExtraction('Buffer created', { bufferSize: buffer.length });
          
          // Extract content from file
          logExtraction('Starting content extraction...');
          const extracted = await extractContent(buffer, input.filename, input.mimeType);
          logExtraction('Content extracted', { title: extracted.title, wordCount: extracted.wordCount, pageCount: extracted.pageCount, textLength: extracted.text?.length });
          
          // Upload original file to S3
          const fileKey = `books/${userId}/${Date.now()}-${input.filename}`;
          const { url: fileUrl } = await storagePut(fileKey, buffer, input.mimeType);
          
          // Create book record
          const bookId = await db.createBook({
            userId,
            title: extracted.title || input.filename.replace(/\.[^.]+$/, ""),
            author: extracted.author,
            fileUrl,
            fileType: extracted.fileType,
            wordCount: extracted.wordCount,
            pageCount: extracted.pageCount,
            extractedText: truncateText(extracted.text, 500000),
          });
          
          // Extract and upload cover image
          let coverUrl: string | null = null;
          try {
            coverUrl = await extractAndUploadCover(buffer, extracted.fileType, bookId);
            if (coverUrl) {
              await db.updateBook(bookId, { coverUrl });
            }
          } catch (coverError) {
            console.warn("[Upload] Cover extraction failed:", coverError);
          }
          
          // Create library item
          await db.createLibraryItem({
            userId,
            bookId,
            readingStatus: "new",
            isFavorite: false,
          });
          
          return {
            bookId,
            title: extracted.title || input.filename.replace(/\.[^.]+$/, ""),
            author: extracted.author,
            wordCount: extracted.wordCount,
            pageCount: extracted.pageCount,
            fileType: extracted.fileType,
          };
        } catch (error) {
          logError('extraction', 'Book upload failed', { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
          console.error("[Book Upload] Error:", error);
          throw new Error(`Failed to process book: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }),

    // Get user's books
    list: publicProcedure.query(async ({ ctx }) => {
      const userId = getUserId(ctx);
      return db.getBooksByUserId(userId);
    }),

    // Get single book
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const book = await db.getBookById(input.id);
        if (!book) {
          throw new Error("Book not found");
        }
        return book;
      }),

    // Delete book
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const book = await db.getBookById(input.id);
        if (!book) {
          throw new Error("Book not found");
        }
        await db.deleteBook(input.id);
        return { success: true };
      }),
  }),

  // Insights router - all public procedures
  insights: router({
    // Generate insights for a book
    generate: publicProcedure
      .input(z.object({ bookId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        logGeneration('Starting insight generation', { bookId: input.bookId });
        
        const userId = getUserId(ctx);
        const book = await db.getBookById(input.bookId);
        if (!book) {
          logError('generation', 'Book not found', { bookId: input.bookId });
          throw new Error("Book not found");
        }
        
        logGeneration('Book loaded', { title: book.title, author: book.author, textLength: book.extractedText?.length });

        // Create insight record with pending status
        const insightId = await db.createInsight({
          userId,
          bookId: input.bookId,
          title: `Insights: ${book.title}`,
          summary: "",
          status: "generating",
          keyThemes: JSON.stringify([]),
          audioScript: "",
        });

        try {
          // Generate insights using Premium Pipeline (Stage 0 + Stage 1)
          logGeneration('Starting Premium Pipeline', { bookTitle: book.title, insightId });
          const premiumInsight = await generatePremiumInsight(
            book.title,
            book.author,
            book.extractedText || ""
          );
          logGeneration('Premium Pipeline complete', { 
            sections: premiumInsight.sections.length, 
            wordCount: premiumInsight.wordCount,
            keyThemes: premiumInsight.keyThemes.length,
            insightId 
          });

          // Store content blocks with premium section types
          for (let i = 0; i < premiumInsight.sections.length; i++) {
            const section = premiumInsight.sections[i];
            await db.createContentBlock({
              insightId,
              blockType: section.type,
              content: section.content || "",
              title: section.title || null,
              orderIndex: i,
              visualType: section.visualType || null,
              visualData: section.visualData ? JSON.stringify(section.visualData) : null,
              listItems: section.metadata?.actionSteps ? JSON.stringify(section.metadata.actionSteps) : null,
            });
          }

          // Update insight with generated content
          await db.updateInsight(insightId, {
            title: premiumInsight.title,
            summary: premiumInsight.summary,
            status: "completed",
            keyThemes: JSON.stringify(premiumInsight.keyThemes),
            audioScript: premiumInsight.audioScript,
            wordCount: premiumInsight.wordCount,
            recommendedVisuals: JSON.stringify(premiumInsight.tableOfContents.map(t => t.type)),
          });

          // Update library item with insight
          const libraryItems = await db.getLibraryItemsByUserId(userId);
          const libraryItem = libraryItems.find(item => item.bookId === input.bookId);
          if (libraryItem) {
            await db.updateLibraryItem(libraryItem.id, {
              insightId,
              readingStatus: "reading",
            });
          }

          return {
            insightId,
            title: premiumInsight.title,
            summary: premiumInsight.summary,
            keyThemes: premiumInsight.keyThemes,
            sectionCount: premiumInsight.sections.length,
            wordCount: premiumInsight.wordCount,
          };
        } catch (error) {
          logError('generation', 'Insight generation failed', { 
            insightId, 
            bookId: input.bookId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          });
          await db.updateInsight(insightId, { status: "failed" });
          throw error;
        }
      }),

    // Get insight by ID
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const insight = await db.getInsightById(input.id);
        if (!insight) {
          throw new Error("Insight not found");
        }

        const contentBlocks = await db.getContentBlocksByInsightId(input.id);

        return {
          ...insight,
          keyThemes: JSON.parse(insight.keyThemes || "[]"),
          recommendedVisuals: JSON.parse(insight.recommendedVisuals || "[]"),
          contentBlocks: contentBlocks.map(block => ({
            ...block,
            visualData: block.visualData ? JSON.parse(block.visualData) : null,
            listItems: block.listItems ? JSON.parse(block.listItems) : null,
          })),
        };
      }),

    // Get insights for a book
    getByBook: publicProcedure
      .input(z.object({ bookId: z.number() }))
      .query(async ({ input }) => {
        return db.getInsightsByBookId(input.bookId);
      }),

    // List all user insights
    list: publicProcedure.query(async ({ ctx }) => {
      const userId = getUserId(ctx);
      return db.getInsightsByUserId(userId);
    }),

    // Delete insight
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const insight = await db.getInsightById(input.id);
        if (!insight) {
          throw new Error("Insight not found");
        }
        await db.deleteContentBlocksByInsightId(input.id);
        await db.deleteInsight(input.id);
        return { success: true };
      }),

    // Get generation status for polling
    getStatus: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const insight = await db.getInsightById(input.id);
        if (!insight) {
          return { status: "not_found", progress: 0 };
        }
        const contentBlocks = await db.getContentBlocksByInsightId(input.id);
        return {
          status: insight.status,
          progress: insight.status === "completed" ? 100 : Math.min(20 + contentBlocks.length * 7, 95),
          sectionCount: contentBlocks.length,
          title: insight.title,
          summary: insight.summary,
        };
      }),

    // Check if Claude streaming is available
    canStream: publicProcedure.query(() => {
      return { available: isClaudeConfigured() };
    }),

    // Generate insights with streaming progress
    generateStreaming: publicProcedure
      .input(z.object({ bookId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const userId = getUserId(ctx);
        const book = await db.getBookById(input.bookId);
        if (!book) {
          throw new Error("Book not found");
        }

        // Create insight record with pending status
        const insightId = await db.createInsight({
          userId,
          bookId: input.bookId,
          title: `Insights: ${book.title}`,
          summary: "",
          status: "generating",
          keyThemes: JSON.stringify([]),
          audioScript: "",
        });

        // Return the insight ID immediately, streaming will update it
        // The actual streaming happens in a separate call
        return { insightId, bookTitle: book.title, bookAuthor: book.author };
      }),

    // Poll for streaming progress (alternative to WebSocket)
    getGenerationProgress: publicProcedure
      .input(z.object({ insightId: z.number() }))
      .query(async ({ input }) => {
        const insight = await db.getInsightById(input.insightId);
        if (!insight) {
          throw new Error("Insight not found");
        }
        
        const blocks = await db.getContentBlocksByInsightId(input.insightId);
        
        return {
          status: insight.status,
          title: insight.title,
          sectionCount: blocks.length,
          wordCount: insight.wordCount || 0,
          isComplete: insight.status === "completed",
          isFailed: insight.status === "failed",
        };
      }),
  }),

  // Audio router
  audio: router({
    // Generate audio narration
    generate: publicProcedure
      .input(z.object({
        insightId: z.number(),
        voiceId: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const insight = await db.getInsightById(input.insightId);
        if (!insight) {
          throw new Error("Insight not found");
        }

        if (!insight.audioScript) {
          throw new Error("No audio script available");
        }

        const result = await generateAudioNarration(
          insight.audioScript,
          (input.voiceId as VoiceId) || "rachel",
          input.insightId
        );

        await db.updateInsight(input.insightId, {
          audioUrl: result.audioUrl,
          audioDuration: result.duration,
        });

        return result;
      }),

    // Get voice options
    voices: publicProcedure.query(() => {
      return getVoiceOptions();
    }),

    // Estimate audio duration
    estimate: publicProcedure
      .input(z.object({ insightId: z.number() }))
      .query(async ({ input }) => {
        const insight = await db.getInsightById(input.insightId);
        if (!insight) {
          throw new Error("Insight not found");
        }

        const duration = estimateAudioDuration(insight.audioScript || "");
        return { estimatedSeconds: duration };
      }),
  }),

  // Library router
  library: router({
    // Get library items with book and insight details
    list: publicProcedure.query(async ({ ctx }) => {
      const userId = getUserId(ctx);
      return db.getLibraryItemWithDetails(userId);
    }),

    // Toggle favorite
    toggleFavorite: publicProcedure
      .input(z.object({ id: z.number(), isFavorite: z.boolean() }))
      .mutation(async ({ input }) => {
        await db.toggleFavorite(input.id, input.isFavorite);
        return { success: true };
      }),

    // Update reading status
    updateStatus: publicProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["new", "reading", "completed"]),
      }))
      .mutation(async ({ input }) => {
        await db.updateLibraryItem(input.id, { readingStatus: input.status });
        return { success: true };
      }),

    // Search library
    search: publicProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ ctx, input }) => {
        const userId = getUserId(ctx);
        return db.searchLibrary(userId, input.query);
      }),

    // Delete library item
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const item = await db.getLibraryItemById(input.id);
        if (!item) {
          throw new Error("Library item not found");
        }
        
        // Delete associated insight and content blocks
        if (item.insightId) {
          await db.deleteContentBlocksByInsightId(item.insightId);
          await db.deleteInsight(item.insightId);
        }
        
        // Delete book
        await db.deleteBook(item.bookId);
        
        // Delete library item
        await db.deleteLibraryItem(input.id);
        
        return { success: true };
      }),
  }),

  // Export router - multiple formats
  export: router({
    // Generate PDF export
    pdf: publicProcedure
      .input(z.object({ insightId: z.number() }))
      .mutation(async ({ input }) => {
        const insight = await db.getInsightById(input.insightId);
        if (!insight) {
          throw new Error("Insight not found");
        }

        const book = await db.getBookById(insight.bookId);
        if (!book) {
          throw new Error("Book not found");
        }

        const contentBlocks = await db.getContentBlocksByInsightId(input.insightId);

        const result = await generatePremiumPDF({
          title: insight.title,
          author: book.author,
          summary: insight.summary || "",
          sections: contentBlocks.map(block => ({
            type: block.blockType as any,
            content: block.content || "",
            title: block.title || undefined,
            visualType: block.visualType as any,
            visualData: block.visualData ? JSON.parse(block.visualData) : undefined,
            items: block.listItems ? JSON.parse(block.listItems) : undefined,
          })),
          keyThemes: JSON.parse(insight.keyThemes || "[]"),
          bookTitle: book.title,
          generatedAt: new Date(),
        }, input.insightId);

        await db.updateInsight(input.insightId, {
          pdfUrl: result.pdfUrl,
        });

        return result;
      }),

    // Generate Markdown export
    markdown: publicProcedure
      .input(z.object({ insightId: z.number() }))
      .mutation(async ({ input }) => {
        const insight = await db.getInsightById(input.insightId);
        if (!insight) {
          throw new Error("Insight not found");
        }

        const book = await db.getBookById(insight.bookId);
        const contentBlocks = await db.getContentBlocksByInsightId(input.insightId);

        const result = await generateMarkdownExport({
          title: insight.title,
          author: book?.author || null,
          summary: insight.summary || "",
          sections: contentBlocks.map(block => ({
            type: block.blockType as any,
            content: block.content || "",
            title: block.title || undefined,
            items: block.listItems ? JSON.parse(block.listItems) : undefined,
          })),
          keyThemes: JSON.parse(insight.keyThemes || "[]"),
          bookTitle: book?.title || "",
          generatedAt: new Date(),
        }, input.insightId);

        return result;
      }),

    // Generate Plain Text export
    plainText: publicProcedure
      .input(z.object({ insightId: z.number() }))
      .mutation(async ({ input }) => {
        const insight = await db.getInsightById(input.insightId);
        if (!insight) {
          throw new Error("Insight not found");
        }

        const book = await db.getBookById(insight.bookId);
        const contentBlocks = await db.getContentBlocksByInsightId(input.insightId);

        const result = await generatePlainTextExport({
          title: insight.title,
          author: book?.author || null,
          summary: insight.summary || "",
          sections: contentBlocks.map(block => ({
            type: block.blockType as any,
            content: block.content || "",
            title: block.title || undefined,
            items: block.listItems ? JSON.parse(block.listItems) : undefined,
          })),
          keyThemes: JSON.parse(insight.keyThemes || "[]"),
          bookTitle: book?.title || "",
          generatedAt: new Date(),
        }, input.insightId);

        return result;
      }),

    // Generate HTML export
    html: publicProcedure
      .input(z.object({ insightId: z.number() }))
      .mutation(async ({ input }) => {
        const insight = await db.getInsightById(input.insightId);
        if (!insight) {
          throw new Error("Insight not found");
        }

        const book = await db.getBookById(insight.bookId);
        const contentBlocks = await db.getContentBlocksByInsightId(input.insightId);

        const result = await generateHTMLExport({
          title: insight.title,
          author: book?.author || null,
          summary: insight.summary || "",
          sections: contentBlocks.map(block => ({
            type: block.blockType as any,
            content: block.content || "",
            title: block.title || undefined,
            items: block.listItems ? JSON.parse(block.listItems) : undefined,
          })),
          keyThemes: JSON.parse(insight.keyThemes || "[]"),
          bookTitle: book?.title || "",
          generatedAt: new Date(),
        }, input.insightId);

        return result;
      }),
  }),

  // Visual types router
  visuals: router({
    // Get all visual types
    types: publicProcedure.query(() => {
      return VISUAL_TYPE_INFO;
    }),
  }),

  // Debug router for monitoring extraction and generation
  debug: router({
    // Get debug logs
    logs: publicProcedure
      .input(z.object({
        category: z.enum(['extraction', 'generation', 'api', 'llm', 'audio', 'general']).optional(),
        level: z.enum(['info', 'warn', 'error', 'debug']).optional(),
        limit: z.number().optional().default(100),
      }).optional())
      .query(({ input }) => {
        return getDebugLogs(input || {});
      }),

    // Clear all logs
    clear: publicProcedure.mutation(() => {
      clearDebugLogs();
      return { success: true };
    }),

    // Test logging
    test: publicProcedure.mutation(() => {
      debugLog('info', 'general', 'Debug test log entry');
      debugLog('warn', 'general', 'Debug test warning');
      debugLog('error', 'general', 'Debug test error');
      return { success: true, message: 'Test logs added' };
    }),
  }),
});

export type AppRouter = typeof appRouter;
