// Modified by Hyperbolic Labs, Inc. on 2026-01-23
// Original work Copyright 2025 OpenRouter Inc.
// Licensed under the Apache License, Version 2.0

import type {
  LanguageModelV3FilePart,
  LanguageModelV3Prompt,
  LanguageModelV3TextPart,
  LanguageModelV3ToolResultPart,
  SharedV3ProviderMetadata,
} from "@ai-sdk/provider";

import type { ReasoningDetailUnion } from "../schemas/reasoning-details";
import type {
  ChatCompletionContentPart,
  HyperbolicChatCompletionsInput,
} from "../types/hyperbolic-chat-completions-input";
import { HyperbolicProviderOptionsSchema } from "../schemas/provider-metadata";
import { getFileUrl, getInputAudioData } from "./file-url-utils";
import { isUrl } from "./is-url";

// Type for Hyperbolic Cache Control following Anthropic's pattern
export type HyperbolicCacheControl = { type: "ephemeral" };

function getCacheControl(
  providerMetadata: SharedV3ProviderMetadata | undefined,
): HyperbolicCacheControl | undefined {
  const anthropic = providerMetadata?.anthropic;
  const hyperbolic = providerMetadata?.hyperbolic;

  // Allow both cacheControl and cache_control:
  return (hyperbolic?.cacheControl ??
    hyperbolic?.cache_control ??
    anthropic?.cacheControl ??
    anthropic?.cache_control) as HyperbolicCacheControl | undefined;
}

export function convertToHyperbolicChatMessages(
  prompt: LanguageModelV3Prompt,
): HyperbolicChatCompletionsInput {
  const messages: HyperbolicChatCompletionsInput = [];
  for (const { role, content, providerOptions } of prompt) {
    switch (role) {
      case "system": {
        messages.push({
          role: "system",
          content,
          cache_control: getCacheControl(providerOptions),
        });
        break;
      }

      case "user": {
        if (content.length === 1 && content[0]?.type === "text") {
          const cacheControl =
            getCacheControl(providerOptions) ?? getCacheControl(content[0].providerOptions);
          const contentWithCacheControl: string | ChatCompletionContentPart[] = cacheControl
            ? [
                {
                  type: "text",
                  text: content[0].text,
                  cache_control: cacheControl,
                },
              ]
            : content[0].text;
          messages.push({
            role: "user",
            content: contentWithCacheControl,
          });
          break;
        }

        // Get message level cache control
        const messageCacheControl = getCacheControl(providerOptions);
        const contentParts: ChatCompletionContentPart[] = content.map(
          (part: LanguageModelV3TextPart | LanguageModelV3FilePart) => {
            const cacheControl = getCacheControl(part.providerOptions) ?? messageCacheControl;

            switch (part.type) {
              case "text":
                return {
                  type: "text" as const,
                  text: part.text,
                  // For text parts, only use part-specific cache control
                  cache_control: cacheControl,
                };
              case "file": {
                if (part.mediaType?.startsWith("image/")) {
                  const url = getFileUrl({
                    part,
                    defaultMediaType: "image/jpeg",
                  });
                  return {
                    type: "image_url" as const,
                    image_url: {
                      url,
                    },
                    // For image parts, use part-specific or message-level cache control
                    cache_control: cacheControl,
                  };
                }

                // Handle audio files for input_audio format
                if (part.mediaType?.startsWith("audio/")) {
                  return {
                    type: "input_audio" as const,
                    input_audio: getInputAudioData(part),
                    cache_control: cacheControl,
                  };
                }

                const fileName = String(
                  part.providerOptions?.hyperbolic?.filename ?? part.filename ?? "",
                );

                const fileData = getFileUrl({
                  part,
                  defaultMediaType: "application/pdf",
                });

                if (
                  isUrl({
                    url: fileData,
                    protocols: new Set(["http:", "https:"] as const),
                  })
                ) {
                  return {
                    type: "file" as const,
                    file: {
                      filename: fileName,
                      file_data: fileData,
                    },
                  } satisfies ChatCompletionContentPart;
                }

                return {
                  type: "file" as const,
                  file: {
                    filename: fileName,
                    file_data: fileData,
                  },
                  cache_control: cacheControl,
                } satisfies ChatCompletionContentPart;
              }
              default: {
                return {
                  type: "text" as const,
                  text: "",
                  cache_control: cacheControl,
                };
              }
            }
          },
        );

        // For multi-part messages, don't add cache_control at the root level
        messages.push({
          role: "user",
          content: contentParts,
        });

        break;
      }

      case "assistant": {
        let text = "";
        let reasoning = "";
        const toolCalls: Array<{
          id: string;
          type: "function";
          function: { name: string; arguments: string };
        }> = [];
        const accumulatedReasoningDetails: ReasoningDetailUnion[] = [];

        for (const part of content) {
          switch (part.type) {
            case "text": {
              text += part.text;

              break;
            }
            case "tool-call": {
              const partReasoningDetails = (part.providerOptions as Record<string, unknown>)
                ?.hyperbolic as Record<string, unknown> | undefined;
              if (
                partReasoningDetails?.reasoning_details &&
                Array.isArray(partReasoningDetails.reasoning_details)
              ) {
                accumulatedReasoningDetails.push(
                  ...(partReasoningDetails.reasoning_details as ReasoningDetailUnion[]),
                );
              }
              toolCalls.push({
                id: part.toolCallId,
                type: "function",
                function: {
                  name: part.toolName,
                  arguments: JSON.stringify(part.input),
                },
              });
              break;
            }
            case "reasoning": {
              reasoning += part.text;
              const parsedPartProviderOptions = HyperbolicProviderOptionsSchema.safeParse(
                part.providerOptions,
              );
              if (
                parsedPartProviderOptions.success &&
                parsedPartProviderOptions.data?.hyperbolic?.reasoning_details
              ) {
                accumulatedReasoningDetails.push(
                  ...parsedPartProviderOptions.data.hyperbolic.reasoning_details,
                );
              }
              break;
            }

            case "file":
              break;
            default: {
              break;
            }
          }
        }

        // Check message-level providerOptions for preserved reasoning_details and annotations
        const parsedProviderOptions = HyperbolicProviderOptionsSchema.safeParse(providerOptions);
        const messageReasoningDetails = parsedProviderOptions.success
          ? parsedProviderOptions.data?.hyperbolic?.reasoning_details
          : undefined;
        const messageAnnotations = parsedProviderOptions.success
          ? parsedProviderOptions.data?.hyperbolic?.annotations
          : undefined;

        // Use message-level reasoning_details if available, otherwise use accumulated from parts
        const finalReasoningDetails =
          messageReasoningDetails &&
          Array.isArray(messageReasoningDetails) &&
          messageReasoningDetails.length > 0
            ? messageReasoningDetails
            : accumulatedReasoningDetails.length > 0
              ? accumulatedReasoningDetails
              : undefined;

        messages.push({
          role: "assistant",
          content: text,
          tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
          reasoning: reasoning || undefined,
          reasoning_details: finalReasoningDetails,
          annotations: messageAnnotations,
          cache_control: getCacheControl(providerOptions),
        });

        break;
      }

      case "tool": {
        for (const toolResponse of content) {
          // Skip tool approval responses - only process tool results
          if (toolResponse.type === "tool-approval-response") {
            continue;
          }
          const content = getToolResultContent(toolResponse);

          messages.push({
            role: "tool",
            tool_call_id: toolResponse.toolCallId,
            content,
            cache_control:
              getCacheControl(providerOptions) ?? getCacheControl(toolResponse.providerOptions),
          });
        }
        break;
      }

      default: {
        break;
      }
    }
  }

  return messages;
}

function getToolResultContent(input: LanguageModelV3ToolResultPart): string {
  switch (input.output.type) {
    case "text":
    case "error-text":
      return input.output.value;
    case "json":
    case "error-json":
    case "content":
      return JSON.stringify(input.output.value);
    case "execution-denied":
      return input.output.reason ?? "Tool execution denied";
  }
}
