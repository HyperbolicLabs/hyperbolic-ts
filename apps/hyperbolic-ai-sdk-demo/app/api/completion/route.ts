import { openai } from "@ai-sdk/openai";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { streamText } from "ai";
import { Simplify } from "type-fest";

import { createHyperbolic } from "@hyperbolic/ai-sdk-provider";

export function errorHandler(error: unknown) {
  if (error == null) {
    return "unknown error";
  }

  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return JSON.stringify(error);
}

const hyperbolic = createHyperbolic({
  compatibility: "compatible",
  apiKey: process.env.HYPERBOLIC_API_KEY,
  baseURL: "https://api.hyperbolic.xyz/v1",
});

const model = hyperbolic.completion("meta-llama/Meta-Llama-3.1-405B-FP8");

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  // Extract the `prompt` from the body of the request
  const { prompt } = await req.json();

  // Ask OpenAI for a streaming chat completion given the prompt
  const result = streamText({
    model,
    prompt,
  });

  // Respond with the stream
  return result.toDataStreamResponse({
    getErrorMessage: errorHandler,
  });
}
