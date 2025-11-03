import { describe, it, expect } from 'vitest';
import { combineClaimsPeriod, parseClaimsPeriod } from '../../src/lib/claimsPeriod';

describe('claimsPeriod utils', () => {
  it('combines start and end into "to" format', () => {
    expect(combineClaimsPeriod('2025-01-01', '2025-12-31')).toBe('2025-01-01 to 2025-12-31');
    expect(combineClaimsPeriod('2025-01-01', '')).toBe('2025-01-01');
    expect(combineClaimsPeriod('', '2025-12-31')).toBe('2025-12-31');
    expect(combineClaimsPeriod('', '')).toBe('');
  });

  it('parses ISO range into start and end', () => {
    const r = parseClaimsPeriod('2025-01-01 to 2025-12-31');
    expect(r.start).toBe('2025-01-01');
    expect(r.end).toBe('2025-12-31');
  });

  it('parses DD/MM/YYYY range into ISO normalized', () => {
    const r = parseClaimsPeriod('01/01/2025 to 31/12/2025');
    expect(r.start).toBe('2025-01-01');
    expect(r.end).toBe('2025-12-31');
  });
});
