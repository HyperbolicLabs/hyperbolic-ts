import type { SharedV3Warning, SpeechModelV3 } from "@ai-sdk/provider";
import { combineHeaders, createJsonResponseHandler, postJsonToApi } from "@ai-sdk/provider-utils";
// Import the v4 entry point, matching every other schema in this package. Mixing
// `zod` and `zod/v4` imports loads two different Zod runtimes into one bundle,
// and a schema built by one is not recognised by helpers that expect the other.
import { z } from "zod/v4";

import type {
  HyperbolicSpeechModelId,
  HyperbolicSpeechProviderOptions,
  HyperbolicSpeechProviderResponseMetadata,
  HyperbolicSpeechSettings,
} from "./hyperbolic-speech-settings";
import { hyperbolicFailedResponseHandler } from "../schemas/error-response";

type HyperbolicSpeechModelConfig = {
  provider: string;
  headers: () => Record<string, string | undefined>;
  url: (options: { modelId: string; path: string }) => string;
  fetch?: typeof fetch;
  extraBody?: Record<string, unknown>;
};

export class HyperbolicSpeechModel implements SpeechModelV3 {
  readonly specificationVersion = "v3";
  readonly provider = "hyperbolic.speech";

  constructor(
    readonly modelId: HyperbolicSpeechModelId,
    private readonly settings: HyperbolicSpeechSettings,
    private readonly config: HyperbolicSpeechModelConfig,
  ) {}

  async doGenerate(
    options: Omit<Parameters<SpeechModelV3["doGenerate"]>[0], "providerOptions"> & {
      providerOptions: {
        hyperbolic?: HyperbolicSpeechProviderOptions;
      };
    },
  ): Promise<
    Omit<Awaited<ReturnType<SpeechModelV3["doGenerate"]>>, "response"> & {
      response: Awaited<ReturnType<SpeechModelV3["doGenerate"]>>["response"] & {
        hyperbolic: HyperbolicSpeechProviderResponseMetadata;
      };
    }
  > {
    const warnings: Array<SharedV3Warning> = [];

    // The AI SDK speech contract carries several call options that the
    // Hyperbolic audio endpoint does not accept. They were previously dropped
    // without a word, so a caller passing `voice` got default output and no
    // indication why. The cast keeps this readable across SDK versions that add
    // or rename these optional fields.
    const callOptions = options as unknown as {
      speed?: number;
      voice?: string;
      outputFormat?: string;
      instructions?: string;
      language?: string;
    };

    for (const feature of ["voice", "outputFormat", "instructions", "language"] as const) {
      if (callOptions[feature] != undefined) {
        warnings.push({
          type: "unsupported",
          feature,
          details: `This model does not support \`${feature}\`.`,
        });
      }
    }

    const args = {
      text: options.text,
      model: this.modelId,
      // Precedence: provider-specific option, then the standard SDK `speed`
      // option (previously ignored entirely), then the API default of 1.
      speed: options.providerOptions?.hyperbolic?.speed ?? callOptions.speed ?? 1,
      // `extraBody` exists so callers can reach Hyperbolic and upstream provider
      // features this provider does not model explicitly. Both levels were
      // accepted and then never sent, making the option silently inert.
      // Provider-level values are applied first so the model-level `settings`
      // (the more specific scope) can override them.
      ...this.config.extraBody,
      ...this.settings.extraBody,
    };

    const { value: response, responseHeaders } = await postJsonToApi({
      url: this.config.url({
        path: "/audio/generation",
        modelId: this.modelId,
      }),
      headers: combineHeaders(this.config.headers(), options.headers),
      body: args,
      failedResponseHandler: hyperbolicFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(hyperbolicSpeechResponseSchema),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    return {
      audio: response.audio,
      response: {
        timestamp: new Date(),
        modelId: this.modelId,
        headers: responseHeaders,
        hyperbolic: {
          inferenceTime: response.inference_time,
        },
      },
      warnings,
    };
  }
}

// minimal version of the schema, focussed on what is needed for the implementation to avoid breaking changes
const hyperbolicSpeechResponseSchema = z.object({
  /**
   * Base64 coded audio
   * The generated audio
   */
  audio: z.string(),
  inference_time: z.number(),
  /**
   * Sample rate of the audio
   */
  sample_rate: z.number(),
  /**
   * usage
   */
  usage: z.number(),
  /**
   * A unique identifier for the request
   */
  request_id: z.string().nullable().optional().default(null),
});

export * from "./hyperbolic-speech-settings";
