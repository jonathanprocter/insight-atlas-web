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
 * Extract text content from a PDF file buffer
 */
export async function extractFromPDF(buffer: Buffer): Promise<ExtractedContent> {
  try {
    // Dynamic import to avoid issues
    const { PDFParse } = await import("pdf-parse");
    
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    
    let text = "";
    let title = "Untitled PDF";
    let author: string | null = null;
    let pageCount: number | null = null;
    
    try {
      const textResult = await parser.getText();
      text = textResult.text || "";
      pageCount = textResult.pages?.length || null;
    } catch (textError) {
      console.warn("[PDF Extraction] Text extraction failed:", textError);
    }
    
    try {
      const infoResult = await parser.getInfo();
      if (infoResult.info?.Title) {
        title = infoResult.info.Title;
      }
      if (infoResult.info?.Author) {
        author = infoResult.info.Author;
      }
    } catch (infoError) {
      console.warn("[PDF Extraction] Info extraction failed:", infoError);
    }
    
    // Fallback title from first line
    if (title === "Untitled PDF" && text) {
      const firstLine = text.split("\n").find((line: string) => line.trim().length > 0);
      if (firstLine && firstLine.length < 200) {
        title = firstLine.trim();
      }
    }
    
    const wordCount = text.split(/\s+/).filter((w: string) => w.length > 0).length;
    
    try {
      await parser.destroy();
    } catch {
      // Ignore destroy errors
    }
    
    return {
      title,
      author,
      text,
      wordCount,
      pageCount,
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
        }, 30000);
        
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
            
            // Extract text from chapters with error handling
            const chapters: string[] = [];
            const flow = epub.flow || [];
            
            for (const chapter of flow.slice(0, 50)) { // Limit chapters to prevent timeout
              if (chapter.id) {
                try {
                  const chapterText = await new Promise<string>((res) => {
                    const chapterTimeout = setTimeout(() => res(""), 5000);
                    epub.getChapter(chapter.id!, (err: Error | null, text?: string) => {
                      clearTimeout(chapterTimeout);
                      if (err) res("");
                      else res(text || "");
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
                    .replace(/\s+/g, " ")
                    .trim();
                  if (cleanText && cleanText.length > 10) {
                    chapters.push(cleanText);
                  }
                } catch {
                  // Skip failed chapters
                }
              }
            }
            
            const text = chapters.join("\n\n");
            const wordCount = text.split(/\s+/).filter((w: string) => w.length > 0).length;
            
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
