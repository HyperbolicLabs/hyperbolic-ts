import type { LanguageModelV1 } from "@ai-sdk/provider";

export { type LanguageModelV1 } from "@openrouter/ai-sdk-provider";
export type HyperbolicLanguageModel = LanguageModelV1;

export {
  type HyperbolicChatSettings,
  type HyperbolicChatConfig,
  HyperbolicChatLanguageModel,
} from "./hyperbolic-chat-language-model";

export {
  type HyperbolicCompletionSettings,
  type HyperbolicCompletionConfig,
  HyperbolicCompletionLanguageModel,
} from "./hyperbolic-completion-language-model";

export {
  type HyperbolicProvider,
  type HyperbolicProviderSettings,
  createHyperbolic,
} from "./hyperbolic-provider";
