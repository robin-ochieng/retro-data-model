import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../../../../lib/supabase';
import { useAutosave } from '../../../../hooks/useAutosave';
import { useSubmissionMeta } from '../../SubmissionMetaContext';
const OTHER = '__OTHER__';

// Allowed countries for dropdown (African countries)
const COUNTRIES = [
  'Algeria',
  'Angola',
  'Benin',
  'Botswana',
  'Burkina Faso',
  'Burundi',
  'Cabo Verde',
  'Cameroon',
  'Central African Republic',
  'Chad',
  'Comoros',
  'Congo',
  'Democratic Republic of the Congo',
  'Djibouti',
  'Egypt',
  'Equatorial Guinea',
  'Eritrea',
  'Eswatini',
  'Ethiopia',
  'Gabon',
  'Gambia',
  'Ghana',
  'Guinea',
  'Guinea-Bissau',
  'Ivory Coast',
  'Kenya',
  'Lesotho',
  'Liberia',
  'Libya',
  'Madagascar',
  'Malawi',
  'Mali',
  'Mauritania',
  'Mauritius',
  'Morocco',
  'Mozambique',
  'Namibia',
  'Niger',
  'Nigeria',
  'Rwanda',
  'Sao Tome and Principe',
  'Senegal',
  'Seychelles',
  'Sierra Leone',
  'Somalia',
  'South Africa',
  'South Sudan',
  'Sudan',
  'Tanzania',
  'Togo',
  'Tunisia',
  'Uganda',
  'Zambia',
  'Zimbabwe',
];

// Supported currencies shown as a dropdown (value stored as 3-letter code)
const CURRENCIES: { code: string; name: string }[] = [
  { code: 'USD', name: 'United States Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'GBP', name: 'British Pound Sterling' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', name: 'Chinese Yuan Renminbi' },
  { code: 'HKD', name: 'Hong Kong Dollar' },
  { code: 'NZD', name: 'New Zealand Dollar' },
  { code: 'SEK', name: 'Swedish Krona' },
  { code: 'NOK', name: 'Norwegian Krone' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'KRW', name: 'South Korean Won' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'MXN', name: 'Mexican Peso' },
  { code: 'BRL', name: 'Brazilian Real' },
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'TRY', name: 'Turkish Lira' },
  { code: 'RUB', name: 'Russian Ruble' },
  { code: 'AED', name: 'United Arab Emirates Dirham' },
  { code: 'SAR', name: 'Saudi Riyal' },
  { code: 'ILS', name: 'Israeli Shekel' },
  { code: 'THB', name: 'Thai Baht' },
  { code: 'IDR', name: 'Indonesian Rupiah' },
  { code: 'PLN', name: 'Polish Zloty' },
  { code: 'DKK', name: 'Danish Krone' },
  { code: 'MYR', name: 'Malaysian Ringgit' },
  { code: 'PHP', name: 'Philippine Peso' },
  { code: 'EGP', name: 'Egyptian Pound' },
];

// Treaty Types
const TREATY_TYPES = [
  'Quota Share Treaty',
  'Surplus Treaty',
  'Facultative Obligatory',
  'Excess of Loss (XL) Treaty',
  'Stop Loss Treaty',
];

// Classes of Business and dependent Lines of Business
const CLASSES_OF_BUSINESS = [
  'Property',
  'Casualty / Liability',
  'Marine & Aviation',
  'Life',
  'Health / Medical',
  'Agriculture',
  'Motor',
  'Engineering',
  'Financial Lines',
  'Specialty Risks',
  'Energy / Oil & Gas',
  'Credit & Surety',
  'Travel',
  'Workers’ Compensation',
  'Miscellaneous',
] as const;

const LINES_BY_CLASS: Record<(typeof CLASSES_OF_BUSINESS)[number], string[]> = {
  'Property': [
    'Industrial Risks',
    'Commercial Property',
    'Residential / Homeowners',
    'Catastrophe (NatCat)',
    'Fire & Allied Perils',
  ],
  'Casualty / Liability': [
    'General Liability',
    'Professional Indemnity',
    'Directors & Officers (D&O)',
    'Employers’ Liability',
    'Product Liability',
  ],
  'Marine & Aviation': [
    'Marine Cargo',
    'Marine Hull',
    'Aviation Hull',
    'Aviation Liability',
    'Offshore Energy',
  ],
  'Life': [
    'Term Life',
    'Whole Life',
    'Endowment',
    'Group Life',
    'Annuities',
  ],
  'Health / Medical': [
    'Individual Health',
    'Group Health',
    'Critical Illness',
    'Disability Income',
  ],
  'Agriculture': [
    'Crop Insurance',
    'Livestock',
    'Weather Index',
  ],
  'Motor': [
    'Private Motor',
    'Commercial Motor',
    'Motor Third-Party Liability (MTPL)',
  ],
  'Engineering': [
    'Contractors All Risks (CAR)',
    'Erection All Risks (EAR)',
    'Machinery Breakdown',
    'Electronic Equipment',
  ],
  'Financial Lines': [
    'Bankers Blanket Bond (BBB)',
    'Cyber Risk',
    'Trade Credit',
    'Surety Bonds',
  ],
  'Specialty Risks': [
    'Political Risk',
    'Terrorism',
    'Event Cancellation',
  ],
  'Energy / Oil & Gas': [
    'Upstream Energy',
    'Downstream Energy',
    'Renewables',
  ],
  'Credit & Surety': [
    'Credit Insurance',
    'Surety Bonds',
  ],
  'Travel': [
    'Travel Insurance',
    'Assistance Services',
  ],
  'Workers’ Compensation': [
    'Employers’ Liability',
    'Occupational Injury',
  ],
  'Miscellaneous': [
    'Pet Insurance',
    'Other Niche Covers',
  ],
};

const Schema = z.object({
  name_of_company: z.string().min(1, 'Required'),
  country: z.string().min(1, 'Required'),
  currency_std_units: z.string().min(1, 'Required'),
  // Removed per requirements
  inception_date: z.string().min(1, 'Required'),
  expiry_date: z.string().min(1, 'Required'),
  claims_period_start: z.string().optional().or(z.literal('')),
  claims_period_end: z.string().optional().or(z.literal('')),
  class_of_business: z.string().optional().or(z.literal('')),
  lines_of_business: z.string().optional().or(z.literal('')),
  treaty_type: z.string().optional().or(z.literal('')),
  additional_comments: z.string().optional().or(z.literal('')),
}).superRefine((val, ctx) => {
  // Validate that end >= start when both present
  if (val.claims_period_start && val.claims_period_end) {
    const s = new Date(val.claims_period_start);
    const e = new Date(val.claims_period_end);
    if (!Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime()) && e < s) {
      ctx.addIssue({ path: ['claims_period_end'], code: z.ZodIssueCode.custom, message: 'End date must be after start date' });
    }
  }
});

type FormValues = z.infer<typeof Schema>;

const SHEET = 'Header';

export default function StepHeader() {
  const { submissionId } = useParams();
  const meta = useSubmissionMeta();
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Track when user explicitly chose "Other" for each select
  const [countryIsOther, setCountryIsOther] = useState(false);
  const [currencyIsOther, setCurrencyIsOther] = useState(false);
  const [classIsOther, setClassIsOther] = useState(false);
  const [linesIsOther, setLinesIsOther] = useState(false);
  const [treatyIsOther, setTreatyIsOther] = useState(false);

  const { register, handleSubmit, reset, formState: { errors }, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    mode: 'onChange',
    defaultValues: {
      name_of_company: '',
  country: 'Kenya',
  currency_std_units: 'USD',
  // removed per requirements
      inception_date: '',
      expiry_date: '',
  claims_period_start: '',
  claims_period_end: '',
  class_of_business: '',
  lines_of_business: '',
  treaty_type: 'Quota Share Treaty',
      additional_comments: '',
    },
  });

  // Load from sheet_blobs
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!submissionId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('sheet_blobs')
        .select('payload')
        .eq('submission_id', submissionId)
        .eq('sheet_name', SHEET)
        .maybeSingle();
      if (!mounted) return;
      if (!error && data?.payload) {
        const toISO = (s: string | undefined | null): string => {
          const v = (s ?? '').trim();
          if (!v) return '';
          if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v; // already ISO
          const m = v.match(/^(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{4})$/);
          if (m && m.length >= 4) {
            const dd = (m[1] ?? '').padStart(2, '0');
            const mm = (m[2] ?? '').padStart(2, '0');
            const yyyy = (m[3] ?? '');
            return `${yyyy}-${mm}-${dd}`;
          }
          return v;
        };
        const raw = data.payload as any;
        // Back-compat: derive start/end from legacy claims_period string if needed
        let cps: string = raw.claims_period_start ?? '';
        let cpe: string = raw.claims_period_end ?? '';
    if ((!cps || !cpe) && typeof raw.claims_period === 'string') {
          const s = String(raw.claims_period);
          // Accept common separators: "–", "-", "to"
          const parts = s.split(/\s*(?:–|—|-|to)\s*/i).filter(Boolean);
          if (parts.length >= 2) {
      cps = cps || (parts[0] ?? '');
      cpe = cpe || (parts[1] ?? '');
          }
        }
        const payload: FormValues = {
          name_of_company: String(raw.name_of_company ?? ''),
          country: String(raw.country ?? 'Kenya'),
          currency_std_units: String(raw.currency_std_units ?? 'USD'),
          inception_date: String(raw.inception_date ?? ''),
          expiry_date: String(raw.expiry_date ?? ''),
          claims_period_start: toISO(cps ?? ''),
          claims_period_end: toISO(cpe ?? ''),
          class_of_business: String(raw.class_of_business ?? ''),
          lines_of_business: String(raw.lines_of_business ?? ''),
          treaty_type: String(raw.treaty_type ?? 'Quota Share Treaty'),
          additional_comments: String(raw.additional_comments ?? ''),
        };
        // Ensure a default treaty type if missing in stored payload
        if (!payload.treaty_type || String(payload.treaty_type).trim() === '') {
          payload.treaty_type = 'Quota Share Treaty';
        }
        reset(payload);
        // Prime context for downstream consumers
  meta.updateFromHeader(payload);
        // Store claims period in meta as well
        void meta.updateMeta({
          claims_period_start: payload.claims_period_start,
          claims_period_end: payload.claims_period_end,
          claims_period: payload.claims_period_start && payload.claims_period_end
            ? `${payload.claims_period_start}–${payload.claims_period_end}`
            : '',
        });
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [submissionId, reset]);

  const values = watch();
  const selectedClass = values.class_of_business as (typeof CLASSES_OF_BUSINESS)[number] | '';
  // Ensure lines of business resets if the current selection no longer matches the selected class
  useEffect(() => {
    const lines = selectedClass ? LINES_BY_CLASS[selectedClass] ?? [] : [];
    if (values.lines_of_business && !lines.includes(values.lines_of_business)) {
      setValue('lines_of_business', '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass]);
  // Keep "Other" flags in sync when data is loaded or edited programmatically
  useEffect(() => {
    setCountryIsOther(!!values.country && !COUNTRIES.includes(values.country));
  }, [values.country]);
  useEffect(() => {
    setCurrencyIsOther(!!values.currency_std_units && !CURRENCIES.some(c => c.code === values.currency_std_units));
  }, [values.currency_std_units]);
  useEffect(() => {
    setClassIsOther(!!values.class_of_business && !(CLASSES_OF_BUSINESS as readonly string[]).includes(values.class_of_business as any));
  }, [values.class_of_business]);
  useEffect(() => {
    const linesListLocal = selectedClass && (CLASSES_OF_BUSINESS as readonly string[]).includes(selectedClass)
      ? (LINES_BY_CLASS as Record<string, string[] | undefined>)[selectedClass] ?? []
      : [];
    setLinesIsOther(!!values.lines_of_business && !linesListLocal.includes(values.lines_of_business));
  }, [values.lines_of_business, selectedClass]);
  useEffect(() => {
    setTreatyIsOther(!!values.treaty_type && !TREATY_TYPES.includes(values.treaty_type));
  }, [values.treaty_type]);
  // Derived select values to support 'Other' option
  const countrySelectValue = countryIsOther ? OTHER : (COUNTRIES.includes(values.country) ? values.country : (values.country ? OTHER : ''));
  const currencySelectValue = currencyIsOther ? OTHER : (CURRENCIES.some(c => c.code === values.currency_std_units) ? values.currency_std_units : (values.currency_std_units ? OTHER : ''));
  const classSelectValue = classIsOther ? OTHER : ((CLASSES_OF_BUSINESS as readonly string[]).includes(values.class_of_business as any) ? values.class_of_business : (values.class_of_business ? OTHER : ''));
  const linesList: string[] =
    selectedClass && (CLASSES_OF_BUSINESS as readonly string[]).includes(selectedClass)
      ? (LINES_BY_CLASS as Record<string, string[] | undefined>)[selectedClass] ?? []
      : [];
  const linesSelectValue = linesIsOther ? OTHER : (linesList.includes(values.lines_of_business ?? '')
    ? (values.lines_of_business ?? '')
    : (values.lines_of_business ? OTHER : ''));
  const treatySelectValue = treatyIsOther ? OTHER : (TREATY_TYPES.includes(values.treaty_type ?? '') ? (values.treaty_type ?? '') : (values.treaty_type ? OTHER : ''));
  useAutosave(values, async (val) => {
    if (!submissionId) return;
    setError(null);
    // Validate date range before saving
    const s = val.claims_period_start ? new Date(val.claims_period_start) : null;
    const e = val.claims_period_end ? new Date(val.claims_period_end) : null;
    if (s && e && !Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime()) && e < s) {
      setError('Claims Period: End date must be after start date');
      return; // Block save
    }
    // Upsert by (submission_id, sheet_name) with robust fallback when PK is missing
    const res = await supabase
      .from('sheet_blobs')
      .upsert(
        [{ submission_id: submissionId, sheet_name: SHEET, payload: val }],
        { onConflict: 'submission_id,sheet_name' }
      );
    if (res.error && /no unique or exclusion constraint/i.test(String(res.error.message))) {
      // Fallback: try update, then insert if no row exists
      const upd = await supabase
        .from('sheet_blobs')
        .update({ payload: val as any })
        .eq('submission_id', submissionId)
        .eq('sheet_name', SHEET)
        .select('submission_id');
      if (upd.error) {
        // If update failed (likely row absent), insert
        const ins = await supabase
          .from('sheet_blobs')
          .insert([{ submission_id: submissionId, sheet_name: SHEET, payload: val as any }]);
        if (ins.error) { setError(ins.error.message); return; }
      }
    } else if (res.error) {
      setError(res.error.message);
      return;
    }
    setLastSaved(new Date());
    // Update context to reflect latest treaty type
    meta.updateFromHeader(val);
    // Mirror claims period into submissions.meta for downstream usage
    void meta.updateMeta({
      claims_period_start: val.claims_period_start,
      claims_period_end: val.claims_period_end,
      claims_period: val.claims_period_start && val.claims_period_end ? `${val.claims_period_start}–${val.claims_period_end}` : '',
    });
  });

  if (loading) return <div className="text-sm text-gray-600">Loading…</div>;

  return (
    <div className="rounded-xl border shadow-sm p-4 sm:p-6">
      <form className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Name of Company" error={errors.name_of_company?.message}>
          <input className={`input ${errors.name_of_company ? 'focus:ring-red-200 focus:border-red-500' : ''}`} placeholder="e.g., Munich RE" {...register('name_of_company')} />
        </Field>
        <Field label="Country" error={errors.country?.message}>
      <select
            className={`input ${errors.country ? 'focus:ring-red-200 focus:border-red-500' : ''}`}
            value={countrySelectValue}
            onChange={(e) => {
              const v = e.target.value;
              if (v === OTHER) {
        setCountryIsOther(true);
        setValue('country', '');
              } else {
        setCountryIsOther(false);
        setValue('country', v);
              }
            }}
          >
            <option value="" disabled>
              Select a country
            </option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value={OTHER}>Other…</option>
          </select>
          {(countrySelectValue === OTHER || countryIsOther) && (
            <input className="input mt-2" placeholder="Enter other country" {...register('country')} />
          )}
        </Field>
        <Field label="Currency (in std. units)" error={errors.currency_std_units?.message}>
      <select
            className={`input ${errors.currency_std_units ? 'focus:ring-red-200 focus:border-red-500' : ''}`}
            value={currencySelectValue}
            onChange={(e) => {
              const v = e.target.value;
              if (v === OTHER) {
        setCurrencyIsOther(true);
        setValue('currency_std_units', '');
              } else {
        setCurrencyIsOther(false);
        setValue('currency_std_units', v);
              }
            }}
          >
            <option value="" disabled>
              Select a currency
            </option>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{`${c.code} — ${c.name}`}</option>
            ))}
            <option value={OTHER}>Other…</option>
          </select>
          {(currencySelectValue === OTHER || currencyIsOther) && (
            <input className="input mt-2" placeholder="Enter other currency (code or name)" {...register('currency_std_units')} />
          )}
        </Field>
  {/* Client Manager and Underwriter removed per requirements */}
        <Field label="Inception Date" hint="e.g., 01/01/2022" error={errors.inception_date?.message}>
          <input className={`input ${errors.inception_date ? 'focus:ring-red-200 focus:border-red-500' : ''}`} type="date" {...register('inception_date')} />
        </Field>
        <Field label="Expiry Date" hint="e.g., 31/12/2022" error={errors.expiry_date?.message}>
          <input className={`input ${errors.expiry_date ? 'focus:ring-red-200 focus:border-red-500' : ''}`} type="date" {...register('expiry_date')} />
        </Field>
        <Field label="Claims Period" hint="Select a start and end date">
          <div className="flex gap-2 items-center">
            <input
              type="date"
              className={`input ${errors.claims_period_start ? 'focus:ring-red-200 focus:border-red-500' : ''}`}
              {...register('claims_period_start')}
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              className={`input ${errors.claims_period_end ? 'focus:ring-red-200 focus:border-red-500' : ''}`}
              {...register('claims_period_end')}
            />
          </div>
          {(errors.claims_period_start || errors.claims_period_end) && (
            <div className="text-xs text-red-600 mt-1">
              {errors.claims_period_start?.message || errors.claims_period_end?.message}
            </div>
          )}
        </Field>
        <Field label="Class of Business">
      <select
            className="input"
            value={classSelectValue}
            onChange={(e) => {
              const v = e.target.value as string;
              if (v === OTHER) {
        setClassIsOther(true);
        setValue('class_of_business', '');
              } else {
        setClassIsOther(false);
        setValue('class_of_business', v);
              }
            }}
          >
            <option value="" disabled>
              Select a class
            </option>
            {CLASSES_OF_BUSINESS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
            <option value={OTHER}>Other…</option>
          </select>
      {(classSelectValue === OTHER || classIsOther) && (
            <input className="input mt-2" placeholder="Enter other class" {...register('class_of_business')} />
          )}
        </Field>
        <Field label="Line/s of Business">
      <select
            className="input"
            value={linesSelectValue}
            onChange={(e) => {
              const v = e.target.value;
              if (v === OTHER) {
        setLinesIsOther(true);
        setValue('lines_of_business', '');
              } else {
        setLinesIsOther(false);
        setValue('lines_of_business', v);
              }
            }}
            disabled={!selectedClass || classSelectValue === OTHER}
          >
            <option value="" disabled>
              {selectedClass && classSelectValue !== OTHER ? 'Select a line' : 'Select a class first'}
            </option>
            {linesList.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
            {selectedClass && classSelectValue !== OTHER && <option value={OTHER}>Other…</option>}
          </select>
      {(classIsOther || linesIsOther || (values.lines_of_business && !linesList.includes(values.lines_of_business ?? ''))) && (
            <input className="input mt-2" placeholder="Enter other line" {...register('lines_of_business')} />
          )}
        </Field>
        <Field label="Treaty Type">
      <select
            className="input"
            value={treatySelectValue}
            onChange={(e) => {
              const v = e.target.value;
              if (v === OTHER) {
        setTreatyIsOther(true);
        setValue('treaty_type', '');
              } else {
        setTreatyIsOther(false);
        setValue('treaty_type', v);
              }
            }}
          >
            <option value="" disabled>
              Select a treaty type
            </option>
            {TREATY_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
            <option value={OTHER}>Other…</option>
          </select>
          {(treatySelectValue === OTHER || treatyIsOther) && (
            <input className="input mt-2" placeholder="Enter other treaty type" {...register('treaty_type')} />
          )}
        </Field>
        <div className="md:col-span-2">
          <Field label="Additional Comments">
            <textarea className="input" placeholder="Any notes or guidance for this submission…" {...register('additional_comments')} />
          </Field>
        </div>
        <div className="md:col-span-2 flex justify-end text-sm text-gray-500">
          {error ? <span className="text-red-600">{error}</span> : lastSaved ? `Saved at ${lastSaved.toLocaleTimeString()}` : 'Autosaving…'}
        </div>
      </form>
    </div>
  );
}

function Field({ label, children, error, hint }: { label: string; children: React.ReactNode; error?: string; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-200">{label}</span>
      {children}
      {hint && <div className="text-xs text-gray-500 mt-1">{hint}</div>}
      {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
    </label>
  );
}

declare module 'react' {
  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    className?: string;
  }
}

// Tailwind input style shortcut
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const inputClass = 'input';
