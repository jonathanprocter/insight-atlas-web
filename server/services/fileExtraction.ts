import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface ExtractedContent {
  title: string;
  author: string | null;
  text: string;
  wordCount: number;
  pageCount: number | null;
  fileType: "pdf" | "epub" | "txt";
  coverImage: Buffer | null;
  coverMimeType: string | null;
}

/**
 * Extract text content from a PDF file buffer using pdfjs-dist
 */
export async function extractFromPDF(buffer: Buffer): Promise<ExtractedContent> {
  try {
    // Use pdfjs-dist directly for better compatibility
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
    });
    
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    
    // Get metadata
    let title = "Untitled PDF";
    let author: string | null = null;
    
    try {
      const metadata = await pdf.getMetadata();
      if (metadata.info) {
        const info = metadata.info as Record<string, any>;
        if (info.Title) title = String(info.Title);
        if (info.Author) author = String(info.Author);
      }
    } catch (metaError) {
      console.warn("[PDF Extraction] Metadata extraction failed:", metaError);
    }
    
    // Extract text from all pages
    const textParts: string[] = [];
    
    for (let pageNum = 1; pageNum <= Math.min(numPages, 500); pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        const pageText = textContent.items
          .map((item: any) => item.str || "")
          .join(" ");
        
        if (pageText.trim()) {
          textParts.push(pageText);
        }
      } catch (pageError) {
        console.warn(`[PDF Extraction] Page ${pageNum} extraction failed:`, pageError);
      }
    }
    
    const text = textParts.join("\n\n");
    
    // Fallback title from first line
    if (title === "Untitled PDF" && text) {
      const firstLine = text.split("\n").find((line: string) => line.trim().length > 0);
      if (firstLine && firstLine.length < 200) {
        title = firstLine.trim();
      }
    }
    
    const wordCount = text.split(/\s+/).filter((w: string) => w.length > 0).length;
    
    console.log(`[PDF Extraction] Extracted ${wordCount} words from ${numPages} pages`);
    
    return {
      title,
      author,
      text,
      wordCount,
      pageCount: numPages,
      fileType: "pdf",
      coverImage: null,
      coverMimeType: null,
    };
  } catch (error) {
    console.error("[PDF Extraction] Error:", error);
    // Return minimal content on failure instead of crashing
    return {
      title: "PDF Document",
      author: null,
      text: "",
      wordCount: 0,
      pageCount: null,
      fileType: "pdf",
      coverImage: null,
      coverMimeType: null,
    };
  }
}

/**
 * Extract text content from an EPUB file buffer
 */
export async function extractFromEPUB(buffer: Buffer): Promise<ExtractedContent> {
  return new Promise((resolve) => {
    const tempPath = path.join(os.tmpdir(), `epub-${Date.now()}-${Math.random().toString(36).slice(2)}.epub`);
    
    try {
      fs.writeFileSync(tempPath, buffer);
      
      // Dynamic import
      import("epub2").then(({ default: EPub }) => {
        const epub = new EPub(tempPath);
        
        const cleanup = () => {
          try {
            if (fs.existsSync(tempPath)) {
              fs.unlinkSync(tempPath);
            }
          } catch {
            // Ignore cleanup errors
          }
        };
        
        // Set a timeout to prevent hanging
        const timeout = setTimeout(() => {
          cleanup();
          resolve({
            title: "EPUB Document",
            author: null,
            text: "",
            wordCount: 0,
            pageCount: null,
            fileType: "epub",
            coverImage: null,
            coverMimeType: null,
          });
        }, 60000); // Increased timeout to 60 seconds
        
        epub.on("error", (err: Error) => {
          clearTimeout(timeout);
          console.error("[EPUB Extraction] Error:", err);
          cleanup();
          resolve({
            title: "EPUB Document",
            author: null,
            text: "",
            wordCount: 0,
            pageCount: null,
            fileType: "epub",
            coverImage: null,
            coverMimeType: null,
          });
        });
        
        epub.on("end", async () => {
          clearTimeout(timeout);
          try {
            const title = epub.metadata?.title || "EPUB Document";
            const author = epub.metadata?.creator || null;
            
            console.log(`[EPUB Extraction] Processing: ${title} by ${author || "Unknown"}`);
            
            // Extract text from chapters with error handling
            const chapters: string[] = [];
            const flow = epub.flow || [];
            
            console.log(`[EPUB Extraction] Found ${flow.length} chapters`);
            
            for (let i = 0; i < Math.min(flow.length, 100); i++) {
              const chapter = flow[i];
              if (chapter.id) {
                try {
                  const chapterText = await new Promise<string>((res) => {
                    const chapterTimeout = setTimeout(() => res(""), 10000);
                    epub.getChapter(chapter.id!, (err: Error | null, text?: string) => {
                      clearTimeout(chapterTimeout);
                      if (err) {
                        console.warn(`[EPUB Extraction] Chapter ${i} error:`, err.message);
                        res("");
                      } else {
                        res(text || "");
                      }
                    });
                  });
                  
                  // Strip HTML tags
                  const cleanText = chapterText
                    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
                    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
                    .replace(/<[^>]*>/g, " ")
                    .replace(/&nbsp;/g, " ")
                    .replace(/&amp;/g, "&")
                    .replace(/&lt;/g, "<")
                    .replace(/&gt;/g, ">")
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'")
                    .replace(/&#x27;/g, "'")
                    .replace(/&apos;/g, "'")
                    .replace(/\s+/g, " ")
                    .trim();
                  
                  if (cleanText && cleanText.length > 20) {
                    chapters.push(cleanText);
                  }
                } catch (chapterError) {
                  console.warn(`[EPUB Extraction] Chapter ${i} processing error:`, chapterError);
                }
              }
            }
            
            const text = chapters.join("\n\n");
            const wordCount = text.split(/\s+/).filter((w: string) => w.length > 0).length;
            
            console.log(`[EPUB Extraction] Extracted ${wordCount} words from ${chapters.length} chapters`);
            
            cleanup();
            
            resolve({
              title,
              author,
              text,
              wordCount,
              pageCount: flow.length,
              fileType: "epub",
              coverImage: null,
              coverMimeType: null,
            });
          } catch (error) {
            console.error("[EPUB Extraction] Processing error:", error);
            cleanup();
            resolve({
              title: "EPUB Document",
              author: null,
              text: "",
              wordCount: 0,
              pageCount: null,
              fileType: "epub",
              coverImage: null,
              coverMimeType: null,
            });
          }
        });
        
        epub.parse();
      }).catch((importError) => {
        console.error("[EPUB Extraction] Import error:", importError);
        try {
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
          }
        } catch {}
        resolve({
          title: "EPUB Document",
          author: null,
          text: "",
          wordCount: 0,
          pageCount: null,
          fileType: "epub",
          coverImage: null,
          coverMimeType: null,
        });
      });
    } catch (error) {
      console.error("[EPUB Extraction] Setup error:", error);
      try {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      } catch {}
      resolve({
        title: "EPUB Document",
        author: null,
        text: "",
        wordCount: 0,
        pageCount: null,
        fileType: "epub",
        coverImage: null,
        coverMimeType: null,
      });
    }
  });
}

/**
 * Extract text content from a plain text file buffer
 */
export async function extractFromTXT(buffer: Buffer, filename: string): Promise<ExtractedContent> {
  try {
    const text = buffer.toString("utf-8");
    const wordCount = text.split(/\s+/).filter((w: string) => w.length > 0).length;
    
    // Try to extract title from first line or filename
    const lines = text.split("\n");
    const firstLine = lines.find((line: string) => line.trim().length > 0);
    let title = filename.replace(/\.txt$/i, "") || "Untitled Text";
    
    // Use first line as title if it looks like a title (short, no punctuation at end)
    if (firstLine && firstLine.length < 100 && !firstLine.match(/[.!?]$/)) {
      title = firstLine.trim();
    }
    
    console.log(`[TXT Extraction] Extracted ${wordCount} words`);
    
    return {
      title,
      author: null,
      text,
      wordCount,
      pageCount: null,
      fileType: "txt",
      coverImage: null,
      coverMimeType: null,
    };
  } catch (error) {
    console.error("[TXT Extraction] Error:", error);
    return {
      title: filename.replace(/\.txt$/i, "") || "Text Document",
      author: null,
      text: "",
      wordCount: 0,
      pageCount: null,
      fileType: "txt",
      coverImage: null,
      coverMimeType: null,
    };
  }
}

/**
 * Extract content from a file buffer based on its type
 */
export async function extractContent(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<ExtractedContent> {
  const lowerFilename = filename.toLowerCase();
  
  console.log(`[Extraction] Processing file: ${filename}, type: ${mimeType}, size: ${buffer.length} bytes`);
  
  if (mimeType === "application/pdf" || lowerFilename.endsWith(".pdf")) {
    return extractFromPDF(buffer);
  }
  
  if (mimeType === "application/epub+zip" || lowerFilename.endsWith(".epub")) {
    return extractFromEPUB(buffer);
  }
  
  if (mimeType === "text/plain" || lowerFilename.endsWith(".txt")) {
    return extractFromTXT(buffer, filename);
  }
  
  // Default to TXT for unknown types
  console.warn(`[Extraction] Unknown file type: ${mimeType || filename}, treating as text`);
  return extractFromTXT(buffer, filename);
}

/**
 * Truncate text to a maximum length while preserving word boundaries
 */
export function truncateText(text: string, maxLength: number = 100000): string {
  if (!text || text.length <= maxLength) return text || "";
  
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  
  return lastSpace > maxLength * 0.8 ? truncated.substring(0, lastSpace) : truncated;
}
