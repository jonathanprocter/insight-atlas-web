import Anthropic from "@anthropic-ai/sdk";

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ClaudeResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Generate content using Claude for high-quality analysis and writing
 */
export async function generateWithClaude(
  systemPrompt: string,
  messages: ClaudeMessage[],
  options?: {
    maxTokens?: number;
    temperature?: number;
  }
): Promise<ClaudeResponse> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: options?.maxTokens || 4096,
    temperature: options?.temperature || 0.7,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  // Extract text content from response
  const textContent = response.content.find((block) => block.type === "text");
  const content = textContent?.type === "text" ? textContent.text : "";

  return {
    content,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

/**
 * Generate book insights using Claude's superior analysis capabilities
 */
export async function generateBookInsightsWithClaude(
  bookTitle: string,
  bookAuthor: string | null,
  bookText: string,
  visualType: string
): Promise<{
  title: string;
  summary: string;
  keyThemes: string[];
  sections: Array<{
    type: string;
    content: string;
    title?: string;
    items?: string[];
  }>;
}> {
  const systemPrompt = `You are an expert literary analyst and content creator for Insight Atlas, a premium book insights application. Your role is to generate beautifully crafted, insightful summaries and analyses of books.

Your output should be:
- Intellectually engaging and thought-provoking
- Written in an elegant, professional tone
- Rich with meaningful insights and connections
- Structured for easy reading and comprehension

You will generate content in JSON format with the following structure:
{
  "title": "A compelling title for the insights",
  "summary": "An executive summary of the book's key ideas (2-3 paragraphs)",
  "keyThemes": ["Theme 1", "Theme 2", "Theme 3", "Theme 4", "Theme 5"],
  "sections": [
    {
      "type": "heading",
      "content": "Section Title"
    },
    {
      "type": "paragraph",
      "content": "Detailed analysis..."
    },
    {
      "type": "quote",
      "content": "A memorable quote or key passage",
      "title": "Attribution or context"
    },
    {
      "type": "insightNote",
      "content": "A key insight or takeaway",
      "title": "Insight Title"
    },
    {
      "type": "bulletList",
      "title": "Key Points",
      "items": ["Point 1", "Point 2", "Point 3"]
    },
    {
      "type": "authorSpotlight",
      "content": "Information about the author's perspective or background"
    },
    {
      "type": "alternativePerspective",
      "content": "A contrasting viewpoint or consideration"
    },
    {
      "type": "researchInsight",
      "content": "Supporting research or evidence"
    }
  ]
}

Available section types:
- heading: Section headers
- paragraph: Regular text content
- quote: Notable quotes with attribution
- insightNote: Key insights or takeaways
- bulletList: Lists of points (requires "items" array)
- numberedList: Numbered lists (requires "items" array)
- authorSpotlight: Author background/perspective
- alternativePerspective: Contrasting viewpoints
- researchInsight: Supporting research
- sectionDivider: Visual separator

Generate 8-12 sections that provide a comprehensive analysis of the book.`;

  // Truncate book text if too long (Claude has large context but we want focused analysis)
  const maxTextLength = 100000;
  const truncatedText = bookText.length > maxTextLength 
    ? bookText.substring(0, maxTextLength) + "\n\n[Text truncated for analysis...]"
    : bookText;

  const userMessage = `Please analyze the following book and generate comprehensive insights:

**Book Title:** ${bookTitle}
${bookAuthor ? `**Author:** ${bookAuthor}` : ""}
**Visual Style:** ${visualType}

**Book Content:**
${truncatedText || "No text content available. Please generate insights based on the title and author."}

Generate a JSON response with the insight structure described in your instructions.`;

  try {
    const response = await generateWithClaude(systemPrompt, [
      { role: "user", content: userMessage },
    ], {
      maxTokens: 4096,
      temperature: 0.7,
    });

    // Parse the JSON response
    let content = response.content;
    
    // Handle markdown code blocks
    if (content.includes("```json")) {
      content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "");
    } else if (content.includes("```")) {
      content = content.replace(/```\s*/g, "");
    }
    
    // Find JSON object in response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in Claude response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      title: parsed.title || `Insights: ${bookTitle}`,
      summary: parsed.summary || "",
      keyThemes: parsed.keyThemes || [],
      sections: parsed.sections || [],
    };
  } catch (error) {
    console.error("[Claude] Error generating insights:", error);
    
    // Return minimal fallback
    return {
      title: `Insights: ${bookTitle}`,
      summary: `An analysis of "${bookTitle}"${bookAuthor ? ` by ${bookAuthor}` : ""}.`,
      keyThemes: ["Analysis", "Themes", "Insights"],
      sections: [
        {
          type: "paragraph",
          content: `This book explores important themes and ideas that resonate with readers.`,
        },
        {
          type: "insightNote",
          content: "The insights for this book are being generated. Please try again.",
          title: "Note",
        },
      ],
    };
  }
}

/**
 * Stream book insights using Claude with real-time updates
 * Returns an async generator that yields progress updates
 */
export async function* streamBookInsightsWithClaude(
  bookTitle: string,
  bookAuthor: string | null,
  bookText: string,
  visualType: string
): AsyncGenerator<{
  type: "progress" | "section" | "complete" | "error";
  data: any;
}> {
  const systemPrompt = `You are an expert literary analyst and content creator for Insight Atlas. Generate beautifully crafted, insightful summaries and analyses of books.

You will generate content in JSON format. Start by outputting the title and summary, then output each section one at a time.

Output format - emit each part as a separate JSON object on its own line:
{"type": "header", "title": "...", "summary": "...", "keyThemes": [...]}
{"type": "section", "section": {"type": "heading", "content": "..."}}
{"type": "section", "section": {"type": "paragraph", "content": "..."}}
... more sections ...
{"type": "complete"}

Section types available: heading, paragraph, quote (with title for attribution), insightNote (with title), bulletList (with items array), numberedList (with items array), authorSpotlight, alternativePerspective, researchInsight.

Generate 8-12 diverse sections. Output each JSON object on a new line as you generate it.`;

  const maxTextLength = 100000;
  const truncatedText = bookText.length > maxTextLength 
    ? bookText.substring(0, maxTextLength) + "\n\n[Text truncated for analysis...]"
    : bookText;

  const userMessage = `Analyze this book and generate insights, outputting each section as a separate JSON line:

**Book Title:** ${bookTitle}
${bookAuthor ? `**Author:** ${bookAuthor}` : ""}

**Book Content:**
${truncatedText || "No text content available. Generate insights based on the title."}`;

  try {
    yield { type: "progress", data: { message: "Starting analysis with Claude...", percent: 5 } };

    const stream = await anthropic.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    let fullContent = "";
    let headerParsed = false;
    let sectionCount = 0;
    let header: { title: string; summary: string; keyThemes: string[] } | null = null;
    const sections: Array<{ type: string; content?: string; title?: string; items?: string[] }> = [];

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        fullContent += event.delta.text;

        // Try to parse complete JSON lines
        const lines = fullContent.split("\n");
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          if (line.startsWith("{") && line.endsWith("}")) {
            try {
              const parsed = JSON.parse(line);
              
              if (parsed.type === "header" && !headerParsed) {
                header = {
                  title: parsed.title || `Insights: ${bookTitle}`,
                  summary: parsed.summary || "",
                  keyThemes: parsed.keyThemes || [],
                };
                headerParsed = true;
                yield { type: "progress", data: { message: "Generated title and summary", percent: 20, header } };
              } else if (parsed.type === "section" && parsed.section) {
                sectionCount++;
                sections.push(parsed.section);
                yield { 
                  type: "section", 
                  data: { 
                    section: parsed.section, 
                    sectionNumber: sectionCount,
                    percent: Math.min(20 + (sectionCount * 7), 90)
                  } 
                };
              } else if (parsed.type === "complete") {
                yield { type: "progress", data: { message: "Analysis complete", percent: 100 } };
              }
            } catch (e) {
              // Not valid JSON yet, continue
            }
          }
        }
        // Keep the last incomplete line
        fullContent = lines[lines.length - 1];
      }
    }

    // If streaming didn't produce structured output, fall back to parsing full response
    if (!header || sections.length === 0) {
      const finalResponse = await stream.finalMessage();
      const textContent = finalResponse.content.find((block) => block.type === "text");
      const content = textContent?.type === "text" ? textContent.text : "";
      
      // Try to parse as single JSON
      let jsonContent = content;
      if (jsonContent.includes("```json")) {
        jsonContent = jsonContent.replace(/```json\s*/g, "").replace(/```\s*/g, "");
      }
      const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        yield {
          type: "complete",
          data: {
            title: parsed.title || `Insights: ${bookTitle}`,
            summary: parsed.summary || "",
            keyThemes: parsed.keyThemes || [],
            sections: parsed.sections || [],
          },
        };
        return;
      }
    }

    yield {
      type: "complete",
      data: {
        title: header?.title || `Insights: ${bookTitle}`,
        summary: header?.summary || "",
        keyThemes: header?.keyThemes || [],
        sections,
      },
    };
  } catch (error) {
    console.error("[Claude Streaming] Error:", error);
    yield {
      type: "error",
      data: { message: error instanceof Error ? error.message : "Unknown error" },
    };
  }
}

/**
 * Check if Anthropic API key is configured
 */
export function isClaudeConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}
