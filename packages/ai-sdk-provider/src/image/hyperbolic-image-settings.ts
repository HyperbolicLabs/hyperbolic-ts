import type { GenerateImageResult } from "ai";

import type { HyperbolicSharedSettings } from "../types";

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
  image?: string;
};

export type HyperbolicImageProviderResponseMetadata = {
  inferenceTime: number;
  randomSeeds: number[];
};

export type HyperbolicGenerateImageResult = Omit<GenerateImageResult, "responses"> & {
  responses: (GenerateImageResult["responses"][number] & {
    hyperbolic: HyperbolicImageProviderResponseMetadata;
  })[];
};
