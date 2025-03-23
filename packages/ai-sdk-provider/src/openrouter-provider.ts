import { loadApiKey, withoutTrailingSlash } from "@ai-sdk/provider-utils";

import type { HyperbolicChatModelId, HyperbolicChatSettings } from "./openrouter-chat-settings";
import type {
  HyperbolicCompletionModelId,
  HyperbolicCompletionSettings,
} from "./openrouter-completion-settings";
import { HyperbolicChatLanguageModel } from "./openrouter-chat-language-model";
import { HyperbolicCompletionLanguageModel } from "./openrouter-completion-language-model";

export type { HyperbolicCompletionSettings };

export interface HyperbolicProvider {
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
Creates a Hyperbolic chat model for text generation.
   */
  chat(
    modelId: HyperbolicChatModelId,
    settings?: HyperbolicChatSettings,
  ): HyperbolicChatLanguageModel;

  /**
   * Creates a Hyperbolic completion model for text generation.
   */
  completion(
    modelId: HyperbolicCompletionModelId,
    settings?: HyperbolicCompletionSettings,
  ): HyperbolicCompletionLanguageModel;
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
}

/**
Create an Hyperbolic provider instance.
 */
export function createHyperbolic(options: HyperbolicProviderSettings = {}): HyperbolicProvider {
  const baseURL =
    withoutTrailingSlash(options.baseURL ?? options.baseUrl) ?? "https://openrouter.ai/api/v1";

  // we default to compatible, because strict breaks providers like Groq:
  const compatibility = options.compatibility ?? "compatible";

  const getHeaders = () => ({
    Authorization: `Bearer ${loadApiKey({
      apiKey: options.apiKey,
      environmentVariableName: "OPENROUTER_API_KEY",
      description: "Hyperbolic",
    })}`,
    ...options.headers,
  });

  const createChatModel = (modelId: HyperbolicChatModelId, settings: HyperbolicChatSettings = {}) =>
    new HyperbolicChatLanguageModel(modelId, settings, {
      provider: "openrouter.chat",
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
      provider: "openrouter.completion",
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

    if (modelId === "openai/gpt-3.5-turbo-instruct") {
      return createCompletionModel(modelId, settings as HyperbolicCompletionSettings);
    }

    return createChatModel(modelId, settings as HyperbolicChatSettings);
  };

  const provider = function (
    modelId: HyperbolicChatModelId | HyperbolicCompletionModelId,
    settings?: HyperbolicChatSettings | HyperbolicCompletionSettings,
  ) {
    return createLanguageModel(modelId, settings);
  };

  provider.languageModel = createLanguageModel;
  provider.chat = createChatModel;
  provider.completion = createCompletionModel;

  return provider as HyperbolicProvider;
}

/**
Default Hyperbolic provider instance. It uses 'strict' compatibility mode.
 */
export const openrouter = createHyperbolic({
  compatibility: "strict", // strict for Hyperbolic API
});
