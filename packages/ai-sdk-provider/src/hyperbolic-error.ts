import { createJsonErrorResponseHandler } from "@ai-sdk/provider-utils";
import { z } from "zod";

const hyperbolicErrorDataSchema = z.object({
  object: z.literal("error"),
  message: z.string(),
  type: z.string(),
  param: z.string().nullable(),
  code: z.string().nullable(),
});

export type HyperbolicErrorData = z.infer<typeof hyperbolicErrorDataSchema>;

export const hyperbolicFailedResponseHandler = createJsonErrorResponseHandler({
  errorSchema: hyperbolicErrorDataSchema,
  errorToMessage: (data) => data.message,
});
