import { describe, it, expect } from 'vitest';
import { 
  formatNumberDisplay, 
  parseNumericInput, 
  parseYearInput, 
  parseDateInput,
  validateDate,
  validateYear,
  validateNumeric
} from '../../src/lib/formatUtils';

describe('Large Loss Triangulation - Format Utils', () => {
  describe('formatNumberDisplay', () => {
    it('should format numbers with commas', () => {
      expect(formatNumberDisplay(1000)).toBe('1,000');
      expect(formatNumberDisplay(1500250.75)).toBe('1,500,250.75');
      expect(formatNumberDisplay(1000000)).toBe('1,000,000');
    });

    it('should handle decimals correctly', () => {
      expect(formatNumberDisplay(1234.5)).toBe('1,234.5');
      expect(formatNumberDisplay(1234.56)).toBe('1,234.56');
      expect(formatNumberDisplay(1234.567)).toBe('1,234.57'); // Rounds to 2 decimals
    });

    it('should handle negative numbers', () => {
      expect(formatNumberDisplay(-1000)).toBe('-1,000');
      expect(formatNumberDisplay(-1500.50)).toBe('-1,500.5');
    });

    it('should return empty string for null/undefined', () => {
      expect(formatNumberDisplay(null)).toBe('');
      expect(formatNumberDisplay(undefined)).toBe('');
      expect(formatNumberDisplay('')).toBe('');
    });
  });

  describe('parseNumericInput', () => {
    it('should parse numbers with commas', () => {
      expect(parseNumericInput('1,500,250.75')).toBe(1500250.75);
      expect(parseNumericInput('1,000')).toBe(1000);
      expect(parseNumericInput('10,000,000')).toBe(10000000);
    });

    it('should parse negative numbers', () => {
      expect(parseNumericInput('-50000.50')).toBe(-50000.50);
      expect(parseNumericInput('-1,000')).toBe(-1000);
    });

    it('should parse decimals', () => {
      expect(parseNumericInput('1234.56')).toBe(1234.56);
      expect(parseNumericInput('.5')).toBe(0.5);
    });

    it('should handle spaces', () => {
      expect(parseNumericInput('1 500 250.75')).toBe(1500250.75);
      expect(parseNumericInput(' 1000 ')).toBe(1000);
    });

    it('should return null for empty/invalid', () => {
      expect(parseNumericInput('')).toBe(null);
      expect(parseNumericInput(null)).toBe(null);
      expect(parseNumericInput(undefined)).toBe(null);
      expect(parseNumericInput('abc')).toBe(null);
    });

    it('should handle numbers passed as numbers', () => {
      expect(parseNumericInput(1500)).toBe(1500);
      expect(parseNumericInput(1500.75)).toBe(1500.75);
    });
  });

  describe('parseYearInput', () => {
    it('should parse valid 4-digit years', () => {
      expect(parseYearInput('2023')).toBe(2023);
      expect(parseYearInput('2024')).toBe(2024);
      expect(parseYearInput('1900')).toBe(1900);
      expect(parseYearInput('2100')).toBe(2100);
    });

    it('rejects years that include grouping commas', () => {
      expect(parseYearInput('2,023')).toBe(null);
      expect(parseYearInput('2,024')).toBe(null);
    });

    it('should reject invalid years', () => {
      // Note: '20,24' becomes '2024' after comma removal, which is valid
      // So we test with actually invalid formats
      expect(parseYearInput('23')).toBe(null); // Too short
      expect(parseYearInput('20234')).toBe(null); // Too long
      expect(parseYearInput('1899')).toBe(null); // Too early
      expect(parseYearInput('2101')).toBe(null); // Too late
    });

    it('should return null for empty/invalid', () => {
      expect(parseYearInput('')).toBe(null);
      expect(parseYearInput(null)).toBe(null);
      expect(parseYearInput(undefined)).toBe(null);
    });
  });

  describe('parseDateInput', () => {
    it('should parse Excel serial dates', () => {
      expect(parseDateInput(44927)).toBe('2023-01-01');
      expect(parseDateInput(45292)).toBe('2024-01-01');
      expect(parseDateInput('44927')).toBe('2023-01-01');
    });

    it('should parse ISO format (YYYY-MM-DD)', () => {
      expect(parseDateInput('2023-01-01')).toBe('2023-01-01');
      expect(parseDateInput('2024-06-15')).toBe('2024-06-15');
    });

    it('should parse DD/MM/YYYY format', () => {
      expect(parseDateInput('15/06/2023')).toBe('2023-06-15');
      expect(parseDateInput('01/01/2024')).toBe('2024-01-01');
      expect(parseDateInput('31/12/2025')).toBe('2025-12-31');
    });

    it('should parse DD-MM-YYYY format', () => {
      expect(parseDateInput('20-07-2024')).toBe('2024-07-20');
      expect(parseDateInput('01-01-2023')).toBe('2023-01-01');
    });

    it('should return null for invalid dates', () => {
      expect(parseDateInput('13/13/2024')).toBe(null); // Invalid month
      expect(parseDateInput('32/01/2024')).toBe(null); // Invalid day
      expect(parseDateInput('invalid')).toBe(null);
      expect(parseDateInput('')).toBe(null);
      expect(parseDateInput(null)).toBe(null);
    });
  });

  describe('validateDate', () => {
    it('should return null for valid dates', () => {
      expect(validateDate('2023-01-01')).toBe(null);
      expect(validateDate(null)).toBe(null);
      expect(validateDate(undefined)).toBe(null);
    });

    it('should return error message for invalid dates', () => {
      const error = validateDate('invalid-date');
      expect(error).toContain('Invalid date format');
    });
  });

  describe('validateYear', () => {
    it('should return null for valid years', () => {
      expect(validateYear(2023)).toBe(null);
      expect(validateYear('2024')).toBe(null);
      expect(validateYear(null)).toBe(null);
    });

    it('should return error message for invalid years', () => {
      const error = validateYear(1899);
      expect(error).toBeTruthy();
      expect(error).toContain('Invalid year');
      
      const error2 = validateYear(2101);
      expect(error2).toBeTruthy();
      expect(error2).toContain('Invalid year');
    });
  });

  describe('validateNumeric', () => {
    it('should return null for valid numbers', () => {
      expect(validateNumeric(1000)).toBe(null);
      expect(validateNumeric('1,500.50')).toBe(null);
      expect(validateNumeric(null)).toBe(null);
      expect(validateNumeric(0)).toBe(null);
    });

    it('should return error message for invalid numbers', () => {
      const error = validateNumeric('abc');
      expect(error).toContain('Invalid number');
    });
  });
});
