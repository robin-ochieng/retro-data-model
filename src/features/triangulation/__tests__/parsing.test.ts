import { describe, expect, it } from 'vitest';
import { parseNumericInput, parseYearInput } from '../../../lib/formatUtils';

describe('formatUtils parsing helpers', () => {
  describe('parseNumericInput', () => {
    it('parses comma-grouped integers', () => {
      expect(parseNumericInput('1,234')).toBe(1234);
    });

    it('parses negative decimals with grouping', () => {
      expect(parseNumericInput('-1,234.56')).toBeCloseTo(-1234.56);
    });

    it('parses European decimal notation', () => {
      expect(parseNumericInput('1.234,56')).toBeCloseTo(1234.56);
    });

    it('returns null for blanks', () => {
      expect(parseNumericInput('')).toBeNull();
    });
  });

  describe('parseYearInput', () => {
    it('accepts plain 4-digit year', () => {
      expect(parseYearInput('2024')).toBe(2024);
    });

    it('rejects years with commas', () => {
      expect(parseYearInput('2,024')).toBeNull();
    });
  });
});
