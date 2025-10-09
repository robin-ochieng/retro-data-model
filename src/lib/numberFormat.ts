/**
 * Number formatting utilities for display and parsing
 * Handles thousands separators, decimals, and Excel paste compatibility
 */

/**
 * Format a number for display with thousands separators
 * @param n - Number, string, or null to format
 * @param opts - Optional Intl.NumberFormat options
 * @returns Formatted string with thousands separators (e.g., "8,288,000,000")
 */
export function formatNumberDisplay(
  n: number | string | null | undefined,
  opts?: Intl.NumberFormatOptions
): string {
  // Handle null/undefined/empty
  if (n === null || n === undefined || n === '') {
    return '';
  }

  // Convert to number if string
  const num = typeof n === 'string' ? parseFloat(n) : n;

  // Return empty for NaN
  if (isNaN(num)) {
    return '';
  }

  // Use Kenyan locale with sensible defaults
  const defaultOpts: Intl.NumberFormatOptions = {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    ...opts,
  };

  try {
    return new Intl.NumberFormat('en-KE', defaultOpts).format(num);
  } catch (error) {
    // Fallback to basic formatting if Intl fails
    console.warn('Number formatting failed, using fallback:', error);
    return num.toLocaleString('en-US', defaultOpts);
  }
}

/**
 * Parse numeric input from various formats (Excel paste, user input)
 * Handles: "1,234", "1,234.56", "1234.56", " 1 234 ", "1.234,56"
 * @param raw - Raw string or number input
 * @returns Parsed number or null if invalid
 */
export function parseNumericInput(
  raw: string | number | null | undefined
): number | null {
  // Handle null/undefined
  if (raw === null || raw === undefined) {
    return null;
  }

  // Already a number
  if (typeof raw === 'number') {
    return isNaN(raw) ? null : raw;
  }

  // Convert to string and trim
  let str = String(raw).trim();

  // Empty string
  if (str === '') {
    return null;
  }

  // Detect format: European (1.234,56) vs US (1,234.56)
  // European format: comma is decimal separator, period/space are thousands
  // US format: period is decimal separator, comma/space are thousands
  
  const hasComma = str.includes(',');
  const hasPeriod = str.includes('.');
  
  if (hasComma && hasPeriod) {
    // Both present - determine which is decimal separator
    const lastCommaPos = str.lastIndexOf(',');
    const lastPeriodPos = str.lastIndexOf('.');
    
    if (lastCommaPos > lastPeriodPos) {
      // European format: "1.234,56" - comma is decimal
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: "1,234.56" - period is decimal
      str = str.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Only comma - check if it's decimal or thousands separator
    const lastCommaPos = str.lastIndexOf(',');
    const digitsAfterComma = str.length - lastCommaPos - 1;
    
    // If 1-2 digits after comma, likely European decimal (e.g., "1234,56")
    // If 3 digits or 0 digits, likely thousands separator (e.g., "1,234")
    if (digitsAfterComma > 0 && digitsAfterComma <= 2) {
      str = str.replace(/,/g, '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (hasPeriod) {
    // Only period - keep as is, it's the decimal separator
    // No action needed
  }
  
  // Remove any remaining spaces (for formats like "1 234 567")
  str = str.replace(/\s/g, '');

  // Parse the cleaned string
  const parsed = Number(str);

  // Return null if NaN, otherwise return the number
  return isNaN(parsed) ? null : parsed;
}

/**
 * Format a number for editing (remove formatting)
 * @param n - Number to format for editing
 * @returns Plain string without thousands separators
 */
export function formatNumberForEdit(n: number | null | undefined): string {
  if (n === null || n === undefined) {
    return '';
  }
  
  if (isNaN(n)) {
    return '';
  }

  return String(n);
}

/**
 * Validate if a string can be parsed as a valid number
 * @param raw - Raw input string
 * @returns true if parseable, false otherwise
 */
export function isValidNumericInput(raw: string): boolean {
  return parseNumericInput(raw) !== null;
}
