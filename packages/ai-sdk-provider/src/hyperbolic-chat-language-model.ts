// Modified by Hyperbolic Labs, Inc. on 2025-03-25
// Original work Copyright 2025 OpenRouter Inc.
// Licensed under the Apache License, Version 2.0

import type {
  LanguageModelV1,
  LanguageModelV1FinishReason,
  LanguageModelV1FunctionTool,
  LanguageModelV1LogProbs,
  LanguageModelV1ProviderDefinedTool,
  LanguageModelV1StreamPart,
} from "@ai-sdk/provider";
import type { ParseResult } from "@ai-sdk/provider-utils";
import { InvalidResponseDataError, UnsupportedFunctionalityError } from "@ai-sdk/provider";
import {
  combineHeaders,
  createEventSourceResponseHandler,
  createJsonResponseHandler,
  generateId,
  isParsableJson,
  postJsonToApi,
} from "@ai-sdk/provider-utils";
import { z } from "zod";

import type { HyperbolicChatModelId, HyperbolicChatSettings } from "./hyperbolic-chat-settings";
import { convertToHyperbolicChatMessages } from "./convert-to-hyperbolic-chat-messages";
import {
  HyperbolicErrorResponseSchema,
  hyperbolicFailedResponseHandler,
  isHyperbolicError,
  tryParsingHyperbolicError,
} from "./hyperbolic-error";
import { mapHyperbolicChatLogProbsOutput } from "./map-hyperbolic-chat-logprobs";
import { mapHyperbolicFinishReason } from "./map-hyperbolic-finish-reason";

function isFunctionTool(
  tool: LanguageModelV1FunctionTool | LanguageModelV1ProviderDefinedTool,
): tool is LanguageModelV1FunctionTool {
  return "parameters" in tool;
}

type HyperbolicChatConfig = {
  provider: string;
  compatibility: "strict" | "compatible";
  headers: () => Record<string, string | undefined>;
  url: (options: { modelId: string; path: string }) => string;
  fetch?: typeof fetch;
  extraBody?: Record<string, unknown>;
};

export class HyperbolicChatLanguageModel implements LanguageModelV1 {
  readonly specificationVersion = "v1";
  readonly defaultObjectGenerationMode = "tool";

  readonly modelId: HyperbolicChatModelId;
  readonly settings: HyperbolicChatSettings;

  private readonly config: HyperbolicChatConfig;

  constructor(
    modelId: HyperbolicChatModelId,
    settings: HyperbolicChatSettings,
    config: HyperbolicChatConfig,
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
    prompt,
    maxTokens,
    temperature,
    topP,
    frequencyPenalty,
    presencePenalty,
    seed,
    stopSequences,
    responseFormat,
    topK,
    providerMetadata,
  }: Parameters<LanguageModelV1["doGenerate"]>[0]) {
    const type = mode.type;
    const extraCallingBody = providerMetadata?.["hyperbolic"] ?? {};

    const baseArgs = {
      // model id:
      model: this.modelId,
      models: this.settings.models,

      // model specific settings:
      logit_bias: this.settings.logitBias,
      logprobs:
        this.settings.logprobs === true || typeof this.settings.logprobs === "number"
          ? true
          : undefined,
      top_logprobs:
        typeof this.settings.logprobs === "number"
          ? this.settings.logprobs
          : typeof this.settings.logprobs === "boolean"
            ? this.settings.logprobs
              ? 0
              : undefined
            : undefined,
      user: this.settings.user,
      parallel_tool_calls: this.settings.parallelToolCalls,

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

      // messages:
      messages: convertToHyperbolicChatMessages(prompt),

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
        return { ...baseArgs, ...prepareToolsAndToolChoice(mode) };
      }

      case "object-json": {
        return {
          ...baseArgs,
          response_format: { type: "json_object" },
        };
      }

      case "object-tool": {
        return {
          ...baseArgs,
          tool_choice: { type: "function", function: { name: mode.tool.name } },
          tools: [
            {
              type: "function",
              function: {
                name: mode.tool.name,
                description: mode.tool.description,
                parameters: mode.tool.parameters,
              },
            },
          ],
        };
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
        path: "/chat/completions",
        modelId: this.modelId,
      }),
      headers: combineHeaders(this.config.headers(), options.headers),
      body: args,
      failedResponseHandler: hyperbolicFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(
        HyperbolicNonStreamChatCompletionResponseSchema,
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    const { messages: rawPrompt, ...rawSettings } = args;
    const choice = response.choices[0];

    if (!choice) {
      throw new Error("No choice in response");
    }

    return {
      response: {
        id: response.id,
        modelId: response.model,
      },
      text: choice.message.content ?? undefined,
      reasoning: choice.message.reasoning ?? undefined,
      toolCalls: choice.message.tool_calls?.map((toolCall) => ({
        toolCallType: "function",
        toolCallId: toolCall.id ?? generateId(),
        toolName: toolCall.function.name,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        args: toolCall.function.arguments!,
      })),
      finishReason: mapHyperbolicFinishReason(choice.finish_reason),
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
      },
      rawCall: { rawPrompt, rawSettings },
      rawResponse: { headers: responseHeaders },
      warnings: [],
      logprobs: mapHyperbolicChatLogProbsOutput(choice.logprobs),
    };
  }

  async doStream(
    options: Parameters<LanguageModelV1["doStream"]>[0],
  ): Promise<Awaited<ReturnType<LanguageModelV1["doStream"]>>> {
    const args = this.getArgs(options);

    const { responseHeaders, value: response } = await postJsonToApi({
      url: this.config.url({
        path: "/chat/completions",
        modelId: this.modelId,
      }),
      headers: combineHeaders(this.config.headers(), options.headers),
      body: {
        ...args,
        stream: true,

        // only include stream_options when in strict compatibility mode:
        stream_options:
          this.config.compatibility === "strict" ? { include_usage: true } : undefined,
      },
      failedResponseHandler: hyperbolicFailedResponseHandler,
      successfulResponseHandler: createEventSourceResponseHandler(
        HyperbolicStreamChatCompletionChunkSchema,
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    const { messages: rawPrompt, ...rawSettings } = args;

    const toolCalls: Array<{
      id: string;
      type: "function";
      function: {
        name: string;
        arguments: string;
      };
    }> = [];

    let finishReason: LanguageModelV1FinishReason = "other";
    let usage: { promptTokens: number; completionTokens: number } = {
      promptTokens: Number.NaN,
      completionTokens: Number.NaN,
    };
    let logprobs: LanguageModelV1LogProbs;

    return {
      stream: response.pipeThrough(
        new TransformStream<
          ParseResult<z.infer<typeof HyperbolicStreamChatCompletionChunkSchema>>,
          LanguageModelV1StreamPart
        >({
          transform(chunk, controller) {
            // handle failed chunk parsing / validation:
            if (!chunk.success) {
              finishReason = "error";

              // Error messages from the API are sometimes an ugly combo of text and JSON in a single chunk, so attempt to parse it as a hyperbolic error.
              const maybeHyperbolicError = tryParsingHyperbolicError(chunk.error);
              if (maybeHyperbolicError) {
                controller.enqueue({ type: "error", error: maybeHyperbolicError });
                return;
              }

              controller.enqueue({
                type: "error",
                error: chunk.error,
              });
              return;
            }

            const value = chunk.value;

            // handle error chunks:
            if (isHyperbolicError(value)) {
              finishReason = "error";
              controller.enqueue({ type: "error", error: value });
              return;
            }

            if (value.id) {
              controller.enqueue({
                type: "response-metadata",
                id: value.id,
              });
            }

            if (value.model) {
              controller.enqueue({
                type: "response-metadata",
                modelId: value.model,
              });
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

            if (choice?.delta == null) {
              return;
            }

            const delta = choice.delta;

            if (delta.content != null) {
              controller.enqueue({
                type: "text-delta",
                textDelta: delta.content,
              });
            }

            if (delta.reasoning != null) {
              controller.enqueue({
                type: "reasoning",
                textDelta: delta.reasoning,
              });
            }

            const mappedLogprobs = mapHyperbolicChatLogProbsOutput(choice?.logprobs);
            if (mappedLogprobs?.length) {
              if (logprobs === undefined) logprobs = [];
              logprobs.push(...mappedLogprobs);
            }

            if (delta.tool_calls != null) {
              for (const toolCallDelta of delta.tool_calls) {
                const index = toolCallDelta.index;

                // Tool call start. Hyperbolic returns all information except the arguments in the first chunk.
                if (toolCalls[index] == null) {
                  if (toolCallDelta.type !== "function") {
                    throw new InvalidResponseDataError({
                      data: toolCallDelta,
                      message: `Expected 'function' type.`,
                    });
                  }

                  if (toolCallDelta.id == null) {
                    throw new InvalidResponseDataError({
                      data: toolCallDelta,
                      message: `Expected 'id' to be a string.`,
                    });
                  }

                  if (toolCallDelta.function?.name == null) {
                    throw new InvalidResponseDataError({
                      data: toolCallDelta,
                      message: `Expected 'function.name' to be a string.`,
                    });
                  }

                  toolCalls[index] = {
                    id: toolCallDelta.id,
                    type: "function",
                    function: {
                      name: toolCallDelta.function.name,
                      arguments: toolCallDelta.function.arguments ?? "",
                    },
                  };

                  const toolCall = toolCalls[index];

                  if (toolCall == null) {
                    throw new Error("Tool call is missing");
                  }

                  // check if tool call is complete (some providers send the full tool call in one chunk)
                  if (
                    toolCall.function?.name != null &&
                    toolCall.function?.arguments != null &&
                    isParsableJson(toolCall.function.arguments)
                  ) {
                    // send delta
                    controller.enqueue({
                      type: "tool-call-delta",
                      toolCallType: "function",
                      toolCallId: toolCall.id,
                      toolName: toolCall.function.name,
                      argsTextDelta: toolCall.function.arguments,
                    });

                    // send tool call
                    controller.enqueue({
                      type: "tool-call",
                      toolCallType: "function",
                      toolCallId: toolCall.id ?? generateId(),
                      toolName: toolCall.function.name,
                      args: toolCall.function.arguments,
                    });
                  }

                  continue;
                }

                // existing tool call, merge
                const toolCall = toolCalls[index];

                if (toolCall == null) {
                  throw new Error("Tool call is missing");
                }

                if (toolCallDelta.function?.arguments != null) {
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  toolCall.function!.arguments += toolCallDelta.function?.arguments ?? "";
                }

                // send delta
                controller.enqueue({
                  type: "tool-call-delta",
                  toolCallType: "function",
                  toolCallId: toolCall.id,
                  toolName: toolCall.function.name,
                  argsTextDelta: toolCallDelta.function.arguments ?? "",
                });

                // check if tool call is complete
                if (
                  toolCall.function?.name != null &&
                  toolCall.function?.arguments != null &&
                  isParsableJson(toolCall.function.arguments)
                ) {
                  controller.enqueue({
                    type: "tool-call",
                    toolCallType: "function",
                    toolCallId: toolCall.id ?? generateId(),
                    toolName: toolCall.function.name,
                    args: toolCall.function.arguments,
                  });
                }
              }
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

const HyperbolicChatCompletionBaseResponseSchema = z.object({
  id: z.string().optional(),
  model: z.string().optional(),
  usage: z
    .object({
      prompt_tokens: z.number(),
      completion_tokens: z.number(),
      total_tokens: z.number(),
    })
    .nullish(),
});

// limited version of the schema, focussed on what is needed for the implementation
// this approach limits breakages when the API changes and increases efficiency
const HyperbolicNonStreamChatCompletionResponseSchema =
  HyperbolicChatCompletionBaseResponseSchema.extend({
    choices: z.array(
      z.object({
        message: z.object({
          role: z.literal("assistant"),
          content: z.string().nullable().optional(),
          reasoning: z.string().nullable().optional(),
          tool_calls: z
            .array(
              z.object({
                id: z.string().optional().nullable(),
                type: z.literal("function"),
                function: z.object({
                  name: z.string(),
                  arguments: z.string(),
                }),
              }),
            )
            .optional(),
        }),
        index: z.number(),
        logprobs: z
          .object({
            content: z
              .array(
                z.object({
                  token: z.string(),
                  logprob: z.number(),
                  top_logprobs: z.array(
                    z.object({
                      token: z.string(),
                      logprob: z.number(),
                    }),
                  ),
                }),
              )
              .nullable(),
          })
          .nullable()
          .optional(),
        finish_reason: z.string().optional().nullable(),
      }),
    ),
  });

// limited version of the schema, focussed on what is needed for the implementation
// this approach limits breakages when the API changes and increases efficiency
const HyperbolicStreamChatCompletionChunkSchema = z.union([
  HyperbolicChatCompletionBaseResponseSchema.extend({
    choices: z.array(
      z.object({
        delta: z
          .object({
            role: z.enum(["assistant"]).optional(),
            content: z.string().nullish(),
            reasoning: z.string().nullish().optional(),
            tool_calls: z
              .array(
                z.object({
                  index: z.number(),
                  id: z.string().nullish(),
                  type: z.literal("function").optional(),
                  function: z.object({
                    name: z.string().nullish(),
                    arguments: z.string().nullish(),
                  }),
                }),
              )
              .nullish(),
          })
          .nullish(),
        logprobs: z
          .object({
            content: z
              .array(
                z.object({
                  token: z.string(),
                  logprob: z.number(),
                  top_logprobs: z.array(
                    z.object({
                      token: z.string(),
                      logprob: z.number(),
                    }),
                  ),
                }),
              )
              .nullable(),
          })
          .nullish(),
        finish_reason: z.string().nullable().optional(),
        index: z.number(),
      }),
    ),
  }),
  HyperbolicErrorResponseSchema,
]);

function prepareToolsAndToolChoice(
  mode: Parameters<LanguageModelV1["doGenerate"]>[0]["mode"] & {
    type: "regular";
  },
) {
  // when the tools array is empty, change it to undefined to prevent errors:
  const tools = mode.tools?.length ? mode.tools : undefined;

  if (tools == null) {
    return { tools: undefined, tool_choice: undefined };
  }

  const mappedTools = tools.map((tool) => {
    if (isFunctionTool(tool)) {
      return {
        type: "function" as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      };
    } else {
      return {
        type: "function" as const,
        function: {
          name: tool.name,
        },
      };
    }
  });

  const toolChoice = mode.toolChoice;

  if (toolChoice == null) {
    return { tools: mappedTools, tool_choice: undefined };
  }

  const type = toolChoice.type;

  switch (type) {
    case "auto":
    case "none":
    case "required":
      return { tools: mappedTools, tool_choice: type };
    case "tool":
      return {
        tools: mappedTools,
        tool_choice: {
          type: "function",
          function: {
            name: toolChoice.toolName,
          },
        },
      };
    default: {
      const _exhaustiveCheck: never = type;
      throw new Error(`Unsupported tool choice type: ${_exhaustiveCheck}`);
    }
  }
}
