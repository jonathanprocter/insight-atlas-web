import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function testClaude() {
  console.log("Testing Claude API...");
  console.log("API Key:", process.env.ANTHROPIC_API_KEY ? "Set" : "NOT SET");
  
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: "Say hello and confirm you are working. Keep it brief.",
        },
      ],
    });
    
    console.log("Response:", response);
    console.log("Content:", response.content);
  } catch (error) {
    console.error("Error:", error);
    console.error("Error message:", error.message);
    if (error.status) {
      console.error("Status:", error.status);
    }
  }
}

testClaude();
