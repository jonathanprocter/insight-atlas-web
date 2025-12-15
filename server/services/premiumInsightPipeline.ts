/**
 * Premium Insight Pipeline
 * 
 * Orchestrates the complete multi-stage pipeline:
 * Stage 0: Book Analysis & Classification
 * Stage 1: Premium Content Generation
 * 
 * Produces comprehensive 9,000-12,000 word guides with all premium components.
 */

import { analyzeBook, BookAnalysis } from './stage0BookAnalysis';
import { generatePremiumContent, PremiumGuide, PremiumSection } from './stage1ContentGeneration';
import { invokeLLM } from '../_core/llm';

export interface InsightSection {
  id: string;
  type: string;
  title: string;
  content: string;
  visualType?: string;
  visualData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface GeneratedInsight {
  title: string;
  summary: string;
  keyThemes: string[];
  sections: InsightSection[];
  tableOfContents: Array<{ id: string; title: string; type: string }>;
  audioScript: string;
  wordCount: number;
  bookAnalysis: BookAnalysis;
}

/**
 * Generate a premium insight guide using the multi-stage pipeline
 */
export async function generatePremiumInsight(
  bookTitle: string,
  bookAuthor: string | null,
  bookText: string
): Promise<GeneratedInsight> {
  console.log('[Premium Pipeline] Starting Stage 0: Book Analysis...');
  
  // Stage 0: Analyze the book
  const analysis = await analyzeBook(bookTitle, bookAuthor, bookText);
  console.log('[Premium Pipeline] Stage 0 complete. Found', analysis.coreConcepts.length, 'core concepts');

  console.log('[Premium Pipeline] Starting Stage 1: Premium Content Generation...');
  
  // Stage 1: Generate premium content
  const guide = await generatePremiumContent(analysis, bookText);
  console.log('[Premium Pipeline] Stage 1 complete. Generated', guide.sections.length, 'sections,', guide.wordCount, 'words');

  // Extract key themes from analysis
  const keyThemes = analysis.coreConcepts.slice(0, 5).map(c => c.conceptName);

  // Generate summary from Quick Glance section
  const quickGlance = guide.sections.find(s => s.type === 'quickGlance');
  const summary = quickGlance?.content || `A comprehensive analysis of "${bookTitle}" by ${bookAuthor || 'Unknown Author'}`;

  // Generate audio script from the content
  console.log('[Premium Pipeline] Generating audio script...');
  const audioScript = await generateAudioScript(guide, analysis);

  return {
    title: guide.title,
    summary: summary.substring(0, 1000), // First 1000 chars for summary
    keyThemes,
    sections: guide.sections.map(s => ({
      id: s.id,
      type: s.type,
      title: s.title,
      content: s.content,
      visualType: s.visualType,
      visualData: s.visualData,
      metadata: s.metadata
    })),
    tableOfContents: guide.tableOfContents,
    audioScript,
    wordCount: guide.wordCount,
    bookAnalysis: analysis
  };
}

/**
 * Generate an engaging audio script from the premium guide
 */
async function generateAudioScript(
  guide: PremiumGuide,
  analysis: BookAnalysis
): Promise<string> {
  // Build content summary for audio
  const contentParts: string[] = [];
  
  for (const section of guide.sections) {
    if (section.type === 'quickGlance') {
      contentParts.push(`Quick Summary: ${section.content.substring(0, 500)}`);
    } else if (section.type === 'foundationalNarrative') {
      contentParts.push(`Origin Story: ${section.content.substring(0, 500)}`);
    } else if (section.type === 'conceptExplanation') {
      contentParts.push(`Key Concept - ${section.title}: ${section.content.substring(0, 300)}`);
    } else if (section.type === 'actionBox' && section.metadata?.actionSteps) {
      const steps = section.metadata.actionSteps as string[];
      contentParts.push(`Action Steps for ${section.title}: ${steps.slice(0, 3).join('. ')}`);
    }
  }

  const contentSummary = contentParts.join('\n\n');

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `You are a skilled narrator creating an engaging audio summary of a book insight guide. 
Your narration should:
- Sound natural and conversational when read aloud
- Convey the actual insights and wisdom, not describe visual elements
- Use varied pacing and emphasis
- Include brief pauses (indicated by "...")
- Be 3-5 minutes when read at normal pace (approximately 500-750 words)
- Start with an engaging hook
- End with a powerful takeaway

Do NOT describe charts, diagrams, or visual elements. Instead, convey the information those visuals represent in an engaging narrative form.`
        },
        {
          role: 'user',
          content: `Create an engaging audio narration for this insight guide:

Book: "${guide.bookTitle}" by ${guide.bookAuthor}
Guide Title: ${guide.title}

Key Themes: ${analysis.coreConcepts.map(c => c.conceptName).join(', ')}

Content Summary:
${contentSummary}

Cross-References:
- Psychology: ${analysis.crossReferences.psychologicalFrameworks.join(', ')}
- Philosophy: ${analysis.crossReferences.philosophicalTraditions.join(', ')}

Generate a compelling audio narration that brings these insights to life.`
        }
      ]
    });

    const content = response.choices[0]?.message?.content;
    if (typeof content === 'string') {
      return content;
    }
    return `Welcome to your Insight Atlas guide for "${guide.bookTitle}" by ${guide.bookAuthor}. This comprehensive analysis reveals the key insights and practical wisdom from this transformative work.`;
  } catch (error) {
    console.error('Audio script generation error:', error);
    return `Welcome to your Insight Atlas guide for "${guide.bookTitle}" by ${guide.bookAuthor}. This comprehensive analysis reveals the key insights and practical wisdom from this transformative work.`;
  }
}

/**
 * Convert premium sections to the legacy format for backward compatibility
 */
export function convertToLegacyFormat(insight: GeneratedInsight): {
  title: string;
  summary: string;
  keyThemes: string[];
  sections: Array<{
    title: string;
    visualType: string;
    content: string;
    listItems?: string[];
    chartData?: Record<string, unknown>;
  }>;
  audioScript: string;
} {
  const legacySections = insight.sections.map(section => ({
    title: section.title,
    visualType: section.visualType || 'text',
    content: section.content,
    listItems: section.metadata?.actionSteps as string[] | undefined,
    chartData: section.visualData
  }));

  return {
    title: insight.title,
    summary: insight.summary,
    keyThemes: insight.keyThemes,
    sections: legacySections,
    audioScript: insight.audioScript
  };
}
