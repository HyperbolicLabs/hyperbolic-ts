import type { OpenRouterChatSettings } from "@openrouter/ai-sdk-provider/internal";
import type { Except } from "type-fest";
import { OpenRouterChatLanguageModel } from "@openrouter/ai-sdk-provider/internal";

import type { HyperbolicModelId } from "./__generated__/models.gen";

type OpenRouterChatConfig = ConstructorParameters<typeof OpenRouterChatLanguageModel>[2];
export type HyperbolicChatConfig = Except<OpenRouterChatConfig, "compatibility" | "provider">;
export type HyperbolicChatSettings = OpenRouterChatSettings;

export class HyperbolicChatLanguageModel extends OpenRouterChatLanguageModel {
  constructor(
    modelId: HyperbolicModelId,
    settings: HyperbolicChatSettings,
    config: HyperbolicChatConfig,
  ) {
    super(modelId, settings, {
      ...config,
      provider: "hyperbolic",
      compatibility: "compatible",
    });
  }
}
