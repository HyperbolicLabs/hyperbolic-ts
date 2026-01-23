// Modified by Hyperbolic Labs, Inc. on 2026-01-23
// Original work Copyright 2025 OpenRouter Inc.
// Licensed under the Apache License, Version 2.0

import { z } from "zod/v4";

const ImageResponseSchema = z
  .object({
    type: z.literal("image_url"),
    image_url: z
      .object({
        url: z.string(),
      })
      .loose(),
  })
  .loose();

export type ImageResponse = z.infer<typeof ImageResponseSchema>;

const ImageResponseWithUnknownSchema = z.union([
  ImageResponseSchema,
  z.unknown().transform(() => null),
]);

export const ImageResponseArraySchema = z
  .array(ImageResponseWithUnknownSchema)
  .transform((d) => d.filter((d): d is ImageResponse => !!d));
