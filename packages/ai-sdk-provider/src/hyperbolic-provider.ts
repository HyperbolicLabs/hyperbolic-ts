import type { OpenRouterProviderSettings } from "@openrouter/ai-sdk-provider";
import type { Except } from "type-fest";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

import type { HyperbolicModelId } from "./__generated__/models.gen";
import type {
  HyperbolicChatLanguageModel,
  HyperbolicChatSettings,
} from "./hyperbolic-chat-language-model";
import type {
  HyperbolicCompletionLanguageModel,
  HyperbolicCompletionSettings,
} from "./hyperbolic-completion-language-model";

export interface HyperbolicProvider {
  (
    modelId: HyperbolicModelId,
    settings?: HyperbolicCompletionSettings,
  ): HyperbolicCompletionLanguageModel;
  (modelId: HyperbolicModelId, settings?: HyperbolicChatSettings): HyperbolicChatLanguageModel;

  languageModel(
    modelId: HyperbolicModelId,
    settings?: HyperbolicCompletionSettings,
  ): HyperbolicCompletionLanguageModel;
  languageModel(
    modelId: HyperbolicModelId,
    settings?: HyperbolicChatSettings,
  ): HyperbolicChatLanguageModel;

  /**
   * Creates a Hyperbolic chat model for text generation.
   */
  chat(modelId: HyperbolicModelId, settings?: HyperbolicChatSettings): HyperbolicChatLanguageModel;

  /**
   * Creates a Hyperbolic completion model for text generation.
   */
  completion(
    modelId: HyperbolicModelId,
    settings?: HyperbolicCompletionSettings,
  ): HyperbolicCompletionLanguageModel;
}

export type HyperbolicProviderSettings = Except<OpenRouterProviderSettings, "compatibility">;

export const createHyperbolic = (options?: HyperbolicProviderSettings): HyperbolicProvider =>
  createOpenRouter({
    compatibility: "compatible",
    baseURL: "https://api.hyperbolic.xyz/v1",
    ...options,
  }) as unknown as HyperbolicProvider; // typescript can't infer that the
