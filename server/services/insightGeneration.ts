import { invokeLLM } from "../_core/llm";
import { VISUAL_TYPE_INFO, VisualType } from "../../shared/types";
import { generateBookInsightsWithClaude, isClaudeConfigured } from "./claudeService";

export interface InsightSection {
  type: "heading" | "paragraph" | "quote" | "authorSpotlight" | "insightNote" | 
        "alternativePerspective" | "researchInsight" | "keyTakeaways" | 
        "exercise" | "sectionDivider" | "visual" | "bulletList" | "numberedList";
  content: string;
  title?: string;
  visualType?: VisualType;
  visualData?: Record<string, unknown>;
  items?: string[];
}

export interface GeneratedInsight {
  title: string;
  summary: string;
  sections: InsightSection[];
  keyThemes: string[];
  recommendedVisualTypes: VisualType[];
  audioScript: string;
  wordCount: number;
}

/**
 * Analyze content to determine the best visual types
 */
export function selectVisualTypes(content: string, themes: string[]): VisualType[] {
  const lowerContent = content.toLowerCase();
  const lowerThemes = themes.map(t => t.toLowerCase());
  
  const scores: { type: VisualType; score: number }[] = [];
  
  for (const info of VISUAL_TYPE_INFO) {
    let score = 0;
    
    // Check keywords in content
    for (const keyword of info.keywords) {
      if (lowerContent.includes(keyword)) {
        score += 2;
      }
      // Check in themes
      for (const theme of lowerThemes) {
        if (theme.includes(keyword) || keyword.includes(theme)) {
          score += 3;
        }
      }
    }
    
    scores.push({ type: info.type, score });
  }
  
  // Sort by score and return top 5
  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .filter(s => s.score > 0)
    .map(s => s.type);
}

/**
 * Generate minimal insights when book text is not available
 */
async function generateMinimalInsight(
  bookTitle: string,
  bookAuthor: string | null
): Promise<GeneratedInsight> {
  const authorInfo = bookAuthor ? ` by ${bookAuthor}` : "";
  
  const systemPrompt = `You are an expert literary analyst. Based only on the book title and author, generate a brief analysis. Respond with valid JSON:
{
  "title": "Insights on [Book Title]",
  "summary": "A brief overview based on the title",
  "keyThemes": ["theme1", "theme2", "theme3"],
  "sections": [{"type": "paragraph", "content": "..."}],
  "audioScript": "A brief audio summary"
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate insights for: "${bookTitle}"${authorInfo}` },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new Error("No content in AI response");
    }

    // Remove markdown code blocks if present
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.slice(7);
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.slice(3);
    }
    if (jsonContent.endsWith('```')) {
      jsonContent = jsonContent.slice(0, -3);
    }
    jsonContent = jsonContent.trim();

    const parsed = JSON.parse(jsonContent);
    const wordCount = parsed.audioScript?.split(/\s+/).length || 0;

    return {
      title: parsed.title || `Insights: ${bookTitle}`,
      summary: parsed.summary || "Analysis based on book title.",
      sections: parsed.sections || [{ type: "paragraph", content: "Content analysis pending." }],
      keyThemes: parsed.keyThemes || ["Literature", "Analysis"],
      recommendedVisualTypes: ["infographic", "mindMap"],
      audioScript: parsed.audioScript || `This is an analysis of ${bookTitle}.`,
      wordCount,
    };
  } catch (error) {
    console.error("[Minimal Insight Generation] Error:", error);
    // Return a fallback insight
    return {
      title: `Insights: ${bookTitle}`,
      summary: `Analysis of "${bookTitle}"${authorInfo}. Full content extraction was not available.`,
      sections: [
        { type: "heading", content: "About This Book" },
        { type: "paragraph", content: `"${bookTitle}" is a work${authorInfo}. Due to content extraction limitations, this analysis is based on available metadata.` },
        { type: "insightNote", content: "Upload a TXT version for more detailed analysis.", title: "Tip" },
      ],
      keyThemes: ["Literature", "Reading"],
      recommendedVisualTypes: ["infographic"],
      audioScript: `Welcome to the insights for ${bookTitle}${authorInfo}. This analysis provides an overview based on the book's metadata.`,
      wordCount: 30,
    };
  }
}

/**
 * Generate comprehensive book insights using AI
 * Uses Claude for content generation when available, falls back to built-in LLM
 */
export async function generateInsight(
  bookText: string,
  bookTitle: string,
  bookAuthor: string | null
): Promise<GeneratedInsight> {
  // Handle empty or missing text
  if (!bookText || bookText.trim().length < 50) {
    // Generate insights based on title and author only
    return generateMinimalInsight(bookTitle, bookAuthor);
  }

  // Try Claude first for superior content generation
  if (isClaudeConfigured()) {
    try {
      console.log("[Insight Generation] Using Claude for content generation");
      const claudeResult = await generateBookInsightsWithClaude(
        bookTitle,
        bookAuthor,
        bookText,
        "premium"
      );
      
      // Generate audio script using built-in LLM with full section content
      // This creates a rich narration that conveys the actual insights, not just visual descriptions
      const audioScript = await generateAudioScriptFromInsights(
        claudeResult.title,
        claudeResult.summary,
        claudeResult.keyThemes,
        claudeResult.sections
      );
      
      // Select visual types based on content
      const recommendedVisualTypes = selectVisualTypes(
        claudeResult.summary + " " + claudeResult.sections.map((s) => s.content || "").join(" "),
        claudeResult.keyThemes
      );
      
      const wordCount = audioScript.split(/\s+/).length;
      
      return {
        title: claudeResult.title,
        summary: claudeResult.summary,
        sections: claudeResult.sections as InsightSection[],
        keyThemes: claudeResult.keyThemes,
        recommendedVisualTypes,
        audioScript,
        wordCount,
      };
    } catch (error) {
      console.error("[Insight Generation] Claude failed, falling back to built-in LLM:", error);
      // Fall through to built-in LLM
    }
  }

  // Fallback: Use built-in LLM
  console.log("[Insight Generation] Using built-in LLM");
  
  // Truncate text if too long (keep first 80k chars for context)
  const maxChars = 80000;
  const truncatedText = bookText.length > maxChars 
    ? bookText.substring(0, maxChars) + "\n\n[Content truncated for analysis...]"
    : bookText;
  
  const systemPrompt = `You are an expert literary analyst and book summarizer. Your task is to create comprehensive, insightful analysis of books that helps readers understand key concepts, themes, and takeaways.

You must respond with valid JSON matching this exact structure:
{
  "title": "Insight title based on the book",
  "summary": "A compelling 2-3 paragraph executive summary",
  "keyThemes": ["theme1", "theme2", "theme3", "theme4", "theme5"],
  "sections": [
    {
      "type": "heading",
      "content": "Section Title"
    },
    {
      "type": "paragraph",
      "content": "Regular paragraph text..."
    },
    {
      "type": "quote",
      "content": "Notable quote from the book",
      "title": "Quote attribution or context"
    },
    {
      "type": "authorSpotlight",
      "content": "Information about the author's background and perspective"
    },
    {
      "type": "insightNote",
      "content": "A key insight or observation",
      "title": "Insight Title"
    },
    {
      "type": "alternativePerspective",
      "content": "A contrasting viewpoint or consideration"
    },
    {
      "type": "researchInsight",
      "content": "Related research or studies that support the book's claims"
    },
    {
      "type": "keyTakeaways",
      "items": ["Takeaway 1", "Takeaway 2", "Takeaway 3"]
    },
    {
      "type": "exercise",
      "content": "A practical exercise for the reader",
      "title": "Exercise Title"
    },
    {
      "type": "bulletList",
      "title": "List Title",
      "items": ["Item 1", "Item 2", "Item 3"]
    }
  ],
  "audioScript": "A natural, conversational script for audio narration (5-7 minutes when read aloud). Write as if speaking directly to the listener, summarizing the key insights engagingly."
}

Guidelines:
- Create 10-15 diverse sections using different types
- Include at least one of each: quote, authorSpotlight, insightNote, keyTakeaways
- The audioScript should be engaging and conversational, suitable for podcast-style narration
- Focus on actionable insights and practical applications
- Maintain the author's original intent while adding analytical depth`;

  const userPrompt = `Please analyze this book and generate comprehensive insights:

Book Title: ${bookTitle}
Author: ${bookAuthor || "Unknown"}

Book Content:
${truncatedText}

Generate a detailed analysis with multiple section types, key themes, and an engaging audio script.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "book_insight",
          strict: true,
          schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              summary: { type: "string" },
              keyThemes: { type: "array", items: { type: "string" } },
              sections: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    content: { type: "string" },
                    title: { type: "string" },
                    items: { type: "array", items: { type: "string" } },
                  },
                  required: ["type"],
                  additionalProperties: false,
                },
              },
              audioScript: { type: "string" },
            },
            required: ["title", "summary", "keyThemes", "sections", "audioScript"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new Error("No content in AI response");
    }

    // Remove markdown code blocks if present
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.slice(7);
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.slice(3);
    }
    if (jsonContent.endsWith('```')) {
      jsonContent = jsonContent.slice(0, -3);
    }
    jsonContent = jsonContent.trim();

    const parsed = JSON.parse(jsonContent);
    
    // Calculate word count
    const wordCount = parsed.audioScript.split(/\s+/).length;
    
    // Select visual types based on content
    const recommendedVisualTypes = selectVisualTypes(
      parsed.summary + " " + parsed.sections.map((s: InsightSection) => s.content || "").join(" "),
      parsed.keyThemes
    );

    return {
      title: parsed.title,
      summary: parsed.summary,
      sections: parsed.sections,
      keyThemes: parsed.keyThemes,
      recommendedVisualTypes,
      audioScript: parsed.audioScript,
      wordCount,
    };
  } catch (error) {
    console.error("[Insight Generation] Error:", error);
    throw new Error(`Failed to generate insights: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Generate visual data for a specific visual type
 */
export async function generateVisualData(
  content: string,
  visualType: VisualType,
  themes: string[]
): Promise<Record<string, unknown>> {
  const visualInfo = VISUAL_TYPE_INFO.find(v => v.type === visualType);
  
  const systemPrompt = `You are a data visualization expert. Generate structured data for a ${visualInfo?.name || visualType} visualization based on the provided content.

Respond with valid JSON containing the visualization data. The structure should be appropriate for the visualization type:

For timeline: { "events": [{ "date": "...", "title": "...", "description": "..." }] }
For flowDiagram: { "nodes": [{ "id": "...", "label": "..." }], "edges": [{ "from": "...", "to": "...", "label": "..." }] }
For comparisonMatrix: { "items": ["..."], "criteria": ["..."], "values": [[...]] }
For barChart/pieChart: { "labels": ["..."], "values": [...], "title": "..." }
For mindMap: { "central": "...", "branches": [{ "label": "...", "children": ["..."] }] }
For other types: Use appropriate structure for the visualization.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate ${visualType} visualization data for:\n\nContent: ${content}\n\nThemes: ${themes.join(", ")}` },
      ],
    });

    const responseContent = response.choices[0]?.message?.content;
    if (!responseContent || typeof responseContent !== 'string') {
      return {};
    }

    // Try to parse JSON from response
    const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return {};
  } catch (error) {
    console.error("[Visual Data Generation] Error:", error);
    return {};
  }
}


/**
 * Generate audio script from insights using built-in LLM
 * Creates a rich narration that conveys the actual content and insights,
 * not just descriptions of visual elements
 */
async function generateAudioScriptFromInsights(
  title: string,
  summary: string,
  keyThemes: string[],
  sections?: Array<{ type: string; content?: string; title?: string; items?: string[] }>
): Promise<string> {
  // Build a content-rich representation of all sections
  let sectionContent = "";
  if (sections && sections.length > 0) {
    sectionContent = sections.map((section, index) => {
      let text = "";
      switch (section.type) {
        case "heading":
          text = `\n## ${section.content}`;
          break;
        case "paragraph":
          text = section.content || "";
          break;
        case "quote":
          text = `Quote: "${section.content}"${section.title ? ` - ${section.title}` : ""}`;
          break;
        case "insightNote":
          text = `Key Insight${section.title ? ` (${section.title})` : ""}: ${section.content}`;
          break;
        case "authorSpotlight":
          text = `About the Author: ${section.content}`;
          break;
        case "alternativePerspective":
          text = `Alternative View: ${section.content}`;
          break;
        case "researchInsight":
          text = `Research Finding: ${section.content}`;
          break;
        case "keyTakeaways":
        case "bulletList":
        case "numberedList":
          if (section.items && section.items.length > 0) {
            text = `${section.title || "Key Points"}: ${section.items.join("; ")}`;
          }
          break;
        case "exercise":
          text = `Practical Exercise${section.title ? ` - ${section.title}` : ""}: ${section.content}`;
          break;
        default:
          text = section.content || "";
      }
      return text;
    }).filter(t => t.length > 0).join("\n\n");
  }

  const systemPrompt = `You are a professional narrator creating an engaging audio script for a book insights podcast.

Your task is to transform written insights into a compelling audio experience that:
1. CONVEYS the actual content, ideas, and insights - not just describes what visuals show
2. Presents quotes naturally as if reading them aloud with proper attribution
3. Explains key insights and takeaways in a way that listeners can absorb and remember
4. Weaves together different sections into a cohesive narrative flow
5. Uses vivid language to paint mental pictures of concepts and ideas
6. Includes natural transitions between topics
7. Emphasizes actionable insights and memorable quotes

Write in a warm, conversational tone perfect for audio narration.
The script should be 5-7 minutes when read aloud (approximately 700-1000 words).
Do NOT say things like "as shown in the diagram" or "the chart illustrates" - instead, directly explain the concepts.
Do NOT include stage directions, notes, or formatting - just the spoken content.`;

  const userPrompt = `Create an engaging audio narration that brings these book insights to life:

**Title:** ${title}

**Summary:** ${summary}

**Key Themes:** ${keyThemes.join(", ")}

**Full Content to Narrate:**
${sectionContent || summary}

Transform this into a flowing, engaging audio script that conveys all the key insights, quotes, and takeaways in a way that's perfect for listening. Make the listener feel like they're having an enlightening conversation about the book.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (content && typeof content === 'string') {
      return content.trim();
    }
    
    // Fallback script
    return `Welcome to Insight Atlas. Today we're exploring "${title}". ${summary} The key themes we'll cover include ${keyThemes.join(", ")}. Thank you for listening.`;
  } catch (error) {
    console.error("[Audio Script Generation] Error:", error);
    return `Welcome to Insight Atlas. Today we're exploring "${title}". ${summary}`;
  }
}
