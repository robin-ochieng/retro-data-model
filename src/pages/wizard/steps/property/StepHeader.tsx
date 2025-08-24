import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../../../../lib/supabase';
import { useAutosave } from '../../../../hooks/useAutosave';

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
      country: '',
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

  if (loading) return <div>Loading…</div>;

  return (
    <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Name of Company" error={errors.name_of_company?.message}>
        <input className="input" {...register('name_of_company')} />
      </Field>
      <Field label="Country" error={errors.country?.message}>
        <input className="input" {...register('country')} />
      </Field>
      <Field label="Currency (in std. units)" error={errors.currency_std_units?.message}>
        <input className="input" {...register('currency_std_units')} />
      </Field>
      <Field label="Munich RE Client Manager">
        <input className="input" {...register('munich_re_client_manager')} />
      </Field>
      <Field label="Munich RE Underwriter">
        <input className="input" {...register('munich_re_underwriter')} />
      </Field>
      <Field label="Inception Date" hint="e.g., 01/01/2022" error={errors.inception_date?.message}>
        <input className="input" type="date" {...register('inception_date')} />
      </Field>
      <Field label="Expiry Date" hint="e.g., 31/12/2022" error={errors.expiry_date?.message}>
        <input className="input" type="date" {...register('expiry_date')} />
      </Field>
      <Field label="Claims Period">
        <input className="input" placeholder="e.g., 01/01/2022–31/12/2022" {...register('claims_period')} />
      </Field>
      <Field label="Class of Business">
        <input className="input" {...register('class_of_business')} />
      </Field>
      <Field label="Line/s of Business">
        <input className="input" {...register('lines_of_business')} />
      </Field>
      <Field label="Treaty Type">
        <input className="input" {...register('treaty_type')} />
      </Field>
      <div className="md:col-span-2">
        <Field label="Additional Comments">
          <textarea className="input min-h-[90px]" {...register('additional_comments')} />
        </Field>
      </div>
      <div className="md:col-span-2 flex justify-end text-sm text-gray-500">
        {error ? <span className="text-red-600">{error}</span> : lastSaved ? `Saved at ${lastSaved.toLocaleTimeString()}` : 'Autosaving…'}
      </div>
    </form>
  );
}

function Field({ label, children, error, hint }: { label: string; children: React.ReactNode; error?: string; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1">{label}</span>
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
