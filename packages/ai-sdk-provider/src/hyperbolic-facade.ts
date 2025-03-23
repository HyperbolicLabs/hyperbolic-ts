import { loadApiKey, withoutTrailingSlash } from "@ai-sdk/provider-utils";

import type { HyperbolicChatModelId, HyperbolicChatSettings } from "./hyperbolic-chat-settings";
import type {
  HyperbolicCompletionModelId,
  HyperbolicCompletionSettings,
} from "./hyperbolic-completion-settings";
import type { HyperbolicProviderSettings } from "./hyperbolic-provider";
import { HyperbolicChatLanguageModel } from "./hyperbolic-chat-language-model";
import { HyperbolicCompletionLanguageModel } from "./hyperbolic-completion-language-model";

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
API key that is being send using the `Authorization` header.
It defaults to the `OPENROUTER_API_KEY` environment variable.
 */
  readonly apiKey?: string;

  /**
Custom headers to include in the requests.
   */
  readonly headers?: Record<string, string>;

  /**
   * Creates a new Hyperbolic provider instance.
   */
  constructor(options: HyperbolicProviderSettings = {}) {
    this.baseURL =
      withoutTrailingSlash(options.baseURL ?? options.baseUrl) ?? "https://api.hyperbolic.xyz/v1";
    this.apiKey = options.apiKey;
    this.headers = options.headers;
  }

  private get baseConfig() {
    return {
      baseURL: this.baseURL,
      headers: () => ({
        Authorization: `Bearer ${loadApiKey({
          apiKey: this.apiKey,
          environmentVariableName: "OPENROUTER_API_KEY",
          description: "Hyperbolic",
        })}`,
        ...this.headers,
      }),
    };
  }

  chat(modelId: HyperbolicChatModelId, settings: HyperbolicChatSettings = {}) {
    return new HyperbolicChatLanguageModel(modelId, settings, {
      provider: "openrouter.chat",
      ...this.baseConfig,
      compatibility: "strict",
      url: ({ path }) => `${this.baseURL}${path}`,
    });
  }

  completion(modelId: HyperbolicCompletionModelId, settings: HyperbolicCompletionSettings = {}) {
    return new HyperbolicCompletionLanguageModel(modelId, settings, {
      provider: "openrouter.completion",
      ...this.baseConfig,
      compatibility: "strict",
      url: ({ path }) => `${this.baseURL}${path}`,
    });
  }
}
