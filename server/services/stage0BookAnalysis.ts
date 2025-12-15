/**
 * Stage 0: Book Analysis & Classification
 * 
 * Pre-processing stage that analyzes the source book BEFORE content generation.
 * Produces structured analysis to guide the main generation prompt.
 */

import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

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
    publicationYear: string;
    wordCountEstimate: string;
  };
  classification: {
    primaryCategory: string;
    secondaryCategories: string[];
    complexityLevel: 'Accessible' | 'Intermediate' | 'Advanced';
    frameworkType: string;
  };
  originStory: {
    present: boolean;
    location: string;
    description: string;
    narrativeTone: string;
  };
  structure: {
    totalChapters: number;
    chapterTitles: string[];
    logicalGroupings: string[];
    chaptersStandaloneOrSequential: string;
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

const STAGE_0_SYSTEM_PROMPT = `You are a book classification and analysis specialist. Your role is to deeply analyze books to prepare them for synthesis. You identify structural patterns, narrative elements, genre conventions, and optimal treatment approaches.

You have access to 30+ visual types for representing concepts:
- Timeline: For chronological events, historical progressions, life stages
- FlowDiagram: For processes, cycles, cause-effect chains, decision trees
- ComparisonMatrix: For before/after, problem/solution, contrasting approaches
- PieChart: For proportional breakdowns, percentage distributions
- BarChart: For comparing quantities across categories
- Infographic: For multi-element overviews combining text and visuals
- MindMap: For central concept with radiating related ideas
- Hierarchy: For nested concepts, organizational structures, taxonomies
- NetworkGraph: For interconnected relationships, systems thinking
- VennDiagram: For overlapping concepts, shared characteristics
- ScatterPlot: For correlations, relationships between variables
- HeatMap: For intensity patterns, frequency distributions
- Treemap: For hierarchical proportions, nested categories
- Sunburst: For hierarchical data with proportional segments
- Sankey: For flow of resources, energy, or information
- WordCloud: For key themes, frequently mentioned concepts
- RadarChart: For multi-dimensional assessments, skill profiles
- GaugeChart: For single metric progress, goal tracking
- FunnelChart: For stages with decreasing quantities
- WaterfallChart: For cumulative effects, step-by-step changes
- AreaChart: For trends over time with volume emphasis
- BubbleChart: For three-variable comparisons
- DonutChart: For proportions with central focus
- StackedBar: For comparing composition across categories
- LineChart: For trends, progressions, continuous data
- ForceDirectedGraph: For complex relationship networks
- CircularPacking: For nested hierarchies with emphasis on leaf nodes

Choose the most appropriate visual type for each concept based on what the content is trying to convey.

Output your analysis as structured JSON that will guide the content generation stage.`;

const STAGE_0_USER_PROMPT = `# BOOK ANALYSIS & CLASSIFICATION

Analyze the following book to prepare it for Insight Atlas guide generation.

## ANALYSIS TASKS

### 1. BOOK CLASSIFICATION

Identify the primary and secondary categories:

**Primary Categories:**
- Self-Help/Personal Development
- Business/Leadership
- Psychology/Behavioral Science
- Philosophy/Spirituality
- Science/Popular Science
- Biography/Memoir
- History/Current Affairs
- Health/Wellness
- Relationships/Communication
- Productivity/Skills

**Complexity Level:**
- Accessible (general audience, minimal prerequisites)
- Intermediate (some domain knowledge helpful)
- Advanced (assumes significant background)

### 2. ORIGIN STORY DETECTION

Search the text for:
- Opening narrative, parable, or founding myth
- Author's personal story that frames the work
- Cultural or historical context that opens the book
- The "aha moment" or discovery that led to this work

### 3. STRUCTURAL ANALYSIS

**Framework Type:**
- Principle-based (e.g., "7 Habits", "4 Agreements")
- Process/Stage-based (e.g., "5 Stages of Grief")
- Model-based (e.g., introduces a conceptual model)
- Argument-based (builds a case chapter by chapter)
- Story-driven (narrative carries the concepts)
- Mixed/Hybrid

### 4. CORE CONCEPTS WITH VISUAL RECOMMENDATIONS

For each major concept, identify:
- The concept name
- Which chapter it comes from
- Brief description
- The BEST visual type from our 30+ options to represent this concept
- Why that visual type is appropriate
- Example domains where this concept applies

### 5. CROSS-REFERENCE OPPORTUNITIES

Identify connections to psychological frameworks, philosophical traditions, neuroscience research, and related popular works.

### 6. TONE ANALYSIS

Analyze the author's voice and recommend the guide tone.

### 7. GENERATION RECOMMENDATIONS

Identify emphasis areas, potential challenges, and unique value opportunities.

## OUTPUT FORMAT

Return your analysis as structured JSON with this exact structure:

{
  "bookMetadata": {
    "title": "",
    "author": "",
    "publicationYear": "",
    "wordCountEstimate": ""
  },
  "classification": {
    "primaryCategory": "",
    "secondaryCategories": [],
    "complexityLevel": "",
    "frameworkType": ""
  },
  "originStory": {
    "present": true/false,
    "location": "",
    "description": "",
    "narrativeTone": ""
  },
  "structure": {
    "totalChapters": 0,
    "chapterTitles": [],
    "logicalGroupings": [],
    "chaptersStandaloneOrSequential": ""
  },
  "coreConcepts": [
    {
      "conceptName": "",
      "chapterSource": "",
      "briefDescription": "",
      "recommendedVisual": "flowDiagram",
      "visualRationale": "Why this visual type is best for this concept",
      "exampleDomains": []
    }
  ],
  "crossReferences": {
    "psychologicalFrameworks": [],
    "philosophicalTraditions": [],
    "neuroscienceResearch": [],
    "relatedPopularWorks": []
  },
  "toneAnalysis": {
    "authorVoice": "",
    "recommendedGuideTone": "",
    "toneNotes": ""
  },
  "generationRecommendations": {
    "emphasisAreas": [],
    "potentialChallenges": [],
    "uniqueValueOpportunities": []
  }
}

## BOOK TEXT

`;

/**
 * Analyze a book to prepare for premium content generation
 */
export async function analyzeBook(
  bookTitle: string,
  bookAuthor: string | null,
  bookText: string
): Promise<BookAnalysis> {
  // Truncate text if too long (keep first 50,000 chars for analysis)
  const truncatedText = bookText.length > 50000 
    ? bookText.substring(0, 50000) + '\n\n[Text truncated for analysis...]'
    : bookText;

  const prompt = STAGE_0_USER_PROMPT + truncatedText + '\n\n---\n\nAnalyze this book and return the structured JSON analysis.';

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      temperature: 0.3,
      system: STAGE_0_SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    // Extract text content
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in response');
    }

    // Parse JSON from response
    let jsonStr = textContent.text;
    
    // Remove markdown code blocks if present
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const analysis = JSON.parse(jsonStr) as BookAnalysis;

    // Fill in metadata if not detected
    if (!analysis.bookMetadata.title) {
      analysis.bookMetadata.title = bookTitle;
    }
    if (!analysis.bookMetadata.author && bookAuthor) {
      analysis.bookMetadata.author = bookAuthor;
    }

    // Validate visual types
    for (const concept of analysis.coreConcepts) {
      if (!VISUAL_TYPES.includes(concept.recommendedVisual as VisualType)) {
        concept.recommendedVisual = 'flowDiagram'; // Default fallback
      }
    }

    return analysis;
  } catch (error) {
    console.error('Stage 0 analysis error:', error);
    
    // Return a minimal analysis on error
    return {
      bookMetadata: {
        title: bookTitle,
        author: bookAuthor || 'Unknown',
        publicationYear: '',
        wordCountEstimate: String(bookText.split(/\s+/).length)
      },
      classification: {
        primaryCategory: 'Self-Help/Personal Development',
        secondaryCategories: [],
        complexityLevel: 'Accessible',
        frameworkType: 'Mixed/Hybrid'
      },
      originStory: {
        present: false,
        location: '',
        description: '',
        narrativeTone: ''
      },
      structure: {
        totalChapters: 0,
        chapterTitles: [],
        logicalGroupings: [],
        chaptersStandaloneOrSequential: 'standalone'
      },
      coreConcepts: [
        {
          conceptName: 'Core Thesis',
          chapterSource: 'Introduction',
          briefDescription: 'The main argument of the book',
          recommendedVisual: 'mindMap',
          visualRationale: 'Central concept with radiating ideas',
          exampleDomains: ['Personal', 'Professional']
        }
      ],
      crossReferences: {
        psychologicalFrameworks: [],
        philosophicalTraditions: [],
        neuroscienceResearch: [],
        relatedPopularWorks: []
      },
      toneAnalysis: {
        authorVoice: 'Conversational/Accessible',
        recommendedGuideTone: 'Accessible Professional',
        toneNotes: ''
      },
      generationRecommendations: {
        emphasisAreas: ['Key concepts', 'Practical applications'],
        potentialChallenges: [],
        uniqueValueOpportunities: []
      }
    };
  }
}
