import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractContent, truncateText } from "./services/fileExtraction";

describe("File Extraction Service", () => {
  describe("truncateText", () => {
    it("should return text unchanged if under limit", () => {
      const text = "Hello world";
      expect(truncateText(text, 100)).toBe(text);
    });

    it("should truncate text if over limit", () => {
      const text = "Hello world this is a test";
      const result = truncateText(text, 15);
      expect(result.length).toBeLessThanOrEqual(18); // Allow for "..."
    });

    it("should handle empty text", () => {
      expect(truncateText("", 100)).toBe("");
    });

    it("should handle very long text", () => {
      const longText = "word ".repeat(10000);
      const result = truncateText(longText, 100);
      expect(result.length).toBeLessThanOrEqual(103); // 100 + "..."
    });
  });

  describe("extractContent", () => {
    it("should extract content from TXT files", async () => {
      const content = "This is a test book.\n\nBy Test Author\n\nChapter 1\n\nSome content here.";
      const buffer = Buffer.from(content);
      
      const result = await extractContent(buffer, "test.txt", "text/plain");
      
      expect(result.text).toBe(content);
      expect(result.fileType).toBe("txt");
      expect(result.wordCount).toBeGreaterThan(0);
    });

    it("should extract title from content", async () => {
      const content = "Some content without a clear title.";
      const buffer = Buffer.from(content);
      
      const result = await extractContent(buffer, "My Great Book.txt", "text/plain");
      
      // Title can come from content or filename
      expect(result.title).toBeDefined();
      expect(result.title.length).toBeGreaterThan(0);
    });

    it("should handle empty files", async () => {
      const buffer = Buffer.from("");
      
      const result = await extractContent(buffer, "empty.txt", "text/plain");
      
      expect(result.text).toBe("");
      expect(result.wordCount).toBe(0);
    });
  });
});

describe("Visual Type Selection", () => {
  it("should import visual types correctly", async () => {
    const { VISUAL_TYPES, VISUAL_TYPE_INFO } = await import("../shared/types");
    
    expect(VISUAL_TYPES).toBeDefined();
    expect(Array.isArray(VISUAL_TYPES)).toBe(true);
    expect(VISUAL_TYPES.length).toBe(30);
    
    expect(VISUAL_TYPE_INFO).toBeDefined();
    expect(Array.isArray(VISUAL_TYPE_INFO)).toBe(true);
    expect(VISUAL_TYPE_INFO.length).toBe(30);
  });

  it("should have all required fields in visual type info", async () => {
    const { VISUAL_TYPE_INFO } = await import("../shared/types");
    
    for (const info of VISUAL_TYPE_INFO) {
      expect(info.type).toBeDefined();
      expect(info.name).toBeDefined();
      expect(info.description).toBeDefined();
      expect(info.keywords).toBeDefined();
      expect(info.icon).toBeDefined();
    }
  });
});

describe("Audio Generation Service", () => {
  it("should return voice options", async () => {
    const { getVoiceOptions } = await import("./services/audioGeneration");
    
    const voices = getVoiceOptions();
    
    expect(Array.isArray(voices)).toBe(true);
    expect(voices.length).toBeGreaterThan(0);
    
    for (const voice of voices) {
      expect(voice.id).toBeDefined();
      expect(voice.name).toBeDefined();
      expect(voice.description).toBeDefined();
    }
  });

  it("should estimate audio duration correctly", async () => {
    const { estimateAudioDuration } = await import("./services/audioGeneration");
    
    const shortText = "Hello world";
    const longText = "word ".repeat(1000);
    
    const shortDuration = estimateAudioDuration(shortText);
    const longDuration = estimateAudioDuration(longText);
    
    expect(shortDuration).toBeGreaterThan(0);
    expect(longDuration).toBeGreaterThan(shortDuration);
  });
});
