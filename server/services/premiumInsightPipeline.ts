/**
 * Premium Insight Pipeline
 * 
 * Orchestrates the complete multi-stage pipeline:
 * Stage 0: Book Analysis & Classification
 * Stage 1: Premium Content Generation
 * Gap Analysis: Check all 9 dimensions and fill missing content
 * Stage 2: Final formatting and audio script generation
 * 
 * Produces comprehensive 9,000-12,000 word guides with all premium components.
 */

import { analyzeBook, BookAnalysis } from './stage0BookAnalysis';
import { generatePremiumContent, PremiumGuide, PremiumSection } from './stage1ContentGeneration';
import { generatePremiumContentChunked } from './stage1ChunkedGeneration';
import { runGapAnalysis, mergeGapFilledContent } from './gapAnalysisService';
import { invokeLLM } from '../_core/llm';
import { generateAudioNarration, isElevenLabsConfigured, AudioGenerationResult } from './elevenLabsService';
import { debugLog, logGeneration, logLLM, logError, timedOperation } from './debugLogger';
import { broadcastProgress, notifyComplete, notifyFailed } from '../_core/websocket';

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
  audioUrl?: string;
  audioDuration?: number;
  wordCount: number;
  bookAnalysis: BookAnalysis;
  gapAnalysisApplied: boolean;
  completenessScore: number;
}

/**
 * Generate a premium insight guide using the multi-stage pipeline
 */
export async function generatePremiumInsight(
  bookTitle: string,
  bookAuthor: string | null,
  bookText: string,
  insightId?: number,
  updateProgress?: (stage: string, progress: number) => Promise<void>
): Promise<GeneratedInsight> {
  logGeneration('=== PREMIUM PIPELINE START ===', { bookTitle, bookAuthor, textLength: bookText.length });

  // Helper to broadcast via WebSocket and callback
  const broadcastUpdate = async (percent: number, step: string, sectionCount?: number, wordCount?: number) => {
    if (insightId) {
      await broadcastProgress({
        insightId,
        status: 'generating',
        percent,
        currentStep: step,
        sectionCount,
        wordCount,
      });
    }
    // Map to callback format
    const stage = percent < 30 ? 'analyzing' : percent < 90 ? 'generating' : 'finalizing';
    await updateProgress?.(stage, percent);
  };

  try {
  logGeneration('Starting Stage 0: Book Analysis...');

  // Update progress: Starting analysis (5%)
  await broadcastUpdate(5, 'Analyzing book structure and themes');
  
  // Stage 0: Analyze the book
  const analysis = await timedOperation('generation', 'Stage 0: Book Analysis', async () => {
    return analyzeBook(bookTitle, bookAuthor || 'Unknown Author', bookText);
  }, { bookTitle });
  
  logGeneration('Stage 0 complete', { 
    coreConcepts: analysis.coreConcepts.length,
    themes: analysis.coreConcepts.map(c => c.conceptName)
  });
  
  // Update progress: Analysis complete (25%)
  await broadcastUpdate(25, 'Book analysis complete', 0, 0);

  logGeneration('Starting Stage 1: Premium Content Generation (Chunked)...');
  await broadcastUpdate(30, 'Generating premium content');

  // Stage 1: Generate premium content in chunks to meet 9-12k word requirement
  const guide = await timedOperation('generation', 'Stage 1: Premium Content (Chunked)', async () => {
    return generatePremiumContentChunked(analysis, bookText);
  }, { bookTitle });
  
  logGeneration('Stage 1 complete', { 
    sections: guide.sections.length, 
    wordCount: guide.wordCount,
    sectionTypes: guide.sections.map(s => s.type)
  });
  
  // Update progress: Content generation complete (65%)
  await broadcastUpdate(65, 'Premium content generated', guide.sections.length, guide.wordCount);

  // Gap Analysis: Check all 9 dimensions and fill missing content
  logGeneration('Starting Gap Analysis & Content Completion...');
  await broadcastUpdate(70, 'Running gap analysis');
  let finalSections = guide.sections;
  let gapAnalysisApplied = false;
  let completenessScore = 100;

  try {
    // Convert sections to a readable format for gap analysis
    const guideContent = guide.sections.map(s => {
      let sectionText = `## ${s.title}\n\n${s.content}`;
      if (s.metadata?.actionSteps) {
        sectionText += `\n\nAction Steps:\n${(s.metadata.actionSteps as string[]).join('\n')}`;
      }
      return sectionText;
    }).join('\n\n---\n\n');

    // Run gap analysis
    const gapResult = await runGapAnalysis(
      guideContent,
      bookTitle,
      bookAuthor || 'Unknown',
      bookText.slice(0, 20000) // First 20k chars as excerpts
    );

    logGeneration('Gap Analysis complete', { 
      gapsFound: gapResult.gapsFound.length, 
      gaps: gapResult.gapsFound,
      completenessScore: gapResult.completenessScore,
      generatedContent: gapResult.generatedContent.length
    });

    if (gapResult.generatedContent.length > 0) {
      // Convert gap-filled content to PremiumSection format
      const gapFilledSections = gapResult.generatedContent.map((gc, idx) => ({
        id: `gap-${idx + 1}`,
        type: gc.type as PremiumSection['type'],
        title: gc.title,
        content: gc.content,
        visualType: gc.visualType,
        visualData: gc.visualData,
        metadata: gc.metadata
      })) as PremiumSection[];

      // Merge gap-filled content with original sections
      const mergedSections = mergeGapFilledContent(
        guide.sections.map(s => ({
          type: s.type,
          title: s.title,
          content: s.content,
          visualType: s.visualType,
          visualData: s.visualData,
          metadata: s.metadata
        })),
        gapFilledSections.map(s => ({
          type: s.type,
          title: s.title,
          content: s.content,
          visualType: s.visualType,
          visualData: s.visualData,
          metadata: s.metadata
        }))
      );

      // Convert back to InsightSection format with IDs
      finalSections = mergedSections.map((s, idx) => ({
        id: `section-${idx + 1}`,
        type: s.type as PremiumSection['type'],
        title: s.title,
        content: s.content,
        visualType: s.visualType,
        visualData: s.visualData,
        metadata: s.metadata
      })) as PremiumSection[];

      gapAnalysisApplied = true;
      completenessScore = gapResult.completenessScore;
      logGeneration('Gap Analysis applied', { totalSections: finalSections.length });
    } else {
      // No gaps found, use original sections
      finalSections = guide.sections;
      completenessScore = gapResult.completenessScore;
      logGeneration('No gaps found - content is complete', { completenessScore });
    }
  } catch (gapError) {
    logError('generation', 'Gap Analysis failed, using Stage 1 output', {
      error: gapError instanceof Error ? gapError.message : String(gapError),
      stack: gapError instanceof Error ? gapError.stack : undefined
    });
    finalSections = guide.sections;
  }

  await broadcastUpdate(80, 'Gap analysis complete', finalSections.length, 0);

  // Calculate updated word count
  const totalWordCount = finalSections.reduce((sum, s) => {
    const sectionWords = s.content.split(/\s+/).length;
    const actionWords = s.metadata?.actionSteps 
      ? (s.metadata.actionSteps as string[]).join(' ').split(/\s+/).length 
      : 0;
    return sum + sectionWords + actionWords;
  }, 0);

  // Extract key themes from analysis
  const keyThemes = analysis.coreConcepts.slice(0, 5).map(c => c.conceptName);

  // Generate summary from Quick Glance section
  const quickGlance = finalSections.find(s => s.type === 'quickGlance');
  const summary = quickGlance?.content || `A comprehensive analysis of "${bookTitle}" by ${bookAuthor || 'Unknown Author'}`;

  // Build table of contents from final sections
  const tableOfContents = finalSections.map(s => ({
    id: s.id,
    title: s.title,
    type: s.type
  }));

  // Generate audio script from the content (using built-in LLM for formatting)
  logGeneration('Generating audio script...');
  await broadcastUpdate(85, 'Generating audio script', finalSections.length, totalWordCount);
  const audioScript = await generateAudioScript(
    { ...guide, sections: finalSections },
    analysis
  );

  // Generate audio narration using ElevenLabs if configured
  let audioUrl: string | undefined;
  let audioDuration: number | undefined;

  if (isElevenLabsConfigured() && audioScript.length > 100) {
    logGeneration('Generating audio narration with ElevenLabs...', { scriptLength: audioScript.length });
    await broadcastUpdate(90, 'Generating audio narration', finalSections.length, totalWordCount);
    try {
      // Use a unique ID for the audio file (based on book title hash)
      const bookId = Buffer.from(bookTitle).toString('base64').slice(0, 12).replace(/[^a-zA-Z0-9]/g, '');
      const audioResult = await generateAudioNarration(audioScript, bookId);
      if (audioResult) {
        audioUrl = audioResult.audioUrl;
        audioDuration = audioResult.durationEstimate;
        logGeneration('Audio generated', { audioUrl, audioDuration });
      }
    } catch (audioError) {
      logError('audio', 'ElevenLabs audio generation failed', { 
        error: audioError instanceof Error ? audioError.message : String(audioError)
      });
    }
  } else {
    logGeneration('Skipping audio generation', { 
      elevenLabsConfigured: isElevenLabsConfigured(), 
      scriptLength: audioScript.length 
    });
  }

  logGeneration('=== PREMIUM PIPELINE COMPLETE ===', { 
    totalSections: finalSections.length, 
    totalWordCount, 
    gapAnalysisApplied,
    completenessScore,
    hasAudio: !!audioUrl
  });
  
  // Update progress: Finalizing (95%)
  await broadcastUpdate(95, 'Finalizing insight guide', finalSections.length, totalWordCount);

  // Update progress: Pipeline complete (100%)
  await updateProgress?.('completed', 100);

  const result = {
    title: guide.title,
    summary: summary.substring(0, 1000), // First 1000 chars for summary
    keyThemes,
    sections: finalSections,
    tableOfContents,
    audioScript,
    audioUrl,
    audioDuration,
    wordCount: totalWordCount,
    bookAnalysis: analysis,
    gapAnalysisApplied,
    completenessScore
  };

  // Notify WebSocket clients of completion
  if (insightId) {
    await notifyComplete(insightId, {
      wordCount: totalWordCount,
      sectionCount: finalSections.length,
      hasAudio: !!audioUrl
    });
  }

  return result;
  } catch (error) {
    // Notify WebSocket clients of failure
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError('generation', 'Premium pipeline failed', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      bookTitle
    });

    if (insightId) {
      await notifyFailed(insightId, errorMessage);
    }

    throw error;
  }
}

/**
 * Generate an engaging audio script from the premium guide
 */
async function generateAudioScript(
  guide: { bookTitle: string; bookAuthor: string; title: string; sections: InsightSection[] },
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
    } else if (section.type === 'practicalExample') {
      contentParts.push(`Example - ${section.title}: ${section.content.substring(0, 200)}`);
    } else if (section.type === 'insightAtlasNote') {
      contentParts.push(`Insight Note - ${section.title}: ${section.content.substring(0, 200)}`);
    }
  }

  const contentSummary = contentParts.slice(0, 10).join('\n\n'); // Limit to first 10 parts

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
