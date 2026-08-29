import type { ImageModelV3, SharedV3Warning } from "@ai-sdk/provider";
import { combineHeaders, createJsonResponseHandler, postJsonToApi } from "@ai-sdk/provider-utils";
// Import the v4 entry point, matching every other schema in this package. Mixing
// `zod` and `zod/v4` imports loads two different Zod runtimes into one bundle,
// and a schema built by one is not recognised by helpers that expect the other.
import { z } from "zod/v4";

import type {
  HyperbolicImageModelId,
  HyperbolicImageProviderOptions,
  HyperbolicImageProviderResponseMetadata,
  HyperbolicImageSettings,
} from "./hyperbolic-image-settings";
import { hyperbolicFailedResponseHandler } from "../schemas/error-response";

type HyperbolicImageModelConfig = {
  provider: string;
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

    // `size` is a free-form string in the AI SDK contract, so it has to be
    // validated here. `"1024x1024".split("x").map(Number)` silently produced
    // `NaN` for inputs such as "1024 x 1024" or "large", and `NaN` serialises to
    // `null` in JSON — the request then failed server-side with an opaque error
    // instead of telling the caller which value was wrong.
    let width: number | undefined;
    let height: number | undefined;
    if (options.size != undefined) {
      const parsed = parseImageSize(options.size);
      if (parsed) {
        width = parsed.width;
        height = parsed.height;
      } else {
        warnings.push({
          type: "unsupported",
          feature: "size",
          details: `Could not parse \`size\`: "${options.size}". Expected the format "<width>x<height>", e.g. "1024x1024". The model default will be used instead.`,
        });
      }
    }

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
      // `extraBody` exists so callers can reach Hyperbolic and upstream provider
      // features this provider does not model explicitly. Both levels were
      // accepted and then never sent, making the option silently inert.
      // Provider-level values are applied first so the model-level `settings`
      // (the more specific scope) can override them.
      ...this.config.extraBody,
      ...this.settings.extraBody,
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

/**
 * Parses an AI SDK `size` string of the form `"<width>x<height>"`.
 *
 * @param size - The requested size, e.g. `"1024x1024"`.
 * @returns The parsed dimensions, or `undefined` if `size` is not two positive
 * integers separated by `x`. Returning `undefined` rather than `NaN` lets the
 * caller emit a warning instead of sending an invalid request body.
 */
export function parseImageSize(size: string): { width: number; height: number } | undefined {
  const match = /^(\d+)\s*[x×]\s*(\d+)$/i.exec(size.trim());
  if (!match) {
    return undefined;
  }

  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) {
    return undefined;
  }

  return { width, height };
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
