/**
 * ElevenLabs Text-to-Speech Service
 * 
 * Generates high-quality audio narration from insight guide text.
 * Uses the ElevenLabs API for natural-sounding voice synthesis.
 */

import { ElevenLabsClient } from 'elevenlabs';
import { storagePut } from '../storage';

// Get API key dynamically to handle late environment variable injection
const getApiKey = (): string | undefined => {
  return process.env.ELEVENLABS_API_KEY;
};

const getClient = (): ElevenLabsClient | null => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('[ElevenLabs] API key not configured');
    return null;
  }
  return new ElevenLabsClient({
    apiKey,
  });
};

export const isElevenLabsConfigured = (): boolean => {
  const apiKey = getApiKey();
  return !!apiKey && apiKey.length > 10;
};

// Available voices for narration
export const NARRATION_VOICES = [
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', description: 'Warm, conversational female voice' },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'Clear, professional female voice' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', description: 'Confident, engaging female voice' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', description: 'Warm, friendly male voice' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', description: 'Deep, authoritative male voice' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', description: 'Clear, professional male voice' },
] as const;

export type VoiceId = typeof NARRATION_VOICES[number]['id'];

export interface AudioGenerationOptions {
  voiceId?: VoiceId;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
}

export interface AudioGenerationResult {
  audioUrl: string;
  audioKey: string;
  durationEstimate: number; // in seconds
  voiceUsed: string;
}

/**
 * Generate audio narration from text using ElevenLabs
 */
export async function generateAudioNarration(
  text: string,
  bookId: string,
  options: AudioGenerationOptions = {}
): Promise<AudioGenerationResult | null> {
  const client = getClient();
  if (!client) {
    console.log('[ElevenLabs] Not configured, skipping audio generation');
    return null;
  }

  const {
    voiceId = 'EXAVITQu4vr4xnSDxMaL', // Sarah - warm, conversational
    modelId = 'eleven_multilingual_v2',
    stability = 0.5,
    similarityBoost = 0.75,
    style = 0.5,
  } = options;

  console.log('[ElevenLabs] Generating audio narration...');
  console.log('[ElevenLabs] Text length:', text.length, 'characters');

  try {
    // Generate audio using ElevenLabs
    const audioStream = await client.textToSpeech.convert(voiceId, {
      text,
      model_id: modelId,
      voice_settings: {
        stability,
        similarity_boost: similarityBoost,
        style,
      },
    });

    // Collect audio chunks into a buffer
    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      chunks.push(Buffer.from(chunk));
    }
    const audioBuffer = Buffer.concat(chunks);

    console.log('[ElevenLabs] Audio generated, size:', audioBuffer.length, 'bytes');

    // Upload to S3
    const timestamp = Date.now();
    const audioKey = `insights/${bookId}/narration-${timestamp}.mp3`;
    
    const { url: audioUrl } = await storagePut(audioKey, audioBuffer, 'audio/mpeg');

    // Estimate duration (rough estimate: ~150 words per minute, ~5 chars per word)
    const wordCount = text.split(/\s+/).length;
    const durationEstimate = Math.ceil((wordCount / 150) * 60);

    const voiceName = NARRATION_VOICES.find(v => v.id === voiceId)?.name || 'Unknown';

    console.log('[ElevenLabs] Audio uploaded to:', audioUrl);
    console.log('[ElevenLabs] Estimated duration:', durationEstimate, 'seconds');

    return {
      audioUrl,
      audioKey,
      durationEstimate,
      voiceUsed: voiceName,
    };
  } catch (error) {
    console.error('[ElevenLabs] Audio generation error:', error);
    return null;
  }
}

/**
 * Generate a short audio preview (first ~30 seconds of content)
 */
export async function generateAudioPreview(
  text: string,
  bookId: string,
  options: AudioGenerationOptions = {}
): Promise<AudioGenerationResult | null> {
  // Truncate to approximately 30 seconds of content (~75 words)
  const words = text.split(/\s+/);
  const previewText = words.slice(0, 75).join(' ');
  
  if (previewText.length < 50) {
    console.log('[ElevenLabs] Text too short for preview');
    return null;
  }

  return generateAudioNarration(previewText + '...', bookId, options);
}

/**
 * Get available voices for the UI
 */
export function getAvailableVoices() {
  return NARRATION_VOICES.map(v => ({
    id: v.id,
    name: v.name,
    description: v.description,
  }));
}
