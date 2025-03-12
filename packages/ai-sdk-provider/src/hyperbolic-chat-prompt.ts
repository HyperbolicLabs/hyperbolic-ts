export type HyperbolicPrompt = Array<HyperbolicMessage>;

export type HyperbolicMessage =
  | HyperbolicSystemMessage
  | HyperbolicUserMessage
  | HyperbolicAssistantMessage
  | HyperbolicToolMessage;

export interface HyperbolicSystemMessage {
  role: "system";
  content: string;
}

export interface HyperbolicUserMessage {
  role: "user";
  content: Array<HyperbolicUserMessageContent>;
}

export type HyperbolicUserMessageContent =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: string }
  | { type: "document_url"; document_url: string };

export interface HyperbolicAssistantMessage {
  role: "assistant";
  content: string;
  prefix?: boolean;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
}

export interface HyperbolicToolMessage {
  role: "tool";
  name: string;
  content: string;
  tool_call_id: string;
}
