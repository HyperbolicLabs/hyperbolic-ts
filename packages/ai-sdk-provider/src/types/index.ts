// Modified by Hyperbolic Labs, Inc. on 2026-01-23
// Original work Copyright 2025 OpenRouter Inc.
// Licensed under the Apache License, Version 2.0

import type { LanguageModelV3, LanguageModelV3Prompt } from "@ai-sdk/provider";

export type { LanguageModelV3, LanguageModelV3Prompt };

export type HyperbolicProviderOptions = {
  models?: string[];

  /**
   * One of `max_tokens` or `effort` is required.
   * If `exclude` is true, reasoning will be removed from the response. Default is false.
   */
  reasoning?: {
    enabled?: boolean;
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

  extraBody?: Record<string, unknown>;

  /**
   * Enable usage accounting to get detailed token usage information.
   */
  usage?: {
    /**
     * When true, includes token usage information in the response.
     */
    include: boolean;
  };
};
