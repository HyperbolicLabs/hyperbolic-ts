// Modified by Hyperbolic Labs, Inc. on 2026-01-23
// Original work Copyright 2025 OpenRouter Inc.
// Licensed under the Apache License, Version 2.0

import { describe, expect, it } from "vitest";

import type { HyperbolicChatSettings } from "../types/hyperbolic-chat-settings";
import { HyperbolicChatLanguageModel } from "../chat";
import { createTestServer } from "../test-utils/test-server";

describe("Hyperbolic Usage Accounting", () => {
  const server = createTestServer({
    "https://api.hyperbolic.xyz/v1/chat/completions": {
      response: { type: "json-value", body: {} },
    },
  });

  function prepareJsonResponse(includeUsage = true) {
    const response = {
      id: "test-id",
      model: "test-model",
      choices: [
        {
          message: {
            role: "assistant",
            content: "Hello, I am an AI assistant.",
          },
          index: 0,
          finish_reason: "stop",
        },
      ],
      usage: includeUsage
        ? {
            prompt_tokens: 10,
            prompt_tokens_details: {
              cached_tokens: 5,
            },
            completion_tokens: 20,
            completion_tokens_details: {
              reasoning_tokens: 8,
            },
            total_tokens: 30,
            cost: 0.0015,
            cost_details: {
              upstream_inference_cost: 0.0019,
            },
          }
        : undefined,
    };

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    server.urls["https://api.hyperbolic.xyz/v1/chat/completions"]!.response = {
      type: "json-value",
      body: response,
    };
  }

  it("should include usage parameter in the request when enabled", async () => {
    prepareJsonResponse();

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

    // Call the model
    await model.doGenerate({
      prompt: [
        {
          role: "user",
          content: [{ type: "text", text: "Hello" }],
        },
      ],
      maxOutputTokens: 100,
    });

    // Check request contains usage parameter
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const requestBody = (await server.calls[0]!.requestBodyJson) as Record<string, unknown>;
    expect(requestBody).toBeDefined();
    expect(requestBody).toHaveProperty("usage");
    expect(requestBody.usage).toEqual({ include: true });
  });

  it("should include provider-specific metadata in response when usage accounting is enabled", async () => {
    prepareJsonResponse();

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

    // Call the model
    const result = await model.doGenerate({
      prompt: [
        {
          role: "user",
          content: [{ type: "text", text: "Hello" }],
        },
      ],
      maxOutputTokens: 100,
    });

    // Check result contains provider metadata
    expect(result.providerMetadata).toBeDefined();
    const providerData = result.providerMetadata;

    // Check for Hyperbolic usage data
    expect(providerData?.hyperbolic).toBeDefined();
    const openrouterData = providerData?.hyperbolic as Record<string, unknown>;
    expect(openrouterData.usage).toBeDefined();

    const usage = openrouterData.usage;
    expect(usage).toMatchObject({
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
      cost: 0.0015,
      costDetails: {
        upstreamInferenceCost: 0.0019,
      },
      promptTokensDetails: {
        cachedTokens: 5,
      },
      completionTokensDetails: {
        reasoningTokens: 8,
      },
    });
  });

  it("should not include provider-specific metadata when usage accounting is disabled", async () => {
    prepareJsonResponse();

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

    // Call the model
    const result = await model.doGenerate({
      prompt: [
        {
          role: "user",
          content: [{ type: "text", text: "Hello" }],
        },
      ],
      maxOutputTokens: 100,
    });

    // Verify that Hyperbolic metadata is not included
    expect(result.providerMetadata?.hyperbolic?.usage).toStrictEqual({
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
      cost: 0.0015,
      costDetails: {
        upstreamInferenceCost: 0.0019,
      },
      promptTokensDetails: {
        cachedTokens: 5,
      },
      completionTokensDetails: {
        reasoningTokens: 8,
      },
    });
  });

  it("should exclude token details from providerMetadata when not present in response", async () => {
    // Prepare a response without token details
    const response = {
      id: "test-id",
      model: "test-model",
      choices: [
        {
          message: {
            role: "assistant",
            content: "Hello, I am an AI assistant.",
          },
          index: 0,
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
        cost: 0.0015,
        // No prompt_tokens_details, completion_tokens_details, or cost_details
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    server.urls["https://api.hyperbolic.xyz/v1/chat/completions"]!.response = {
      type: "json-value",
      body: response,
    };

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

    const result = await model.doGenerate({
      prompt: [
        {
          role: "user",
          content: [{ type: "text", text: "Hello" }],
        },
      ],
      maxOutputTokens: 100,
    });

    const usage = (result.providerMetadata?.hyperbolic as Record<string, unknown>)?.usage;

    // Should include basic token counts
    expect(usage).toMatchObject({
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
      cost: 0.0015,
    });

    // Should NOT include token details when not present in response
    expect(usage).not.toHaveProperty("promptTokensDetails");
    expect(usage).not.toHaveProperty("completionTokensDetails");
    expect(usage).not.toHaveProperty("costDetails");
  });

  it("should include only present token details in providerMetadata", async () => {
    // Prepare a response with only cached_tokens (no reasoning or cost details)
    const response = {
      id: "test-id",
      model: "test-model",
      choices: [
        {
          message: {
            role: "assistant",
            content: "Hello, I am an AI assistant.",
          },
          index: 0,
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 10,
        prompt_tokens_details: {
          cached_tokens: 5,
        },
        completion_tokens: 20,
        total_tokens: 30,
        cost: 0.0015,
        // No completion_tokens_details or cost_details
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    server.urls["https://api.hyperbolic.xyz/v1/chat/completions"]!.response = {
      type: "json-value",
      body: response,
    };

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

    const result = await model.doGenerate({
      prompt: [
        {
          role: "user",
          content: [{ type: "text", text: "Hello" }],
        },
      ],
      maxOutputTokens: 100,
    });

    const usage = (result.providerMetadata?.hyperbolic as Record<string, unknown>)?.usage;

    // Should include promptTokensDetails since cached_tokens is present
    expect(usage).toHaveProperty("promptTokensDetails");
    expect((usage as Record<string, unknown>).promptTokensDetails).toEqual({
      cachedTokens: 5,
    });

    // Should NOT include completionTokensDetails or costDetails
    expect(usage).not.toHaveProperty("completionTokensDetails");
    expect(usage).not.toHaveProperty("costDetails");
  });
});
