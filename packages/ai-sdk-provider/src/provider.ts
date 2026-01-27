import type { ProviderV3 } from "@ai-sdk/provider";
import { loadApiKey, withoutTrailingSlash } from "@ai-sdk/provider-utils";

import type {
  HyperbolicImageModelId,
  HyperbolicImageSettings,
} from "./image/hyperbolic-image-settings";
import type { HyperbolicSpeechModelId, HyperbolicSpeechSettings } from "./speech";
import { HyperbolicImageModel } from "./image";
import { HyperbolicSpeechModel } from "./speech";
import { withUserAgentSuffix } from "./utils/with-user-agent-suffix";
import { VERSION } from "./version";

export interface HyperbolicProvider extends ProviderV3 {
  imageModel(
    modelId: HyperbolicImageModelId,
    settings?: HyperbolicImageSettings,
  ): HyperbolicImageModel;

  speechModel(
    modelId: HyperbolicSpeechModelId,
    settings?: HyperbolicSpeechSettings,
  ): HyperbolicSpeechModel;
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
 * Create an Hyperbolic provider instance.
 *
 * For chat and completion models, use the @openrouter/ai-sdk-provider instead.
 */
export function createHyperbolic(options: HyperbolicProviderSettings = {}): HyperbolicProvider {
  const baseURL =
    withoutTrailingSlash(options.baseURL ?? options.baseUrl) ?? "https://api.hyperbolic.xyz/v1";

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

  const createImageModel = (
    modelId: HyperbolicImageModelId,
    settings: HyperbolicImageSettings = {},
  ) =>
    new HyperbolicImageModel(modelId, settings, {
      provider: "hyperbolic.image",
      url: ({ path }) => `${baseURL}${path}`,
      headers: getHeaders,
      fetch: options.fetch,
      extraBody: options.extraBody,
    });

  const createSpeechModel = (
    modelId: HyperbolicSpeechModelId,
    settings: HyperbolicSpeechSettings = {},
  ) =>
    new HyperbolicSpeechModel(modelId, settings, {
      provider: "hyperbolic.speech",
      url: ({ path }) => `${baseURL}${path}`,
      headers: getHeaders,
      fetch: options.fetch,
      extraBody: options.extraBody,
    });

  const provider: HyperbolicProvider = {
    specificationVersion: "v3",
    imageModel: createImageModel,
    speechModel: createSpeechModel,

    embeddingModel: () => {
      throw new Error("Not implemented");
    },
    languageModel: () => {
      throw new Error("Not implemented");
    },
  };

  return provider;
}

/**
 * Default Hyperbolic provider instance.  Requires a valid API key set to the `HYPERBOLIC_API_KEY` environment variable.
 */
export const hyperbolic = createHyperbolic();
