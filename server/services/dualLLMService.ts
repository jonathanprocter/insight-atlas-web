/**
 * Dual LLM Service
 * 
 * Uses both Anthropic Claude and the built-in LLM (OpenAI/Gemini via Forge)
 * for different stages of the insight generation pipeline.
 * 
 * Strategy:
 * - Anthropic Claude: PRIMARY for content generation (Stage 0, Stage 1, Gap Analysis)
 * - Built-in LLM (OpenAI/Gemini): For formatting, audio scripts, and fallback
 */

import { invokeLLM, Message } from '../_core/llm';
import Anthropic from '@anthropic-ai/sdk';
import { logLLM, logError } from './debugLogger';

// Check if Anthropic is configured
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export const isAnthropicConfigured = (): boolean => {
  return !!ANTHROPIC_API_KEY && ANTHROPIC_API_KEY.length > 10;
};

// Lazy initialization of Anthropic client with extended timeout
let anthropicClient: Anthropic | null = null;
const getAnthropicClient = (): Anthropic | null => {
  if (!isAnthropicConfigured()) {
    return null;
  }
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
      timeout: 10 * 60 * 1000, // 10 minutes timeout for large books
    });
  }
  return anthropicClient;
};

// Maximum characters to send to Claude for optimal processing
// Claude can handle ~200k tokens, but we limit to ensure fast responses
const MAX_BOOK_TEXT_CHARS = 200000;

/**
 * Smart book text extraction that preserves quality
 * Instead of simple truncation, this extracts key sections:
 * - Chapter beginnings and endings (where key ideas are introduced/summarized)
 * - Evenly distributed samples throughout the book
 * - Maintains narrative coherence
 */
function extractKeyBookContent(text: string): string {
  if (text.length <= MAX_BOOK_TEXT_CHARS) {
    return text;
  }

  // Split into potential chapters/sections
  const chapterPatterns = /(?:^|\n)(?:Chapter|CHAPTER|Part|PART|Section|SECTION)\s*[\dIVXivx]+[.:\s]/gm;
  const chapters: { start: number; end: number }[] = [];
  let match;
  
  while ((match = chapterPatterns.exec(text)) !== null) {
    if (chapters.length > 0) {
      chapters[chapters.length - 1].end = match.index;
    }
    chapters.push({ start: match.index, end: text.length });
  }

  // If no chapters found, use paragraph-based extraction
  if (chapters.length === 0) {
    // Take beginning (introduction), middle samples, and end (conclusion)
    const introLength = Math.floor(MAX_BOOK_TEXT_CHARS * 0.35);
    const middleLength = Math.floor(MAX_BOOK_TEXT_CHARS * 0.35);
    const endLength = Math.floor(MAX_BOOK_TEXT_CHARS * 0.30);
    
    const intro = text.slice(0, introLength);
    const middleStart = Math.floor(text.length * 0.4);
    const middle = text.slice(middleStart, middleStart + middleLength);
    const end = text.slice(-endLength);
    
    return intro + 
      '\n\n--- [Content from middle of book] ---\n\n' + 
      middle + 
      '\n\n--- [Content from end of book] ---\n\n' + 
      end;
  }

  // Extract key portions from each chapter
  const extractedParts: string[] = [];
  const charsPerChapter = Math.floor(MAX_BOOK_TEXT_CHARS / chapters.length);
  
  for (const chapter of chapters) {
    const chapterText = text.slice(chapter.start, chapter.end);
    const chapterLength = chapterText.length;
    
    if (chapterLength <= charsPerChapter) {
      // Include full chapter if it fits
      extractedParts.push(chapterText);
    } else {
      // Extract beginning (40%), key middle (30%), and end (30%) of chapter
      const beginLength = Math.floor(charsPerChapter * 0.4);
      const middleLength = Math.floor(charsPerChapter * 0.3);
      const endLength = Math.floor(charsPerChapter * 0.3);
      
      const begin = chapterText.slice(0, beginLength);
      const middleStart = Math.floor(chapterLength * 0.4);
      const middle = chapterText.slice(middleStart, middleStart + middleLength);
      const end = chapterText.slice(-endLength);
      
      extractedParts.push(begin + '\n[...]\n' + middle + '\n[...]\n' + end);
    }
  }

  return extractedParts.join('\n\n---\n\n');
}

export interface LLMResponse {
  content: string;
  provider: 'anthropic' | 'builtin';
}

/**
 * Generate content using Anthropic Claude (PRIMARY)
 * Used for: Stage 0 Analysis, Stage 1 Content Generation, Gap Analysis
 */
export async function generateWithClaude(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 16000,
  options?: { truncateInput?: boolean }
): Promise<LLMResponse> {
  const client = getAnthropicClient();
  if (!client) {
    logLLM('Anthropic not configured, falling back to built-in LLM');
    return generateWithBuiltinLLM(systemPrompt, userPrompt, maxTokens);
  }

  // Optionally extract key content from very long prompts
  let processedUserPrompt = userPrompt;
  if (options?.truncateInput && userPrompt.length > MAX_BOOK_TEXT_CHARS) {
    processedUserPrompt = extractKeyBookContent(userPrompt);
    logLLM('Extracted key content from long prompt', { 
      originalLength: userPrompt.length, 
      extractedLength: processedUserPrompt.length 
    });
  }

  logLLM('Using Anthropic Claude (PRIMARY)', { 
    systemPromptLength: systemPrompt.length, 
    userPromptLength: processedUserPrompt.length,
    maxTokens,
    wasTruncated: processedUserPrompt.length !== userPrompt.length
  });

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [
        { role: 'user', content: processedUserPrompt },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    return {
      content: content.text,
      provider: 'anthropic',
    };
  } catch (error) {
    logError('llm', 'Claude error, falling back to built-in LLM', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return generateWithBuiltinLLM(systemPrompt, userPrompt, maxTokens);
  }
}

/**
 * Generate content using the built-in LLM (OpenAI/Gemini)
 * Used for: Formatting, Audio Scripts, Fallback
 */
export async function generateWithBuiltinLLM(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 16000
): Promise<LLMResponse> {
  logLLM('Using built-in LLM (OpenAI/Gemini)', { 
    systemPromptLength: systemPrompt.length, 
    userPromptLength: userPrompt.length,
    maxTokens 
  });
  
  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const response = await invokeLLM({
    messages,
    maxTokens,
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error('No content in LLM response');
  }

  return {
    content,
    provider: 'builtin',
  };
}

/**
 * Generate content with Claude as primary, built-in as fallback
 */
export async function generateWithFallback(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 16000
): Promise<LLMResponse> {
  // Always try Claude first (it's the primary)
  return generateWithClaude(systemPrompt, userPrompt, maxTokens);
}

/**
 * Generate JSON content with Claude (PRIMARY)
 */
export async function generateJSONWithClaude(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 16000
): Promise<LLMResponse> {
  const jsonSystemPrompt = `${systemPrompt}\n\nYou MUST respond with valid JSON only. No markdown code blocks, no explanations, just the JSON object.`;
  return generateWithClaude(jsonSystemPrompt, userPrompt, maxTokens);
}

/**
 * Generate formatted content using built-in LLM (OpenAI/Gemini)
 * Specifically for formatting tasks, audio scripts, etc.
 */
export async function generateFormattedContent(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 8000
): Promise<LLMResponse> {
  console.log('[DualLLM] Using built-in LLM for formatting task');
  return generateWithBuiltinLLM(systemPrompt, userPrompt, maxTokens);
}
