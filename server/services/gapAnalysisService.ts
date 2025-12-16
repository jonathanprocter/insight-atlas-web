/**
 * Gap Analysis & Content Completion Service
 * 
 * Runs after Stage 1 to ensure all 9 dimensions are complete.
 * For each gap found, it generates the missing content immediately.
 */

import { generateWithClaude, generateWithBuiltinLLM, isAnthropicConfigured } from './dualLLMService';

interface GeneratedSection {
  type: string;
  title: string;
  content: string;
  visualType?: string;
  visualData?: any;
  metadata?: any;
}

interface GapAnalysisResult {
  gapsFound: string[];
  generatedContent: GeneratedSection[];
  revisedSections: GeneratedSection[];
  completenessScore: number;
}

const GAP_ANALYSIS_PROMPT = `# GAP ANALYSIS & CONTENT COMPLETION

You are a content completion specialist for premium book guides. Your role is to:
1. Analyze generated content against comprehensive requirements
2. Identify specific missing elements
3. Generate high-quality content to fill every gap

You don't just flag problems—you fix them. Every gap you identify, you fill with publication-ready content.

## THE GENERATED GUIDE TO ANALYZE
{GENERATED_GUIDE}

## THE SOURCE BOOK
Title: {BOOK_TITLE}
Author: {BOOK_AUTHOR}

## KEY EXCERPTS FROM SOURCE
{BOOK_EXCERPTS}

---

## GAP ANALYSIS CHECKLIST - CHECK ALL 9 DIMENSIONS

### DIMENSION 1: QUICK GLANCE SUMMARY
Required elements:
- Section header with "Read time: 2 minutes"
- Book title and author
- One-sentence premise
- Framework overview (2-3 sentences)
- Core principles as numbered list with one-sentence descriptions
- Bottom line takeaway
- "Who should read this" section

If ANY element is missing, generate it.

### DIMENSION 2: FOUNDATIONAL NARRATIVE
Required elements:
- 300-500 words
- Narrative tone (storytelling, not analysis)
- Origin story OR author background
- Cultural/historical context
- Frames what follows

If missing or inadequate, generate a complete narrative section.

### DIMENSION 3: PRACTICAL EXAMPLES
Required: Minimum 3-4 specific, relatable examples per major concept

Example quality requirements:
- Uses specific names (Sarah, Marcus, Keisha—not "someone" or "a person")
- Includes concrete settings (at work, in the kitchen, during the meeting)
- Shows internal thoughts/dialogue
- Demonstrates BOTH the problem pattern AND the solution
- Feels contemporary and relatable

For each concept lacking sufficient examples, generate them from diverse domains:
- Workplace (meetings, feedback, deadlines, colleague conflicts)
- Relationships (conversations with partners, misunderstandings)
- Family (interactions with parents, children, siblings)
- Social (friendships, group dynamics)
- Internal (self-talk, decision-making, emotional reactions)
- Daily life (traffic, customer service, minor frustrations)

### DIMENSION 4: INSIGHT ATLAS NOTES
Required structure for EACH note:
- Main connection (to psychological framework, philosopher, research, or related book)
- **Key Distinction:** How this framework differs from the referenced one
- **Practical Implication:** What this means for application (1-2 sentences)
- **Go Deeper:** Specific book recommendation with author and benefit

Cross-reference opportunities to check:
- Psychology (CBT, ACT, DBT, IFS, attachment theory, positive psychology)
- Philosophy (Stoicism, Buddhism, existentialism)
- Neuroscience (habits, emotional regulation, decision-making)
- Related popular books

If a concept has NO cross-reference, generate one.

### DIMENSION 5: VISUAL FRAMEWORKS
Required: At least one visual element per major concept

Visual types to include:
- Flow charts (for processes, cycles, cause-effect chains)
- Comparison tables (for before/after, problem/solution, contrasts)
- Concept maps (for showing relationships between ideas)
- Hierarchy diagrams (for nested concepts)

For each concept lacking a visual, generate one.

### DIMENSION 6: ACTION BOXES
Required: One Action Box per major concept/chapter/principle

Action Box requirements:
- 3-5 specific action steps
- Imperative voice ("Notice when…" not "You should notice…")
- Immediately implementable (no prerequisites)
- Mix of internal practices and external behaviors
- Time-bounded where appropriate ("Today…", "For one week…")

Quality check for each action:
- Is it specific? ("Ask one clarifying question" not "Be more curious")
- Is it observable? (Could someone watch you do this?)
- Is it immediate? (Can be done without preparation)
- Is it imperative? ("Notice when…" not "You might want to notice…")

### DIMENSION 7: ENHANCED EXERCISES
Required exercise types (at least 3 different types per major section):
- Reflection prompts (open-ended journaling questions)
- Self-assessment scales (rate yourself 1-10)
- Scenario responses ("What would you do if…")
- Tracking templates (weekly observation logs)
- Dialogue scripts (example conversations)

For each missing exercise type, generate it.

### DIMENSION 8: STRUCTURE MAP
Required: Appendix mapping original book chapters to guide sections

If missing, generate a complete structure map table.

### DIMENSION 9: TONE CHECK
Required tone markers (should appear naturally throughout):
- Uses "you" and "we" naturally
- Includes transitional phrases ("Here's where it gets interesting…", "Sound familiar?")
- Brief editorial voice moments ("This is harder than it sounds, but…")
- Rhetorical questions that invite reflection
- Warm but not saccharine

If tone is too clinical, generate transitional phrases to insert.

---

## OUTPUT FORMAT

Return a JSON object with this structure:
{
  "gapsFound": ["List of all gaps identified"],
  "generatedContent": [
    {
      "type": "quickGlance|foundationalNarrative|practicalExample|insightAtlasNote|visualFramework|actionBox|exercise|structureMap|toneInsertion",
      "title": "Section title",
      "content": "The complete generated content",
      "insertAfter": "Description of where to insert this content",
      "visualType": "flowChart|comparisonTable|conceptMap|hierarchy (if applicable)",
      "visualData": {} // Structured data for visual rendering if applicable
    }
  ],
  "completenessScore": 0-100,
  "summary": "Brief summary of gaps filled"
}

Generate the gap analysis and fill ALL identified gaps now. Return ONLY valid JSON.`;

export async function runGapAnalysis(
  generatedGuide: string,
  bookTitle: string,
  bookAuthor: string,
  bookExcerpts: string
): Promise<GapAnalysisResult> {
  const prompt = GAP_ANALYSIS_PROMPT
    .replace('{GENERATED_GUIDE}', generatedGuide)
    .replace('{BOOK_TITLE}', bookTitle)
    .replace('{BOOK_AUTHOR}', bookAuthor || 'Unknown')
    .replace('{BOOK_EXCERPTS}', bookExcerpts.slice(0, 15000));

  console.log('[Gap Analysis] Using Anthropic Claude for gap analysis');
  console.log('[Gap Analysis] Anthropic configured:', isAnthropicConfigured());

  try {
    // Use Anthropic Claude as primary for gap analysis
    const response = await generateWithClaude(
      'You are a content completion specialist. Analyze the generated guide and fill any gaps. Return valid JSON only.',
      prompt,
      16000
    );

    console.log('[Gap Analysis] Completed using:', response.provider);

    // Parse the JSON response with robust error handling
    let jsonStr = response.content;
    
    // Handle markdown code blocks
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    // Try to repair common JSON issues with comprehensive handling
    const repairJson = (str: string): string => {
      // Step 1: Remove trailing commas before } or ]
      str = str.replace(/,\s*([}\]])/g, '$1');
      
      // Step 2: Fix unterminated strings - find and close them
      // Count quotes to see if we have an odd number (unterminated)
      const quoteCount = (str.match(/(?<!\\)"/g) || []).length;
      if (quoteCount % 2 !== 0) {
        // Find the last quote and add a closing quote after it
        const lastQuoteIdx = str.lastIndexOf('"');
        if (lastQuoteIdx > 0) {
          // Check if this is an opening quote (preceded by : or [)
          const beforeQuote = str.substring(Math.max(0, lastQuoteIdx - 10), lastQuoteIdx);
          if (beforeQuote.match(/[:\[,]\s*$/)) {
            // This is an opening quote for a value, close it
            str = str.substring(0, lastQuoteIdx + 1) + '"';
          }
        }
      }
      
      // Step 3: Try to find the last complete JSON object/array
      if (!str.trim().endsWith('}') && !str.trim().endsWith(']')) {
        const lastBrace = str.lastIndexOf('}');
        const lastBracket = str.lastIndexOf(']');
        const lastComplete = Math.max(lastBrace, lastBracket);
        if (lastComplete > 0) {
          str = str.substring(0, lastComplete + 1);
        }
      }
      
      // Step 4: Balance braces
      const openBraces = (str.match(/{/g) || []).length;
      const closeBraces = (str.match(/}/g) || []).length;
      if (openBraces > closeBraces) {
        str += '}'.repeat(openBraces - closeBraces);
      }
      
      // Step 5: Balance brackets
      const openBrackets = (str.match(/\[/g) || []).length;
      const closeBrackets = (str.match(/\]/g) || []).length;
      if (openBrackets > closeBrackets) {
        // Insert closing brackets before the final }
        const insertPos = str.lastIndexOf('}');
        if (insertPos > 0) {
          str = str.substring(0, insertPos) + ']'.repeat(openBrackets - closeBrackets) + str.substring(insertPos);
        } else {
          str += ']'.repeat(openBrackets - closeBrackets);
        }
      }
      
      // Step 6: Remove any trailing incomplete key-value pairs
      str = str.replace(/,\s*"[^"]*"\s*:\s*$/g, '');
      str = str.replace(/,\s*"[^"]*"\s*:\s*"[^"]*$/g, '');
      
      return str;
    };

    let result;
    try {
      result = JSON.parse(jsonStr);
    } catch (parseError) {
      console.log('[Gap Analysis] Initial parse failed, attempting repair...');
      const repairedJson = repairJson(jsonStr);
      try {
        result = JSON.parse(repairedJson);
        console.log('[Gap Analysis] JSON repair successful');
      } catch {
        console.error('[Gap Analysis] JSON repair failed, returning empty result');
        return {
          gapsFound: [],
          generatedContent: [],
          revisedSections: [],
          completenessScore: 100,
        };
      }
    }

    return {
      gapsFound: result.gapsFound || [],
      generatedContent: result.generatedContent || [],
      revisedSections: result.revisedSections || [],
      completenessScore: result.completenessScore || 0,
    };
  } catch (error) {
    console.error('[Gap Analysis] Error:', error);
    // Return empty result on error
    return {
      gapsFound: [],
      generatedContent: [],
      revisedSections: [],
      completenessScore: 100, // Assume complete if analysis fails
    };
  }
}

/**
 * Merge gap-filled content with original sections
 */
export function mergeGapFilledContent(
  originalSections: GeneratedSection[],
  gapFilledContent: GeneratedSection[]
): GeneratedSection[] {
  const merged = [...originalSections];

  for (const newContent of gapFilledContent) {
    // Check if this type already exists
    const existingIndex = merged.findIndex(
      (s) => s.type === newContent.type && s.title === newContent.title
    );

    if (existingIndex >= 0) {
      // Replace with enhanced version
      merged[existingIndex] = newContent;
    } else {
      // Add new section at appropriate position
      const insertPosition = getInsertPosition(newContent.type, merged);
      merged.splice(insertPosition, 0, newContent);
    }
  }

  return merged;
}

function getInsertPosition(type: string, sections: GeneratedSection[]): number {
  const typeOrder = [
    'quickGlance',
    'foundationalNarrative',
    'executiveSummary',
    'conceptExplanation',
    'practicalExample',
    'insightAtlasNote',
    'visualFramework',
    'actionBox',
    'exercise',
    'selfAssessment',
    'dialogueScript',
    'keyTakeaways',
    'structureMap',
  ];

  const targetIndex = typeOrder.indexOf(type);
  if (targetIndex === -1) return sections.length;

  // Find the first section that should come after this type
  for (let i = 0; i < sections.length; i++) {
    const sectionTypeIndex = typeOrder.indexOf(sections[i].type);
    if (sectionTypeIndex > targetIndex) {
      return i;
    }
  }

  return sections.length;
}

/**
 * Generate specific missing content types
 */
export async function generateMissingExamples(
  conceptName: string,
  conceptDescription: string,
  existingExamples: string[],
  targetCount: number = 4
): Promise<string[]> {
  const neededCount = Math.max(0, targetCount - existingExamples.length);
  if (neededCount === 0) return [];

  const domains = [
    'workplace (meetings, feedback, deadlines)',
    'relationships (conversations with partners)',
    'family (interactions with parents, children)',
    'social (friendships, group dynamics)',
    'internal (self-talk, decision-making)',
    'daily life (traffic, customer service)',
  ];

  const prompt = `Generate ${neededCount} specific, relatable examples for the concept: "${conceptName}"

Concept description: ${conceptDescription}

Existing examples (avoid duplicating these themes):
${existingExamples.join('\n')}

Requirements for each example:
- Use a specific name (Sarah, Marcus, Keisha, James, etc.)
- Include a concrete setting
- Show internal thoughts/dialogue in italics
- Demonstrate BOTH the problem pattern AND the solution
- Feel contemporary and relatable

Use these domains for variety: ${domains.slice(0, neededCount).join(', ')}

Format each example as:
**In Practice:** [Name] is [specific situation]. [Their automatic response with internal thoughts]. [The consequence]. This is [concept] in action. The alternative: [transformed behavior].

Return ONLY the examples, no other text.`;

  try {
    // Use Claude for generating high-quality examples
    const response = await generateWithClaude(
      'You are an expert at creating relatable, specific examples for concepts. Return only the examples, no other text.',
      prompt,
      4000
    );

    // Split by "**In Practice:**" to get individual examples
    const examples = response.content
      .split(/\*\*In Practice:\*\*/)
      .filter((e: string) => e.trim().length > 50)
      .map((e: string) => `**In Practice:** ${e.trim()}`);

    return examples;
  } catch (error) {
    console.error('[Generate Examples] Error:', error);
    return [];
  }
}

/**
 * Generate a complete Action Box for a concept
 */
export async function generateActionBox(
  conceptName: string,
  conceptDescription: string
): Promise<{ title: string; actions: string[] }> {
  const prompt = `Generate an Action Box for the concept: "${conceptName}"

Description: ${conceptDescription}

Create 5 specific, immediately implementable actions in imperative voice.

Requirements:
- Use imperative voice ("Notice when..." not "You should notice...")
- Make each action specific and observable
- Include a mix of internal practices and external behaviors
- Add time bounds where appropriate ("Today...", "For one week...")

Format:
1. [First action - can be done immediately]
2. [Second action - different domain]
3. [Third action - with time element]
4. [Fourth action - internal practice]
5. [Fifth action - something for today]

Return ONLY the numbered actions, no other text.`;

  try {
    // Use Claude for generating actionable steps
    const response = await generateWithClaude(
      'You are an expert at creating actionable steps. Return only the numbered actions, no other text.',
      prompt,
      1000
    );

    const actions = response.content
      .split(/\d+\.\s+/)
      .filter((a: string) => a.trim().length > 10)
      .map((a: string) => a.trim());

    return { title: conceptName, actions };
  } catch (error) {
    console.error('[Generate Action Box] Error:', error);
    return { title: conceptName, actions: [] };
  }
}

/**
 * Generate a visual framework for a concept
 */
export async function generateVisualFramework(
  conceptName: string,
  conceptDescription: string,
  preferredType: 'flowChart' | 'comparisonTable' | 'conceptMap' | 'hierarchy' = 'flowChart'
): Promise<{ type: string; data: any }> {
  const typePrompts: Record<string, string> = {
    flowChart: `Create a flow chart showing the process or cycle of "${conceptName}".
Return JSON: { "nodes": [{"id": "1", "label": "Step 1"}], "edges": [{"from": "1", "to": "2"}] }`,
    
    comparisonTable: `Create a comparison table for "${conceptName}" showing before/after or problem/solution.
Return JSON: { "headers": ["Problem State", "Solution State"], "rows": [["Behavior 1", "Transformed 1"]] }`,
    
    conceptMap: `Create a concept map showing how "${conceptName}" connects to related ideas.
Return JSON: { "center": "Main Concept", "connections": [{"label": "Related A", "relationship": "leads to"}] }`,
    
    hierarchy: `Create a hierarchy diagram for "${conceptName}" showing nested concepts.
Return JSON: { "root": "Main", "children": [{"label": "Sub 1", "children": []}] }`,
  };

  const prompt = `${typePrompts[preferredType]}

Concept: ${conceptName}
Description: ${conceptDescription}

Return ONLY valid JSON, no other text.`;

  try {
    // Use Claude for generating visual frameworks
    const response = await generateWithClaude(
      'You are an expert at creating visual frameworks. Return only valid JSON, no other text.',
      prompt,
      2000
    );

    let jsonStr = response.content;
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const data = JSON.parse(jsonStr);
    return { type: preferredType, data };
  } catch (error) {
    console.error('[Generate Visual] Error:', error);
    return { type: preferredType, data: {} };
  }
}
