import type { EmbeddingModelV1, LanguageModelV1, ProviderV1 } from "@ai-sdk/provider";
import type { FetchFunction } from "@ai-sdk/provider-utils";
import { loadApiKey, withoutTrailingSlash } from "@ai-sdk/provider-utils";

import type { HyperbolicChatModelId, HyperbolicChatSettings } from "./hyperbolic-chat-settings";
import type {
  HyperbolicEmbeddingModelId,
  HyperbolicEmbeddingSettings,
} from "./hyperbolic-embedding-settings";
import { HyperbolicChatLanguageModel } from "./hyperbolic-chat-language-model";
import { HyperbolicEmbeddingModel } from "./hyperbolic-embedding-model";

export interface HyperbolicProvider extends ProviderV1 {
  (modelId: HyperbolicChatModelId, settings?: HyperbolicChatSettings): LanguageModelV1;

  /**
Creates a model for text generation.
*/
  languageModel(modelId: HyperbolicChatModelId, settings?: HyperbolicChatSettings): LanguageModelV1;

  /**
Creates a model for text generation.
*/
  chat(modelId: HyperbolicChatModelId, settings?: HyperbolicChatSettings): LanguageModelV1;

  /**
@deprecated Use `textEmbeddingModel()` instead.
   */
  embedding(
    modelId: HyperbolicEmbeddingModelId,
    settings?: HyperbolicEmbeddingSettings,
  ): EmbeddingModelV1<string>;

  /**
@deprecated Use `textEmbeddingModel()` instead.
   */
  textEmbedding(
    modelId: HyperbolicEmbeddingModelId,
    settings?: HyperbolicEmbeddingSettings,
  ): EmbeddingModelV1<string>;

  textEmbeddingModel: (
    modelId: HyperbolicEmbeddingModelId,
    settings?: HyperbolicEmbeddingSettings,
  ) => EmbeddingModelV1<string>;
}

export interface HyperbolicProviderSettings {
  /**
Use a different URL prefix for API calls, e.g. to use proxy servers.
The default prefix is `https://api.hyperbolic.ai/v1`.
   */
  baseURL?: string;

  /**
API key that is being send using the `Authorization` header.
It defaults to the `HYPERBOLIC_API_KEY` environment variable.
   */
  apiKey?: string;

  /**
Custom headers to include in the requests.
     */
  headers?: Record<string, string>;

  /**
Custom fetch implementation. You can use it as a middleware to intercept requests,
or to provide a custom fetch implementation for e.g. testing.
    */
  fetch?: FetchFunction;
}

/**
Create a Hyperbolic AI provider instance.
 */
export function createHyperbolic(options: HyperbolicProviderSettings = {}): HyperbolicProvider {
  const baseURL = withoutTrailingSlash(options.baseURL) ?? "https://api.hyperbolic.ai/v1";

  const getHeaders = () => ({
    Authorization: `Bearer ${loadApiKey({
      apiKey: options.apiKey,
      environmentVariableName: "HYPERBOLIC_API_KEY",
      description: "Hyperbolic",
    })}`,
    ...options.headers,
  });

  const createChatModel = (modelId: HyperbolicChatModelId, settings: HyperbolicChatSettings = {}) =>
    new HyperbolicChatLanguageModel(modelId, settings, {
      provider: "hyperbolic.chat",
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
    });

  const createEmbeddingModel = (
    modelId: HyperbolicEmbeddingModelId,
    settings: HyperbolicEmbeddingSettings = {},
  ) =>
    new HyperbolicEmbeddingModel(modelId, settings, {
      provider: "hyperbolic.embedding",
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
    });

  const provider = function (modelId: HyperbolicChatModelId, settings?: HyperbolicChatSettings) {
    if (new.target) {
      throw new Error("The Hyperbolic model function cannot be called with the new keyword.");
    }

    return createChatModel(modelId, settings);
  };

  provider.languageModel = createChatModel;
  provider.chat = createChatModel;
  provider.embedding = createEmbeddingModel;
  provider.textEmbedding = createEmbeddingModel;
  provider.textEmbeddingModel = createEmbeddingModel;

  return provider;
}

/**
Default Hyperbolic provider instance.
 */
export const hyperbolic = createHyperbolic();
