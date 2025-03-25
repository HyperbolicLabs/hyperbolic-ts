// Modified by Hyperbolic Labs, Inc. on 2025-03-25
// Original work Copyright 2025 OpenRouter Inc.
// Licensed under the Apache License, Version 2.0

import type { LanguageModelV1Prompt } from "@ai-sdk/provider";
import { createTestServer } from "@ai-sdk/provider-utils/test";
import { streamText } from "ai";
import { describe, expect, it, vi } from "vitest";

import { createHyperbolic } from "./hyperbolic-provider";

// Add type assertions for the mocked classes
const TEST_MESSAGES: LanguageModelV1Prompt = [
  { role: "user", content: [{ type: "text", text: "Hello" }] },
];

describe("providerOptions", () => {
  const server = createTestServer({
    "https://api.hyperbolic.xyz/v1/chat/completions": {
      response: {
        type: "stream-chunks",
        chunks: [],
      },
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should set providerOptions hyperbolic to extra body", async () => {
    const hyperbolic = createHyperbolic({
      apiKey: "test",
    });
    const model = hyperbolic("Qwen/Qwen2.5-72B-Instruct");

    await streamText({
      model,
      messages: TEST_MESSAGES,
      providerOptions: {
        hyperbolic: {
          reasoning: {
            max_tokens: 1000,
          },
        },
      },
    }).consumeStream();

    expect(await server.calls[0]?.requestBody).toStrictEqual({
      messages: [
        {
          content: "Hello",
          role: "user",
        },
      ],
      reasoning: {
        max_tokens: 1000,
      },
      temperature: 0,
      model: "Qwen/Qwen2.5-72B-Instruct",
      stream: true,
    });
  });
});
