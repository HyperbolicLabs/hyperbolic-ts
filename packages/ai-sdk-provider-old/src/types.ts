// Modified by Hyperbolic Labs, Inc. on 2025-03-25
// Original work Copyright 2025 OpenRouter Inc.
// Licensed under the Apache License, Version 2.0

import type { LanguageModelV1 } from "@ai-sdk/provider";

// Re-export the LanguageModelV1 type to ensure proper type compatibility
export type { LanguageModelV1 };

// Export our model types with explicit type constraints
export type HyperbolicLanguageModel = LanguageModelV1;

export type HyperbolicProviderOptions = {
  models?: string[];

  /**
   * https://openrouter.ai/docs/use-cases/reasoning-tokens
   * One of `max_tokens` or `effort` is required.
   * If `exclude` is true, reasoning will be removed from the response. Default is false.
   */
  reasoning?: {
    exclude?: boolean;
  } & (
    | {
        max_tokens: number;
      }
    | {
        effort: "high" | "medium" | "low";
      }
  );

  /**
   * A unique identifier representing your end-user, which can
   * help Hyperbolic to monitor and detect abuse.
   */
  user?: string;
};

export type HyperbolicSharedSettings = HyperbolicProviderOptions & {
  /**
   * @deprecated use `reasoning` instead
   */
  includeReasoning?: boolean;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extraBody?: Record<string, any>;
};
