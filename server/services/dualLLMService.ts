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

// Check if Anthropic is configured
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export const isAnthropicConfigured = (): boolean => {
  return !!ANTHROPIC_API_KEY && ANTHROPIC_API_KEY.length > 10;
};

// Lazy initialization of Anthropic client
let anthropicClient: Anthropic | null = null;
const getAnthropicClient = (): Anthropic | null => {
  if (!isAnthropicConfigured()) {
    return null;
  }
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    });
  }
  return anthropicClient;
};

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
  maxTokens: number = 16000
): Promise<LLMResponse> {
  const client = getAnthropicClient();
  if (!client) {
    console.warn('[DualLLM] Anthropic not configured, falling back to built-in LLM');
    return generateWithBuiltinLLM(systemPrompt, userPrompt, maxTokens);
  }

  console.log('[DualLLM] Using Anthropic Claude (PRIMARY) for generation');

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
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
    console.error('[DualLLM] Claude error, falling back to built-in LLM:', error);
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
  console.log('[DualLLM] Using built-in LLM (OpenAI/Gemini) for generation');
  
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
