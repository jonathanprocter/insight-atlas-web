import { storagePut } from "../storage";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

// Get API key dynamically to ensure it's available after server start
function getElevenLabsApiKey(): string | undefined {
  return process.env.ELEVENLABS_API_KEY;
}

// Premium voice IDs from ElevenLabs
const VOICE_OPTIONS = {
  rachel: "21m00Tcm4TlvDq8ikWAM", // Rachel - warm, professional female
  drew: "29vD33N1CtxCmqQRPOHJ", // Drew - confident male
  clyde: "2EiwWnXFnvU5JabPnv8n", // Clyde - deep, authoritative male
  domi: "AZnzlk1XvdvUeBnXmlld", // Domi - expressive female
  bella: "EXAVITQu4vr4xnSDxMaL", // Bella - soft, engaging female
  antoni: "ErXwobaYiN019PkySvjV", // Antoni - warm male
  elli: "MF3mGyEYCl7XYWbV9V6O", // Elli - young female
  josh: "TxGEqnHWrfWFTfGW9XjX", // Josh - deep male
  arnold: "VR6AewLTigWG4xSOukaG", // Arnold - crisp male
  adam: "pNInz6obpgDQGcFmaJgB", // Adam - deep male
  sam: "yoZ06aMxZJJ28mfd3POQ", // Sam - raspy male
};

export type VoiceId = keyof typeof VOICE_OPTIONS;

export interface AudioGenerationResult {
  audioUrl: string;
  audioKey: string;
  duration: number;
  voiceId: string;
}

/**
 * Generate audio narration using ElevenLabs API
 */
export async function generateAudioNarration(
  script: string,
  voiceId: VoiceId = "rachel",
  insightId: number
): Promise<AudioGenerationResult> {
  const apiKey = getElevenLabsApiKey();
  if (!apiKey) {
    throw new Error("ElevenLabs API key not configured");
  }

  const voiceIdValue = VOICE_OPTIONS[voiceId] || VOICE_OPTIONS.rachel;

  try {
    // Call ElevenLabs text-to-speech API
    const response = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceIdValue}`,
      {
        method: "POST",
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text: script,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    // Get audio buffer
    const audioBuffer = await response.arrayBuffer();
    const audioData = Buffer.from(audioBuffer);

    // Calculate approximate duration (rough estimate based on audio size)
    // MP3 at 128kbps = 16KB per second
    const estimatedDuration = Math.round(audioData.length / 16000);

    // Upload to S3
    const audioKey = `insights/${insightId}/audio-${Date.now()}.mp3`;
    const { url: audioUrl } = await storagePut(audioKey, audioData, "audio/mpeg");

    return {
      audioUrl,
      audioKey,
      duration: estimatedDuration,
      voiceId,
    };
  } catch (error) {
    console.error("[Audio Generation] Error:", error);
    throw new Error(`Failed to generate audio: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Get available voice options
 */
export function getVoiceOptions(): { id: VoiceId; name: string; description: string }[] {
  return [
    { id: "rachel", name: "Rachel", description: "Warm, professional female voice" },
    { id: "drew", name: "Drew", description: "Confident male voice" },
    { id: "bella", name: "Bella", description: "Soft, engaging female voice" },
    { id: "josh", name: "Josh", description: "Deep, authoritative male voice" },
    { id: "elli", name: "Elli", description: "Young, energetic female voice" },
    { id: "adam", name: "Adam", description: "Deep, calm male voice" },
    { id: "antoni", name: "Antoni", description: "Warm, friendly male voice" },
    { id: "domi", name: "Domi", description: "Expressive female voice" },
  ];
}

/**
 * Estimate audio duration from text (words per minute)
 */
export function estimateAudioDuration(text: string, wordsPerMinute: number = 150): number {
  const wordCount = text.split(/\s+/).filter((w: string) => w.length > 0).length;
  return Math.ceil((wordCount / wordsPerMinute) * 60);
}
