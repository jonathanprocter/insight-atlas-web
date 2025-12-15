import { invokeLLM } from "./server/_core/llm.js";

const testText = "This is a test book about productivity and time management. The key principles include prioritization, focus, and eliminating distractions.";

const systemPrompt = `You are an expert literary analyst. Generate a simple JSON response:
{
  "title": "Test Insight",
  "summary": "A brief summary",
  "keyThemes": ["theme1", "theme2"],
  "sections": [{"type": "paragraph", "content": "Test content"}],
  "audioScript": "Test audio script"
}`;

try {
  console.log("Testing LLM invocation...");
  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Analyze: ${testText}` },
    ],
  });
  
  console.log("Response:", JSON.stringify(response, null, 2));
} catch (error) {
  console.error("Error:", error);
}
