import { openai } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText } from "ai";

import { createHyperbolic } from "../../../../../packages/ai-sdk-provider/src/index";

const hyperbolic = createHyperbolic({
  apiKey: process.env.HYPERBOLIC_API_KEY,
});

const openRouter = createOpenRouter({
  apiKey: process.env.HYPERBOLIC_API_KEY,
  baseURL: "https://api.hyperbolic.xyz/v1",
  compatibility: "compatible",
});

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  // Extract the `prompt` from the body of the request
  const { prompt } = await req.json();

  // Ask OpenAI for a streaming chat completion given the prompt
  const result = streamText({
    // model: openai("gpt-4o"),
    model: openRouter("meta-llama/Meta-Llama-3.1-8B-Instruct"),
    prompt,
  });

  // Respond with the stream
  return result.toDataStreamResponse();
}
