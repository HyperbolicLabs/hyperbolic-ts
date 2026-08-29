/**
 * Removes entries from a record where the value is `null` or `undefined`.
 * @param record - The input object whose entries may be `null` or `undefined`.
 * @returns A new object containing only entries with non-null and non-undefined values.
 */
export function removeUndefinedEntries<T>(
  record: Record<string, T | null | undefined>,
): Record<string, T> {
  // The previous implementation only filtered `null`, so every `undefined` entry
  // survived and was serialized as an explicit `"key": undefined` property. When
  // such a record is used as a request body, `JSON.stringify` drops the key —
  // but when it is spread into another object it overwrites a real value with
  // `undefined`, which is how optional provider settings silently unset
  // defaults. Both `null` and `undefined` are removed here, matching the name
  // and the documented contract.
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== null && value !== undefined),
  ) as Record<string, T>;
}
