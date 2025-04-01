// Modified by Hyperbolic Labs, Inc. on 2025-03-25
// Original work Copyright 2025 OpenRouter Inc.
// Licensed under the Apache License, Version 2.0

import type { Experimental_GenerateImageResult } from "ai";

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
  image?: string;
};

export type HyperbolicImageProviderResponseMetadata = {
  inferenceTime: number;
  randomSeeds: number[];
};

export type Experimental_HyperbolicGenerateImageResult = Omit<
  Experimental_GenerateImageResult,
  "responses"
> & {
  responses: (Experimental_GenerateImageResult["responses"][number] & {
    hyperbolic: HyperbolicImageProviderResponseMetadata;
  })[];
};
