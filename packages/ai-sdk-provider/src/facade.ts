// Modified by Hyperbolic Labs, Inc. on 2026-01-23
// Original work Copyright 2025 OpenRouter Inc.
// Licensed under the Apache License, Version 2.0

import { loadApiKey, withoutTrailingSlash } from "@ai-sdk/provider-utils";

import type { HyperbolicProviderSettings } from "./provider";
import type {
  HyperbolicChatModelId,
  HyperbolicChatSettings,
} from "./types/hyperbolic-chat-settings";
import type {
  HyperbolicCompletionModelId,
  HyperbolicCompletionSettings,
} from "./types/hyperbolic-completion-settings";
import { HyperbolicChatLanguageModel } from "./chat";
import { HyperbolicCompletionLanguageModel } from "./completion";

/**
@deprecated Use `createHyperbolic` instead.
 */
export class Hyperbolic {
  /**
Use a different URL prefix for API calls, e.g. to use proxy servers.
The default prefix is `https://api.hyperbolic.xyz/v1`.
   */
  readonly baseURL: string;

  /**
API key that is being sent using the `Authorization` header.
It defaults to the `HYPERBOLIC_API_KEY` environment variable.
 */
  readonly apiKey?: string;

  /**
Custom headers to include in the requests.
   */
  readonly headers?: Record<string, string>;

  /**
   * Record of provider slugs to API keys for injecting into provider routing.
   */
  readonly api_keys?: Record<string, string>;

  /**
   * Creates a new Hyperbolic provider instance.
   */
  constructor(options: HyperbolicProviderSettings = {}) {
    this.baseURL =
      withoutTrailingSlash(options.baseURL ?? options.baseUrl) ?? "https://api.hyperbolic.xyz/v1";
    this.apiKey = options.apiKey;
    this.headers = options.headers;
    this.api_keys = options.api_keys;
  }

  private get baseConfig() {
    return {
      baseURL: this.baseURL,
      headers: () => ({
        Authorization: `Bearer ${loadApiKey({
          apiKey: this.apiKey,
          environmentVariableName: "HYPERBOLIC_API_KEY",
          description: "Hyperbolic",
        })}`,
        ...this.headers,
        ...(this.api_keys &&
          Object.keys(this.api_keys).length > 0 && {
            "X-Provider-API-Keys": JSON.stringify(this.api_keys),
          }),
      }),
    };
  }

  chat(modelId: HyperbolicChatModelId, settings: HyperbolicChatSettings = {}) {
    return new HyperbolicChatLanguageModel(modelId, settings, {
      provider: "hyperbolic.chat",
      ...this.baseConfig,
      compatibility: "strict",
      url: ({ path }) => `${this.baseURL}${path}`,
    });
  }

  completion(modelId: HyperbolicCompletionModelId, settings: HyperbolicCompletionSettings = {}) {
    return new HyperbolicCompletionLanguageModel(modelId, settings, {
      provider: "hyperbolic.completion",
      ...this.baseConfig,
      compatibility: "strict",
      url: ({ path }) => `${this.baseURL}${path}`,
    });
  }
}
