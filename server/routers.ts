import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { extractContent, truncateText } from "./services/fileExtraction";
import { generateInsight, selectVisualTypes, generateVisualData } from "./services/insightGeneration";
import { generateAudioNarration, getVoiceOptions, estimateAudioDuration, VoiceId } from "./services/audioGeneration";
import { generatePremiumPDF } from "./services/pdfExport";
import { storagePut, storageGet } from "./storage";
import { VISUAL_TYPES, VISUAL_TYPE_INFO } from "../shared/types";

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

  // Books router
  books: router({
    // Upload and process a book file
    upload: protectedProcedure
      .input(z.object({
        filename: z.string(),
        mimeType: z.string(),
        fileData: z.string(), // Base64 encoded file data
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.fileData, "base64");
        
        // Extract content from file
        const extracted = await extractContent(buffer, input.filename, input.mimeType);
        
        // Upload original file to S3
        const fileKey = `books/${ctx.user.id}/${Date.now()}-${input.filename}`;
        const { url: fileUrl } = await storagePut(fileKey, buffer, input.mimeType);
        
        // Create book record
        const bookId = await db.createBook({
          userId: ctx.user.id,
          title: extracted.title,
          author: extracted.author,
          fileUrl,
          fileType: extracted.fileType,
          wordCount: extracted.wordCount,
          pageCount: extracted.pageCount,
          extractedText: truncateText(extracted.text, 500000), // Store up to 500k chars
        });
        
        // Create library item
        await db.createLibraryItem({
          userId: ctx.user.id,
          bookId,
          readingStatus: "new",
          isFavorite: false,
        });
        
        return {
          bookId,
          title: extracted.title,
          author: extracted.author,
          wordCount: extracted.wordCount,
          pageCount: extracted.pageCount,
          fileType: extracted.fileType,
        };
      }),

    // Get user's books
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getBooksByUserId(ctx.user.id);
    }),

    // Get single book
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const book = await db.getBookById(input.id);
        if (!book || book.userId !== ctx.user.id) {
          throw new Error("Book not found");
        }
        return book;
      }),

    // Delete book
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const book = await db.getBookById(input.id);
        if (!book || book.userId !== ctx.user.id) {
          throw new Error("Book not found");
        }
        await db.deleteBook(input.id);
        return { success: true };
      }),
  }),

  // Insights router
  insights: router({
    // Generate insights for a book
    generate: protectedProcedure
      .input(z.object({ bookId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const book = await db.getBookById(input.bookId);
        if (!book || book.userId !== ctx.user.id) {
          throw new Error("Book not found");
        }

        // Create insight record with pending status
        const insightId = await db.createInsight({
          userId: ctx.user.id,
          bookId: input.bookId,
          title: `Insights: ${book.title}`,
          summary: "",
          status: "generating",
          keyThemes: JSON.stringify([]),
          audioScript: "",
        });

        try {
          // Generate insights using AI
          const generated = await generateInsight(
            book.extractedText || "",
            book.title,
            book.author
          );

          // Store content blocks
          for (let i = 0; i < generated.sections.length; i++) {
            const section = generated.sections[i];
            await db.createContentBlock({
              insightId,
              blockType: section.type,
              content: section.content || "",
              title: section.title || null,
              orderIndex: i,
              visualType: section.visualType || null,
              visualData: section.visualData ? JSON.stringify(section.visualData) : null,
              listItems: section.items ? JSON.stringify(section.items) : null,
            });
          }

          // Update insight with generated content
          await db.updateInsight(insightId, {
            title: generated.title,
            summary: generated.summary,
            status: "completed",
            keyThemes: JSON.stringify(generated.keyThemes),
            audioScript: generated.audioScript,
            wordCount: generated.wordCount,
            recommendedVisuals: JSON.stringify(generated.recommendedVisualTypes),
          });

          // Update library item with insight
          const libraryItems = await db.getLibraryItemsByUserId(ctx.user.id);
          const libraryItem = libraryItems.find(item => item.bookId === input.bookId);
          if (libraryItem) {
            await db.updateLibraryItem(libraryItem.id, {
              insightId,
              readingStatus: "reading",
            });
          }

          return {
            insightId,
            title: generated.title,
            summary: generated.summary,
            keyThemes: generated.keyThemes,
            sectionCount: generated.sections.length,
            wordCount: generated.wordCount,
          };
        } catch (error) {
          await db.updateInsight(insightId, { status: "failed" });
          throw error;
        }
      }),

    // Get insight by ID
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const insight = await db.getInsightById(input.id);
        if (!insight || insight.userId !== ctx.user.id) {
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
    getByBook: protectedProcedure
      .input(z.object({ bookId: z.number() }))
      .query(async ({ ctx, input }) => {
        const book = await db.getBookById(input.bookId);
        if (!book || book.userId !== ctx.user.id) {
          throw new Error("Book not found");
        }
        return db.getInsightsByBookId(input.bookId);
      }),

    // List all user insights
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getInsightsByUserId(ctx.user.id);
    }),

    // Delete insight
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const insight = await db.getInsightById(input.id);
        if (!insight || insight.userId !== ctx.user.id) {
          throw new Error("Insight not found");
        }
        await db.deleteContentBlocksByInsightId(input.id);
        await db.deleteInsight(input.id);
        return { success: true };
      }),
  }),

  // Audio router
  audio: router({
    // Generate audio narration
    generate: protectedProcedure
      .input(z.object({
        insightId: z.number(),
        voiceId: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const insight = await db.getInsightById(input.insightId);
        if (!insight || insight.userId !== ctx.user.id) {
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
    estimate: protectedProcedure
      .input(z.object({ insightId: z.number() }))
      .query(async ({ ctx, input }) => {
        const insight = await db.getInsightById(input.insightId);
        if (!insight || insight.userId !== ctx.user.id) {
          throw new Error("Insight not found");
        }

        const duration = estimateAudioDuration(insight.audioScript || "");
        return { estimatedSeconds: duration };
      }),
  }),

  // Library router
  library: router({
    // Get library items with book and insight details
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getLibraryItemWithDetails(ctx.user.id);
    }),

    // Toggle favorite
    toggleFavorite: protectedProcedure
      .input(z.object({ id: z.number(), isFavorite: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const items = await db.getLibraryItemsByUserId(ctx.user.id);
        const item = items.find(i => i.id === input.id);
        if (!item) {
          throw new Error("Library item not found");
        }
        await db.toggleFavorite(input.id, input.isFavorite);
        return { success: true };
      }),

    // Update reading status
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["new", "reading", "completed"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const items = await db.getLibraryItemsByUserId(ctx.user.id);
        const item = items.find(i => i.id === input.id);
        if (!item) {
          throw new Error("Library item not found");
        }
        await db.updateLibraryItem(input.id, { readingStatus: input.status });
        return { success: true };
      }),

    // Search library
    search: protectedProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ ctx, input }) => {
        return db.searchLibrary(ctx.user.id, input.query);
      }),

    // Delete library item
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const items = await db.getLibraryItemsByUserId(ctx.user.id);
        const item = items.find(i => i.id === input.id);
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

  // Export router
  export: router({
    // Generate PDF export
    pdf: protectedProcedure
      .input(z.object({ insightId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const insight = await db.getInsightById(input.insightId);
        if (!insight || insight.userId !== ctx.user.id) {
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
  }),

  // Visual types router
  visuals: router({
    // Get all visual types
    types: publicProcedure.query(() => {
      return VISUAL_TYPE_INFO;
    }),

    // Generate visual data for a specific type
    generate: protectedProcedure
      .input(z.object({
        insightId: z.number(),
        visualType: z.enum(VISUAL_TYPES as unknown as [string, ...string[]]),
      }))
      .mutation(async ({ ctx, input }) => {
        const insight = await db.getInsightById(input.insightId);
        if (!insight || insight.userId !== ctx.user.id) {
          throw new Error("Insight not found");
        }

        const themes = JSON.parse(insight.keyThemes || "[]");
        const visualData = await generateVisualData(
          insight.summary || "",
          input.visualType as any,
          themes
        );

        return { visualType: input.visualType, data: visualData };
      }),

    // Select best visual types for content
    recommend: protectedProcedure
      .input(z.object({ insightId: z.number() }))
      .query(async ({ ctx, input }) => {
        const insight = await db.getInsightById(input.insightId);
        if (!insight || insight.userId !== ctx.user.id) {
          throw new Error("Insight not found");
        }

        const themes = JSON.parse(insight.keyThemes || "[]");
        const recommended = selectVisualTypes(insight.summary || "", themes);

        return recommended.map(type => 
          VISUAL_TYPE_INFO.find(v => v.type === type)
        ).filter(Boolean);
      }),
  }),
});

export type AppRouter = typeof appRouter;
