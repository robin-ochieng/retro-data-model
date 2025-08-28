import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../../../../lib/supabase';
import { useAutosave } from '../../../../hooks/useAutosave';

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

const Schema = z.object({
  name_of_company: z.string().min(1, 'Required'),
  country: z.string().min(1, 'Required'),
  currency_std_units: z.string().min(1, 'Required'),
  munich_re_client_manager: z.string().optional().or(z.literal('')),
  munich_re_underwriter: z.string().optional().or(z.literal('')),
  inception_date: z.string().min(1, 'Required'),
  expiry_date: z.string().min(1, 'Required'),
  claims_period: z.string().optional().or(z.literal('')),
  class_of_business: z.string().optional().or(z.literal('')),
  lines_of_business: z.string().optional().or(z.literal('')),
  treaty_type: z.string().optional().or(z.literal('')),
  additional_comments: z.string().optional().or(z.literal('')),
});

type FormValues = z.infer<typeof Schema>;

const SHEET = 'Header';

export default function StepHeader() {
  const { submissionId } = useParams();
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors }, watch } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      name_of_company: '',
  country: 'Kenya',
      currency_std_units: '',
      munich_re_client_manager: '',
      munich_re_underwriter: '',
      inception_date: '',
      expiry_date: '',
      claims_period: '',
      class_of_business: '',
      lines_of_business: '',
      treaty_type: '',
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
        reset(data.payload as FormValues);
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [submissionId, reset]);

  const values = watch();
  useAutosave(values, async (val) => {
    if (!submissionId) return;
    setError(null);
    // Upsert by (submission_id, sheet_name)
    const { error } = await supabase
      .from('sheet_blobs')
      .upsert(
        [{ submission_id: submissionId, sheet_name: SHEET, payload: val }],
        { onConflict: 'submission_id,sheet_name' }
      );
    if (error) { setError(error.message); return; }
    setLastSaved(new Date());
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
            {...register('country')}
          >
            <option value="" disabled>
              Select a country
            </option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Currency (in std. units)" error={errors.currency_std_units?.message}>
          <input className={`input ${errors.currency_std_units ? 'focus:ring-red-200 focus:border-red-500' : ''}`} placeholder="e.g., USD" {...register('currency_std_units')} />
        </Field>
        <Field label="Client Manager">
          <input className="input" placeholder="Optional" {...register('munich_re_client_manager')} />
        </Field>
        <Field label="Underwriter">
          <input className="input" placeholder="Optional" {...register('munich_re_underwriter')} />
        </Field>
        <Field label="Inception Date" hint="e.g., 01/01/2022" error={errors.inception_date?.message}>
          <input className={`input ${errors.inception_date ? 'focus:ring-red-200 focus:border-red-500' : ''}`} type="date" {...register('inception_date')} />
        </Field>
        <Field label="Expiry Date" hint="e.g., 31/12/2022" error={errors.expiry_date?.message}>
          <input className={`input ${errors.expiry_date ? 'focus:ring-red-200 focus:border-red-500' : ''}`} type="date" {...register('expiry_date')} />
        </Field>
        <Field label="Claims Period">
          <input className="input" placeholder="e.g., 01/01/2022–31/12/2022" {...register('claims_period')} />
        </Field>
        <Field label="Class of Business">
          <input className="input" placeholder="e.g., Property" {...register('class_of_business')} />
        </Field>
        <Field label="Line/s of Business">
          <input className="input" placeholder="e.g., Industrial Risks, Commercial" {...register('lines_of_business')} />
        </Field>
        <Field label="Treaty Type">
          <input className="input" placeholder="e.g., Quota Share, Surplus, XL" {...register('treaty_type')} />
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
