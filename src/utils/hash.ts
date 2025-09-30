// Utility hash used for autosave change detection. Separated for testability.
// Produces a stable base64-encoded hash of JSON stringified data; falls back to
// a simple incremental entropy if encoding fails.
export function stableHash(value: any): string {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(value))));
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

// Decide whether to persist based on previous signature and next value.
// Returns the new signature if changed, otherwise null.
export function nextSignature(prevSig: string, value: any): string | null {
  const sig = stableHash(value);
  return sig === prevSig ? null : sig;
}

export interface DifferentialSet<T, K> {
  toUpsert: T[];
  toDelete: T[];
}

// Generic differential helper: given existing and incoming collections and a key getter,
// identify which incoming items are new/changed (using shallow comparison of provided fields)
// and which existing items are removed.
export function diffCollections<T extends Record<string, any>>(
  existing: T[],
  incoming: T[],
  keyFn: (item: T) => string,
  changedFn?: (a: T, b: T) => boolean
): DifferentialSet<T, string> {
  const existingMap = new Map(existing.map(e => [keyFn(e), e]));
  const incomingMap = new Map(incoming.map(i => [keyFn(i), i]));
  const toUpsert: T[] = [];
  const toDelete: T[] = [];
  for (const [k, inc] of incomingMap.entries()) {
    const prev = existingMap.get(k);
    if (!prev) {
      toUpsert.push(inc);
    } else if (changedFn ? changedFn(prev, inc) : JSON.stringify(prev) !== JSON.stringify(inc)) {
      toUpsert.push(inc);
    }
  }
  for (const [k, ex] of existingMap.entries()) {
    if (!incomingMap.has(k)) toDelete.push(ex);
  }
  return { toUpsert, toDelete };
}
