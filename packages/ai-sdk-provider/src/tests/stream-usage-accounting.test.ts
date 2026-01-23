// Modified by Hyperbolic Labs, Inc. on 2026-01-23
// Original work Copyright 2025 OpenRouter Inc.
// Licensed under the Apache License, Version 2.0

import { describe, expect, it } from "vitest";

import type { HyperbolicChatSettings } from "../types/hyperbolic-chat-settings";
import { HyperbolicChatLanguageModel } from "../chat";
import { convertReadableStreamToArray, createTestServer } from "../test-utils/test-server";

describe("Hyperbolic Streaming Usage Accounting", () => {
  const server = createTestServer({
    "https://api.hyperbolic.xyz/v1/chat/completions": {
      response: { type: "stream-chunks", chunks: [] },
    },
  });

  function prepareStreamResponse(includeUsage = true) {
    const chunks = [
      `data: {"id":"test-id","model":"test-model","choices":[{"delta":{"content":"Hello"},"index":0}]}\n\n`,
      `data: {"choices":[{"finish_reason":"stop","index":0}]}\n\n`,
    ];

    if (includeUsage) {
      chunks.push(
        `data: ${JSON.stringify({
          usage: {
            prompt_tokens: 10,
            prompt_tokens_details: { cached_tokens: 5 },
            completion_tokens: 20,
            completion_tokens_details: { reasoning_tokens: 8 },
            total_tokens: 30,
            cost: 0.0015,
            cost_details: { upstream_inference_cost: 0.0019 },
          },
          choices: [],
        })}\n\n`,
      );
    }

    chunks.push("data: [DONE]\n\n");

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    server.urls["https://api.hyperbolic.xyz/v1/chat/completions"]!.response = {
      type: "stream-chunks",
      chunks,
    };
  }

  it("should include stream_options.include_usage in request when enabled", async () => {
    prepareStreamResponse();

    // Create model with usage accounting enabled
    const settings: HyperbolicChatSettings = {
      usage: { include: true },
    };

    const model = new HyperbolicChatLanguageModel("test-model", settings, {
      provider: "hyperbolic.chat",
      url: () => "https://api.hyperbolic.xyz/v1/chat/completions",
      headers: () => ({}),
      compatibility: "strict",
      fetch: global.fetch,
    });

    // Call the model with streaming
    await model.doStream({
      prompt: [
        {
          role: "user",
          content: [{ type: "text", text: "Hello" }],
        },
      ],
      maxOutputTokens: 100,
    });

    // Verify stream options
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const requestBody = (await server.calls[0]!.requestBodyJson) as Record<string, unknown>;
    expect(requestBody).toBeDefined();
    expect(requestBody.stream).toBe(true);
    expect(requestBody.stream_options).toEqual({
      include_usage: true,
    });
  });

  it("should include provider-specific metadata in finish event when usage accounting is enabled", async () => {
    prepareStreamResponse(true);

    // Create model with usage accounting enabled
    const settings: HyperbolicChatSettings = {
      usage: { include: true },
    };

    const model = new HyperbolicChatLanguageModel("test-model", settings, {
      provider: "hyperbolic.chat",
      url: () => "https://api.hyperbolic.xyz/v1/chat/completions",
      headers: () => ({}),
      compatibility: "strict",
      fetch: global.fetch,
    });

    // Call the model with streaming
    const result = await model.doStream({
      prompt: [
        {
          role: "user",
          content: [{ type: "text", text: "Hello" }],
        },
      ],
      maxOutputTokens: 100,
    });

    // Read all chunks from the stream
    const chunks = await convertReadableStreamToArray(result.stream);

    // Find the finish chunk
    const finishChunk = chunks.find((chunk) => chunk.type === "finish");
    expect(finishChunk).toBeDefined();

    // Verify metadata is included
    expect(finishChunk?.providerMetadata).toBeDefined();
    const openrouterData = finishChunk?.providerMetadata?.hyperbolic;
    expect(openrouterData).toBeDefined();

    const usage = openrouterData?.usage;
    expect(usage).toMatchObject({
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
      cost: 0.0015,
      costDetails: { upstreamInferenceCost: 0.0019 },
      promptTokensDetails: { cachedTokens: 5 },
      completionTokensDetails: { reasoningTokens: 8 },
    });
  });

  it("should not include provider-specific metadata when usage accounting is disabled", async () => {
    prepareStreamResponse(false);

    // Create model with usage accounting disabled
    const settings: HyperbolicChatSettings = {
      // No usage property
    };

    const model = new HyperbolicChatLanguageModel("test-model", settings, {
      provider: "hyperbolic.chat",
      url: () => "https://api.hyperbolic.xyz/v1/chat/completions",
      headers: () => ({}),
      compatibility: "strict",
      fetch: global.fetch,
    });

    // Call the model with streaming
    const result = await model.doStream({
      prompt: [
        {
          role: "user",
          content: [{ type: "text", text: "Hello" }],
        },
      ],
      maxOutputTokens: 100,
    });

    // Read all chunks from the stream
    const chunks = await convertReadableStreamToArray(result.stream);

    // Find the finish chunk
    const finishChunk = chunks.find((chunk) => chunk.type === "finish");
    expect(finishChunk).toBeDefined();

    // Verify that provider metadata is not included
    expect(finishChunk?.providerMetadata?.hyperbolic).toStrictEqual({
      usage: {},
    });
  });
});
