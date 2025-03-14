import type { OpenRouterCompletionSettings } from "@openrouter/ai-sdk-provider";
import type { Except } from "type-fest";
import { OpenRouterCompletionLanguageModel } from "@openrouter/ai-sdk-provider/internal";

import type { HyperbolicModelId } from "./__generated__/models.gen";

type OpenRouterCompletionConfig = ConstructorParameters<
  typeof OpenRouterCompletionLanguageModel
>[2];
export type HyperbolicCompletionConfig = Except<
  OpenRouterCompletionConfig,
  "compatibility" | "provider"
>;
export type HyperbolicCompletionSettings = OpenRouterCompletionSettings;

export class HyperbolicCompletionLanguageModel extends OpenRouterCompletionLanguageModel {
  constructor(
    modelId: HyperbolicModelId,
    settings: HyperbolicCompletionSettings,
    config: HyperbolicCompletionConfig,
  ) {
    super(modelId, settings, {
      ...config,
      provider: "hyperbolic",
      compatibility: "compatible",
    });
  }
}
