/**
 * Formatting and Parsing Utilities for Large Loss Triangulation
 * Handles numeric, date, and year input parsing for Excel paste support
 */

/**
 * Format a number for display with locale-specific formatting (commas, decimals)
 * @param value - The numeric value to format
 * @returns Formatted string with commas, or empty string if null/undefined
 */
export function formatNumberDisplay(value?: number | string | null): string {
  if (value == null || value === '') return '';
  const num = typeof value === 'string' ? Number(value) : value;
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('en-KE', { 
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  }).format(num);
}

/**
 * Parse numeric input from Excel or user input
 * Handles: commas, spaces, negative numbers, decimals
 * @param raw - Raw input value (string or number)
 * @returns Parsed number or null if invalid
 */
export function parseNumericInput(raw: string | number | null | undefined): number | null {
  if (raw == null || raw === '') return null;
  
  // Already a number
  if (typeof raw === 'number') {
    return isNaN(raw) ? null : raw;
  }
  
  // String parsing: remove commas and spaces
  const normalized = String(raw)
    .trim()
    .replace(/[,\s]/g, '') // Remove commas and spaces
    .replace(/^[^-\d.]+/, ''); // Remove leading non-numeric chars except - and .
  
  if (normalized === '' || normalized === '-') return null;
  
  const parsed = Number(normalized);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Parse year input - must be exactly 4 digits between 1900-2100
 * @param raw - Raw input value
 * @returns Parsed year number or null if invalid
 */
export function parseYearInput(raw: string | number | null | undefined): number | null {
  if (raw == null || raw === '') return null;
  
  const val = String(raw).trim().replace(/,/g, ''); // Remove commas from year like "2,024"
  
  // Must be exactly 4 digits
  if (!/^\d{4}$/.test(val)) return null;
  
  const year = Number(val);
  
  // Validate range
  if (year < 1900 || year > 2100) return null;
  
  return year;
}

/**
 * Parse date input from various formats including Excel serial dates
 * Supported formats:
 * - Excel serial dates (e.g., 44927 for 2023-01-01)
 * - ISO format: YYYY-MM-DD
 * - European: DD/MM/YYYY, DD-MM-YYYY
 * - US: MM/DD/YYYY
 * @param raw - Raw input value (string or number)
 * @returns ISO date string (YYYY-MM-DD) or null if invalid
 */
export function parseDateInput(raw: string | number | null | undefined): string | null {
  if (raw == null || raw === '') return null;
  
  // Handle Excel serial dates (numeric values > 20000 are likely Excel dates)
  if (!isNaN(Number(raw)) && Number(raw) > 20000 && Number(raw) < 100000) {
    try {
      // Excel epoch: December 30, 1899
      const epoch = new Date(Date.UTC(1899, 11, 30));
      epoch.setUTCDate(epoch.getUTCDate() + Number(raw));
      
      const year = epoch.getUTCFullYear();
      const month = String(epoch.getUTCMonth() + 1).padStart(2, '0');
      const day = String(epoch.getUTCDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch {
      return null;
    }
  }
  
  const str = String(raw).trim();
  
  // ISO format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
      return str;
    }
  }
  
  // DD/MM/YYYY format
  const ddmmyyyySlash = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyySlash) {
    const [, day, month, year] = ddmmyyyySlash;
    const d = Number(day);
    const m = Number(month);
    const y = Number(year);
    
    // Validate ranges
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const isoDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const date = new Date(isoDate);
      if (!isNaN(date.getTime())) {
        return isoDate;
      }
    }
  }
  
  // DD-MM-YYYY format
  const ddmmyyyyDash = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (ddmmyyyyDash) {
    const [, day, month, year] = ddmmyyyyDash;
    const d = Number(day);
    const m = Number(month);
    const y = Number(year);
    
    // Validate ranges
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const isoDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const date = new Date(isoDate);
      if (!isNaN(date.getTime())) {
        return isoDate;
      }
    }
  }
  
  // MM/DD/YYYY format (US) - try as fallback
  const mmddyyyy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyy) {
    const [, month, day, year] = mmddyyyy;
    const d = Number(day);
    const m = Number(month);
    const y = Number(year);
    
    // If month is > 12, it's definitely DD/MM/YYYY (already handled above)
    // Otherwise, ambiguous - prefer DD/MM/YYYY interpretation
    if (m <= 12 && d <= 12) {
      // Ambiguous case - already tried DD/MM/YYYY above, skip this
      return null;
    }
  }
  
  return null;
}

/**
 * Validate a date value for flagging errors in UI
 * @param value - Date string or null
 * @returns Error message or null if valid
 */
export function validateDate(value: string | null | undefined): string | null {
  if (!value) return null;
  
  const parsed = parseDateInput(value);
  if (!parsed) {
    return 'Invalid date format. Use YYYY-MM-DD, DD/MM/YYYY, or DD-MM-YYYY';
  }
  
  return null;
}

/**
 * Validate a year value for flagging errors in UI
 * @param value - Year number or null
 * @returns Error message or null if valid
 */
export function validateYear(value: number | string | null | undefined): string | null {
  if (!value) return null;
  
  const parsed = parseYearInput(value);
  if (!parsed) {
    return 'Invalid year. Must be a 4-digit year between 1900-2100';
  }
  
  return null;
}

/**
 * Validate a numeric value for flagging errors in UI
 * @param value - Numeric value or null
 * @returns Error message or null if valid
 */
export function validateNumeric(value: number | string | null | undefined): string | null {
  if (!value && value !== 0) return null;
  
  const parsed = parseNumericInput(value);
  if (parsed === null && value !== '') {
    return 'Invalid number format';
  }
  
  return null;
}
