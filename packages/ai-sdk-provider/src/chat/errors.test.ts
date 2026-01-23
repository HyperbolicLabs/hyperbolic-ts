// Modified by Hyperbolic Labs, Inc. on 2026-01-23
// Original work Copyright 2025 OpenRouter Inc.
// Licensed under the Apache License, Version 2.0

import type { LanguageModelV3Prompt } from "@ai-sdk/provider";
import { describe, expect, it } from "vitest";

import { createHyperbolic } from "../provider";
import { createTestServer } from "../test-utils/test-server";

const TEST_PROMPT: LanguageModelV3Prompt = [
  { role: "user", content: [{ type: "text", text: "Hello" }] },
];

const provider = createHyperbolic({
  baseURL: "https://api.hyperbolic.xyz/v1",
  apiKey: "test-api-key",
});

const server = createTestServer({
  "https://api.hyperbolic.xyz/v1/chat/completions": {},
});

describe("HTTP 200 Error Response Handling", () => {
  describe("doGenerate", () => {
    it("should throw APICallError for HTTP 200 responses with error payloads", async () => {
      // Hyperbolic sometimes returns HTTP 200 with an error object instead of choices
      // This can occur for various server errors (e.g., internal errors, processing failures)
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      server.urls["https://api.hyperbolic.xyz/v1/chat/completions"]!.response = {
        type: "json-value",
        body: {
          error: {
            message: "Internal Server Error",
            code: 500,
          },
          user_id: "org_abc123",
        },
      };

      const model = provider("anthropic/claude-3.5-sonnet");

      await expect(
        model.doGenerate({
          prompt: TEST_PROMPT,
        }),
      ).rejects.toThrow("Internal Server Error");
    });

    it("should parse successful responses normally when no error present", async () => {
      // Normal successful response without error
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      server.urls["https://api.hyperbolic.xyz/v1/chat/completions"]!.response = {
        type: "json-value",
        body: {
          id: "gen-123",
          model: "anthropic/claude-3.5-sonnet",
          provider: "Anthropic",
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: "Hello! How can I help you?",
              },
              finish_reason: "stop",
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 8,
            total_tokens: 18,
          },
        },
      };

      const model = provider("anthropic/claude-3.5-sonnet");

      const result = await model.doGenerate({
        prompt: TEST_PROMPT,
      });

      expect(result.content).toMatchObject([
        {
          type: "text",
          text: "Hello! How can I help you?",
        },
      ]);
      expect((result.usage.inputTokens?.total ?? 0) + (result.usage.outputTokens?.total ?? 0)).toBe(
        18,
      );
    });
  });
});
