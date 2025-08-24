import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../../../lib/supabase';
import { useAutosave } from '../../../hooks/useAutosave';

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
  const {
    control,
    register,
    handleSubmit,
    reset,
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
          currency: row.currency || 'USD',
        })) });
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

  return (
    <form className="space-y-6">
      <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded shadow p-4">
        <h3 className="font-semibold mb-2">Premium Summary (EPI)</h3>
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
        <h3 className="font-semibold mb-2">GWP Split Per Section</h3>
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
    </form>
  );
}
