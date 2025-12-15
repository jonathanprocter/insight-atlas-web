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
 * Extract cover image from PDF file (first page)
 * Note: This function is currently disabled due to sharp/pdf-poppler Linux compatibility issues.
 * Cover extraction for PDFs will be skipped gracefully.
 */
export async function extractPdfCover(buffer: Buffer): Promise<{ coverBuffer: Buffer; mimeType: string } | null> {
  // Skip PDF cover extraction due to sharp/pdf-poppler Linux compatibility issues
  // This prevents the "linux is NOT supported" error from blocking insight generation
  console.log("[Cover Extraction] PDF cover extraction skipped (not supported on this platform)");
  return null;
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
  bookId: number
): Promise<string | null> {
  let coverResult: { coverBuffer: Buffer; mimeType: string } | null = null;
  
  if (fileType === "epub") {
    coverResult = await extractEpubCover(buffer);
  } else if (fileType === "pdf") {
    coverResult = await extractPdfCover(buffer);
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
