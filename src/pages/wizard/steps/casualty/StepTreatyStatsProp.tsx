import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useFieldArray, useForm, type Path } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../../../../lib/supabase';
import { useAutosave } from '../../../../hooks/useAutosave';

const RowSchema = z.object({
  year: z.number().int().nonnegative().optional(),
  written_premium: z.number().nonnegative().optional().default(0),
  claims_paid: z.number().nonnegative().optional().default(0),
  claims_incurred: z.number().nonnegative().optional().default(0),
  claims_outstanding: z.number().nonnegative().optional().default(0),
  commission: z.number().nonnegative().optional().default(0),
  profit_commission: z.number().nonnegative().optional().default(0),
});

const FormSchema = z.object({ rows: z.array(RowSchema).default([]), additional_comments: z.string().optional().default('') });

type FormValues = z.infer<typeof FormSchema>;

const blankRow: z.infer<typeof RowSchema> = {
  year: undefined,
  written_premium: 0,
  claims_paid: 0,
  claims_incurred: 0,
  claims_outstanding: 0,
  commission: 0,
  profit_commission: 0,
};

export default function StepTreatyStatsPropCasualty() {
  const { submissionId } = useParams();
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const { control, register, reset, watch } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { rows: [blankRow], additional_comments: '' },
  });
  const fa = useFieldArray({ control, name: 'rows' });

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!submissionId) return;
      const { data, error } = await supabase
        .from('sheet_blobs')
        .select('payload')
        .eq('submission_id', submissionId)
        .eq('sheet_name', 'Treaty Statistics_Prop (Casualty)')
        .maybeSingle();
      if (!mounted) return;
      if (!error && data?.payload) reset(data.payload as FormValues);
    })();
    return () => { mounted = false; };
  }, [submissionId, reset]);

  useAutosave(watch(), async (val) => {
    if (!submissionId) return;
    const up = await supabase
      .from('sheet_blobs')
      .upsert(
        [{ submission_id: submissionId, sheet_name: 'Treaty Statistics_Prop (Casualty)', payload: val }],
        { onConflict: 'submission_id,sheet_name' }
      );
    if (!up.error) setLastSaved(new Date());
  });

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Treaty Statistics (Prop)</h2>
      <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded shadow p-4">
        <table className="min-w-full table-auto border rounded">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              {['Year','Written Premium','Claims Paid','Claims Incurred','Claims Outstanding','Commission','Profit Commission','Actions'].map(h => (
                <th key={h} className="px-2 py-1 whitespace-nowrap text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fa.fields.map((field, idx) => (
              <tr key={field.id}>
                <td><input type="number" step="1" {...register(`rows.${idx}.year` as Path<FormValues>, { valueAsNumber: true })} className="input" /></td>
                <td><input type="number" step="0.01" {...register(`rows.${idx}.written_premium` as Path<FormValues>, { valueAsNumber: true })} className="input" /></td>
                <td><input type="number" step="0.01" {...register(`rows.${idx}.claims_paid` as Path<FormValues>, { valueAsNumber: true })} className="input" /></td>
                <td><input type="number" step="0.01" {...register(`rows.${idx}.claims_incurred` as Path<FormValues>, { valueAsNumber: true })} className="input" /></td>
                <td><input type="number" step="0.01" {...register(`rows.${idx}.claims_outstanding` as Path<FormValues>, { valueAsNumber: true })} className="input" /></td>
                <td><input type="number" step="0.01" {...register(`rows.${idx}.commission` as Path<FormValues>, { valueAsNumber: true })} className="input" /></td>
                <td><input type="number" step="0.01" {...register(`rows.${idx}.profit_commission` as Path<FormValues>, { valueAsNumber: true })} className="input" /></td>
                <td>
                  <button type="button" className="px-2 py-1 bg-red-500 text-white rounded" onClick={() => fa.remove(idx)} disabled={fa.fields.length <= 1}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-between items-center mt-3">
          <button type="button" className="px-3 py-1.5 rounded bg-blue-600 text-white" onClick={() => fa.append(blankRow)}>Add Row</button>
          <div className="text-sm text-gray-500">{lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Autosaving…'}</div>
        </div>
      </div>
      <div className="mt-6 bg-white dark:bg-gray-800 rounded shadow p-4">
        <label className="block">
          <span className="block text-sm font-medium mb-1">Additional Comments</span>
          <textarea className="input" placeholder="Any notes or guidance for this submission…" {...register('additional_comments')} />
        </label>
      </div>
    </div>
  );
}
