import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractPdfCover } from "./coverExtraction";

// Mock fetch globally
global.fetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AI-Powered Cover Extraction", () => {
  it("should search Google Books API and download cover image", async () => {
    const mockGoogleBooksResponse = {
      items: [
        {
          volumeInfo: {
            imageLinks: {
              thumbnail: "https://books.google.com/books/content?id=test&printsec=frontcover&img=1&zoom=1"
            }
          }
        }
      ]
    };

    const mockImageBuffer = Buffer.from("fake-image-data");

    // Mock Google Books API call
    (global.fetch as any)
      .mockResolvedValueOnce({
        json: async () => mockGoogleBooksResponse
      })
      // Mock image download
      .mockResolvedValueOnce({
        arrayBuffer: async () => mockImageBuffer.buffer
      });

    const result = await extractPdfCover(
      Buffer.from("fake-pdf-data"),
      "The Great Gatsby",
      "F. Scott Fitzgerald"
    );

    expect(result).toBeDefined();
    expect(result?.coverBuffer).toBeInstanceOf(Buffer);
    expect(result?.mimeType).toBe("image/jpeg");
    expect(global.fetch).toHaveBeenCalledTimes(2);
    
    // Verify Google Books API was called with correct query
    const firstCall = (global.fetch as any).mock.calls[0][0];
    expect(firstCall).toContain("googleapis.com/books/v1/volumes");
    expect(firstCall).toContain("The%20Great%20Gatsby");
    expect(firstCall).toContain("F.%20Scott%20Fitzgerald");
  });

  it("should return null when title is not provided", async () => {
    const result = await extractPdfCover(Buffer.from("fake-pdf-data"));
    
    expect(result).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("should return null when Google Books API returns no results", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ items: [] })
    });

    const result = await extractPdfCover(
      Buffer.from("fake-pdf-data"),
      "Nonexistent Book Title"
    );

    expect(result).toBeNull();
  });

  it("should handle API errors gracefully", async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

    const result = await extractPdfCover(
      Buffer.from("fake-pdf-data"),
      "Some Book Title"
    );

    expect(result).toBeNull();
  });

  it("should prefer higher quality cover images", async () => {
    const mockGoogleBooksResponse = {
      items: [
        {
          volumeInfo: {
            imageLinks: {
              thumbnail: "https://example.com/thumbnail.jpg",
              small: "https://example.com/small.jpg",
              medium: "https://example.com/medium.jpg",
              large: "https://example.com/large.jpg",
              extraLarge: "https://example.com/extralarge.jpg"
            }
          }
        }
      ]
    };

    const mockImageBuffer = Buffer.from("fake-image-data");

    (global.fetch as any)
      .mockResolvedValueOnce({
        json: async () => mockGoogleBooksResponse
      })
      .mockResolvedValueOnce({
        arrayBuffer: async () => mockImageBuffer.buffer
      });

    const result = await extractPdfCover(
      Buffer.from("fake-pdf-data"),
      "Test Book"
    );

    expect(result).toBeDefined();
    
    // Verify it requested the extraLarge version
    const imageDownloadCall = (global.fetch as any).mock.calls[1][0];
    expect(imageDownloadCall).toBe("https://example.com/extralarge.jpg");
  });

  it("should force HTTPS for cover image URLs", async () => {
    const mockGoogleBooksResponse = {
      items: [
        {
          volumeInfo: {
            imageLinks: {
              thumbnail: "http://example.com/cover.jpg" // HTTP URL
            }
          }
        }
      ]
    };

    const mockImageBuffer = Buffer.from("fake-image-data");

    (global.fetch as any)
      .mockResolvedValueOnce({
        json: async () => mockGoogleBooksResponse
      })
      .mockResolvedValueOnce({
        arrayBuffer: async () => mockImageBuffer.buffer
      });

    await extractPdfCover(
      Buffer.from("fake-pdf-data"),
      "Test Book"
    );

    // Verify HTTPS was used
    const imageDownloadCall = (global.fetch as any).mock.calls[1][0];
    expect(imageDownloadCall).toContain("https://");
    expect(imageDownloadCall).not.toContain("http://");
  });
});
