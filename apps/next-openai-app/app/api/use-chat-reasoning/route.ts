import { fireworks } from "@ai-sdk/fireworks";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { extractReasoningMiddleware, streamText, wrapLanguageModel } from "ai";

const openRouter = createOpenRouter({
  apiKey: process.env.HYPERBOLIC_API_KEY,
  baseURL: "https://api.hyperbolic.xyz/v1",
  compatibility: "compatible",
});

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  console.log(JSON.stringify(messages, null, 2));

  const result = streamText({
    model: openRouter("deepseek-ai/DeepSeek-R1"),
    messages,
    providerOptions: {
      openrouter: {
        reasoning: {
          max_tokens: 10,
        },
      },
    },
  });

  // const result = streamText({
  //   model: deepseek('deepseek-reasoner'),
  //   messages,
  // });

  // const result = streamText({
  //   model: anthropic('research-claude-flannel'),
  //   messages,
  //   providerOptions: {
  //     anthropic: {
  //       thinking: { type: 'enabled', budgetTokens: 12000 },
  //     },
  //   },
  // });

  return result.toDataStreamResponse({
    sendReasoning: true,
  });
}
