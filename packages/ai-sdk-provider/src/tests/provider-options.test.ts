// Modified by Hyperbolic Labs, Inc. on 2026-01-23
// Original work Copyright 2025 OpenRouter Inc.
// Licensed under the Apache License, Version 2.0

import type { ModelMessage } from "ai";
import { streamText } from "ai";
import { describe, expect, it, vi } from "vitest";

import { createHyperbolic } from "../provider";
import { createTestServer } from "../test-utils/test-server";

// Add type assertions for the mocked classes
const TEST_MESSAGES: ModelMessage[] = [
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
    const model = hyperbolic("anthropic/claude-3.7-sonnet");

    await streamText({
      model: model,
      messages: TEST_MESSAGES,
      providerOptions: {
        hyperbolic: {
          reasoning: {
            max_tokens: 1000,
          },
        },
      },
    }).consumeStream();

    expect(await server.calls[0]?.requestBodyJson).toStrictEqual({
      messages: [
        {
          content: "Hello",
          role: "user",
        },
      ],
      reasoning: {
        max_tokens: 1000,
      },
      model: "anthropic/claude-3.7-sonnet",
      stream: true,
    });
  });
});
