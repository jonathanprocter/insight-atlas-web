/**
 * Stage 0: Book Analysis & Classification
 * 
 * Pre-processing stage that analyzes the source book BEFORE content generation.
 * Produces structured analysis to guide the main generation prompt.
 * 
 * Uses the built-in LLM (OpenAI/Gemini) as primary, with Anthropic Claude as fallback.
 */

import { generateWithClaude, isAnthropicConfigured } from './dualLLMService';

// The 30+ visual types available in Insight Atlas
export const VISUAL_TYPES = [
  'timeline', 'flowDiagram', 'comparisonMatrix', 'pieChart', 'barChart',
  'infographic', 'mindMap', 'hierarchy', 'networkGraph', 'vennDiagram',
  'scatterPlot', 'heatMap', 'treemap', 'sunburst', 'sankey',
  'wordCloud', 'radarChart', 'gaugeChart', 'funnelChart', 'waterfallChart',
  'areaChart', 'bubbleChart', 'donutChart', 'stackedBar', 'lineChart',
  'candlestick', 'boxPlot', 'histogram', 'parallelCoordinates', 'chordDiagram',
  'forceDirectedGraph', 'circularPacking', 'icicle', 'partition'
] as const;

export type VisualType = typeof VISUAL_TYPES[number];

export interface BookAnalysis {
  bookMetadata: {
    title: string;
    author: string;
    publicationYear?: string;
    wordCountEstimate?: string;
  };
  classification: {
    primaryCategory: string;
    secondaryCategories: string[];
    complexityLevel: 'Accessible' | 'Intermediate' | 'Advanced' | 'Expert';
    frameworkType: 'Practical' | 'Theoretical' | 'Hybrid' | 'Narrative';
  };
  originStory: {
    present: boolean;
    location?: string;
    description?: string;
    narrativeTone?: string;
  };
  structure: {
    totalChapters: number;
    chapterTitles: string[];
    logicalGroupings: Array<{
      groupName: string;
      chapters: string[];
      theme: string;
    }>;
    chaptersStandaloneOrSequential: 'Standalone' | 'Sequential' | 'Mixed';
  };
  coreConcepts: Array<{
    conceptName: string;
    chapterSource: string;
    briefDescription: string;
    recommendedVisual: VisualType;
    visualRationale: string;
    exampleDomains: string[];
  }>;
  crossReferences: {
    psychologicalFrameworks: string[];
    philosophicalTraditions: string[];
    neuroscienceResearch: string[];
    relatedPopularWorks: string[];
  };
  toneAnalysis: {
    authorVoice: string;
    recommendedGuideTone: string;
    toneNotes: string;
  };
  generationRecommendations: {
    emphasisAreas: string[];
    potentialChallenges: string[];
    uniqueValueOpportunities: string[];
  };
}

function buildAnalysisPrompt(bookTitle: string, bookAuthor: string, bookText: string): { system: string; user: string } {
  const truncatedText = bookText.slice(0, 80000);
  
  const systemPrompt = `You are an expert book analyst specializing in extracting structured insights from non-fiction books. Your analysis will guide the generation of comprehensive book guides.

You must respond with valid JSON only. No markdown, no explanations, just the JSON object.`;

  const userPrompt = `# BOOK ANALYSIS REQUEST

Analyze this book and provide structured analysis in JSON format.

## BOOK INFORMATION
- Title: ${bookTitle}
- Author: ${bookAuthor}

## AVAILABLE VISUAL TYPES
${VISUAL_TYPES.join(', ')}

## BOOK TEXT (first 80,000 characters)
${truncatedText}

---

## REQUIRED OUTPUT FORMAT

Return a JSON object with this exact structure:
{
  "bookMetadata": {
    "title": "string",
    "author": "string",
    "publicationYear": "string or null",
    "wordCountEstimate": "string"
  },
  "classification": {
    "primaryCategory": "string (e.g., Self-Help, Business, Psychology)",
    "secondaryCategories": ["array of strings"],
    "complexityLevel": "Accessible|Intermediate|Advanced|Expert",
    "frameworkType": "Practical|Theoretical|Hybrid|Narrative"
  },
  "originStory": {
    "present": true/false,
    "location": "chapter/section where found",
    "description": "brief description",
    "narrativeTone": "storytelling style"
  },
  "structure": {
    "totalChapters": number,
    "chapterTitles": ["array of chapter titles"],
    "logicalGroupings": [
      {
        "groupName": "string",
        "chapters": ["chapter titles in this group"],
        "theme": "unifying theme"
      }
    ],
    "chaptersStandaloneOrSequential": "Standalone|Sequential|Mixed"
  },
  "coreConcepts": [
    {
      "conceptName": "string",
      "chapterSource": "string",
      "briefDescription": "string",
      "recommendedVisual": "one of the visual types listed above",
      "visualRationale": "why this visual type fits",
      "exampleDomains": ["workplace", "relationships", etc.]
    }
  ],
  "crossReferences": {
    "psychologicalFrameworks": ["CBT", "ACT", etc.],
    "philosophicalTraditions": ["Stoicism", etc.],
    "neuroscienceResearch": ["relevant findings"],
    "relatedPopularWorks": ["similar books"]
  },
  "toneAnalysis": {
    "authorVoice": "description of author's writing style",
    "recommendedGuideTone": "suggested tone for the guide",
    "toneNotes": "additional notes"
  },
  "generationRecommendations": {
    "emphasisAreas": ["what to focus on"],
    "potentialChallenges": ["what might be difficult"],
    "uniqueValueOpportunities": ["unique angles to explore"]
  }
}

Analyze the book thoroughly and return ONLY the JSON object.`;

  return { system: systemPrompt, user: userPrompt };
}

/**
 * Analyze a book using the dual LLM approach
 */
export async function analyzeBook(
  bookTitle: string,
  bookAuthor: string,
  bookText: string
): Promise<BookAnalysis> {
  console.log('[Stage 0] Starting book analysis with dual LLM...');
  console.log('[Stage 0] Anthropic configured:', isAnthropicConfigured());
  
  const { system, user } = buildAnalysisPrompt(bookTitle, bookAuthor, bookText);

  try {
    // Use Anthropic Claude as primary for book analysis
    // Increased from 8k to 16k tokens for comprehensive book analysis
    const response = await generateWithClaude(system, user, 16000);
    console.log('[Stage 0] Analysis completed using:', response.provider);

    // Parse the JSON response
    let jsonStr = response.content;
    
    // Handle markdown code blocks
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    // Clean up any leading/trailing whitespace
    jsonStr = jsonStr.trim();

    const analysis = JSON.parse(jsonStr) as BookAnalysis;
    
    console.log('[Stage 0] Extracted', analysis.coreConcepts?.length || 0, 'core concepts');
    
    return analysis;
  } catch (error) {
    console.error('[Stage 0] Analysis error:', error);
    
    // Return a minimal analysis on error
    return {
      bookMetadata: {
        title: bookTitle,
        author: bookAuthor,
        wordCountEstimate: String(bookText.split(/\s+/).length),
      },
      classification: {
        primaryCategory: 'Non-Fiction',
        secondaryCategories: [],
        complexityLevel: 'Intermediate',
        frameworkType: 'Practical',
      },
      originStory: {
        present: false,
      },
      structure: {
        totalChapters: 10,
        chapterTitles: [],
        logicalGroupings: [],
        chaptersStandaloneOrSequential: 'Sequential',
      },
      coreConcepts: [
        {
          conceptName: 'Main Concept',
          chapterSource: 'Chapter 1',
          briefDescription: 'The primary concept from the book',
          recommendedVisual: 'flowDiagram',
          visualRationale: 'Shows the process flow',
          exampleDomains: ['general'],
        },
      ],
      crossReferences: {
        psychologicalFrameworks: [],
        philosophicalTraditions: [],
        neuroscienceResearch: [],
        relatedPopularWorks: [],
      },
      toneAnalysis: {
        authorVoice: 'Informative',
        recommendedGuideTone: 'Accessible',
        toneNotes: 'Standard non-fiction tone',
      },
      generationRecommendations: {
        emphasisAreas: ['Key concepts'],
        potentialChallenges: [],
        uniqueValueOpportunities: [],
      },
    };
  }
}
