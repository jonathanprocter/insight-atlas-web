import { describe, it, expect } from "vitest";
import * as db from "./db";
import { generatePremiumInsight } from "./services/premiumInsightPipeline";

describe("Generation Debug Test", () => {
  it("should generate insights and check for invalid characters", async () => {
    // Create a test book
    const bookId = await db.createBook({
      userId: 1,
      title: "What's Your Story?",
      author: "Rebecca Walker",
      fileUrl: "test.pdf",
      fileType: "pdf",
      wordCount: 5462,
      pageCount: 224,
      extractedText: `What's Your Story? A Journal for Everyday Evolution

This is a test book about personal growth and storytelling. The book explores how we create meaning through narrative and how our stories shape our identity.

Chapter 1: The Power of Story
Stories are fundamental to human experience. They help us make sense of our lives and connect with others.

Chapter 2: Finding Your Voice
Discovering your authentic voice is essential for meaningful self-expression.

Chapter 3: Daily Practice
Regular journaling can transform your relationship with yourself and your story.`,
    });

    console.log(`[Test] Created book ID: ${bookId}`);

    // Generate insights
    console.log("[Test] Starting insight generation...");
    const result = await generatePremiumInsight(
      "What's Your Story?",
      "Rebecca Walker",
      "This is a test book about personal growth and storytelling."
    );

    console.log("[Test] Generation complete");
    console.log("[Test] Title:", result.title);
    console.log("[Test] Title length:", result.title.length);
    console.log("[Test] Title char codes:", Array.from(result.title).map(c => c.charCodeAt(0)));
    console.log("[Test] Summary:", result.summary.substring(0, 100));
    console.log("[Test] Key themes:", result.keyThemes);
    console.log("[Test] Sections:", result.sections.length);

    // Check for invalid characters
    const hasControlChars = /[\x00-\x1F\x7F]/.test(result.title) || 
                           /[\x00-\x1F\x7F]/.test(result.summary);
    const hasUnpairedSurrogates = /[\uD800-\uDFFF]/.test(result.title) || 
                                  /[\uD800-\uDFFF]/.test(result.summary);

    console.log("[Test] Has control characters:", hasControlChars);
    console.log("[Test] Has unpaired surrogates:", hasUnpairedSurrogates);

    // Try to create a URL with the title (this is what might be failing)
    try {
      const testUrl = new URL(`https://example.com/insight/${result.title}`);
      console.log("[Test] URL creation succeeded:", testUrl.href);
    } catch (error) {
      console.error("[Test] URL creation failed:", error);
      if (error instanceof Error) {
        console.error("[Test] Error message:", error.message);
      }
    }

    expect(result.title).toBeTruthy();
    expect(result.sections.length).toBeGreaterThan(0);
  }, 120000); // 2 minute timeout
});
