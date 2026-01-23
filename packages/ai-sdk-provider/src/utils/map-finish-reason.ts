// Modified by Hyperbolic Labs, Inc. on 2026-01-23
// Original work Copyright 2025 OpenRouter Inc.
// Licensed under the Apache License, Version 2.0

import type { LanguageModelV3FinishReason } from "@ai-sdk/provider";

type UnifiedFinishReason = "stop" | "length" | "content-filter" | "tool-calls" | "error" | "other";

function mapToUnified(finishReason: string | null | undefined): UnifiedFinishReason {
  switch (finishReason) {
    case "stop":
      return "stop";
    case "length":
      return "length";
    case "content_filter":
      return "content-filter";
    case "function_call":
    case "tool_calls":
      return "tool-calls";
    default:
      return "other";
  }
}

export function mapOpenRouterFinishReason(
  finishReason: string | null | undefined,
): LanguageModelV3FinishReason {
  return {
    unified: mapToUnified(finishReason),
    raw: finishReason ?? undefined,
  };
}

export function createFinishReason(
  unified: UnifiedFinishReason,
  raw?: string,
): LanguageModelV3FinishReason {
  return { unified, raw };
}
