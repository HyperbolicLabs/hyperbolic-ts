import type {
  LanguageModelV1,
  LanguageModelV1CallWarning,
  LanguageModelV1FinishReason,
  LanguageModelV1StreamPart,
} from "@ai-sdk/provider";
import type { FetchFunction, ParseResult } from "@ai-sdk/provider-utils";
import { InvalidResponseDataError } from "@ai-sdk/provider";
import {
  combineHeaders,
  createEventSourceResponseHandler,
  createJsonResponseHandler,
  postJsonToApi,
} from "@ai-sdk/provider-utils";
import { z } from "zod";

import type { HyperbolicChatModelId, HyperbolicChatSettings } from "./hyperbolic-chat-settings";
import { convertToHyperbolicChatMessages } from "./convert-to-hyperbolic-chat-messages";
import { getResponseMetadata } from "./get-response-metadata";
import { hyperbolicFailedResponseHandler } from "./hyperbolic-error";
import { prepareTools } from "./hyperbolic-prepare-tools";
import { mapHyperbolicFinishReason } from "./map-hyperbolic-finish-reason";

type HyperbolicChatConfig = {
  provider: string;
  baseURL: string;
  headers: () => Record<string, string | undefined>;
  fetch?: FetchFunction;
};

export class HyperbolicChatLanguageModel implements LanguageModelV1 {
  readonly specificationVersion = "v1";
  readonly defaultObjectGenerationMode = "json";
  readonly supportsImageUrls = false;

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

  supportsUrl(url: URL): boolean {
    return url.protocol === "https:";
  }

  private getArgs({
    mode,
    prompt,
    maxTokens,
    temperature,
    topP,
    topK,
    frequencyPenalty,
    presencePenalty,
    stopSequences,
    responseFormat,
    seed,
    providerMetadata,
  }: Parameters<LanguageModelV1["doGenerate"]>[0]) {
    const type = mode.type;

    const warnings: LanguageModelV1CallWarning[] = [];

    if (topK != null) {
      warnings.push({
        type: "unsupported-setting",
        setting: "topK",
      });
    }

    if (frequencyPenalty != null) {
      warnings.push({
        type: "unsupported-setting",
        setting: "frequencyPenalty",
      });
    }

    if (presencePenalty != null) {
      warnings.push({
        type: "unsupported-setting",
        setting: "presencePenalty",
      });
    }

    if (stopSequences != null) {
      warnings.push({
        type: "unsupported-setting",
        setting: "stopSequences",
      });
    }

    if (responseFormat != null && responseFormat.type === "json" && responseFormat.schema != null) {
      warnings.push({
        type: "unsupported-setting",
        setting: "responseFormat",
        details: "JSON response format schema is not supported",
      });
    }

    const baseArgs = {
      // model id:
      model: this.modelId,

      // model specific settings:
      safe_prompt: this.settings.safePrompt,

      // standardized settings:
      max_tokens: maxTokens,
      temperature,
      top_p: topP,
      random_seed: seed,

      // response format:
      response_format: responseFormat?.type === "json" ? { type: "json_object" } : undefined,

      // hyperbolic-specific provider options:
      document_image_limit: providerMetadata?.hyperbolic?.documentImageLimit,
      document_page_limit: providerMetadata?.hyperbolic?.documentPageLimit,

      // messages:
      messages: convertToHyperbolicChatMessages(prompt),
    };

    switch (type) {
      case "regular": {
        const { tools, tool_choice, toolWarnings } = prepareTools(mode);

        return {
          args: { ...baseArgs, tools, tool_choice },
          warnings: [...warnings, ...toolWarnings],
        };
      }

      case "object-json": {
        return {
          args: {
            ...baseArgs,
            response_format: { type: "json_object" },
          },
          warnings,
        };
      }

      case "object-tool": {
        return {
          args: {
            ...baseArgs,
            tool_choice: "any",
            tools: [{ type: "function", function: mode.tool }],
          },
          warnings,
        };
      }

      default: {
        const _exhaustiveCheck: never = type;
        throw new Error(`Unsupported type: ${_exhaustiveCheck}`);
      }
    }
  }

  async doGenerate(
    options: Parameters<LanguageModelV1["doGenerate"]>[0],
  ): Promise<Awaited<ReturnType<LanguageModelV1["doGenerate"]>>> {
    const { args, warnings } = this.getArgs(options);

    const {
      responseHeaders,
      value: response,
      rawValue: rawResponse,
    } = await postJsonToApi({
      url: `${this.config.baseURL}/chat/completions`,
      headers: combineHeaders(this.config.headers(), options.headers),
      body: args,
      failedResponseHandler: hyperbolicFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(hyperbolicChatResponseSchema),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    const { messages: rawPrompt, ...rawSettings } = args;
    const choice = response.choices[0];

    if (choice == null) {
      throw new InvalidResponseDataError({
        data: response,
        message: "No choice found in response",
      });
    }

    // extract text content.
    // image content or reference content is currently ignored.
    let text = extractTextContent(choice.message.content);

    // when there is a trailing assistant message, hyperbolic will send the
    // content of that message again. we skip this repeated content to
    // avoid duplication, e.g. in continuation mode.
    const lastMessage = rawPrompt[rawPrompt.length - 1];
    if (!lastMessage) {
      throw new InvalidResponseDataError({
        data: response,
        message: "No last message found in prompt",
      });
    }

    if (lastMessage.role === "assistant" && text?.startsWith(lastMessage.content)) {
      text = text.slice(lastMessage.content.length);
    }

    return {
      text,
      toolCalls: choice.message.tool_calls?.map((toolCall) => ({
        toolCallType: "function",
        toolCallId: toolCall.id,
        toolName: toolCall.function.name,
        args: toolCall.function.arguments,
      })),
      finishReason: mapHyperbolicFinishReason(choice.finish_reason),
      usage: {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
      },
      rawCall: { rawPrompt, rawSettings },
      rawResponse: {
        headers: responseHeaders,
        body: rawResponse,
      },
      request: { body: JSON.stringify(args) },
      response: getResponseMetadata(response),
      warnings,
    };
  }

  async doStream(
    options: Parameters<LanguageModelV1["doStream"]>[0],
  ): Promise<Awaited<ReturnType<LanguageModelV1["doStream"]>>> {
    const { args, warnings } = this.getArgs(options);

    const body = { ...args, stream: true };

    const { responseHeaders, value: response } = await postJsonToApi({
      url: `${this.config.baseURL}/chat/completions`,
      headers: combineHeaders(this.config.headers(), options.headers),
      body,
      failedResponseHandler: hyperbolicFailedResponseHandler,
      successfulResponseHandler: createEventSourceResponseHandler(hyperbolicChatChunkSchema),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    const { messages: rawPrompt, ...rawSettings } = args;

    let finishReason: LanguageModelV1FinishReason = "unknown";
    let usage: { promptTokens: number; completionTokens: number } = {
      promptTokens: Number.NaN,
      completionTokens: Number.NaN,
    };
    let chunkNumber = 0;
    let trimLeadingSpace = false;

    return {
      stream: response.pipeThrough(
        new TransformStream<
          ParseResult<z.infer<typeof hyperbolicChatChunkSchema>>,
          LanguageModelV1StreamPart
        >({
          transform(chunk, controller) {
            if (!chunk.success) {
              controller.enqueue({ type: "error", error: chunk.error });
              return;
            }

            chunkNumber++;

            const value = chunk.value;

            if (chunkNumber === 1) {
              controller.enqueue({
                type: "response-metadata",
                ...getResponseMetadata(value),
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

            // extract text content.
            // image content or reference content is currently ignored.
            const textContent = extractTextContent(delta.content);

            // when there is a trailing assistant message, hyperbolic will send the
            // content of that message again. we skip this repeated content to
            // avoid duplication, e.g. in continuation mode.
            if (chunkNumber <= 2) {
              const lastMessage = rawPrompt[rawPrompt.length - 1];
              if (!lastMessage) {
                throw new InvalidResponseDataError({
                  data: response,
                  message: "No last message found in prompt",
                });
              }

              if (
                lastMessage.role === "assistant" &&
                textContent === lastMessage.content.trimEnd()
              ) {
                // Hyperbolic moves the trailing space from the prefix to the next chunk.
                // We trim the leading space to avoid duplication.
                if (textContent.length < lastMessage.content.length) {
                  trimLeadingSpace = true;
                }

                // skip the repeated content:
                return;
              }
            }

            if (textContent != null) {
              controller.enqueue({
                type: "text-delta",
                textDelta: trimLeadingSpace ? textContent.trimStart() : textContent,
              });

              trimLeadingSpace = false;
            }

            if (delta.tool_calls != null) {
              for (const toolCall of delta.tool_calls) {
                // hyperbolic tool calls come in one piece:
                controller.enqueue({
                  type: "tool-call-delta",
                  toolCallType: "function",
                  toolCallId: toolCall.id,
                  toolName: toolCall.function.name,
                  argsTextDelta: toolCall.function.arguments,
                });
                controller.enqueue({
                  type: "tool-call",
                  toolCallType: "function",
                  toolCallId: toolCall.id,
                  toolName: toolCall.function.name,
                  args: toolCall.function.arguments,
                });
              }
            }
          },

          flush(controller) {
            controller.enqueue({ type: "finish", finishReason, usage });
          },
        }),
      ),
      rawCall: { rawPrompt, rawSettings },
      rawResponse: { headers: responseHeaders },
      request: { body: JSON.stringify(body) },
      warnings,
    };
  }
}

function extractTextContent(content: z.infer<typeof hyperbolicContentSchema>) {
  if (typeof content === "string") {
    return content;
  }

  if (content == null) {
    return undefined;
  }

  const textContent: string[] = [];

  for (const chunk of content) {
    const { type } = chunk;

    switch (type) {
      case "text":
        textContent.push(chunk.text);
        break;
      case "image_url":
      case "reference":
        // image content or reference content is currently ignored.
        break;
      default: {
        const _exhaustiveCheck: never = type;
        throw new Error(`Unsupported type: ${_exhaustiveCheck}`);
      }
    }
  }

  return textContent.length ? textContent.join("") : undefined;
}

const hyperbolicContentSchema = z
  .union([
    z.string(),
    z.array(
      z.discriminatedUnion("type", [
        z.object({
          type: z.literal("text"),
          text: z.string(),
        }),
        z.object({
          type: z.literal("image_url"),
          image_url: z.union([
            z.string(),
            z.object({
              url: z.string(),
              detail: z.string().nullable(),
            }),
          ]),
        }),
        z.object({
          type: z.literal("reference"),
          reference_ids: z.array(z.number()),
        }),
      ]),
    ),
  ])
  .nullish();

// limited version of the schema, focussed on what is needed for the implementation
// this approach limits breakages when the API changes and increases efficiency
const hyperbolicChatResponseSchema = z.object({
  id: z.string().nullish(),
  created: z.number().nullish(),
  model: z.string().nullish(),
  choices: z.array(
    z.object({
      message: z.object({
        role: z.literal("assistant"),
        content: hyperbolicContentSchema,
        tool_calls: z
          .array(
            z.object({
              id: z.string(),
              function: z.object({ name: z.string(), arguments: z.string() }),
            }),
          )
          .nullish(),
      }),
      index: z.number(),
      finish_reason: z.string().nullish(),
    }),
  ),
  object: z.literal("chat.completion"),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
  }),
});

// limited version of the schema, focussed on what is needed for the implementation
// this approach limits breakages when the API changes and increases efficiency
const hyperbolicChatChunkSchema = z.object({
  id: z.string().nullish(),
  created: z.number().nullish(),
  model: z.string().nullish(),
  choices: z.array(
    z.object({
      delta: z.object({
        role: z.enum(["assistant"]).optional(),
        content: hyperbolicContentSchema,
        tool_calls: z
          .array(
            z.object({
              id: z.string(),
              function: z.object({ name: z.string(), arguments: z.string() }),
            }),
          )
          .nullish(),
      }),
      finish_reason: z.string().nullish(),
      index: z.number(),
    }),
  ),
  usage: z
    .object({
      prompt_tokens: z.number(),
      completion_tokens: z.number(),
    })
    .nullish(),
});
