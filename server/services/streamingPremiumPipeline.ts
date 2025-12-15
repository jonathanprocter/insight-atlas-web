/**
 * Streaming Premium Insight Pipeline
 * 
 * Provides real-time streaming of the multi-stage pipeline:
 * Stage 0: Book Analysis & Classification (with progress updates)
 * Stage 1: Premium Content Generation (streaming sections as they're generated)
 * Gap Analysis: Check all 9 dimensions and fill missing content
 * Stage 2: Final formatting and audio script generation
 * 
 * Uses Anthropic Claude for content generation with streaming support.
 */

import Anthropic from '@anthropic-ai/sdk';
import { BookAnalysis, VisualType, VISUAL_TYPES } from './stage0BookAnalysis';
import { PremiumSection, PremiumGuide } from './stage1ContentGeneration';
import { runGapAnalysis, mergeGapFilledContent } from './gapAnalysisService';
import { invokeLLM } from '../_core/llm';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export interface StreamingProgress {
  type: 'stage' | 'progress' | 'section' | 'complete' | 'error';
  stage?: 'analysis' | 'content' | 'gapAnalysis' | 'audio';
  stageName?: string;
  percent: number;
  message: string;
  section?: PremiumSection;
  data?: any;
}

export interface StreamingInsightResult {
  title: string;
  summary: string;
  keyThemes: string[];
  sections: PremiumSection[];
  tableOfContents: Array<{ id: string; title: string; type: string }>;
  audioScript: string;
  wordCount: number;
  bookAnalysis: BookAnalysis;
  gapAnalysisApplied: boolean;
  completenessScore: number;
}

/**
 * Stream the premium insight generation with real-time progress updates
 */
export async function* streamPremiumInsight(
  bookTitle: string,
  bookAuthor: string | null,
  bookText: string
): AsyncGenerator<StreamingProgress> {
  let analysis: BookAnalysis | null = null;
  let sections: PremiumSection[] = [];
  let audioScript = '';
  let gapAnalysisApplied = false;
  let completenessScore = 100;

  try {
    // ===== STAGE 0: Book Analysis =====
    yield {
      type: 'stage',
      stage: 'analysis',
      stageName: 'Book Analysis',
      percent: 0,
      message: 'Starting Stage 0: Analyzing book structure and content...'
    };

    analysis = await streamStage0Analysis(bookTitle, bookAuthor, bookText, (progress) => {
      // This callback would be used for sub-progress, but we'll keep it simple
    });

    yield {
      type: 'progress',
      stage: 'analysis',
      percent: 20,
      message: `Stage 0 complete. Identified ${analysis.coreConcepts.length} core concepts.`
    };

    // ===== STAGE 1: Premium Content Generation with Streaming =====
    yield {
      type: 'stage',
      stage: 'content',
      stageName: 'Content Generation',
      percent: 20,
      message: 'Starting Stage 1: Generating premium content with Claude...'
    };

    // Stream content generation
    let sectionCount = 0;
    for await (const update of streamStage1Content(analysis, bookText)) {
      if (update.type === 'section' && update.section) {
        sections.push(update.section);
        sectionCount++;
        yield {
          type: 'section',
          stage: 'content',
          percent: 20 + Math.min(sectionCount * 2, 50),
          message: `Generated section ${sectionCount}: ${update.section.title}`,
          section: update.section
        };
      } else if (update.type === 'progress') {
        yield {
          type: 'progress',
          stage: 'content',
          percent: update.percent ?? 50,
          message: update.message ?? 'Generating content...'
        };
      }
    }

    yield {
      type: 'progress',
      stage: 'content',
      percent: 70,
      message: `Stage 1 complete. Generated ${sections.length} sections.`
    };

    // ===== GAP ANALYSIS =====
    yield {
      type: 'stage',
      stage: 'gapAnalysis',
      stageName: 'Gap Analysis',
      percent: 70,
      message: 'Starting Gap Analysis: Checking all 9 dimensions...'
    };

    try {
      const guideContent = sections.map(s => {
        let sectionText = `## ${s.title}\n\n${s.content}`;
        if (s.metadata?.actionSteps) {
          sectionText += `\n\nAction Steps:\n${(s.metadata.actionSteps as string[]).join('\n')}`;
        }
        return sectionText;
      }).join('\n\n---\n\n');

      const gapResult = await runGapAnalysis(
        guideContent,
        bookTitle,
        bookAuthor || 'Unknown',
        bookText.slice(0, 20000)
      );

      yield {
        type: 'progress',
        stage: 'gapAnalysis',
        percent: 80,
        message: `Found ${gapResult.gapsFound.length} gaps. Completeness: ${gapResult.completenessScore}%`
      };

      if (gapResult.generatedContent.length > 0) {
        const gapFilledSections = gapResult.generatedContent.map((gc, idx) => ({
          id: `gap-${idx + 1}`,
          type: gc.type as PremiumSection['type'],
          title: gc.title,
          content: gc.content,
          visualType: gc.visualType as VisualType | undefined,
          visualData: gc.visualData,
          metadata: gc.metadata
        })) as PremiumSection[];

        const mergedSections = mergeGapFilledContent(
          sections.map(s => ({
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

        sections = mergedSections.map((s, idx) => ({
          id: `section-${idx + 1}`,
          type: s.type as PremiumSection['type'],
          title: s.title,
          content: s.content,
          visualType: s.visualType as VisualType | undefined,
          visualData: s.visualData,
          metadata: s.metadata
        })) as PremiumSection[];

        gapAnalysisApplied = true;
        completenessScore = gapResult.completenessScore;

        yield {
          type: 'progress',
          stage: 'gapAnalysis',
          percent: 85,
          message: `Gap Analysis applied. Now have ${sections.length} sections.`
        };
      } else {
        completenessScore = gapResult.completenessScore;
        yield {
          type: 'progress',
          stage: 'gapAnalysis',
          percent: 85,
          message: 'No gaps found. Content is complete.'
        };
      }
    } catch (gapError) {
      console.error('[Streaming Pipeline] Gap Analysis failed:', gapError);
      yield {
        type: 'progress',
        stage: 'gapAnalysis',
        percent: 85,
        message: 'Gap Analysis skipped due to error. Using Stage 1 output.'
      };
    }

    // ===== STAGE 2: Audio Script Generation =====
    yield {
      type: 'stage',
      stage: 'audio',
      stageName: 'Audio Script',
      percent: 85,
      message: 'Generating audio narration script...'
    };

    audioScript = await generateAudioScript(
      { bookTitle, bookAuthor: bookAuthor || 'Unknown', title: `Insights: ${bookTitle}`, sections },
      analysis
    );

    yield {
      type: 'progress',
      stage: 'audio',
      percent: 95,
      message: 'Audio script generated.'
    };

    // Calculate final word count
    const totalWordCount = sections.reduce((sum, s) => {
      const sectionWords = s.content.split(/\s+/).length;
      const actionWords = s.metadata?.actionSteps 
        ? (s.metadata.actionSteps as string[]).join(' ').split(/\s+/).length 
        : 0;
      return sum + sectionWords + actionWords;
    }, 0);

    // Build final result
    const keyThemes = analysis.coreConcepts.slice(0, 5).map(c => c.conceptName);
    const quickGlance = sections.find(s => s.type === 'quickGlance');
    const summary = quickGlance?.content || `A comprehensive analysis of "${bookTitle}" by ${bookAuthor || 'Unknown Author'}`;
    const tableOfContents = sections.map(s => ({
      id: s.id,
      title: s.title,
      type: s.type
    }));

    yield {
      type: 'complete',
      percent: 100,
      message: `Complete! Generated ${sections.length} sections, ${totalWordCount} words.`,
      data: {
        title: `Insight Atlas Guide: ${bookTitle}`,
        summary: summary.substring(0, 1000),
        keyThemes,
        sections,
        tableOfContents,
        audioScript,
        wordCount: totalWordCount,
        bookAnalysis: analysis,
        gapAnalysisApplied,
        completenessScore
      } as StreamingInsightResult
    };

  } catch (error) {
    console.error('[Streaming Pipeline] Error:', error);
    yield {
      type: 'error',
      percent: 0,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Stage 0: Book Analysis (non-streaming for now, but with progress callback)
 */
async function streamStage0Analysis(
  bookTitle: string,
  bookAuthor: string | null,
  bookText: string,
  onProgress: (percent: number, message: string) => void
): Promise<BookAnalysis> {
  const truncatedText = bookText.length > 50000 
    ? bookText.substring(0, 50000) + '\n\n[Text truncated...]'
    : bookText;

  const systemPrompt = `You are a book classification and analysis specialist. Analyze this book and return a JSON object with the structure specified.`;

  const userPrompt = `Analyze this book for the Insight Atlas premium guide generation:

**Title:** ${bookTitle}
**Author:** ${bookAuthor || 'Unknown'}

**Book Text:**
${truncatedText}

Return a JSON object with:
{
  "bookMetadata": { "title": "", "author": "", "publicationYear": "", "wordCountEstimate": "" },
  "classification": { "primaryCategory": "", "secondaryCategories": [], "complexityLevel": "Accessible|Intermediate|Advanced", "frameworkType": "" },
  "originStory": { "present": true/false, "location": "", "description": "", "narrativeTone": "" },
  "structure": { "totalChapters": 0, "chapterTitles": [], "logicalGroupings": [], "chaptersStandaloneOrSequential": "" },
  "coreConcepts": [{ "conceptName": "", "chapterSource": "", "briefDescription": "", "recommendedVisual": "flowDiagram|comparisonMatrix|mindMap|etc", "visualRationale": "", "exampleDomains": [] }],
  "crossReferences": { "psychologicalFrameworks": [], "philosophicalTraditions": [], "neuroscienceResearch": [], "relatedPopularWorks": [] },
  "toneAnalysis": { "authorVoice": "", "recommendedGuideTone": "", "toneNotes": "" },
  "generationRecommendations": { "emphasisAreas": [], "potentialChallenges": [], "uniqueValueOpportunities": [] }
}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    temperature: 0.5,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  });

  const textContent = response.content.find(c => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in Stage 0 response');
  }

  let jsonStr = textContent.text;
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }

  return JSON.parse(jsonStr) as BookAnalysis;
}

/**
 * Stage 1: Stream content generation with real-time section updates
 */
async function* streamStage1Content(
  analysis: BookAnalysis,
  bookText: string
): AsyncGenerator<{ type: 'section' | 'progress'; section?: PremiumSection; percent?: number; message?: string }> {
  const truncatedText = bookText.length > 80000 
    ? bookText.substring(0, 80000) + '\n\n[Text truncated...]'
    : bookText;

  const systemPrompt = `You are an Insight Atlas master synthesizer creating premium book guides.

OUTPUT FORMAT: Emit each section as a separate JSON object on its own line:
{"type": "section", "section": {...}}
{"type": "complete"}

Each section object must have: id, type, title, content, and optionally visualType, visualData, metadata.

Section types: quickGlance, foundationalNarrative, executiveSummary, conceptExplanation, practicalExample, insightAtlasNote, visualFramework, actionBox, selfAssessment, trackingTemplate, dialogueScript, reflectionPrompts, scenarioResponse, structureMap, keyTakeaways, chapterBreakdown

REQUIREMENTS:
- Total 9,000-12,000 words across all sections
- Generate 20-30 sections total
- 3-4 specific examples per concept with names and dialogue
- Action boxes with 3-5 imperative steps
- Insight Atlas Notes with Key Distinction + Practical Implication + Go Deeper
- Use warm, accessible tone with "you" and "we"`;

  const userPrompt = `Create a premium Insight Atlas guide for: **${analysis.bookMetadata.title}** by **${analysis.bookMetadata.author}**

BOOK ANALYSIS:
${JSON.stringify(analysis, null, 2)}

REQUIRED SECTIONS:
1. Quick Glance Summary (500-600 words) - premise, framework, principles, bottom line, who should read
2. Foundational Narrative (300-500 words) - origin story, author background, storytelling tone
3. Executive Summary (800-1200 words)
4. For each core concept: explanation, 3-4 examples, Insight Atlas Note, visual framework, action box, exercise
5. Structure Map appendix

BOOK TEXT:
${truncatedText}

Generate all sections now, emitting each as a separate JSON line.`;

  try {
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });

    let fullContent = '';
    let sectionCount = 0;

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        fullContent += event.delta.text;

        // Try to parse complete JSON lines
        const lines = fullContent.split('\n');
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          if (line.startsWith('{') && line.endsWith('}')) {
            try {
              const parsed = JSON.parse(line);
              
              if (parsed.type === 'section' && parsed.section) {
                sectionCount++;
                const section: PremiumSection = {
                  id: parsed.section.id || `section-${sectionCount}`,
                  type: parsed.section.type || 'conceptExplanation',
                  title: parsed.section.title || `Section ${sectionCount}`,
                  content: parsed.section.content || '',
                  visualType: parsed.section.visualType,
                  visualData: parsed.section.visualData,
                  metadata: parsed.section.metadata
                };
                yield { type: 'section', section };
              } else if (parsed.type === 'complete') {
                yield { type: 'progress', percent: 70, message: 'Content generation complete' };
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
    if (sectionCount === 0) {
      const finalResponse = await stream.finalMessage();
      const textContent = finalResponse.content.find(c => c.type === 'text');
      const content = textContent?.type === 'text' ? textContent.text : '';
      
      // Try to parse as single JSON with sections array
      let jsonContent = content;
      if (jsonContent.includes('```json')) {
        jsonContent = jsonContent.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      }
      const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.sections && Array.isArray(parsed.sections)) {
          for (const s of parsed.sections) {
            yield { type: 'section', section: s as PremiumSection };
          }
        }
      }
    }

  } catch (error) {
    console.error('[Stage 1 Streaming] Error:', error);
    throw error;
  }
}

/**
 * Generate audio script using built-in LLM
 */
async function generateAudioScript(
  guide: { bookTitle: string; bookAuthor: string; title: string; sections: PremiumSection[] },
  analysis: BookAnalysis
): Promise<string> {
  const contentParts: string[] = [];
  
  for (const section of guide.sections.slice(0, 10)) {
    if (section.type === 'quickGlance') {
      contentParts.push(`Quick Summary: ${section.content.substring(0, 500)}`);
    } else if (section.type === 'foundationalNarrative') {
      contentParts.push(`Origin Story: ${section.content.substring(0, 500)}`);
    } else if (section.type === 'conceptExplanation') {
      contentParts.push(`Key Concept - ${section.title}: ${section.content.substring(0, 300)}`);
    } else if (section.type === 'actionBox' && section.metadata?.actionSteps) {
      const steps = section.metadata.actionSteps as string[];
      contentParts.push(`Action Steps: ${steps.slice(0, 3).join('. ')}`);
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
- End with a powerful takeaway`
        },
        {
          role: 'user',
          content: `Create an engaging audio narration for this insight guide:

Book: "${guide.bookTitle}" by ${guide.bookAuthor}
Guide Title: ${guide.title}

Key Themes: ${analysis.coreConcepts.map(c => c.conceptName).join(', ')}

Content Summary:
${contentSummary}

Generate a compelling audio narration.`
        }
      ]
    });

    const content = response.choices[0]?.message?.content;
    if (typeof content === 'string') {
      return content;
    }
    return `Welcome to your Insight Atlas guide for "${guide.bookTitle}". This comprehensive analysis reveals the key insights and practical wisdom from this transformative work.`;
  } catch (error) {
    console.error('Audio script generation error:', error);
    return `Welcome to your Insight Atlas guide for "${guide.bookTitle}". This comprehensive analysis reveals the key insights and practical wisdom from this transformative work.`;
  }
}
