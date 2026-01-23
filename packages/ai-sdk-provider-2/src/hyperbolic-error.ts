// Modified by Hyperbolic Labs, Inc. on 2025-03-25
// Original work Copyright 2025 OpenRouter Inc.
// Licensed under the Apache License, Version 2.0

import type { TypeValidationError } from "ai";
import { createJsonErrorResponseHandler } from "@ai-sdk/provider-utils";
import { JSONParseError } from "ai";
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

/**
 * Error messages from the API are sometimes an ugly combo of text and JSON in a single chunk.  Extract data from error message if it contains JSON
 */
export const tryParsingHyperbolicError = (error: JSONParseError | TypeValidationError) => {
  if (!JSONParseError.isInstance(error)) {
    return undefined;
  }

  const jsonMatch = error.text.match(/\{.*\}/); // Match between brackets
  if (jsonMatch) {
    try {
      const parsedErrorJson = JSON.parse(jsonMatch[0]);
      if (parsedErrorJson.message) {
        return HyperbolicErrorResponseSchema.parse(parsedErrorJson);
      }
    } catch {
      return undefined;
    }
  }
};
