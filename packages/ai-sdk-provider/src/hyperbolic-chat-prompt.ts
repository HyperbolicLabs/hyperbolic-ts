// Type for Hyperbolic Cache Control following Anthropic's pattern
export type HyperbolicCacheControl = { type: "ephemeral" };

export type HyperbolicChatPrompt = Array<ChatCompletionMessageParam>;

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
  | ChatCompletionContentPartImage;

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
  cache_control?: HyperbolicCacheControl;
}

export interface ChatCompletionAssistantMessageParam {
  role: "assistant";
  content?: string | null;
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
