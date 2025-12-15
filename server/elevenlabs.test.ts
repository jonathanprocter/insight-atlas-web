import { describe, it, expect } from 'vitest';
import { isElevenLabsConfigured, getAvailableVoices, NARRATION_VOICES } from './services/elevenLabsService';

describe('ElevenLabs Integration', () => {
  it('should check if ElevenLabs is configured', () => {
    const configured = isElevenLabsConfigured();
    // Should return a boolean
    expect(typeof configured).toBe('boolean');
  });

  it('should have available voices defined', () => {
    expect(NARRATION_VOICES).toBeDefined();
    expect(NARRATION_VOICES.length).toBeGreaterThan(0);
  });

  it('should return available voices with required fields', () => {
    const voices = getAvailableVoices();
    expect(voices.length).toBeGreaterThan(0);
    
    for (const voice of voices) {
      expect(voice.id).toBeDefined();
      expect(voice.name).toBeDefined();
      expect(voice.description).toBeDefined();
    }
  });

  it('should have Sarah as the default voice', () => {
    const sarahVoice = NARRATION_VOICES.find(v => v.name === 'Sarah');
    expect(sarahVoice).toBeDefined();
    expect(sarahVoice?.id).toBe('EXAVITQu4vr4xnSDxMaL');
  });
});
