// Modified by Hyperbolic Labs, Inc. on 2025-03-25
// Original work Copyright 2025 OpenRouter Inc.
// Licensed under the Apache License, Version 2.0

import { createJsonErrorResponseHandler } from "@ai-sdk/provider-utils";
import { z } from "zod";

export const HyperbolicErrorResponseSchema = z.object({
  object: z.literal("error"),
  message: z.string(),
  type: z.string(),
  param: z.any().nullable(),
  code: z.coerce.number().nullable(),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isHyperbolicError = (data: any): data is HyperbolicErrorData => {
  return "object" in data && data.object === "error";
};

export type HyperbolicErrorData = z.infer<typeof HyperbolicErrorResponseSchema>;

export const hyperbolicFailedResponseHandler = createJsonErrorResponseHandler({
  errorSchema: HyperbolicErrorResponseSchema,
  errorToMessage: (data) => data.message,
});
