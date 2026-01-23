// Modified by Hyperbolic Labs, Inc. on 2026-01-23
// Original work Copyright 2025 OpenRouter Inc.
// Licensed under the Apache License, Version 2.0

/**
 * Type guard to check if a value is defined and not null
 */
export function isDefinedOrNotNull<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}
