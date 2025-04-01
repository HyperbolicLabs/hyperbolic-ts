// Modified by Hyperbolic Labs, Inc. on 2025-03-25
// Original work Copyright 2025 OpenRouter Inc.
// Licensed under the Apache License, Version 2.0

import type {
  LanguageModelV1,
  LanguageModelV1FinishReason,
  LanguageModelV1LogProbs,
  LanguageModelV1StreamPart,
} from "@ai-sdk/provider";
import type { ParseResult } from "@ai-sdk/provider-utils";
import { UnsupportedFunctionalityError } from "@ai-sdk/provider";
import {
  combineHeaders,
  createEventSourceResponseHandler,
  createJsonResponseHandler,
  postJsonToApi,
} from "@ai-sdk/provider-utils";
import { z } from "zod";

import type {
  HyperbolicCompletionModelId,
  HyperbolicCompletionSettings,
} from "./hyperbolic-completion-settings";
import { convertToHyperbolicCompletionPrompt } from "./convert-to-hyperbolic-completion-prompt";
import {
  HyperbolicErrorResponseSchema,
  hyperbolicFailedResponseHandler,
  isHyperbolicError,
} from "./hyperbolic-error";
import { mapHyperbolicCompletionLogProbs } from "./map-hyperbolic-completion-logprobs";
import { mapHyperbolicFinishReason } from "./map-hyperbolic-finish-reason";

type HyperbolicCompletionConfig = {
  provider: string;
  compatibility: "strict" | "compatible";
  headers: () => Record<string, string | undefined>;
  url: (options: { modelId: string; path: string }) => string;
  fetch?: typeof fetch;
  extraBody?: Record<string, unknown>;
};

export class HyperbolicCompletionLanguageModel implements LanguageModelV1 {
  readonly specificationVersion = "v1";
  readonly defaultObjectGenerationMode = undefined;

  readonly modelId: HyperbolicCompletionModelId;
  readonly settings: HyperbolicCompletionSettings;

  private readonly config: HyperbolicCompletionConfig;

  constructor(
    modelId: HyperbolicCompletionModelId,
    settings: HyperbolicCompletionSettings,
    config: HyperbolicCompletionConfig,
  ) {
    this.modelId = modelId;
    this.settings = settings;
    this.config = config;
  }

  get provider(): string {
    return this.config.provider;
  }

  private getArgs({
    mode,
    inputFormat,
    prompt,
    maxTokens,
    temperature,
    topP,
    frequencyPenalty,
    presencePenalty,
    seed,
    responseFormat,
    topK,
    stopSequences,
    providerMetadata,
  }: Parameters<LanguageModelV1["doGenerate"]>[0]) {
    const type = mode.type;

    const extraCallingBody = providerMetadata?.["hyperbolic"] ?? {};

    const { prompt: completionPrompt } = convertToHyperbolicCompletionPrompt({
      prompt,
      inputFormat,
    });

    const baseArgs = {
      // model id:
      model: this.modelId,
      models: this.settings.models,

      // model specific settings:
      logit_bias: this.settings.logitBias,
      logprobs:
        typeof this.settings.logprobs === "number"
          ? this.settings.logprobs
          : typeof this.settings.logprobs === "boolean"
            ? this.settings.logprobs
              ? 0
              : undefined
            : undefined,
      suffix: this.settings.suffix,
      user: this.settings.user,

      // standardized settings:
      max_tokens: maxTokens,
      temperature,
      top_p: topP,
      frequency_penalty: frequencyPenalty,
      presence_penalty: presencePenalty,
      seed,

      stop: stopSequences,
      response_format: responseFormat,
      top_k: topK,

      // prompt:
      prompt: completionPrompt,

      // Hyperbolic specific settings:
      include_reasoning: this.settings.includeReasoning,
      reasoning: this.settings.reasoning,

      // extra body:
      ...this.config.extraBody,
      ...this.settings.extraBody,
      ...extraCallingBody,
    };

    switch (type) {
      case "regular": {
        if (mode.tools?.length) {
          throw new UnsupportedFunctionalityError({
            functionality: "tools",
          });
        }

        if (mode.toolChoice) {
          throw new UnsupportedFunctionalityError({
            functionality: "toolChoice",
          });
        }

        return baseArgs;
      }

      case "object-json": {
        throw new UnsupportedFunctionalityError({
          functionality: "object-json mode",
        });
      }

      case "object-tool": {
        throw new UnsupportedFunctionalityError({
          functionality: "object-tool mode",
        });
      }

      // Handle all non-text types with a single default case
      default: {
        const _exhaustiveCheck: never = type;
        throw new UnsupportedFunctionalityError({
          functionality: `${_exhaustiveCheck} mode`,
        });
      }
    }
  }

  async doGenerate(
    options: Parameters<LanguageModelV1["doGenerate"]>[0],
  ): Promise<Awaited<ReturnType<LanguageModelV1["doGenerate"]>>> {
    const args = this.getArgs(options);

    const { responseHeaders, value: response } = await postJsonToApi({
      url: this.config.url({
        path: "/completions",
        modelId: this.modelId,
      }),
      headers: combineHeaders(this.config.headers(), options.headers),
      body: args,
      failedResponseHandler: hyperbolicFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(HyperbolicCompletionChunkSchema),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    const { prompt: rawPrompt, ...rawSettings } = args;
    if (isHyperbolicError(response)) {
      throw new Error(`${response.message}`);
    }

    const choice = response.choices[0];

    if (!choice) {
      throw new Error("No choice in Hyperbolic completion response");
    }

    return {
      response: {
        id: response.id,
        modelId: response.model,
      },
      text: choice.text ?? "",
      reasoning: choice.reasoning || undefined,
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
      },
      finishReason: mapHyperbolicFinishReason(choice.finish_reason),
      logprobs: mapHyperbolicCompletionLogProbs(choice.logprobs),
      rawCall: { rawPrompt, rawSettings },
      rawResponse: { headers: responseHeaders },
      warnings: [],
    };
  }

  async doStream(
    options: Parameters<LanguageModelV1["doStream"]>[0],
  ): Promise<Awaited<ReturnType<LanguageModelV1["doStream"]>>> {
    const args = this.getArgs(options);

    const { responseHeaders, value: response } = await postJsonToApi({
      url: this.config.url({
        path: "/completions",
        modelId: this.modelId,
      }),
      headers: combineHeaders(this.config.headers(), options.headers),
      body: {
        ...this.getArgs(options),
        stream: true,

        // only include stream_options when in strict compatibility mode:
        stream_options:
          this.config.compatibility === "strict" ? { include_usage: true } : undefined,
      },
      failedResponseHandler: hyperbolicFailedResponseHandler,
      successfulResponseHandler: createEventSourceResponseHandler(HyperbolicCompletionChunkSchema),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    const { prompt: rawPrompt, ...rawSettings } = args;

    let finishReason: LanguageModelV1FinishReason = "other";
    let usage: { promptTokens: number; completionTokens: number } = {
      promptTokens: Number.NaN,
      completionTokens: Number.NaN,
    };
    let logprobs: LanguageModelV1LogProbs;

    return {
      stream: response.pipeThrough(
        new TransformStream<
          ParseResult<z.infer<typeof HyperbolicCompletionChunkSchema>>,
          LanguageModelV1StreamPart
        >({
          transform(chunk, controller) {
            // handle failed chunk parsing / validation:
            if (!chunk.success) {
              finishReason = "error";
              controller.enqueue({ type: "error", error: chunk.error });
              return;
            }

            const value = chunk.value;

            // handle error chunks:
            if (isHyperbolicError(value)) {
              finishReason = "error";
              controller.enqueue({ type: "error", error: value });
              return;
            }

            if (value.usage != null) {
              usage = {
                promptTokens: value.usage.prompt_tokens,
                completionTokens: value.usage.completion_tokens,
              };
            }

            const choice = value.choices[0];

            if (choice?.finish_reason != null) {
              finishReason = mapHyperbolicFinishReason(choice.finish_reason);
            }

            if (choice?.text != null) {
              controller.enqueue({
                type: "text-delta",
                textDelta: choice.text,
              });
            }

            const mappedLogprobs = mapHyperbolicCompletionLogProbs(choice?.logprobs);
            if (mappedLogprobs?.length) {
              if (logprobs === undefined) logprobs = [];
              logprobs.push(...mappedLogprobs);
            }
          },

          flush(controller) {
            controller.enqueue({
              type: "finish",
              finishReason,
              logprobs,
              usage,
            });
          },
        }),
      ),
      rawCall: { rawPrompt, rawSettings },
      rawResponse: { headers: responseHeaders },
      warnings: [],
    };
  }
}

// limited version of the schema, focussed on what is needed for the implementation
// this approach limits breakages when the API changes and increases efficiency
const HyperbolicCompletionChunkSchema = z.union([
  z.object({
    id: z.string().optional(),
    model: z.string().optional(),
    choices: z.array(
      z.object({
        text: z.string(),
        reasoning: z.string().nullish().optional(),
        finish_reason: z.string().nullish(),
        index: z.number(),
        logprobs: z
          .object({
            tokens: z.array(z.string()),
            token_logprobs: z.array(z.number()),
            top_logprobs: z.array(z.record(z.string(), z.number())).nullable(),
          })
          .nullable()
          .optional(),
      }),
    ),
    usage: z
      .object({
        prompt_tokens: z.number(),
        completion_tokens: z.number(),
      })
      .optional()
      .nullable(),
  }),
  HyperbolicErrorResponseSchema,
]);
