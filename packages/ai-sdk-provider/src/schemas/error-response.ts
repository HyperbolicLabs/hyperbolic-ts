// Modified by Hyperbolic Labs, Inc. on 2026-01-23
// Original work Copyright 2025 OpenRouter Inc.
// Licensed under the Apache License, Version 2.0

import type { ChatErrorError } from "@openrouter/sdk/models";
import { createJsonErrorResponseHandler } from "@ai-sdk/provider-utils";
import { z } from "zod/v4";

// Use SDK's ChatErrorError type but wrap in response schema
// SDK type: { code: string | number | null; message: string; param?: string | null; type?: string | null }
export const HyperbolicErrorResponseSchema = z
  .object({
    error: z
      .object({
        code: z.union([z.string(), z.number()]).nullable().optional().default(null),
        message: z.string(),
        type: z.string().nullable().optional().default(null),
        param: z.any().nullable().optional().default(null),
      })
      .passthrough() satisfies z.ZodType<
      Omit<ChatErrorError, "code"> & { code: string | number | null }
    >,
  })
  .passthrough();

export type HyperbolicErrorData = z.infer<typeof HyperbolicErrorResponseSchema>;

export const hyperbolicFailedResponseHandler = createJsonErrorResponseHandler({
  errorSchema: HyperbolicErrorResponseSchema,
  errorToMessage: (data: HyperbolicErrorData) => data.error.message,
});
