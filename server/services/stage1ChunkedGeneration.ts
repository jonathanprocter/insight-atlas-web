/**
 * Stage 1 Chunked Generation
 * 
 * Generates premium content in multiple chunks to reach 9-12k word target.
 * Each chunk stays within Claude's 8k token limit, then merges into final guide.
 */

import { BookAnalysis } from './stage0BookAnalysis';
import { PremiumSection, PremiumGuide } from './stage1ContentGeneration';
import { generateWithClaude } from './dualLLMService';
import { logGeneration, logError } from './debugLogger';

interface ChunkConfig {
  name: string;
  targetWords: number;
  sectionTypes: string[];
  prompt: string;
}

/**
 * Generate premium content in chunks to meet 9-12k word requirement
 */
export async function generatePremiumContentChunked(
  analysis: BookAnalysis,
  bookText: string
): Promise<PremiumGuide> {
  logGeneration('[Chunked Generation] Starting 3-chunk generation process');
  
  const truncatedText = bookText.length > 80000 
    ? bookText.substring(0, 80000) + '\n\n[Text truncated...]'
    : bookText;
  
  const allSections: PremiumSection[] = [];
  let totalWordCount = 0;
  
  // Chunk 1: Foundation (Quick Glance, Narrative, Executive Summary)
  const chunk1 = await generateChunk({
    name: 'Foundation',
    targetWords: 3000,
    sectionTypes: ['quickGlance', 'foundationalNarrative', 'executiveSummary'],
    prompt: buildFoundationPrompt(analysis, truncatedText)
  });
  allSections.push(...chunk1.sections);
  totalWordCount += chunk1.wordCount;
  
  logGeneration('[Chunked Generation] Chunk 1 complete', { 
    sections: chunk1.sections.length, 
    words: chunk1.wordCount 
  });
  
  // Chunk 2: Core Concepts (Explanations, Examples, Notes, Action Boxes)
  const chunk2 = await generateChunk({
    name: 'Core Concepts',
    targetWords: 4000,
    sectionTypes: ['conceptExplanation', 'practicalExample', 'insightAtlasNote', 'actionBox', 'visualFramework'],
    prompt: buildCoreConceptsPrompt(analysis, truncatedText)
  });
  allSections.push(...chunk2.sections);
  totalWordCount += chunk2.wordCount;
  
  logGeneration('[Chunked Generation] Chunk 2 complete', { 
    sections: chunk2.sections.length, 
    words: chunk2.wordCount 
  });
  
  // Chunk 3: Application & Structure (Assessments, Tracking, Structure Map)
  const chunk3 = await generateChunk({
    name: 'Application',
    targetWords: 3000,
    sectionTypes: ['selfAssessment', 'trackingTemplate', 'structureMap', 'keyTakeaways'],
    prompt: buildApplicationPrompt(analysis, truncatedText, allSections)
  });
  allSections.push(...chunk3.sections);
  totalWordCount += chunk3.wordCount;
  
  logGeneration('[Chunked Generation] Chunk 3 complete', { 
    sections: chunk3.sections.length, 
    words: chunk3.wordCount 
  });
  
  // Validate total word count
  if (totalWordCount < 9000) {
    const error = `Chunked generation failed validation: ${totalWordCount} words (minimum 9,000 required)`;
    logError('generation', error, { 
      totalWordCount, 
      target: 9000,
      sections: allSections.length
    });
    throw new Error(error);
  }
  
  // Validate section count
  if (allSections.length < 20) {
    const error = `Chunked generation failed validation: ${allSections.length} sections (minimum 20 required)`;
    logError('generation', error, { 
      totalWordCount,
      sections: allSections.length,
      target: 20
    });
    throw new Error(error);
  }
  
  // Validate required section types exist
  const requiredTypes = ['quickGlance', 'foundationalNarrative', 'executiveSummary'];
  const sectionTypes = allSections.map(s => s.type);
  const missingTypes = requiredTypes.filter(t => !sectionTypes.includes(t as any));
  
  if (missingTypes.length > 0) {
    const error = `Chunked generation missing required sections: ${missingTypes.join(', ')}`;
    logError('generation', error, { 
      totalWordCount,
      sections: allSections.length,
      missingTypes
    });
    throw new Error(error);
  }
  
  // Calculate quality metrics
  const avgWordsPerSection = Math.round(totalWordCount / allSections.length);
  const sectionTypeDistribution = sectionTypes.reduce((acc, type) => {
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const visualSections = allSections.filter(s => s.visualType).length;
  const visualCoverage = Math.round((visualSections / allSections.length) * 100);
  
  logGeneration('[Chunked Generation] Complete - Quality Validated', { 
    totalSections: allSections.length, 
    totalWords: totalWordCount,
    target: '9,000-12,000',
    avgWordsPerSection,
    visualCoverage: `${visualCoverage}%`,
    sectionTypeDistribution
  });
  
  return {
    title: `Insight Atlas Guide: ${analysis.bookMetadata.title}`,
    bookTitle: analysis.bookMetadata.title,
    bookAuthor: analysis.bookMetadata.author,
    generatedAt: new Date().toISOString(),
    wordCount: totalWordCount,
    sections: allSections,
    tableOfContents: allSections.map(s => ({ id: s.id, title: s.title, type: s.type }))
  };
}

async function generateChunk(config: ChunkConfig): Promise<{ sections: PremiumSection[]; wordCount: number }> {
  logGeneration(`[Chunk: ${config.name}] Starting generation`, { 
    targetWords: config.targetWords,
    sectionTypes: config.sectionTypes 
  });
  const systemPrompt = `You are an Insight Atlas synthesizer generating premium book guide content. 
Output ONLY valid JSON with this structure:
{
  "sections": [
    {
      "id": "unique-id",
      "type": "sectionType",
      "title": "Section Title",
      "content": "Full markdown content...",
      "visualType": "optional-visual-type",
      "metadata": {}
    }
  ]
}

Target ${config.targetWords} words across ${config.sectionTypes.join(', ')} sections.
Use rich markdown formatting, practical examples, and actionable insights.`;

  try {
    const response = await generateWithClaude(
      systemPrompt,
      config.prompt,
      8192, // Stay within Claude's limit
      { truncateInput: true }
    );
    
    // Parse JSON response
    const cleaned = response.content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    const parsed = JSON.parse(cleaned);
    const sections: PremiumSection[] = parsed.sections || [];
    
    // Calculate word count
    const wordCount = sections.reduce((sum, s) => {
      const words = (s.content || '').split(/\s+/).length;
      return sum + words;
    }, 0);
    
    // Validate chunk meets minimum target (allow 20% under for flexibility)
    const minWords = Math.floor(config.targetWords * 0.8);
    if (wordCount < minWords) {
      logError('generation', `Chunk ${config.name} below target`, {
        wordCount,
        target: config.targetWords,
        minimum: minWords
      });
    }
    
    // Validate section types match config
    const actualTypes = sections.map(s => s.type);
    const hasExpectedTypes = config.sectionTypes.some(t => actualTypes.includes(t as any));
    if (!hasExpectedTypes) {
      logError('generation', `Chunk ${config.name} missing expected section types`, {
        expected: config.sectionTypes,
        actual: actualTypes
      });
    }
    
    logGeneration(`[Chunk: ${config.name}] Complete`, { 
      sections: sections.length,
      wordCount,
      target: config.targetWords,
      coverage: `${Math.round((wordCount / config.targetWords) * 100)}%`
    });
    
    return { sections, wordCount };
  } catch (error) {
    logError('generation', `Chunk ${config.name} generation failed`, { error });
    throw error;
  }
}

function buildFoundationPrompt(analysis: BookAnalysis, bookText: string): string {
  return `Generate the foundation sections for "${analysis.bookMetadata.title}" by ${analysis.bookMetadata.author}.

**Book Analysis:**
${JSON.stringify(analysis, null, 2)}

**Book Excerpt:**
${bookText.substring(0, 20000)}

Generate these sections (target 3,000 words total):
1. Quick Glance Summary (500-600 words)
2. Foundational Narrative (1,200-1,500 words)
3. Executive Summary (1,200-1,500 words)

Focus on clarity, structure, and immediate value.`;
}

function buildCoreConceptsPrompt(analysis: BookAnalysis, bookText: string): string {
  const concepts = analysis.coreConcepts.slice(0, 5); // Top 5 concepts
  
  return `Generate core concept sections for "${analysis.bookMetadata.title}".

**Core Concepts:**
${concepts.map(c => `- ${c.conceptName}: ${c.briefDescription}`).join('\n')}

**Book Excerpt:**
${bookText.substring(0, 20000)}

For EACH of the ${concepts.length} concepts, generate (target 4,000 words total):
1. Concept Explanation (400-500 words)
2. Practical Example (300-400 words)
3. Insight Atlas Note (200-300 words)
4. Action Box with 5-7 specific steps
5. Visual Framework with appropriate visualType

Make it practical, memorable, and immediately applicable.`;
}

function buildApplicationPrompt(analysis: BookAnalysis, bookText: string, existingSections: PremiumSection[]): string {
  return `Generate application and structure sections for "${analysis.bookMetadata.title}".

**Existing Sections:**
${existingSections.map(s => `- ${s.type}: ${s.title}`).join('\n')}

**Book Excerpt:**
${bookText.substring(0, 20000)}

Generate these sections (target 3,000 words total):
1. Self-Assessment (600-800 words with radarChart visualType)
2. Tracking Template (600-800 words with appropriate visual)
3. Structure Map showing book → guide mapping (400-500 words)
4. Key Takeaways (800-1,000 words)

Tie everything together and provide clear next steps.`;
}
