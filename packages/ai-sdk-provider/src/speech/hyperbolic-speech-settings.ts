import type { SpeechModelV3 } from "@ai-sdk/provider";

import type { HyperbolicSharedSettings } from "../types";

/** The result the speech model contract resolves with, before provider metadata is attached. */
type SpeechModelResult = Awaited<ReturnType<SpeechModelV3["doGenerate"]>>;

export type HyperbolicSpeechModelId = "MeloTTS" | (string & {});

export type HyperbolicSpeechSettings = HyperbolicSharedSettings;

export type HyperbolicSpeechProviderOptions = {
  speed?: number;
};

export type HyperbolicSpeechProviderResponseMetadata = {
  inferenceTime: number;
};

/**
 * The speech generation result, with Hyperbolic's response metadata attached.
 *
 * This was previously declared as `Omit<GenerateImageResult, "responses">` — an
 * *image* result type — so it advertised `image`/`images` fields that a speech
 * call never returns and omitted `audio`, which it always does. It is now
 * derived from the speech model contract itself, so it cannot drift from the
 * shape the model actually resolves with.
 */
export type HyperbolicGenerateSpeechResult = Omit<SpeechModelResult, "response"> & {
  responses: (SpeechModelResult["response"] & {
    hyperbolic: HyperbolicSpeechProviderResponseMetadata;
  })[];
};
