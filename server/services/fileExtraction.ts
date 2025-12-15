import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import AdmZip from "adm-zip";

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
 * Strip HTML tags and decode entities from text
 */
function stripHtml(html: string): string {
  return html
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
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parse XML to extract text content
 */
function extractTextFromXml(xml: string): string {
  // Extract text from body or content areas
  const bodyMatch = xml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    return stripHtml(bodyMatch[1]);
  }
  
  // Fallback: strip all tags
  return stripHtml(xml);
}

/**
 * Extract text content from an EPUB file buffer using adm-zip
 */
export async function extractFromEPUB(buffer: Buffer): Promise<ExtractedContent> {
  try {
    console.log("[EPUB Extraction] Starting extraction, buffer size:", buffer.length);
    
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();
    
    console.log("[EPUB Extraction] Found", zipEntries.length, "entries in EPUB");
    
    let title = "EPUB Document";
    let author: string | null = null;
    const textParts: string[] = [];
    let contentFiles: string[] = [];
    
    // First, find and parse container.xml to get the OPF file location
    const containerEntry = zipEntries.find(e => e.entryName.toLowerCase().includes("container.xml"));
    let opfPath = "";
    
    if (containerEntry) {
      const containerXml = containerEntry.getData().toString("utf-8");
      const rootfileMatch = containerXml.match(/rootfile[^>]*full-path="([^"]+)"/i);
      if (rootfileMatch) {
        opfPath = rootfileMatch[1];
        console.log("[EPUB Extraction] Found OPF path:", opfPath);
      }
    }
    
    // Find and parse the OPF file for metadata and spine
    const opfEntry = zipEntries.find(e => 
      e.entryName === opfPath || 
      e.entryName.toLowerCase().endsWith(".opf")
    );
    
    if (opfEntry) {
      const opfXml = opfEntry.getData().toString("utf-8");
      console.log("[EPUB Extraction] Parsing OPF file:", opfEntry.entryName);
      
      // Extract title
      const titleMatch = opfXml.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
      if (titleMatch) {
        title = stripHtml(titleMatch[1]);
        console.log("[EPUB Extraction] Found title:", title);
      }
      
      // Extract author
      const authorMatch = opfXml.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/i);
      if (authorMatch) {
        author = stripHtml(authorMatch[1]);
        console.log("[EPUB Extraction] Found author:", author);
      }
      
      // Get the base path for content files
      const opfDir = path.dirname(opfEntry.entryName);
      
      // Extract spine order (reading order)
      const spineIds: string[] = [];
      let spineMatch;
      const spineRegex = /<itemref[^>]*idref="([^"]+)"/gi;
      while ((spineMatch = spineRegex.exec(opfXml)) !== null) {
        spineIds.push(spineMatch[1]);
      }
      
      // Build a map of manifest items
      const manifestItems: Record<string, string> = {};
      let manifestMatch;
      const manifestRegex = /<item[^>]*id="([^"]+)"[^>]*href="([^"]+)"/gi;
      while ((manifestMatch = manifestRegex.exec(opfXml)) !== null) {
        manifestItems[manifestMatch[1]] = manifestMatch[2];
      }
      
      // Also try reverse order (href before id)
      const manifestRegex2 = /<item[^>]*href="([^"]+)"[^>]*id="([^"]+)"/gi;
      while ((manifestMatch = manifestRegex2.exec(opfXml)) !== null) {
        manifestItems[manifestMatch[2]] = manifestMatch[1];
      }
      
      console.log("[EPUB Extraction] Found", spineIds.length, "spine items and", Object.keys(manifestItems).length, "manifest items");
      
      // Get content files in spine order
      for (const spineId of spineIds) {
        const href = manifestItems[spineId];
        if (href) {
          const fullPath = opfDir ? `${opfDir}/${href}` : href;
          contentFiles.push(fullPath);
        }
      }
      
      // If no spine found, fall back to all HTML/XHTML files
      if (contentFiles.length === 0) {
        contentFiles = zipEntries
          .filter(e => /\.(x?html?|xml)$/i.test(e.entryName) && !e.entryName.includes("toc"))
          .map(e => e.entryName);
      }
    } else {
      // No OPF found, fall back to all HTML/XHTML files
      console.log("[EPUB Extraction] No OPF file found, using fallback");
      contentFiles = zipEntries
        .filter(e => /\.(x?html?|xml)$/i.test(e.entryName) && !e.entryName.includes("toc"))
        .map(e => e.entryName);
    }
    
    console.log("[EPUB Extraction] Processing", contentFiles.length, "content files");
    
    // Extract text from each content file
    for (const contentPath of contentFiles.slice(0, 100)) {
      // Handle URL-encoded paths and normalize
      const normalizedPath = decodeURIComponent(contentPath).replace(/\\/g, "/");
      
      const entry = zipEntries.find(e => {
        const entryPath = e.entryName.replace(/\\/g, "/");
        return entryPath === normalizedPath || 
               entryPath === contentPath ||
               entryPath.endsWith(normalizedPath) ||
               normalizedPath.endsWith(entryPath);
      });
      
      if (entry) {
        try {
          const content = entry.getData().toString("utf-8");
          const text = extractTextFromXml(content);
          
          if (text && text.length > 20) {
            textParts.push(text);
          }
        } catch (entryError) {
          console.warn("[EPUB Extraction] Error reading entry:", contentPath, entryError);
        }
      }
    }
    
    const text = textParts.join("\n\n");
    const wordCount = text.split(/\s+/).filter((w: string) => w.length > 0).length;
    
    console.log(`[EPUB Extraction] Extracted ${wordCount} words from ${textParts.length} chapters`);
    
    // If still no text, try extracting from ALL xhtml/html files
    if (wordCount === 0) {
      console.log("[EPUB Extraction] No text found, trying all HTML files...");
      
      for (const entry of zipEntries) {
        if (/\.(x?html?)$/i.test(entry.entryName)) {
          try {
            const content = entry.getData().toString("utf-8");
            const entryText = extractTextFromXml(content);
            
            if (entryText && entryText.length > 50) {
              textParts.push(entryText);
              console.log("[EPUB Extraction] Found text in:", entry.entryName, "length:", entryText.length);
            }
          } catch (e) {
            // Skip errors
          }
        }
      }
      
      const finalText = textParts.join("\n\n");
      const finalWordCount = finalText.split(/\s+/).filter((w: string) => w.length > 0).length;
      
      console.log(`[EPUB Extraction] Final extraction: ${finalWordCount} words`);
      
      return {
        title,
        author,
        text: finalText,
        wordCount: finalWordCount,
        pageCount: contentFiles.length || textParts.length,
        fileType: "epub",
        coverImage: null,
        coverMimeType: null,
      };
    }
    
    return {
      title,
      author,
      text,
      wordCount,
      pageCount: contentFiles.length,
      fileType: "epub",
      coverImage: null,
      coverMimeType: null,
    };
  } catch (error) {
    console.error("[EPUB Extraction] Error:", error);
    return {
      title: "EPUB Document",
      author: null,
      text: "",
      wordCount: 0,
      pageCount: null,
      fileType: "epub",
      coverImage: null,
      coverMimeType: null,
    };
  }
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
