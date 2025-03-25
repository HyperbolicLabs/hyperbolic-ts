// Modified by Hyperbolic Labs, Inc. on 2025-03-25
// Original work Copyright 2025 OpenRouter Inc.
// Licensed under the Apache License, Version 2.0

type HyperbolicCompletionLogProps = {
  tokens: string[];
  token_logprobs: number[];
  top_logprobs: Record<string, number>[] | null;
};

export function mapHyperbolicCompletionLogProbs(
  logprobs: HyperbolicCompletionLogProps | null | undefined,
) {
  return logprobs?.tokens.map((token, index) => ({
    token,
    logprob: logprobs.token_logprobs[index] ?? 0,
    topLogprobs: logprobs.top_logprobs
      ? Object.entries(logprobs.top_logprobs[index] ?? {}).map(([token, logprob]) => ({
          token,
          logprob,
        }))
      : [],
  }));
}
