import { describe, it, expect } from 'vitest';
import { formatNumberDisplay, parseNumericInput, formatNumberForEdit, isValidNumericInput } from '../../src/lib/numberFormat';

describe('numberFormat utilities', () => {
  describe('formatNumberDisplay', () => {
    it('should format numbers with thousands separators', () => {
      expect(formatNumberDisplay(8288000000)).toBe('8,288,000,000');
      expect(formatNumberDisplay(1234567)).toBe('1,234,567');
      expect(formatNumberDisplay(1234)).toBe('1,234');
    });

    it('should handle decimal places', () => {
      expect(formatNumberDisplay(1234.56)).toBe('1,234.56');
      expect(formatNumberDisplay(1234.567, { maximumFractionDigits: 3 })).toBe('1,234.567');
      expect(formatNumberDisplay(1234.5, { minimumFractionDigits: 2 })).toBe('1,234.50');
    });

    it('should handle null/undefined/empty values', () => {
      expect(formatNumberDisplay(null)).toBe('');
      expect(formatNumberDisplay(undefined)).toBe('');
      expect(formatNumberDisplay('')).toBe('');
    });

    it('should handle string inputs', () => {
      expect(formatNumberDisplay('1234567')).toBe('1,234,567');
      expect(formatNumberDisplay('1234.56')).toBe('1,234.56');
    });

    it('should handle zero', () => {
      expect(formatNumberDisplay(0)).toBe('0');
    });

    it('should handle negative numbers', () => {
      expect(formatNumberDisplay(-1234567)).toBe('-1,234,567');
      expect(formatNumberDisplay(-1234.56)).toBe('-1,234.56');
    });

    it('should return empty for invalid input', () => {
      expect(formatNumberDisplay('invalid')).toBe('');
      expect(formatNumberDisplay('abc123')).toBe('');
    });
  });

  describe('parseNumericInput', () => {
    it('should parse numbers with comma separators', () => {
      expect(parseNumericInput('1,234')).toBe(1234);
      expect(parseNumericInput('67,000,000,000')).toBe(67000000000);
      expect(parseNumericInput('82,880,000')).toBe(82880000);
      expect(parseNumericInput('105,000,000.75')).toBe(105000000.75);
    });

    it('should parse numbers with space separators', () => {
      expect(parseNumericInput('1 234')).toBe(1234);
      expect(parseNumericInput('1 234 567')).toBe(1234567);
      expect(parseNumericInput(' 1 234 ')).toBe(1234);
    });

    it('should parse plain numbers', () => {
      expect(parseNumericInput('1234')).toBe(1234);
      expect(parseNumericInput('1234.56')).toBe(1234.56);
      expect(parseNumericInput('0.5')).toBe(0.5);
    });

    it('should parse European format (comma as decimal)', () => {
      expect(parseNumericInput('1234,56')).toBe(1234.56);
      expect(parseNumericInput('1,50')).toBe(1.50);
      expect(parseNumericInput('999,99')).toBe(999.99);
    });

    it('should handle null/undefined/empty values', () => {
      expect(parseNumericInput(null)).toBeNull();
      expect(parseNumericInput(undefined)).toBeNull();
      expect(parseNumericInput('')).toBeNull();
      expect(parseNumericInput('   ')).toBeNull();
    });

    it('should handle numeric input', () => {
      expect(parseNumericInput(1234)).toBe(1234);
      expect(parseNumericInput(1234.56)).toBe(1234.56);
      expect(parseNumericInput(0)).toBe(0);
    });

    it('should handle negative numbers', () => {
      expect(parseNumericInput('-1,234')).toBe(-1234);
      expect(parseNumericInput('-1234.56')).toBe(-1234.56);
      expect(parseNumericInput('-1234,56')).toBe(-1234.56);
    });

    it('should return null for invalid input', () => {
      expect(parseNumericInput('invalid')).toBeNull();
      expect(parseNumericInput('abc')).toBeNull();
      expect(parseNumericInput('12abc34')).toBeNull();
    });

    it('should handle NaN input', () => {
      expect(parseNumericInput(NaN)).toBeNull();
    });

    it('should handle mixed formats from Excel paste', () => {
      // Typical Excel formats users might paste
      expect(parseNumericInput('82,880,000.50')).toBe(82880000.50);
      expect(parseNumericInput('95,000,000')).toBe(95000000);
      expect(parseNumericInput('67000000000')).toBe(67000000000);
    });
  });

  describe('formatNumberForEdit', () => {
    it('should return plain string without formatting', () => {
      expect(formatNumberForEdit(1234567)).toBe('1234567');
      expect(formatNumberForEdit(1234.56)).toBe('1234.56');
      expect(formatNumberForEdit(0)).toBe('0');
    });

    it('should handle null/undefined', () => {
      expect(formatNumberForEdit(null)).toBe('');
      expect(formatNumberForEdit(undefined)).toBe('');
    });

    it('should handle negative numbers', () => {
      expect(formatNumberForEdit(-1234.56)).toBe('-1234.56');
    });

    it('should handle NaN', () => {
      expect(formatNumberForEdit(NaN)).toBe('');
    });
  });

  describe('isValidNumericInput', () => {
    it('should validate parseable numbers', () => {
      expect(isValidNumericInput('1,234')).toBe(true);
      expect(isValidNumericInput('1234.56')).toBe(true);
      expect(isValidNumericInput('67,000,000,000')).toBe(true);
      expect(isValidNumericInput('1 234')).toBe(true);
      expect(isValidNumericInput('1234,56')).toBe(true);
    });

    it('should reject invalid input', () => {
      expect(isValidNumericInput('invalid')).toBe(false);
      expect(isValidNumericInput('abc')).toBe(false);
      expect(isValidNumericInput('12abc34')).toBe(false);
    });

    it('should handle empty strings', () => {
      expect(isValidNumericInput('')).toBe(false);
      expect(isValidNumericInput('   ')).toBe(false);
    });
  });

  describe('Edge cases and Excel paste compatibility', () => {
    it('should handle large numbers from Excel', () => {
      expect(parseNumericInput('8,288,000,000')).toBe(8288000000);
      expect(parseNumericInput('67,000,000,000')).toBe(67000000000);
      expect(formatNumberDisplay(8288000000)).toBe('8,288,000,000');
    });

    it('should handle decimals with comma thousands', () => {
      expect(parseNumericInput('82,880,000.50')).toBe(82880000.50);
      expect(parseNumericInput('105,000,000.75')).toBe(105000000.75);
    });

    it('should handle various decimal formats', () => {
      expect(parseNumericInput('1234.5')).toBe(1234.5);
      expect(parseNumericInput('1234.56')).toBe(1234.56);
      expect(parseNumericInput('1234.567')).toBe(1234.567);
    });

    it('should roundtrip formatting and parsing', () => {
      const values = [1234, 1234.56, 8288000000, 0, -1234.56];
      
      values.forEach(val => {
        const formatted = formatNumberDisplay(val);
        const parsed = parseNumericInput(formatted);
        expect(parsed).toBe(val);
      });
    });
  });
});
