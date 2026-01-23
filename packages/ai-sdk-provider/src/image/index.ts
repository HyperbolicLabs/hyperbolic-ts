import type { ImageModelV3, SharedV3Warning } from "@ai-sdk/provider";
import { combineHeaders, createJsonResponseHandler, postJsonToApi } from "@ai-sdk/provider-utils";
import { z } from "zod";

import type {
  HyperbolicImageModelId,
  HyperbolicImageProviderOptions,
  HyperbolicImageProviderResponseMetadata,
  HyperbolicImageSettings,
} from "./hyperbolic-image-settings";
import { hyperbolicFailedResponseHandler } from "../utils/hyperbolic-error";

type HyperbolicImageModelConfig = {
  provider: string;
  compatibility: "strict" | "compatible";
  headers: () => Record<string, string | undefined>;
  url: (options: { modelId: string; path: string }) => string;
  fetch?: typeof fetch;
  extraBody?: Record<string, unknown>;
};

export class HyperbolicImageModel implements ImageModelV3 {
  readonly specificationVersion = "v3";
  readonly provider = "hyperbolic.image";

  get maxImagesPerCall(): number {
    return this.settings.maxImagesPerCall ?? 1;
  }

  constructor(
    readonly modelId: HyperbolicImageModelId,
    private readonly settings: HyperbolicImageSettings,
    private readonly config: HyperbolicImageModelConfig,
  ) {}

  async doGenerate(
    options: Omit<Parameters<ImageModelV3["doGenerate"]>[0], "providerOptions"> & {
      providerOptions: {
        hyperbolic?: HyperbolicImageProviderOptions;
      };
    },
  ): Promise<
    Omit<Awaited<ReturnType<ImageModelV3["doGenerate"]>>, "response"> & {
      response: Awaited<ReturnType<ImageModelV3["doGenerate"]>>["response"] & {
        hyperbolic: HyperbolicImageProviderResponseMetadata;
      };
    }
  > {
    const warnings: Array<SharedV3Warning> = [];
    const [width, height] = options.size ? options.size.split("x").map(Number) : [];

    const args = {
      prompt: options.prompt,
      height,
      width,
      cfg_scale: options.providerOptions?.hyperbolic?.cfgScale,
      enable_refiner: options.providerOptions?.hyperbolic?.enableRefiner,
      model_name: this.modelId,
      negative_prompt: options.providerOptions?.hyperbolic?.negativePrompt,
      steps: options.providerOptions?.hyperbolic?.steps,
      strength: options.providerOptions?.hyperbolic?.strength,
      image: options.providerOptions?.hyperbolic?.image,
    };

    if (options.aspectRatio != undefined) {
      warnings.push({
        type: "unsupported",
        feature: "aspectRatio",
        details: "This model does not support `aspectRatio`. Use `size` instead.",
      });
    }
    if (options.seed != undefined) {
      warnings.push({
        type: "unsupported",
        feature: "seed",
        details: "This model does not support `seed`.",
      });
    }
    if (options.n != undefined) {
      warnings.push({
        type: "unsupported",
        feature: "n",
        details: "This model does not support `n`.",
      });
    }

    const { value: response, responseHeaders } = await postJsonToApi({
      url: this.config.url({
        path: "/image/generation",
        modelId: this.modelId,
      }),
      headers: combineHeaders(this.config.headers(), options.headers),
      body: args,
      failedResponseHandler: hyperbolicFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(hyperbolicImageResponseSchema),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    return {
      images: response.images.map((image) => image.image),
      warnings,
      response: {
        timestamp: new Date(),
        modelId: this.modelId,
        headers: responseHeaders,
        hyperbolic: {
          inferenceTime: response.inference_time,
          randomSeeds: response.images.map((image) => image.random_seed),
        },
      },
    };
  }
}

// minimal version of the schema, focussed on what is needed for the implementation to avoid breaking changes
const hyperbolicImageResponseSchema = z.object({
  images: z.array(
    z.object({
      image: z.string(),
      index: z.number(),
      random_seed: z.number(),
    }),
  ),
  inference_time: z.number(),
});

export * from "./hyperbolic-image-settings";
