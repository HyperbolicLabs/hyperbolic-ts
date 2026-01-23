// Modified by Hyperbolic Labs, Inc. on 2026-01-23
// Original work Copyright 2025 OpenRouter Inc.
// Licensed under the Apache License, Version 2.0

export enum ReasoningFormat {
  Unknown = "unknown",
  OpenAIResponsesV1 = "openai-responses-v1",
  XAIResponsesV1 = "xai-responses-v1",
  AnthropicClaudeV1 = "anthropic-claude-v1",
  GoogleGeminiV1 = "google-gemini-v1",
}

// Anthropic Claude was the first reasoning that we're
// passing back and forth
export const DEFAULT_REASONING_FORMAT = ReasoningFormat.AnthropicClaudeV1;
