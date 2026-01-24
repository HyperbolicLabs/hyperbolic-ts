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
      .loose(),
  })
  .loose();

export type HyperbolicErrorData = z.infer<typeof HyperbolicErrorResponseSchema>;

export const hyperbolicFailedResponseHandler = createJsonErrorResponseHandler({
  errorSchema: HyperbolicErrorResponseSchema,
  errorToMessage: (data: HyperbolicErrorData) => data.error.message,
});
