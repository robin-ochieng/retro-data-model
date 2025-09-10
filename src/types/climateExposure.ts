// Climate Change Exposure redesigned schema
// Ordered field definitions with validation hints

export interface ClimateChangeExposureRow {
  policy_inception_date: string | null; // ISO date (yyyy-mm-dd) stored normalized
  policy_expiry_date: string | null; // ISO date, >= inception
  insured: string; // required
  policy_category: string | null;
  policy_description: string | null;
  nature_of_risk: string | null;
  gross_exposure_tsi: number | null;
  cedants_exposure_tsi: number | null;
  eml_mpl_limit_applied: number | null; // numeric flag/amount applied (>0 means active)
  eml_mpl_limit: number | null;
  ceded_prop_reinsurance_exposure: number | null;
  net_inuring_prop_reinsurance_exposure: number | null; // optional manual / derived
  gross_premium: number | null;
  cedants_premium: number | null;
  ceded_prop_reinsurance_premium: number | null;
  net_prop_reinsurance_premium: number | null; // optional manual / derived
  _legacy?: any; // original row if migrated
}

export type ClimateExposureFieldKey = keyof Omit<ClimateChangeExposureRow, '_legacy'>;

export interface ClimateExposureFieldMeta {
  key: ClimateExposureFieldKey;
  label: string;
  type: 'text' | 'number' | 'date' | 'checkbox';
  required?: boolean;
  placeholder?: string;
  derive?: (row: ClimateChangeExposureRow) => number | null; // for potential future derivations
  validate?: (value: any, row: ClimateChangeExposureRow) => string | null;
  sum?: boolean; // include in totals row
  format?: (value: any) => string;
}

export const CLIMATE_EXPOSURE_FIELDS: ClimateExposureFieldMeta[] = [
  { key: 'policy_inception_date', label: 'Policy Inception Date', type: 'text', required: true, placeholder: 'YYYY-MM-DD or DD/MM/YYYY', validate: v => !v ? 'Required' : (normalizeDateString(v) ? null : 'Invalid date') },
  { key: 'policy_expiry_date', label: 'Policy Expiry Date', type: 'text', required: true, placeholder: 'YYYY-MM-DD or DD/MM/YYYY', validate: (v, row) => {
      if (!v) return 'Required';
      const norm = normalizeDateString(v); if (!norm) return 'Invalid date';
      if (row.policy_inception_date) {
        const incNorm = normalizeDateString(row.policy_inception_date);
        if (incNorm && norm < incNorm) return 'Must be >= inception';
      }
      return null;
    } },
  { key: 'insured', label: 'Insured', type: 'text', required: true, validate: v => !v ? 'Required' : null },
  { key: 'policy_category', label: 'Policy Category', type: 'text' },
  { key: 'policy_description', label: 'Policy Description', type: 'text' },
  { key: 'nature_of_risk', label: 'Nature of Risk', type: 'text' },
  { key: 'gross_exposure_tsi', label: 'Gross Exposure (TSI)', type: 'number', sum: true, validate: v => (v == null || v === '') ? null : (v < 0 ? '>= 0' : null) },
  { key: 'cedants_exposure_tsi', label: "Cedants Exposure (TSI)", type: 'number', sum: true, validate: v => (v == null || v === '') ? null : (v < 0 ? '>= 0' : null) },
  { key: 'eml_mpl_limit_applied', label: 'EML/MPL Limit Applied', type: 'number', validate: v => (v == null || v === '') ? null : (v < 0 ? '>= 0' : null) },
  { key: 'eml_mpl_limit', label: 'EML/MPL Limit', type: 'number', validate: (v, row) => {
      if (row.eml_mpl_limit_applied == null || row.eml_mpl_limit_applied <= 0) return null; // only required if applied > 0
      return (v == null || v === '') ? 'Required' : (v < 0 ? '>= 0' : null);
    } },
  { key: 'ceded_prop_reinsurance_exposure', label: 'Ceded to Proportional Reinsurance (Exposure)', type: 'number', sum: true, validate: v => (v == null || v === '') ? null : (v < 0 ? '>= 0' : null) },
  { key: 'net_inuring_prop_reinsurance_exposure', label: 'Net of Inuring Proportional Reinsurance (Exposure)', type: 'number', validate: v => (v == null || v === '') ? null : (v < 0 ? '>= 0' : null) },
  { key: 'gross_premium', label: 'Gross Premium', type: 'number', sum: true, validate: v => (v == null || v === '') ? null : (v < 0 ? '>= 0' : null) },
  { key: 'cedants_premium', label: "Cedants Premium", type: 'number', sum: true, validate: v => (v == null || v === '') ? null : (v < 0 ? '>= 0' : null) },
  { key: 'ceded_prop_reinsurance_premium', label: 'Ceded to Proportional Reinsurance (Premium)', type: 'number', sum: true, validate: v => (v == null || v === '') ? null : (v < 0 ? '>= 0' : null) },
  { key: 'net_prop_reinsurance_premium', label: 'Net of Proportional Reinsurance (Premium)', type: 'number', validate: v => (v == null || v === '') ? null : (v < 0 ? '>= 0' : null) },
];

export const CLIMATE_EXPOSURE_NUMERIC_KEYS: ClimateExposureFieldKey[] = CLIMATE_EXPOSURE_FIELDS.filter(f => f.type === 'number').map(f => f.key);

// Robust numeric parsing for pasted values
export function parseNumeric(raw: any): number | null {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;
  // Parentheses negative
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  // Remove commas & spaces
  s = s.replace(/[,\s]/g, '');
  // Optional percent handling (strip % and keep number)
  let isPercent = false;
  if (/%$/.test(s)) { isPercent = true; s = s.replace(/%$/, ''); }
  if (!/^[-+]?\d*(\.\d+)?$/.test(s) || s === '' || s === '.' || s === '+' || s === '-') return null;
  const n = parseFloat(s);
  if (Number.isNaN(n)) return null;
  const val = neg ? -n : n;
  return isPercent ? val : val; // currently no scaling for percent
}

// Acceptable date formats: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY
export function normalizeDateString(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = String(raw).trim();
  if (!v) return null;
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m1 = /^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/.exec(v); // DD/MM/YYYY or DD-MM-YYYY
  if (m1) {
    const [_, dd, mm, yyyy] = m1;
    const d = Number(dd), m = Number(mm);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) return `${yyyy}-${mm}-${dd}`; // Basic range check only
    return null;
  }
  return null; // unsupported format
}

export function emptyClimateExposureRow(): ClimateChangeExposureRow {
  return {
    policy_inception_date: null,
    policy_expiry_date: null,
    insured: '',
    policy_category: null,
    policy_description: null,
    nature_of_risk: null,
    gross_exposure_tsi: null,
    cedants_exposure_tsi: null,
  eml_mpl_limit_applied: null,
    eml_mpl_limit: null,
    ceded_prop_reinsurance_exposure: null,
    net_inuring_prop_reinsurance_exposure: null,
    gross_premium: null,
    cedants_premium: null,
    ceded_prop_reinsurance_premium: null,
    net_prop_reinsurance_premium: null,
  };
}

// Determine if a row is an "empty placeholder" (all user-entered, non-derived fields are blank)
// Derived fields (currently net_* fields) and optional numeric fields are ignored if null.
export function isRowEmpty(row: ClimateChangeExposureRow): boolean {
  // A row counts as empty only if required core identifiers are blank and every editable field is null/''.
  const keys: ClimateExposureFieldKey[] = CLIMATE_EXPOSURE_FIELDS.map(f => f.key);
  for (const k of keys) {
    const val = (row as any)[k];
    if (val != null && val !== '') return false; // any user-provided value makes it non-empty
  }
  return true;
}

export function autoFillDerived(row: ClimateChangeExposureRow): ClimateChangeExposureRow {
  const copy = { ...row };
  // Auto-calc net fields if currently null (treat only null as unset, allow 0 values)
  if (copy.net_prop_reinsurance_premium == null && copy.gross_premium != null && copy.ceded_prop_reinsurance_premium != null) {
    copy.net_prop_reinsurance_premium = Number(copy.gross_premium) - Number(copy.ceded_prop_reinsurance_premium);
  }
  if (copy.net_inuring_prop_reinsurance_exposure == null && copy.gross_exposure_tsi != null && copy.ceded_prop_reinsurance_exposure != null) {
    copy.net_inuring_prop_reinsurance_exposure = Number(copy.gross_exposure_tsi) - Number(copy.ceded_prop_reinsurance_exposure);
  }
  return copy;
}

export function validateClimateExposureRow(row: ClimateChangeExposureRow): Record<string, string> {
  const errs: Record<string, string> = {};
  // Attempt in-place normalization for date fields if they look non-normalized
  if (row.policy_inception_date) {
    const n = normalizeDateString(row.policy_inception_date);
    if (n) row.policy_inception_date = n; // store normalized
  }
  if (row.policy_expiry_date) {
    const n = normalizeDateString(row.policy_expiry_date);
    if (n) row.policy_expiry_date = n;
  }
  for (const meta of CLIMATE_EXPOSURE_FIELDS) {
    const val = (row as any)[meta.key];
    if (meta.required && (val == null || val === '')) errs[meta.key] = 'Required';
    if (meta.validate) {
      const r = meta.validate(val, row);
      if (r) errs[meta.key] = r;
    }
    if (meta.type === 'number' && val != null && val !== '' && typeof val === 'number' && val < 0) {
      errs[meta.key] = '>= 0';
    }
  }
  return errs;
}

export function migrateLegacyClimateExposureRow(oldRow: any): ClimateChangeExposureRow {
  // Map legacy to new
  const base = emptyClimateExposureRow();
  (base as any)._legacy = oldRow;
  base.policy_category = oldRow.region_or_zone || null;
  base.policy_description = oldRow.notes || null;
  base.nature_of_risk = oldRow.peril || null;
  base.gross_exposure_tsi = safeNum(oldRow.tsi);
  base.gross_premium = safeNum(oldRow.premium);
  return base;
}

function safeNum(v: any): number | null { const n = Number(v); return isFinite(n) ? n : null; }
