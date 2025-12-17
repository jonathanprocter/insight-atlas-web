import { describe, it, expect } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';

describe('Anthropic API Integration', () => {
  it('should successfully connect to Anthropic API', async () => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey!.length).toBeGreaterThan(10);

    const client = new Anthropic({
      apiKey: apiKey,
    });

    // Make a minimal API call to verify the key works
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 50,
      messages: [
        { role: 'user', content: 'Respond with a brief greeting.' }
      ]
    });

    // Just verify we got a valid response from the API
    expect(response.content).toBeDefined();
    expect(response.content.length).toBeGreaterThan(0);
    expect(response.content[0].type).toBe('text');
    
    const textContent = response.content[0];
    if (textContent.type === 'text') {
      // Just verify we got some text back (API key is valid)
      expect(textContent.text.length).toBeGreaterThan(0);
    }
  }, 30000); // 30 second timeout for API call
});
