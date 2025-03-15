import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { createHyperbolic } from "@hyperbolic/ai-sdk-provider/dist/index";

const hyperbolic = createHyperbolic({
  apiKey: process.env.HYPERBOLIC_API_KEY,
});

const test = hyperbolic("Qwen/QwQ-32B");

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  // Extract the `prompt` from the body of the request
  const { prompt } = await req.json();

  // Ask OpenAI for a streaming chat completion given the prompt
  const result = streamText({
    model: hyperbolic("Qwen/QwQ-32B"),
    prompt,
  });

  // Respond with the stream
  return result.toDataStreamResponse();
}
