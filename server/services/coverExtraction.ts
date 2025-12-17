import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { storagePut } from "../storage";

/**
 * Extract cover image from EPUB file
 */
export async function extractEpubCover(buffer: Buffer): Promise<{ coverBuffer: Buffer; mimeType: string } | null> {
  const AdmZip = (await import("adm-zip")).default;
  
  try {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    
    // Common cover image patterns in EPUBs
    const coverPatterns = [
      /cover\.(jpg|jpeg|png|gif)/i,
      /cover-image\.(jpg|jpeg|png|gif)/i,
      /frontcover\.(jpg|jpeg|png|gif)/i,
      /^OEBPS\/images\/cover\.(jpg|jpeg|png|gif)/i,
      /^OEBPS\/Images\/cover\.(jpg|jpeg|png|gif)/i,
      /^images\/cover\.(jpg|jpeg|png|gif)/i,
      /^Images\/cover\.(jpg|jpeg|png|gif)/i,
    ];
    
    // First, try to find cover from OPF metadata
    const opfEntry = entries.find((e: any) => e.entryName.endsWith(".opf"));
    if (opfEntry) {
      const opfContent = opfEntry.getData().toString("utf-8");
      
      // Look for cover meta tag
      const coverIdMatch = opfContent.match(/name="cover"\s+content="([^"]+)"/i);
      if (coverIdMatch) {
        const coverId = coverIdMatch[1];
        // Find the item with this id
        const itemMatch = opfContent.match(new RegExp(`id="${coverId}"[^>]*href="([^"]+)"`, "i"));
        if (itemMatch) {
          const coverPath = itemMatch[1];
          const coverEntry = entries.find((e: any) => e.entryName.includes(coverPath));
          if (coverEntry) {
            const ext = path.extname(coverPath).toLowerCase();
            const mimeType = ext === ".png" ? "image/png" : ext === ".gif" ? "image/gif" : "image/jpeg";
            return { coverBuffer: coverEntry.getData(), mimeType };
          }
        }
      }
    }
    
    // Fallback: search for common cover image patterns
    for (const pattern of coverPatterns) {
      const coverEntry = entries.find((e: any) => pattern.test(e.entryName));
      if (coverEntry) {
        const ext = path.extname(coverEntry.entryName).toLowerCase();
        const mimeType = ext === ".png" ? "image/png" : ext === ".gif" ? "image/gif" : "image/jpeg";
        return { coverBuffer: coverEntry.getData(), mimeType };
      }
    }
    
    // Last resort: find any large image in the EPUB
    const imageEntries = entries.filter((e: any) => 
      /\.(jpg|jpeg|png|gif)$/i.test(e.entryName) && 
      e.getData().length > 10000 // At least 10KB
    );
    
    if (imageEntries.length > 0) {
      // Sort by size descending, assume largest is cover
      imageEntries.sort((a: any, b: any) => b.getData().length - a.getData().length);
      const coverEntry = imageEntries[0];
      const ext = path.extname(coverEntry.entryName).toLowerCase();
      const mimeType = ext === ".png" ? "image/png" : ext === ".gif" ? "image/gif" : "image/jpeg";
      return { coverBuffer: coverEntry.getData(), mimeType };
    }
    
    return null;
  } catch (error) {
    console.error("[Cover Extraction] EPUB cover extraction failed:", error);
    return null;
  }
}

/**
 * Extract cover image from PDF file using AI-powered search
 * Extracts title/author from PDF, then searches for and downloads the cover image
 */
export async function extractPdfCover(buffer: Buffer, title?: string, author?: string): Promise<{ coverBuffer: Buffer; mimeType: string } | null> {
  try {
    console.log("[Cover Extraction] Starting AI-powered PDF cover search...");
    
    // If title/author not provided, we can't search
    if (!title) {
      console.log("[Cover Extraction] No title provided, cannot search for cover");
      return null;
    }
    
    // Use Google Books API to find the cover
    const searchQuery = encodeURIComponent(`${title}${author ? ` ${author}` : ""}`);
    const googleBooksUrl = `https://www.googleapis.com/books/v1/volumes?q=${searchQuery}&maxResults=1`;
    
    console.log(`[Cover Extraction] Searching Google Books for: ${title}${author ? ` by ${author}` : ""}`);
    
    const response = await fetch(googleBooksUrl);
    const data = await response.json();
    
    if (data.items && data.items.length > 0) {
      const book = data.items[0];
      const imageLinks = book.volumeInfo?.imageLinks;
      
      // Try to get the highest quality cover available
      const coverUrl = imageLinks?.extraLarge || imageLinks?.large || imageLinks?.medium || imageLinks?.thumbnail;
      
      if (coverUrl) {
        // Download the cover image
        const imageResponse = await fetch(coverUrl.replace("http://", "https://")); // Force HTTPS
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        
        console.log("[Cover Extraction] Successfully downloaded cover from Google Books");
        return {
          coverBuffer: imageBuffer,
          mimeType: "image/jpeg"
        };
      }
    }
    
    console.log("[Cover Extraction] No cover found on Google Books");
    return null;
  } catch (error) {
    console.error("[Cover Extraction] AI-powered cover search failed:", error);
    return null;
  }
}
    


/**
 * Upload cover image to S3 and return URL
 */
export async function uploadCoverToS3(
  coverBuffer: Buffer,
  mimeType: string,
  bookId: number
): Promise<string> {
  const ext = mimeType === "image/png" ? "png" : mimeType === "image/gif" ? "gif" : "jpg";
  const key = `books/${bookId}/cover-${Date.now()}.${ext}`;
  
  const { url } = await storagePut(key, coverBuffer, mimeType);
  return url;
}

/**
 * Extract and upload cover from file buffer
 */
export async function extractAndUploadCover(
  buffer: Buffer,
  fileType: "pdf" | "epub" | "txt",
  bookId: number,
  title?: string,
  author?: string | null
): Promise<string | null> {
  let coverResult: { coverBuffer: Buffer; mimeType: string } | null = null;
  
  if (fileType === "epub") {
    coverResult = await extractEpubCover(buffer);
  } else if (fileType === "pdf") {
    coverResult = await extractPdfCover(buffer, title, author || undefined);
  }
  
  if (coverResult) {
    try {
      const coverUrl = await uploadCoverToS3(coverResult.coverBuffer, coverResult.mimeType, bookId);
      return coverUrl;
    } catch (error) {
      console.error("[Cover Extraction] Failed to upload cover:", error);
      return null;
    }
  }
  
  return null;
}
