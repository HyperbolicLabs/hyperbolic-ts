// Modified by Hyperbolic Labs, Inc. on 2026-01-23
// Original work Copyright 2025 OpenRouter Inc.
// Licensed under the Apache License, Version 2.0

import { z } from "zod/v4";

import { ReasoningDetailUnionSchema } from "./reasoning-details";

/**
 * Schema for file annotations from FileParserPlugin
 */
export const FileAnnotationSchema = z
  .object({
    type: z.literal("file"),
    file: z
      .object({
        hash: z.string(),
        name: z.string(),
        content: z
          .array(
            z
              .object({
                type: z.string(),
                text: z.string().optional(),
              })
              .catchall(z.any()),
          )
          .optional(),
      })
      .catchall(z.any()),
  })
  .catchall(z.any());

export type FileAnnotation = z.infer<typeof FileAnnotationSchema>;

/**
 * Schema for Hyperbolic provider metadata attached to responses
 */
export const HyperbolicProviderMetadataSchema = z
  .object({
    provider: z.string(),
    reasoning_details: z.array(ReasoningDetailUnionSchema).optional(),
    annotations: z.array(FileAnnotationSchema).optional(),
    usage: z
      .object({
        promptTokens: z.number(),
        promptTokensDetails: z
          .object({
            cachedTokens: z.number(),
          })
          .catchall(z.any())
          .optional(),
        completionTokens: z.number(),
        completionTokensDetails: z
          .object({
            reasoningTokens: z.number(),
          })
          .catchall(z.any())
          .optional(),
        totalTokens: z.number(),
        cost: z.number().optional(),
        costDetails: z
          .object({
            upstreamInferenceCost: z.number(),
          })
          .catchall(z.any())
          .optional(),
      })
      .catchall(z.any()),
  })
  .catchall(z.any());

export type HyperbolicProviderMetadata = z.infer<typeof HyperbolicProviderMetadataSchema>;

/**
 * Schema for parsing provider options that may contain reasoning_details and annotations
 */
export const HyperbolicProviderOptionsSchema = z
  .object({
    hyperbolic: z
      .object({
        reasoning_details: z.array(ReasoningDetailUnionSchema).optional(),
        annotations: z.array(FileAnnotationSchema).optional(),
      })
      .optional(),
  })
  .optional();
