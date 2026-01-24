// Modified by Hyperbolic Labs, Inc. on 2026-01-23
// Original work Copyright 2025 OpenRouter Inc.
// Licensed under the Apache License, Version 2.0

import type { LanguageModelV3, LanguageModelV3Prompt } from "@ai-sdk/provider";

export type { LanguageModelV3, LanguageModelV3Prompt };

export type HyperbolicProviderOptions = {
  models?: string[];

  /**
   * A unique identifier representing your end-user, which can
   * help Hyperbolic to monitor and detect abuse.
   */
  user?: string;
};

export type HyperbolicSharedSettings = HyperbolicProviderOptions & {
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
