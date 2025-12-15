import { invokeLLM } from "../_core/llm";
import { VISUAL_TYPE_INFO, VisualType } from "../../shared/types";

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
 * Generate comprehensive book insights using AI
 */
export async function generateInsight(
  bookText: string,
  bookTitle: string,
  bookAuthor: string | null
): Promise<GeneratedInsight> {
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

    const parsed = JSON.parse(content);
    
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
