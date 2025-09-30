import { describe, it, expect } from 'vitest';
import { stableHash, nextSignature, diffCollections } from '../../src/utils/hash';

describe('stableHash', () => {
  it('produces same hash for same object', () => {
    const a = { x: 1, y: 'test' };
    expect(stableHash(a)).toBe(stableHash(a));
  });
  it('differs for different objects', () => {
    const h1 = stableHash({ x: 1 });
    const h2 = stableHash({ x: 2 });
    expect(h1).not.toBe(h2);
  });
});

describe('nextSignature', () => {
  it('returns null when unchanged', () => {
    const v = { a: 1 };
    const sig = stableHash(v);
    expect(nextSignature(sig, v)).toBeNull();
  });
  it('returns new signature when changed', () => {
    const sig = stableHash({ a: 1 });
    const newSig = nextSignature(sig, { a: 2 });
    expect(newSig).not.toBeNull();
    expect(newSig).not.toBe(sig);
  });
});

describe('diffCollections', () => {
  interface Row { key: string; value: number; note?: string }
  const keyFn = (r: Row) => r.key;
  it('detects added and deleted', () => {
    const existing: Row[] = [{ key: 'a', value: 1 }, { key: 'b', value: 2 }];
    const incoming: Row[] = [{ key: 'b', value: 2 }, { key: 'c', value: 3 }];
    const diff = diffCollections(existing, incoming, keyFn);
    expect(diff.toUpsert).toEqual([{ key: 'c', value: 3 }]);
    expect(diff.toDelete).toEqual([{ key: 'a', value: 1 }]);
  });
  it('detects changed row', () => {
    const existing: Row[] = [{ key: 'a', value: 1 }];
    const incoming: Row[] = [{ key: 'a', value: 2 }];
    const diff = diffCollections(existing, incoming, keyFn, (p, n) => p.value !== n.value);
    expect(diff.toUpsert).toEqual([{ key: 'a', value: 2 }]);
    expect(diff.toDelete).toEqual([]);
  });
});
