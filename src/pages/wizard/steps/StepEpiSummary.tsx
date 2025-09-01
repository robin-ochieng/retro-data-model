import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../../../lib/supabase';
import { useAutosave } from '../../../hooks/useAutosave';
import PasteModal from '../../../components/PasteModal';

const RowSchema = z.object({
  programme: z.string().min(1, 'Required'),
  estimate_type: z.string().min(1, 'Required'),
  period_label: z.string().optional(),
  epi_value: z.number().min(0, 'Must be >= 0'),
  currency: z.string().default('USD'),
});

const GwpsSchema = z.object({ section: z.string().min(1, 'Required'), premium: z.number().nonnegative() });
const FormSchema = z.object({
  rows: z.array(RowSchema),
  gwp_split: z.array(GwpsSchema).optional(),
  additional_comments: z.string().optional().default(''),
});

type FormValues = z.infer<typeof FormSchema>;

const defaultRows = [
  { programme: 'Quota Share', estimate_type: '', period_label: '', epi_value: 0, currency: 'USD' },
  { programme: 'Surplus', estimate_type: '', period_label: '', epi_value: 0, currency: 'USD' },
];

export default function StepEpiSummary() {
  const { submissionId } = useParams();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [pasteEpiOpen, setPasteEpiOpen] = useState(false);
  const [pasteGwpOpen, setPasteGwpOpen] = useState(false);
  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isDirty },
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { rows: defaultRows, gwp_split: [], additional_comments: '' },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'rows' });
  const { fields: gwpFields, append: gwpAppend, remove: gwpRemove } = useFieldArray({ control, name: 'gwp_split' });
  const watchedRows = watch('rows');

  // Load existing rows on mount
  useEffect(() => {
    async function loadRows() {
      if (!submissionId) return;
      // Load client details currency from Header sheet for initial sync
      const header = await supabase
        .from('sheet_blobs')
        .select('payload')
        .eq('submission_id', submissionId)
        .eq('sheet_name', 'Header')
        .maybeSingle();
      let headerCurrency: string | undefined = undefined;
      if (!header.error && header.data?.payload) {
        const payload = header.data.payload as any;
        headerCurrency = (payload?.currency_std_units as string | undefined)?.toUpperCase();
      }
      const { data, error } = await supabase
        .from('epi_summary')
        .select('*')
        .eq('submission_id', submissionId);
      if (!error && data && data.length > 0) {
        reset({ rows: data.map((row: any) => ({
          programme: row.programme,
          estimate_type: row.estimate_type,
          period_label: row.period_label,
          epi_value: row.epi_value,
          currency: (headerCurrency ?? row.currency) || 'USD',
        })) });
      } else if (headerCurrency) {
        // If no data yet, set defaults with header currency
        reset({ rows: defaultRows.map(r => ({ ...r, currency: headerCurrency! })), gwp_split: [], additional_comments: '' });
      }
      // Load GWP Split from sheet_blobs
      const gwp = await supabase
        .from('sheet_blobs')
        .select('payload')
        .eq('submission_id', submissionId)
        .eq('sheet_name', 'EPI Summary')
        .maybeSingle();
      if (!gwp.error && gwp.data?.payload) {
        const payload = gwp.data.payload as any;
        reset(curr => ({
          ...curr,
          gwp_split: payload.gwp_split ?? [],
          additional_comments: payload.additional_comments ?? '',
        }));
      }
    }
    loadRows();
  }, [submissionId, reset]);

  // Autosave on change
  useAutosave(watch(), async (values) => {
    if (!submissionId) return;
    setSaveError(null);
    const del = await supabase.from('epi_summary').delete().eq('submission_id', submissionId);
    if (del.error) { setSaveError(del.error.message); return; }
    const rows = values.rows ?? [];
    if (rows.length > 0) {
      const ins = await supabase.from('epi_summary').insert(
        rows.map(row => ({ ...row, submission_id: submissionId }))
      );
      if (ins.error) { setSaveError(ins.error.message); return; }
    }
    // Save GWP Split to sheet_blobs
    const gwp = values.gwp_split ?? [];
    const additional_comments = values.additional_comments ?? '';
    const up = await supabase
      .from('sheet_blobs')
      .upsert(
        [{ submission_id: submissionId, sheet_name: 'EPI Summary', payload: { gwp_split: gwp, additional_comments } }],
        { onConflict: 'submission_id,sheet_name' }
      );
    if (up.error) { setSaveError(up.error.message); return; }
    setLastSaved(new Date());
  });

  // Helpers
  const toNumber = (s: string | undefined) => {
    if (!s) return 0;
    const cleaned = s.replace(/[,\s]/g, '');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  };

  const maybeHasHeader = (cells: string[], expected: string[]) => {
    const lc = cells.map((c) => c.trim().toLowerCase());
    let hits = 0;
    expected.forEach((e) => {
      if (lc.some((c) => c.includes(e))) hits += 1;
    });
    return hits >= Math.max(2, Math.ceil(expected.length / 2));
  };

  // Apply pasted rows to EPI table
  const applyEpiPaste = (rows: string[][]) => {
    if (!rows || rows.length === 0) return;
    let start = 0;
  const first = rows[0] ?? [];
  if (maybeHasHeader(first, ['programme', 'estimate', 'period', 'epi', 'currency'])) {
      start = 1;
    }
  const mapped = rows
      .slice(start)
      .map((r) => ({
        programme: (r[0] ?? '').trim(),
        estimate_type: (r[1] ?? '').trim(),
        period_label: (r[2] ?? '').trim(),
    epi_value: toNumber((r[3] ?? '').trim()),
    currency: (r[4] ?? '').trim() || (watch('rows')?.[0]?.currency ?? 'USD'),
      }))
      .filter((r) => [r.programme, r.estimate_type, r.period_label, String(r.epi_value), r.currency].some((v) => (v ?? '').toString().trim() !== ''));
    setValue('rows', mapped.length > 0 ? mapped : defaultRows, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
  };

  // Keep EPI table currency in sync with client details changes via window event
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { submissionId?: string; currency?: string };
      if (!detail) return;
      if (detail.submissionId && detail.submissionId !== submissionId) return;
      const curr = (detail.currency ?? 'USD').toUpperCase();
      const rows = watch('rows') ?? [];
      if (rows.length === 0) return;
      const updated = rows.map(r => ({ ...r, currency: curr }));
      setValue('rows', updated, { shouldDirty: true, shouldTouch: true, shouldValidate: false });
    };
    window.addEventListener('submission:currency-changed', handler as EventListener);
    return () => window.removeEventListener('submission:currency-changed', handler as EventListener);
  }, [submissionId, setValue, watch]);

  // Apply pasted rows to GWP Split table
  const applyGwpPaste = (rows: string[][]) => {
    if (!rows || rows.length === 0) return;
    let start = 0;
  const first = rows[0] ?? [];
  if (maybeHasHeader(first, ['section', 'premium'])) start = 1;
    const mapped = rows
      .slice(start)
      .map((r) => ({
        section: (r[0] ?? '').trim(),
        premium: toNumber((r[1] ?? '').trim()),
      }))
      .filter((r) => (r.section?.trim() || r.premium > 0));
    setValue('gwp_split', mapped.length > 0 ? mapped : [{ section: '', premium: 0 }], { shouldDirty: true, shouldTouch: true, shouldValidate: true });
  };

  return (
    <form className="space-y-6">
      <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded shadow p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Premium Summary (EPI)</h3>
          <button
            type="button"
            className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
            onClick={() => setPasteEpiOpen(true)}
          >
            Paste from Excel
          </button>
        </div>
        <table className="min-w-full table-auto border rounded">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="px-2 py-1">Programme</th>
              <th className="px-2 py-1">Estimate Type</th>
              <th className="px-2 py-1">Period Label</th>
              <th className="px-2 py-1">EPI Value</th>
              <th className="px-2 py-1">Currency</th>
              <th className="px-2 py-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, idx) => (
              <tr key={field.id}>
                <td>
                  <input
                    {...register(`rows.${idx}.programme`)}
                    className="px-2 py-1 border rounded w-full"
                  />
                  {errors.rows?.[idx]?.programme && (
                    <span className="text-red-600 text-xs">{errors.rows[idx].programme.message}</span>
                  )}
                </td>
                <td>
                  <input
                    {...register(`rows.${idx}.estimate_type`)}
                    className="px-2 py-1 border rounded w-full"
                  />
                  {errors.rows?.[idx]?.estimate_type && (
                    <span className="text-red-600 text-xs">{errors.rows[idx].estimate_type.message}</span>
                  )}
                </td>
                <td>
                  <input
                    {...register(`rows.${idx}.period_label`)}
                    className="px-2 py-1 border rounded w-full"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    {...register(`rows.${idx}.epi_value`, { valueAsNumber: true })}
                    className="px-2 py-1 border rounded w-full"
                    min={0}
                  />
                  {errors.rows?.[idx]?.epi_value && (
                    <span className="text-red-600 text-xs">{errors.rows[idx].epi_value.message}</span>
                  )}
                </td>
                <td>
                  <input
                    {...register(`rows.${idx}.currency`)}
                    className="px-2 py-1 border rounded w-full"
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    onClick={() => remove(idx)}
                    disabled={fields.length <= 1}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
  <div className="flex justify-between items-center mt-4">
        <button
          type="button"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => append({ programme: '', estimate_type: '', period_label: '', epi_value: 0, currency: 'USD' })}
        >
          Add Row
        </button>
        <span className="text-gray-500 text-sm">
          {saveError ? (
            <span className="text-red-600">{saveError}</span>
          ) : lastSaved ? (
            <>Saved {lastSaved.toLocaleTimeString()}</>
          ) : (
            'Changes save automatically'
          )}
        </span>
      </div>

      {/* GWP Split */}
      <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded shadow p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">GWP Split Per Section</h3>
          <button
            type="button"
            className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
            onClick={() => setPasteGwpOpen(true)}
          >
            Paste from Excel
          </button>
        </div>
        <table className="min-w-full table-auto border rounded">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="px-2 py-1">Section</th>
              <th className="px-2 py-1">Premium</th>
              <th className="px-2 py-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {gwpFields.map((field, idx) => (
              <tr key={field.id}>
                <td>
                  <input {...register(`gwp_split.${idx}.section`)} className="px-2 py-1 border rounded w-full" />
                  {errors.gwp_split?.[idx]?.section && (
                    <span className="text-red-600 text-xs">{errors.gwp_split[idx].section?.message}</span>
                  )}
                </td>
                <td>
                  <input type="number" step="0.01" min={0} {...register(`gwp_split.${idx}.premium`, { valueAsNumber: true })} className="px-2 py-1 border rounded w-full" />
                  {errors.gwp_split?.[idx]?.premium && (
                    <span className="text-red-600 text-xs">{errors.gwp_split[idx].premium?.message}</span>
                  )}
                </td>
                <td>
                  <button type="button" className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600" onClick={() => gwpRemove(idx)} disabled={gwpFields.length <= 1}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-between items-center mt-4">
          <button type="button" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={() => gwpAppend({ section: '', premium: 0 })}>
            Add Section
          </button>
        </div>
      </div>

      {/* Additional Comments */}
      <div className="bg-white dark:bg-gray-800 rounded shadow p-4">
        <label className="block">
          <span className="block text-sm font-medium mb-1">Additional Comments</span>
          <textarea
            className="input"
            placeholder="Any notes or guidance for this submission…"
            {...register('additional_comments')}
          />
        </label>
      </div>
      {/* Paste Modals */}
      <PasteModal
        open={pasteEpiOpen}
        onClose={() => setPasteEpiOpen(false)}
        onApply={applyEpiPaste}
        title="Paste from Excel — Premium Summary (EPI)"
      />
      <PasteModal
        open={pasteGwpOpen}
        onClose={() => setPasteGwpOpen(false)}
        onApply={applyGwpPaste}
        title="Paste from Excel — GWP Split"
      />
    </form>
  );
}
