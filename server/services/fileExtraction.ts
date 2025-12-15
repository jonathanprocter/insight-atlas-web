import { PDFParse } from "pdf-parse";
import EPub from "epub2";
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
}

/**
 * Extract text content from a PDF file buffer
 */
export async function extractFromPDF(buffer: Buffer): Promise<ExtractedContent> {
  try {
    // Write buffer to temp file for PDFParse
    const tempPath = path.join(os.tmpdir(), `pdf-${Date.now()}.pdf`);
    fs.writeFileSync(tempPath, buffer);
    
    const parser = new PDFParse({ data: fs.readFileSync(tempPath) });
    const textResult = await parser.getText();
    const infoResult = await parser.getInfo();
    
    // Clean up temp file
    fs.unlinkSync(tempPath);
    
    const text = textResult.text || "";
    const wordCount = text.split(/\s+/).filter((w: string) => w.length > 0).length;
    
    // Extract title from metadata or first line
    let title = infoResult.info?.Title || "";
    if (!title && text) {
      const firstLine = text.split("\n").find((line: string) => line.trim().length > 0);
      title = firstLine?.substring(0, 100) || "Untitled PDF";
    }
    
    const author = infoResult.info?.Author || null;
    
    await parser.destroy();
    
    return {
      title: title || "Untitled PDF",
      author,
      text,
      wordCount,
      pageCount: textResult.pages?.length || null,
      fileType: "pdf",
    };
  } catch (error) {
    console.error("[PDF Extraction] Error:", error);
    throw new Error(`Failed to extract PDF content: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Extract text content from an EPUB file buffer
 */
export async function extractFromEPUB(buffer: Buffer): Promise<ExtractedContent> {
  return new Promise((resolve, reject) => {
    try {
      const tempPath = path.join(os.tmpdir(), `epub-${Date.now()}.epub`);
      fs.writeFileSync(tempPath, buffer);
      
      const epub = new EPub(tempPath);
      
      epub.on("error", (err: Error) => {
        fs.unlinkSync(tempPath);
        reject(new Error(`EPUB parsing error: ${err.message}`));
      });
      
      epub.on("end", async () => {
        try {
          const title = epub.metadata?.title || "Untitled EPUB";
          const author = epub.metadata?.creator || null;
          
          // Extract text from all chapters
          const chapters: string[] = [];
          const flow = epub.flow || [];
          
          for (const chapter of flow) {
            if (chapter.id) {
              try {
                const chapterText = await new Promise<string>((res, rej) => {
                  epub.getChapter(chapter.id!, (err: Error, text?: string) => {
                    if (err) rej(err);
                    else res(text || "");
                  });
                });
                // Strip HTML tags
                const cleanText = chapterText.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
                if (cleanText) chapters.push(cleanText);
              } catch {
                // Skip failed chapters
              }
            }
          }
          
          const text = chapters.join("\n\n");
          const wordCount = text.split(/\s+/).filter((w: string) => w.length > 0).length;
          
          // Clean up temp file
          fs.unlinkSync(tempPath);
          
          resolve({
            title,
            author,
            text,
            wordCount,
            pageCount: flow.length,
            fileType: "epub",
          });
        } catch (error) {
          fs.unlinkSync(tempPath);
          reject(error);
        }
      });
      
      epub.parse();
    } catch (error) {
      reject(new Error(`Failed to extract EPUB content: ${error instanceof Error ? error.message : "Unknown error"}`));
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
    const firstLine = text.split("\n").find((line: string) => line.trim().length > 0);
    const title = firstLine?.substring(0, 100) || filename.replace(/\.txt$/i, "") || "Untitled Text";
    
    return {
      title,
      author: null,
      text,
      wordCount,
      pageCount: null,
      fileType: "txt",
    };
  } catch (error) {
    throw new Error(`Failed to extract TXT content: ${error instanceof Error ? error.message : "Unknown error"}`);
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
  
  throw new Error(`Unsupported file type: ${mimeType || filename}`);
}

/**
 * Truncate text to a maximum length while preserving word boundaries
 */
export function truncateText(text: string, maxLength: number = 100000): string {
  if (text.length <= maxLength) return text;
  
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  
  return lastSpace > maxLength * 0.8 ? truncated.substring(0, lastSpace) : truncated;
}
