import type { GenerateImageResult } from "ai";

import type { HyperbolicSharedSettings } from "../types";

export type HyperbolicSpeechModelId = "MeloTTS" | (string & {});

export type HyperbolicSpeechSettings = HyperbolicSharedSettings;

export type HyperbolicSpeechProviderOptions = {
  speed?: number;
};

export type HyperbolicSpeechProviderResponseMetadata = {
  inferenceTime: number;
};

export type HyperbolicGenerateSpeechResult = Omit<GenerateImageResult, "responses"> & {
  responses: (GenerateImageResult["responses"][number] & {
    hyperbolic: HyperbolicSpeechProviderResponseMetadata;
  })[];
};
