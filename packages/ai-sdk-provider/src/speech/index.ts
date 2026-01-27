import type { SharedV3Warning, SpeechModelV3 } from "@ai-sdk/provider";
import { combineHeaders, createJsonResponseHandler, postJsonToApi } from "@ai-sdk/provider-utils";
import { z } from "zod";

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

    const args = {
      text: options.text,
      model: this.modelId,
      speed: options.providerOptions?.hyperbolic?.speed ?? 1,
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
