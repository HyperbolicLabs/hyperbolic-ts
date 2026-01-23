// Modified by Hyperbolic Labs, Inc. on 2026-01-23
// Original work Copyright 2025 OpenRouter Inc.
// Licensed under the Apache License, Version 2.0

export function isUrl({
  url,
  protocols,
}: {
  url: string | URL;
  protocols: Set<`${string}:`>;
}): boolean {
  try {
    const urlObj = new URL(url);
    // Cast to the literal string due to Set inferred input type
    return protocols.has(urlObj.protocol as `${string}:`);
  } catch (_) {
    return false;
  }
}
