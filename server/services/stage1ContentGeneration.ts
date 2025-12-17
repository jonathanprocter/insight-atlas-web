/**
 * Stage 1: Premium Content Generation
 * 
 * Generates comprehensive 9,000-12,000 word guides using Claude
 * with all premium components: Quick Glance, Foundational Narrative,
 * Executive Summary, Insight Atlas Notes, Action Boxes, Visual Frameworks, etc.
 */

import { BookAnalysis, VisualType } from './stage0BookAnalysis';
import { generateWithClaude, isAnthropicConfigured } from './dualLLMService';

export interface PremiumSection {
  id: string;
  type: 'quickGlance' | 'foundationalNarrative' | 'executiveSummary' | 'conceptExplanation' | 
        'practicalExample' | 'insightAtlasNote' | 'visualFramework' | 'actionBox' | 
        'selfAssessment' | 'trackingTemplate' | 'dialogueScript' | 'reflectionPrompts' |
        'scenarioResponse' | 'structureMap' | 'keyTakeaways' | 'chapterBreakdown';
  title: string;
  content: string;
  visualType?: VisualType;
  visualData?: Record<string, unknown>;
  metadata?: {
    conceptName?: string;
    chapterSource?: string;
    crossReferences?: string[];
    actionSteps?: string[];
    keyDistinction?: string;
    practicalImplication?: string;
    goDeeper?: { title: string; author: string; benefit: string };
  };
}

export interface PremiumGuide {
  title: string;
  bookTitle: string;
  bookAuthor: string;
  generatedAt: string;
  wordCount: number;
  sections: PremiumSection[];
  tableOfContents: Array<{ id: string; title: string; type: string }>;
}

const STAGE_1_SYSTEM_PROMPT = `You are an Insight Atlas master synthesizer—an advanced interpretive AI that transforms books into premium, intellectually rigorous guides that readers describe as "better than the book itself." You combine the analytical precision of an academic with the accessibility of a skilled educator and the practical wisdom of an experienced coach.

Your guides don't just summarize—they illuminate, connect, and equip readers for immediate application.

You have access to 30+ visual types. For each concept, you MUST specify which visual type best represents it:
- timeline: For chronological events, historical progressions
- flowDiagram: For processes, cycles, cause-effect chains
- comparisonMatrix: For before/after, problem/solution contrasts
- pieChart: For proportional breakdowns
- barChart: For comparing quantities
- infographic: For multi-element overviews
- mindMap: For central concept with radiating ideas
- hierarchy: For nested concepts, taxonomies
- networkGraph: For interconnected relationships
- vennDiagram: For overlapping concepts
- radarChart: For multi-dimensional assessments
- gaugeChart: For single metric progress
- funnelChart: For stages with decreasing quantities
- waterfallChart: For cumulative effects
- wordCloud: For key themes
- treemap: For hierarchical proportions
- sankey: For flow of resources or information
- forceDirectedGraph: For complex relationship networks

OUTPUT FORMAT: You MUST output valid JSON with this exact structure:

{
  "title": "Compelling guide title",
  "sections": [
    {
      "id": "quick-glance",
      "type": "quickGlance",
      "title": "Quick Glance Summary",
      "content": "Full markdown content here (500-600 words)..."
    },
    {
      "id": "foundational-narrative",
      "type": "foundationalNarrative", 
      "title": "The Story Behind the Ideas",
      "content": "Narrative content (300-500 words)..."
    },
    {
      "id": "executive-summary",
      "type": "executiveSummary",
      "title": "Executive Summary",
      "content": "Full executive summary (800-1200 words)..."
    },
    {
      "id": "concept-1",
      "type": "conceptExplanation",
      "title": "Concept Name",
      "content": "Detailed explanation...",
      "visualType": "flowDiagram",
      "visualData": {
        "nodes": ["Step 1", "Step 2", "Step 3"],
        "connections": [{"from": 0, "to": 1}, {"from": 1, "to": 2}]
      },
      "metadata": {
        "conceptName": "Concept Name",
        "chapterSource": "Chapter 1"
      }
    },
    {
      "id": "example-1-1",
      "type": "practicalExample",
      "title": "In Practice: [Scenario Name]",
      "content": "**In Practice:** Sarah notices her colleague Mark hasn't responded to her email for two days. She immediately assumes he's ignoring her on purpose, that he doesn't respect her work..."
    },
    {
      "id": "insight-note-1",
      "type": "insightAtlasNote",
      "title": "Insight Atlas Note",
      "content": "Connection to CBT and cognitive distortions...",
      "metadata": {
        "keyDistinction": "How this differs from pure CBT...",
        "practicalImplication": "What this means for application...",
        "goDeeper": {
          "title": "Feeling Good",
          "author": "David Burns",
          "benefit": "Deep dive into cognitive restructuring"
        }
      }
    },
    {
      "id": "action-box-1",
      "type": "actionBox",
      "title": "Apply It: [Concept Name]",
      "content": "",
      "metadata": {
        "actionSteps": [
          "Notice when you make assumptions about others' intentions today",
          "Pause and ask: What are three other possible explanations?",
          "Write down your automatic thought and two alternatives",
          "Ask one clarifying question before reacting",
          "Track your assumption patterns for one week"
        ]
      }
    },
    {
      "id": "self-assessment-1",
      "type": "selfAssessment",
      "title": "Self-Assessment: [Concept Name]",
      "content": "Rate yourself 1-10 on each dimension...",
      "visualType": "radarChart",
      "visualData": {
        "dimensions": ["Awareness", "Response Time", "Alternative Thinking"],
        "labels": ["1 (Rarely)", "5 (Sometimes)", "10 (Always)"]
      }
    },
    {
      "id": "structure-map",
      "type": "structureMap",
      "title": "Structure Map: Original Book → Insight Atlas Guide",
      "content": "Mapping table...",
      "visualType": "comparisonMatrix"
    }
  ]
}`;

function buildStage1Prompt(analysis: BookAnalysis, bookText: string): string {
  // Truncate text for generation (keep first 80,000 chars)
  const truncatedText = bookText.length > 80000 
    ? bookText.substring(0, 80000) + '\n\n[Text truncated...]'
    : bookText;

  return `# INSIGHT ATLAS PREMIUM GUIDE GENERATOR

You are creating a premium Insight Atlas guide for: **${analysis.bookMetadata.title}** by **${analysis.bookMetadata.author}**

## BOOK ANALYSIS (from Stage 0)

${JSON.stringify(analysis, null, 2)}

## YOUR MISSION

Transform this book into a structured, insight-rich guide that:
1. Reveals the architecture of the author's thinking
2. Connects ideas to established frameworks across disciplines
3. Provides immediate, practical application tools
4. Uses appropriate visual types to convey each concept
5. Maintains intellectual depth while maximizing accessibility

## REQUIRED SECTIONS (Generate ALL of these)

### 1. QUICK GLANCE SUMMARY (500-600 words)
- One-Sentence Premise
- The Framework (2-3 sentences)
- Core Principles (3-7 with one sentence each)
- The Bottom Line
- Who Should Read This

### 2. FOUNDATIONAL NARRATIVE (300-500 words)
- Origin story or founding myth from the book
- Author's background and journey
- Cultural/historical context
- Write as storytelling, not analysis

### 3. EXECUTIVE SUMMARY (800-1200 words)
- Central thesis in first paragraph
- The problem addressed
- The proposed solution/framework
- Key concepts mapped
- What makes this distinctive
- Why it matters

### 4. FOR EACH MAJOR CONCEPT (from the analysis):
Generate these components:

a) **Concept Explanation** with:
   - Clear explanation
   - Author's original terminology
   - How it fits the larger framework
   - MUST include visualType and visualData for the recommended visual

b) **3-4 Practical Examples** each with:
   - Specific names, settings, dialogue
   - Both problem pattern AND application
   - Mix of workplace, relationships, personal contexts

c) **Insight Atlas Note** with:
   - Connection to other frameworks
   - Key Distinction (how this differs)
   - Practical Implication
   - Go Deeper recommendation

d) **Visual Framework** using the recommended visual type:
   - Flow charts for processes
   - Comparison tables for contrasts
   - Mind maps for interconnected ideas
   - Include actual visualData that can be rendered

e) **Action Box** with 3-5 specific steps:
   - Imperative voice ("Notice when..." not "You should...")
   - Immediately implementable
   - Mix of internal and external practices

f) **At least one exercise type**:
   - Self-Assessment Scale with dimensions
   - Scenario Response
   - Tracking Template
   - Dialogue Script

### 5. STRUCTURE MAP APPENDIX
- Table mapping original chapters to guide sections

## CRITICAL REQUIREMENTS

1. **Total word count: 9,000-12,000 words**
2. **Generate 20-30 sections total**
3. **Every concept MUST have a visualType specified**
4. **Include visualData that can be rendered as actual charts/diagrams**
5. **3-4 specific examples per major concept with names and dialogue**
6. **Action boxes must have exactly 3-5 imperative action steps**
7. **Cross-references must include Key Distinction + Practical Implication + Go Deeper**

## TONE: Accessible Professional
- Use "you" and "we" naturally
- Include rhetorical questions ("Sound familiar?")
- Transitional phrases ("Here's where it gets interesting...")
- Maintain intellectual depth delivered warmly

## BOOK TEXT

${truncatedText}

---

Generate the complete Insight Atlas Premium Guide as valid JSON now.`;
}

/**
 * Generate premium content using Claude
 */
export async function generatePremiumContent(
  analysis: BookAnalysis,
  bookText: string
): Promise<PremiumGuide> {
  const prompt = buildStage1Prompt(analysis, bookText);

  console.log('[Stage 1] Using Anthropic Claude for content generation');
  console.log('[Stage 1] Anthropic configured:', isAnthropicConfigured());

  try {
    // Use Anthropic Claude as primary for premium content generation
    // Enable truncation for very large books to prevent timeout
    // Increased from 16k to 64k tokens to handle large books like "Scarcity Brain" (94k words)
    const response = await generateWithClaude(
      STAGE_1_SYSTEM_PROMPT,
      prompt,
      64000,  // Increased token limit for comprehensive insights
      { truncateInput: true }
    );

    console.log('[Stage 1] Content generated using:', response.provider);
    console.log('[Stage 1] Response length:', response.content.length, 'characters');

    // Parse JSON from response
    let jsonStr = response.content;
    
    // Remove markdown code blocks if present
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
      console.log('[Stage 1] Extracted JSON from markdown code block');
    }

    console.log('[Stage 1] JSON string length:', jsonStr.length, 'characters');
    console.log('[Stage 1] JSON preview (first 200 chars):', jsonStr.substring(0, 200));
    console.log('[Stage 1] JSON preview (last 200 chars):', jsonStr.substring(jsonStr.length - 200));

    let guideData;
    try {
      guideData = JSON.parse(jsonStr);
      console.log('[Stage 1] JSON parsed successfully on first attempt');
    } catch (parseError) {
      console.error('[Stage 1] JSON parse failed, attempting OpenAI validation/repair:', parseError instanceof Error ? parseError.message : String(parseError));
      
      // Use OpenAI to validate and repair the JSON
      try {
        const { validateAndRepairJSON } = await import('./dualLLMService');
        const expectedStructure = `{
  "title": "string",
  "summary": "string",
  "tableOfContents": [{"title": "string", "type": "visual type"}],
  "sections": [{"type": "section type", "title": "string", "content": "string", "visualType": "string", "visualData": {}, "metadata": {}}],
  "keyThemes": ["string"],
  "audioScript": "string",
  "wordCount": number
}`;
        
        console.log('[Stage 1] Sending to OpenAI for validation...');
        const repairedJSON = await validateAndRepairJSON(jsonStr, expectedStructure);
        console.log('[Stage 1] OpenAI repaired JSON, attempting parse...');
        
        guideData = JSON.parse(repairedJSON);
        console.log('[Stage 1] JSON parsed successfully after OpenAI repair');
      } catch (repairError) {
        console.error('[Stage 1] OpenAI repair also failed:', repairError instanceof Error ? repairError.message : String(repairError));
        console.error('[Stage 1] Original JSON:', jsonStr.substring(0, 1000));
        throw new Error(`Failed to parse Stage 1 JSON even after OpenAI repair: ${repairError instanceof Error ? repairError.message : 'Unknown error'}`);
      }
    }

    // Build the premium guide
    const guide: PremiumGuide = {
      title: guideData.title || `Insights on ${analysis.bookMetadata.title}`,
      bookTitle: analysis.bookMetadata.title,
      bookAuthor: analysis.bookMetadata.author,
      generatedAt: new Date().toISOString(),
      wordCount: 0,
      sections: guideData.sections || [],
      tableOfContents: []
    };

    // Calculate word count and build TOC
    let totalWords = 0;
    for (const section of guide.sections) {
      const sectionWords = (section.content || '').split(/\s+/).length;
      totalWords += sectionWords;
      
      guide.tableOfContents.push({
        id: section.id,
        title: section.title,
        type: section.type
      });
    }
    guide.wordCount = totalWords;

    return guide;
  } catch (error) {
    console.error('Stage 1 content generation error:', error);
    throw error;
  }
}
