// https://docs.hyperbolic.ai/getting-started/models/models_overview/
export type HyperbolicChatModelId =
  // premier
  | "ministral-3b-latest"
  | "ministral-8b-latest"
  | "hyperbolic-large-latest"
  | "hyperbolic-small-latest"
  | "pixtral-large-latest"
  // free
  | "pixtral-12b-2409"
  // legacy
  | "open-hyperbolic-7b"
  | "open-mixtral-8x7b"
  | "open-mixtral-8x22b"
  | (string & {});

export interface HyperbolicChatSettings {
  /**
Whether to inject a safety prompt before all conversations.

Defaults to `false`.
   */
  safePrompt?: boolean;
}
