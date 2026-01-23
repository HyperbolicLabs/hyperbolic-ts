// Modified by Hyperbolic Labs, Inc. on 2026-01-23
// Original work Copyright 2025 OpenRouter Inc.
// Licensed under the Apache License, Version 2.0

import type { FileAnnotation } from "../schemas/provider-metadata";
import type { ReasoningDetailUnion } from "../schemas/reasoning-details";

// Type for Hyperbolic Cache Control following Anthropic's pattern
export type HyperbolicCacheControl = { type: "ephemeral" };

export type HyperbolicChatCompletionsInput = Array<ChatCompletionMessageParam>;

export type ChatCompletionMessageParam =
  | ChatCompletionSystemMessageParam
  | ChatCompletionUserMessageParam
  | ChatCompletionAssistantMessageParam
  | ChatCompletionToolMessageParam;

export interface ChatCompletionSystemMessageParam {
  role: "system";
  content: string;
  cache_control?: HyperbolicCacheControl;
}

export interface ChatCompletionUserMessageParam {
  role: "user";
  content: string | Array<ChatCompletionContentPart>;
  cache_control?: HyperbolicCacheControl;
}

export type ChatCompletionContentPart =
  | ChatCompletionContentPartText
  | ChatCompletionContentPartImage
  | ChatCompletionContentPartFile
  | ChatCompletionContentPartInputAudio;

export interface ChatCompletionContentPartFile {
  type: "file";
  file: {
    filename?: string;
    file_data?: string;
    file_id?: string;
  };
  cache_control?: HyperbolicCacheControl;
}

export interface ChatCompletionContentPartImage {
  type: "image_url";
  image_url: {
    url: string;
  };
  cache_control?: HyperbolicCacheControl;
}

export interface ChatCompletionContentPartText {
  type: "text";
  text: string;
  reasoning?: string | null;
  cache_control?: HyperbolicCacheControl;
}

/** https://openrouter.ai/docs/guides/overview/multimodal/audio */
export const OPENROUTER_AUDIO_FORMATS = [
  "wav",
  "mp3",
  "aiff",
  "aac",
  "ogg",
  "flac",
  "m4a",
  "pcm16",
  "pcm24",
] as const;

export type OpenRouterAudioFormat = (typeof OPENROUTER_AUDIO_FORMATS)[number];

export interface ChatCompletionContentPartInputAudio {
  type: "input_audio";
  input_audio: {
    data: string;
    format: OpenRouterAudioFormat;
  };
  cache_control?: HyperbolicCacheControl;
}

export interface ChatCompletionAssistantMessageParam {
  role: "assistant";
  content?: string | null;
  reasoning?: string | null;
  reasoning_details?: ReasoningDetailUnion[];
  annotations?: FileAnnotation[];
  tool_calls?: Array<ChatCompletionMessageToolCall>;
  cache_control?: HyperbolicCacheControl;
}

export interface ChatCompletionMessageToolCall {
  type: "function";
  id: string;
  function: {
    arguments: string;
    name: string;
  };
}

export interface ChatCompletionToolMessageParam {
  role: "tool";
  content: string;
  tool_call_id: string;
  cache_control?: HyperbolicCacheControl;
}
