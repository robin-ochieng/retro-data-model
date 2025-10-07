/**
 * Shared utility for converting technical field names into human-friendly column headers.
 * 
 * Usage:
 *   import { humanizeHeader } from '@/lib/headerFormat';
 *   const displayName = humanizeHeader('gross_sum_insured'); // "Gross Sum Insured"
 */

/**
 * Common insurance/reinsurance acronyms that should remain uppercase.
 */
const ACRONYMS = new Set([
  "ID",
  "QS",
  "XOL",
  "XL",
  "FAC",
  "USD",
  "EUR",
  "GBP",
  "KES",
  "UW",
  "PI",
  "PML",
  "CAT",
  "EPI",
  "AAL",
  "OEP",
  "AEP",
  "RI",
  "SI",
  "GWP",
  "NWP",
  "GP",
  "NP",
  "IBNR",
  "ULAE",
  "ALAE",
  "DOL",
  "ROL",
  "EL",
  "PL",
  "GL",
  "WC",
  "TP",
  "TPL",
  "MTPL",
  "D&O",
  "E&O",
  "CAR",
  "EAR",
  "TPD",
  "CI",
  "PA",
]);

/**
 * Domain-specific header overrides for insurance/reinsurance terminology.
 * These take precedence over automatic formatting.
 */
export const HEADER_OVERRIDES: Record<string, string> = {
  // Common fields across sheets
  id: "ID",
  submission_id: "Submission ID",
  class_of_business: "Class of Business",
  classes_of_business: "Classes of Business",
  lines_of_business: "Lines of Business",
  line_of_business: "Line of Business",
  
  // Underwriting
  uw_year: "Underwriting Year",
  uw_limit: "UW Limit",
  underwriting_year: "Underwriting Year",
  underwriting_limit: "Underwriting Limit",
  
  // Financial - Sums Insured
  gross_sum_insured: "Gross Sum Insured",
  fac_sum_insured: "FAC Sum Insured",
  surplus_sum_insured: "Surplus Sum Insured",
  quota_share_sum_insured: "QS Sum Insured",
  net_sum_insured: "Net Sum Insured",
  tsi: "Total Sum Insured",
  si: "Sum Insured",
  
  // Financial - Premiums
  gross_premium: "Gross Premium",
  fac_premium: "FAC Premium",
  surplus_premium: "Surplus Premium",
  quota_share_premium: "QS Premium",
  net_premium: "Net Premium",
  gwp: "GWP",
  nwp: "NWP",
  
  // Financial - Claims/Losses
  gross_incurred: "Gross Incurred",
  paid_to_date: "Paid to Date",
  gross_outstanding: "Gross Outstanding",
  case_reserves: "Case Reserves",
  ibnr: "IBNR",
  ulae: "ULAE",
  alae: "ALAE",
  
  // Loss details
  loss_id: "Loss ID",
  dol: "Date of Loss",
  type_of_loss: "Type of Loss",
  loss_description: "Loss Description",
  loss_ratio: "Loss Ratio",
  large_loss: "Large Loss",
  cat_loss: "CAT Loss",
  
  // Treaty details
  treaty_type: "Treaty Type",
  treaty_name: "Treaty Name",
  treaty_reference: "Treaty Reference",
  attachment_point: "Attachment Point",
  exhaustion_point: "Exhaustion Point",
  
  // Dates
  inception_date: "Inception Date",
  expiry_date: "Expiry Date",
  claims_period_start: "Claims Period Start",
  claims_period_end: "Claims Period End",
  
  // Geography
  cresta_zone: "CRESTA Zone",
  cresta_code: "CRESTA Code",
  
  // Top 20 Risks specific
  rank: "Rank",
  insured: "Insured",
  occupation: "Occupation",
  
  // Risk Profile
  nat_cat_exposure: "NatCat Exposure",
  pml: "PML",
  aal: "AAL",
  
  // Currency
  currency: "Currency",
  currency_std_units: "Currency (in std. units)",
  
  // Motor specific
  fleet_name: "Fleet Name",
  fleet_size: "Fleet Size",
  vehicle_type: "Vehicle Type",
  
  // Misc
  notes: "Notes",
  remarks: "Remarks",
  status: "Status",
  created_at: "Created At",
  updated_at: "Updated At",
};

/**
 * Convert a technical field name to a human-friendly header.
 * 
 * Process:
 * 1. Check HEADER_OVERRIDES for exact match
 * 2. Convert camelCase and snake_case to spaces
 * 3. Title Case each word, preserving known acronyms
 * 
 * @param key - The field name (e.g., "gross_sum_insured", "uwYear", "FAC_PREMIUM")
 * @returns Human-friendly header (e.g., "Gross Sum Insured", "UW Year", "FAC Premium")
 * 
 * @example
 * humanizeHeader("gross_sum_insured") // "Gross Sum Insured"
 * humanizeHeader("uwYear") // "UW Year"
 * humanizeHeader("fac_premium") // "FAC Premium"
 * humanizeHeader("id") // "ID"
 * humanizeHeader("class_of_business") // "Class of Business"
 */
export function humanizeHeader(key: string): string {
  if (!key) return "";
  
  const lower = key.trim().toLowerCase();
  
  // Check for exact override match first
  const direct = HEADER_OVERRIDES[lower];
  if (direct) return direct;
  
  // Convert camelCase to spaces: "grossSumInsured" → "gross Sum Insured"
  // Convert snake_case to spaces: "gross_sum_insured" → "gross sum insured"
  const spaced = lower
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2") // camelCase
    .replace(/_/g, " ") // snake_case
    .replace(/\s+/g, " ") // normalize multiple spaces
    .trim();
  
  // Title Case each word, preserving acronyms
  return spaced
    .split(/\s+/)
    .filter(Boolean)
    .map(word => {
      const upper = word.toUpperCase();
      
      // If it's a known acronym, use uppercase
      if (ACRONYMS.has(upper)) {
        return upper;
      }
      
      // Check for special patterns like "d&o" → "D&O"
      if (word.includes("&")) {
        return word
          .split("&")
          .map(part => part.toUpperCase())
          .join("&");
      }
      
      // Standard Title Case
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Batch convert multiple keys to headers.
 * Useful for generating column definitions programmatically.
 * 
 * @param keys - Array of field names
 * @returns Object mapping original keys to human-friendly headers
 * 
 * @example
 * const headers = batchHumanizeHeaders(['rank', 'insured', 'gross_sum_insured']);
 * // { rank: "Rank", insured: "Insured", gross_sum_insured: "Gross Sum Insured" }
 */
export function batchHumanizeHeaders(keys: string[]): Record<string, string> {
  return keys.reduce((acc, key) => {
    acc[key] = humanizeHeader(key);
    return acc;
  }, {} as Record<string, string>);
}
