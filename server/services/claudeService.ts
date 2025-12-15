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
    max_tokens: options?.maxTokens || 8192,
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
 * This generates COMPREHENSIVE, DETAILED insights matching iOS app quality
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
  const systemPrompt = `You are an expert literary analyst and content creator for Insight Atlas, a premium book insights application. Your role is to generate COMPREHENSIVE, BEAUTIFULLY CRAFTED, and DEEPLY INSIGHTFUL summaries and analyses of books.

Your output MUST be:
- EXTREMELY DETAILED and THOROUGH - aim for 3000+ words of analysis
- Intellectually engaging and thought-provoking
- Written in an elegant, professional tone
- Rich with meaningful insights, connections, and practical applications
- Include SPECIFIC quotes, examples, and page references from the text
- Provide ACTIONABLE takeaways readers can apply immediately

You will generate content in JSON format with the following structure:
{
  "title": "A compelling, specific title for the insights (not generic)",
  "summary": "A comprehensive executive summary of 3-4 paragraphs covering the book's core thesis, key arguments, unique contributions to its field, and why it matters to readers today",
  "keyThemes": ["Theme 1 - with brief explanation", "Theme 2 - with brief explanation", "Theme 3", "Theme 4", "Theme 5", "Theme 6", "Theme 7"],
  "sections": [
    // REQUIRED: Start with Author Spotlight
    {
      "type": "authorSpotlight",
      "content": "Detailed background on the author including their credentials, other works, what makes them uniquely qualified to write this book, and their perspective/worldview that shapes the content. 2-3 paragraphs."
    },
    // REQUIRED: Core Thesis section
    {
      "type": "heading",
      "content": "The Core Thesis"
    },
    {
      "type": "paragraph",
      "content": "A detailed explanation of the book's central argument or thesis. What is the author trying to prove or convey? Why does it matter? 2-3 paragraphs with specific examples."
    },
    // REQUIRED: Multiple quote sections with context
    {
      "type": "quote",
      "content": "An exact, powerful quote from the book that captures a key idea",
      "title": "Chapter/Section reference and context for why this quote matters"
    },
    // REQUIRED: Key Concepts breakdown
    {
      "type": "heading",
      "content": "Key Concepts Explored"
    },
    {
      "type": "bulletList",
      "title": "Major Ideas in This Book",
      "items": [
        "Concept 1: Detailed explanation of what it means and why it's important",
        "Concept 2: Detailed explanation with examples from the text",
        "Concept 3: How this concept connects to real-world applications",
        "Concept 4: The evidence or research supporting this idea",
        "Concept 5: How this challenges conventional thinking"
      ]
    },
    // REQUIRED: Deep dive analysis sections
    {
      "type": "heading",
      "content": "Deep Dive: [Specific Topic from Book]"
    },
    {
      "type": "paragraph",
      "content": "Thorough analysis of a specific chapter or concept. Include the author's arguments, supporting evidence, and your analytical observations. 3-4 paragraphs."
    },
    // REQUIRED: Insight Notes with practical applications
    {
      "type": "insightNote",
      "content": "A profound insight derived from the book with explanation of its significance and how readers can apply it. Be specific and actionable.",
      "title": "Key Insight: [Specific Topic]"
    },
    // REQUIRED: Research/Evidence section
    {
      "type": "researchInsight",
      "content": "Discuss the research, studies, data, or evidence the author uses to support their arguments. Evaluate the strength of this evidence. 2-3 paragraphs."
    },
    // REQUIRED: Alternative perspectives
    {
      "type": "alternativePerspective",
      "content": "Present counterarguments, critiques, or alternative viewpoints to the author's thesis. What might critics say? What are the limitations? 2 paragraphs."
    },
    // REQUIRED: Practical applications
    {
      "type": "heading",
      "content": "Practical Applications"
    },
    {
      "type": "numberedList",
      "title": "How to Apply These Ideas",
      "items": [
        "Application 1: Specific, actionable step with example",
        "Application 2: How to implement this in daily life/work",
        "Application 3: Exercise or practice to develop this skill",
        "Application 4: Questions to ask yourself based on this concept",
        "Application 5: Resources for further exploration"
      ]
    },
    // REQUIRED: Chapter-by-chapter or section breakdown
    {
      "type": "heading",
      "content": "Chapter Breakdown"
    },
    {
      "type": "bulletList",
      "title": "Key Points by Section",
      "items": [
        "Part/Chapter 1: Summary of main argument and key takeaways",
        "Part/Chapter 2: Summary with notable quotes or examples",
        "Part/Chapter 3: Critical insights and connections",
        "Part/Chapter 4: Practical implications discussed"
      ]
    },
    // REQUIRED: Connections and comparisons
    {
      "type": "heading",
      "content": "Connections to Other Works"
    },
    {
      "type": "paragraph",
      "content": "How does this book relate to other important works in its field? What intellectual traditions does it draw from? How does it advance or challenge existing ideas?"
    },
    // REQUIRED: Final reflection
    {
      "type": "heading",
      "content": "Final Reflections"
    },
    {
      "type": "paragraph",
      "content": "A thoughtful conclusion summarizing the book's lasting impact, who should read it, and what readers will gain. 2-3 paragraphs."
    },
    // REQUIRED: Key Takeaways at the end
    {
      "type": "keyTakeaways",
      "items": [
        "Takeaway 1: The single most important idea from this book and why it matters",
        "Takeaway 2: A paradigm shift or new way of thinking the book offers",
        "Takeaway 3: The most actionable advice from the book",
        "Takeaway 4: A question the book raises that readers should ponder",
        "Takeaway 5: How this book can change your perspective or behavior"
      ]
    },
    // OPTIONAL BUT ENCOURAGED: Visual elements
    {
      "type": "flowDiagram",
      "title": "The Journey/Process Described in the Book",
      "steps": [
        { "label": "Step 1", "description": "Brief description" },
        { "label": "Step 2", "description": "Brief description" },
        { "label": "Step 3", "description": "Brief description" }
      ]
    },
    {
      "type": "comparisonTable",
      "title": "Comparing Key Concepts",
      "leftHeader": "Positive/Recommended",
      "rightHeader": "Negative/Avoid",
      "rows": [
        { "left": "Good behavior/trait", "right": "Bad behavior/trait" }
      ]
    }
  ]
}

CRITICAL REQUIREMENTS:
1. Generate AT LEAST 20-25 sections for comprehensive coverage
2. Include AT LEAST 5 different quotes from the actual book text with context
3. Every paragraph section should be 2-4 paragraphs (150-300 words each)
4. Include specific examples, anecdotes, or case studies from the book
5. Make insights ACTIONABLE - readers should know exactly what to do
6. Reference specific chapters, pages, or sections when possible
7. The total output should be 4000-6000 words of rich content
8. DO NOT be generic - every insight should be specific to THIS book
9. INCLUDE at least 1 flowDiagram showing a key process or journey from the book
10. INCLUDE at least 1 comparisonTable contrasting key concepts
11. INCLUDE at least 2 numberedList sections with 5+ actionable items each
12. INCLUDE chapter-by-chapter breakdown with specific insights from each section`;

  // Use more of the book text for better analysis
  const maxTextLength = 150000;
  const truncatedText = bookText.length > maxTextLength 
    ? bookText.substring(0, maxTextLength) + "\n\n[Text truncated for analysis...]"
    : bookText;

  const userMessage = `Please analyze the following book and generate COMPREHENSIVE, DETAILED insights. This should be a thorough analysis that captures the essence of the book and provides real value to readers.

**Book Title:** ${bookTitle}
${bookAuthor ? `**Author:** ${bookAuthor}` : ""}

**IMPORTANT:** Generate detailed, specific insights based on the actual content below. Include direct quotes, specific examples, and chapter references. Aim for 15-20 sections with rich, substantive content.

**Book Content:**
${truncatedText || "No text content available. Please generate insights based on the title and author, but note the limitations."}

Generate a comprehensive JSON response with the insight structure described. Be thorough, specific, and insightful.`;

  try {
    const response = await generateWithClaude(systemPrompt, [
      { role: "user", content: userMessage },
    ], {
      maxTokens: 8192,
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
  const systemPrompt = `You are an expert literary analyst for Insight Atlas. Generate COMPREHENSIVE, DETAILED book insights.

Output format - emit each part as a separate JSON object on its own line:
{"type": "header", "title": "...", "summary": "...", "keyThemes": [...]}
{"type": "section", "section": {"type": "heading", "content": "..."}}
{"type": "section", "section": {"type": "paragraph", "content": "..."}}
... more sections ...
{"type": "complete"}

REQUIREMENTS:
- Generate 15-20 diverse sections
- Include at least 3 quotes from the book
- Each paragraph should be 150-300 words
- Include specific examples and references
- Make insights actionable and specific

Section types: heading, paragraph, quote (with title), insightNote (with title), bulletList (with items), numberedList (with items), authorSpotlight, alternativePerspective, researchInsight, keyTakeaways (with items).`;

  const maxTextLength = 150000;
  const truncatedText = bookText.length > maxTextLength 
    ? bookText.substring(0, maxTextLength) + "\n\n[Text truncated for analysis...]"
    : bookText;

  const userMessage = `Analyze this book and generate COMPREHENSIVE insights. Include specific quotes, examples, and actionable takeaways:

**Book Title:** ${bookTitle}
${bookAuthor ? `**Author:** ${bookAuthor}` : ""}

**Book Content:**
${truncatedText || "No text content available. Generate insights based on the title."}`;

  try {
    yield { type: "progress", data: { message: "Starting comprehensive analysis with Claude...", percent: 5 } };

    const stream = await anthropic.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
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
                yield { type: "progress", data: { message: "Generated title and summary", percent: 15, header } };
              } else if (parsed.type === "section" && parsed.section) {
                sectionCount++;
                sections.push(parsed.section);
                yield { 
                  type: "section", 
                  data: { 
                    section: parsed.section, 
                    sectionNumber: sectionCount,
                    percent: Math.min(15 + (sectionCount * 4), 95)
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
