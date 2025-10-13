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

/**
 * Format a percent value for display
 * @param p - Percent value in percent units (e.g., 12.5 for 12.5%)
 * @param digits - Number of decimal places (default: 2)
 * @returns Formatted string with % symbol (e.g., "12.50%")
 */
export function formatPercentDisplay(
  p: number | string | null | undefined,
  digits = 2
): string {
  // Handle null/undefined/empty
  if (p === null || p === undefined || p === '') {
    return '';
  }

  // Convert to number if string
  const num = typeof p === 'string' ? parseFloat(p) : p;

  // Return empty for NaN
  if (isNaN(num)) {
    return '';
  }

  // Format with specified decimal places and add %
  return `${num.toFixed(digits)}%`;
}

/**
 * Parse percent input from various formats
 * Handles: "12", "12.5", "12%", "12.5%", "0.12" (as 12%), "0.125" (as 12.5%)
 * Supports negatives: "-5", "-5%", "-0.05" → -5
 * @param raw - Raw string or number input
 * @returns Parsed percent value in percent units (e.g., 12.5 for 12.5%), or null if invalid
 */
export function parsePercentInput(
  raw: string | number | null | undefined
): number | null {
  // Handle null/undefined
  if (raw === null || raw === undefined) {
    return null;
  }

  // Already a number
  if (typeof raw === 'number') {
    if (isNaN(raw)) return null;
    // If between -1 and 1 (exclusive of -1, 1), treat as fractional (0.12 → 12%)
    if (raw > -1 && raw < 1 && raw !== 0) {
      return raw * 100;
    }
    return raw;
  }

  // Convert to string and trim
  let str = String(raw).trim();

  // Empty string
  if (str === '') {
    return null;
  }

  // Check for % sign
  const hasPercent = str.includes('%');
  
  // Remove % sign if present
  if (hasPercent) {
    str = str.replace(/%/g, '');
  }

  // Remove common grouping characters (commas, spaces)
  str = str.replace(/[,\s]/g, '');

  // Parse the cleaned string
  const parsed = Number(str);

  // Return null if NaN
  if (isNaN(parsed)) {
    return null;
  }

  // If no % sign and value is between -1 and 1 (fractional form like 0.12 or -0.05)
  if (!hasPercent && parsed > -1 && parsed < 1 && parsed !== 0) {
    return parsed * 100;
  }

  return parsed;
}

/**
 * Format a percent value for editing (remove % symbol)
 * @param p - Percent value to format for editing
 * @returns Plain string without % symbol
 */
export function formatPercentForEdit(p: number | null | undefined): string {
  if (p === null || p === undefined) {
    return '';
  }
  
  if (isNaN(p)) {
    return '';
  }

  return String(p);
}

/**
 * Validate if a string can be parsed as a valid percent
 * @param raw - Raw input string
 * @returns true if parseable, false otherwise
 */
export function isValidPercentInput(raw: string): boolean {
  return parsePercentInput(raw) !== null;
}

/**
 * Parse year input - must be a 4-digit year between 1900 and 2100
 * @param raw - Raw string input
 * @returns Parsed year as number or null if invalid
 */
export function parseYearInput(raw: string | number | null | undefined): number | null {
  // Handle null/undefined
  if (raw === null || raw === undefined) {
    return null;
  }

  // Already a number
  if (typeof raw === 'number') {
    if (isNaN(raw)) return null;
    // Must be 4-digit year
    if (raw >= 1900 && raw <= 2100 && Number.isInteger(raw)) {
      return raw;
    }
    return null;
  }

  // Convert to string and trim
  const str = String(raw).trim();

  // Empty string
  if (str === '') {
    return null;
  }

  // Must match 4 digits exactly (no commas allowed)
  if (!/^\d{4}$/.test(str)) {
    return null;
  }

  const year = parseInt(str, 10);

  // Must be in valid range
  if (year >= 1900 && year <= 2100) {
    return year;
  }

  return null;
}

/**
 * Parse date input from various formats and normalize to ISO YYYY-MM-DD
 * Handles: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, MM/DD/YYYY, Excel serials, Date objects
 * @param raw - Raw string or Date input
 * @returns ISO date string (YYYY-MM-DD) or null if invalid
 */
export function parseDateInput(raw: string | Date | null | undefined): string | null {
  // Handle null/undefined
  if (raw === null || raw === undefined) {
    return null;
  }

  // Already a Date object
  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return null;
    // Format as ISO date (YYYY-MM-DD) without timezone shift
    const year = raw.getFullYear();
    const month = String(raw.getMonth() + 1).padStart(2, '0');
    const day = String(raw.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Convert to string and trim
  let str = String(raw).trim();

  // Empty string
  if (str === '') {
    return null;
  }

  // Already ISO format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const parts = str.split('-').map(Number);
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    if (year !== undefined && month !== undefined && day !== undefined &&
        year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return str;
    }
    return null;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyyMatch = str.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (ddmmyyyyMatch) {
    const day = parseInt(ddmmyyyyMatch[1] || '0', 10);
    const month = parseInt(ddmmyyyyMatch[2] || '0', 10);
    const year = parseInt(ddmmyyyyMatch[3] || '0', 10);
    
    if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const mm = String(month).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      return `${year}-${mm}-${dd}`;
    }
    return null;
  }

  // YYYY/MM/DD or YYYY.MM.DD
  const yyyymmddMatch = str.match(/^(\d{4})[\/.](\d{1,2})[\/.](\d{1,2})$/);
  if (yyyymmddMatch) {
    const year = parseInt(yyyymmddMatch[1] || '0', 10);
    const month = parseInt(yyyymmddMatch[2] || '0', 10);
    const day = parseInt(yyyymmddMatch[3] || '0', 10);
    
    if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const mm = String(month).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      return `${year}-${mm}-${dd}`;
    }
    return null;
  }

  // Excel serial number (days since 1899-12-30)
  const excelSerial = parseFloat(str);
  if (!isNaN(excelSerial) && excelSerial > 0 && excelSerial < 100000) {
    // Excel epoch: December 30, 1899
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + excelSerial * 24 * 60 * 60 * 1000);
    
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  return null;
}

/**
 * Format a date for display
 * @param dateStr - ISO date string (YYYY-MM-DD)
 * @param locale - Locale for formatting (default: 'en-KE')
 * @returns Formatted date string or empty string if invalid
 */
export function formatDateDisplay(
  dateStr: string | null | undefined,
  locale = 'en-KE'
): string {
  if (!dateStr) return '';
  
  const parsed = parseDateInput(dateStr);
  if (!parsed) return '';
  
  try {
    const parts = parsed.split('-').map(Number);
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    if (year !== undefined && month !== undefined && day !== undefined) {
      const date = new Date(year, month - 1, day);
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(date);
    }
    return parsed;
  } catch (error) {
    return parsed; // Fallback to ISO format
  }
}
