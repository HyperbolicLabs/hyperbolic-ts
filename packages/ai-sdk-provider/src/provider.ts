// Modified by Hyperbolic Labs, Inc. on 2026-01-23
// Original work Copyright 2025 OpenRouter Inc.
// Licensed under the Apache License, Version 2.0

import type { ProviderV3 } from "@ai-sdk/provider";
import { loadApiKey, withoutTrailingSlash } from "@ai-sdk/provider-utils";

import type {
  HyperbolicImageModelId,
  HyperbolicImageSettings,
} from "./image/hyperbolic-image-settings";
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
import { HyperbolicImageModel } from "./image";
import { withUserAgentSuffix } from "./utils/with-user-agent-suffix";
import { VERSION } from "./version";

export type { HyperbolicChatSettings, HyperbolicCompletionSettings };

export interface HyperbolicProvider extends ProviderV3 {
  (
    modelId: HyperbolicChatModelId,
    settings?: HyperbolicCompletionSettings,
  ): HyperbolicCompletionLanguageModel;
  (modelId: HyperbolicChatModelId, settings?: HyperbolicChatSettings): HyperbolicChatLanguageModel;

  languageModel(
    modelId: HyperbolicChatModelId,
    settings?: HyperbolicCompletionSettings,
  ): HyperbolicCompletionLanguageModel;
  languageModel(
    modelId: HyperbolicChatModelId,
    settings?: HyperbolicChatSettings,
  ): HyperbolicChatLanguageModel;

  /**
Creates an Hyperbolic chat model for text generation.
   */
  chat(
    modelId: HyperbolicChatModelId,
    settings?: HyperbolicChatSettings,
  ): HyperbolicChatLanguageModel;

  /**
Creates an Hyperbolic completion model for text generation.
   */
  completion(
    modelId: HyperbolicCompletionModelId,
    settings?: HyperbolicCompletionSettings,
  ): HyperbolicCompletionLanguageModel;

  image(modelId: HyperbolicImageModelId, settings?: HyperbolicImageSettings): HyperbolicImageModel;
}

export interface HyperbolicProviderSettings {
  /**
Base URL for the Hyperbolic API calls.
     */
  baseURL?: string;

  /**
@deprecated Use `baseURL` instead.
     */
  baseUrl?: string;

  /**
API key for authenticating requests.
     */
  apiKey?: string;

  /**
Custom headers to include in the requests.
     */
  headers?: Record<string, string>;

  /**
Hyperbolic compatibility mode. Should be set to `strict` when using the Hyperbolic API,
and `compatible` when using 3rd party providers. In `compatible` mode, newer
information such as streamOptions are not being sent. Defaults to 'compatible'.
   */
  compatibility?: "strict" | "compatible";

  /**
Custom fetch implementation. You can use it as a middleware to intercept requests,
or to provide a custom fetch implementation for e.g. testing.
    */
  fetch?: typeof fetch;

  /**
A JSON object to send as the request body to access Hyperbolic features & upstream provider features.
  */
  extraBody?: Record<string, unknown>;

  /**
   * Record of provider slugs to API keys for injecting into provider routing.
   * Maps provider slugs (e.g. "anthropic", "openai") to their respective API keys.
   */
  api_keys?: Record<string, string>;
}

/**
Create an Hyperbolic provider instance.
 */
export function createHyperbolic(options: HyperbolicProviderSettings = {}): HyperbolicProvider {
  const baseURL =
    withoutTrailingSlash(options.baseURL ?? options.baseUrl) ?? "https://api.hyperbolic.xyz/v1";

  // we default to compatible, because strict breaks providers like Groq:
  const compatibility = options.compatibility ?? "compatible";

  const getHeaders = () =>
    withUserAgentSuffix(
      {
        Authorization: `Bearer ${loadApiKey({
          apiKey: options.apiKey,
          environmentVariableName: "HYPERBOLIC_API_KEY",
          description: "Hyperbolic",
        })}`,
        ...options.headers,
        ...(options.api_keys &&
          Object.keys(options.api_keys).length > 0 && {
            "X-Provider-API-Keys": JSON.stringify(options.api_keys),
          }),
      },
      `ai-sdk/hyperbolic/${VERSION}`,
    );

  const createChatModel = (modelId: HyperbolicChatModelId, settings: HyperbolicChatSettings = {}) =>
    new HyperbolicChatLanguageModel(modelId, settings, {
      provider: "hyperbolic.chat",
      url: ({ path }) => `${baseURL}${path}`,
      headers: getHeaders,
      compatibility,
      fetch: options.fetch,
      extraBody: options.extraBody,
    });

  const createCompletionModel = (
    modelId: HyperbolicCompletionModelId,
    settings: HyperbolicCompletionSettings = {},
  ) =>
    new HyperbolicCompletionLanguageModel(modelId, settings, {
      provider: "hyperbolic.completion",
      url: ({ path }) => `${baseURL}${path}`,
      headers: getHeaders,
      compatibility,
      fetch: options.fetch,
      extraBody: options.extraBody,
    });

  const createImageModel = (
    modelId: HyperbolicImageModelId,
    settings: HyperbolicImageSettings = {},
  ) =>
    new HyperbolicImageModel(modelId, settings, {
      provider: "hyperbolic.image",
      url: ({ path }) => `${baseURL}${path}`,
      headers: getHeaders,
      compatibility,
      fetch: options.fetch,
      extraBody: options.extraBody,
    });

  const createLanguageModel = (
    modelId: HyperbolicChatModelId | HyperbolicCompletionModelId,
    settings?: HyperbolicChatSettings | HyperbolicCompletionSettings,
  ) => {
    if (new.target) {
      throw new Error("The Hyperbolic model function cannot be called with the new keyword.");
    }

    return createChatModel(modelId, settings as HyperbolicChatSettings);
  };

  const provider = (
    modelId: HyperbolicChatModelId | HyperbolicCompletionModelId,
    settings?: HyperbolicChatSettings | HyperbolicCompletionSettings,
  ) => createLanguageModel(modelId, settings);

  provider.languageModel = createLanguageModel;
  provider.chat = createChatModel;
  provider.completion = createCompletionModel;
  provider.image = createImageModel;

  return provider as HyperbolicProvider;
}

/**
Default Hyperbolic provider instance. It uses 'strict' compatibility mode.
 */
export const hyperbolic = createHyperbolic({
  compatibility: "strict", // strict for Hyperbolic API
});
