import type { HyperbolicSharedSettings } from "./types";

export type HyperbolicImageModelId = string;

export type HyperbolicImageSettings = {
  /**
   * Override the maximum number of images per call (default is dependent on the
   * model, or 1 for an unknown model).
   */
  maxImagesPerCall?: number;
} & HyperbolicSharedSettings;

export type HyperbolicImageProviderOptions = {
  cfgScale?: number;
  negativePrompt?: string;
  steps?: number;
  strength?: number;
  enableRefiner?: boolean;
};

export type HyperbolicImageProviderResponseMetadata = {
  inferenceTime: number;
  randomSeeds: number[];
};
