import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useFieldArray, useForm, type Path } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../../../../lib/supabase';
import { useAutosave } from '../../../../hooks/useAutosave';

const RowSchema = z.object({
  year: z.number().int().nonnegative().optional(),
  layer: z.string().optional().default(''),
  limit: z.number().nonnegative().optional().default(0),
  priority: z.number().nonnegative().optional().default(0),
  ognpi: z.number().nonnegative().optional().default(0),
  rate: z.number().nonnegative().optional().default(0),
  mdp: z.number().nonnegative().optional().default(0),
  adjusted_premium: z.number().nonnegative().optional().default(0),
  premium: z.number().nonnegative().optional().default(0),
  reinstatement_premium: z.number().nonnegative().optional().default(0),
  claims_paid: z.number().nonnegative().optional().default(0),
  claims_outstanding: z.number().nonnegative().optional().default(0),
  claims_incurred: z.number().nonnegative().optional().default(0),
});

const FormSchema = z.object({ rows: z.array(RowSchema).default([]), additional_comments: z.string().optional().default('') });

type FormValues = z.infer<typeof FormSchema>;

const blankRow: z.infer<typeof RowSchema> = {
  year: undefined,
  layer: '',
  limit: 0,
  priority: 0,
  ognpi: 0,
  rate: 0,
  mdp: 0,
  adjusted_premium: 0,
  premium: 0,
  reinstatement_premium: 0,
  claims_paid: 0,
  claims_outstanding: 0,
  claims_incurred: 0,
};

export default function StepTreatyStatsNonPropCasualty() {
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
        .eq('sheet_name', 'Treaty Statistics_Non-Prop')
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
        [{ submission_id: submissionId, sheet_name: 'Treaty Statistics_Non-Prop', payload: val }],
        { onConflict: 'submission_id,sheet_name' }
      );
    if (!up.error) setLastSaved(new Date());
  });

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Treaty Statistics (Non-Prop)</h2>
      <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded shadow p-4">
        <table className="min-w-full table-auto border rounded">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              {['Year','Layer','Limit','Priority','OGNPI','Rate','MDP','Adjust. Premium','Premium','Reinstatement Premium','Claims Paid','Claims Outstanding','Claims Incurred','Actions'].map(h => (
                <th key={h} className="px-2 py-1 whitespace-nowrap text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fa.fields.map((field, idx) => (
              <tr key={field.id}>
                <td><input type="number" step="1" {...register(`rows.${idx}.year` as Path<FormValues>, { valueAsNumber: true })} className="input" /></td>
                <td><input type="text" {...register(`rows.${idx}.layer` as Path<FormValues>)} className="input" /></td>
                <td><input type="number" step="0.01" {...register(`rows.${idx}.limit` as Path<FormValues>, { valueAsNumber: true })} className="input" /></td>
                <td><input type="number" step="0.01" {...register(`rows.${idx}.priority` as Path<FormValues>, { valueAsNumber: true })} className="input" /></td>
                <td><input type="number" step="0.01" {...register(`rows.${idx}.ognpi` as Path<FormValues>, { valueAsNumber: true })} className="input" /></td>
                <td><input type="number" step="0.01" {...register(`rows.${idx}.rate` as Path<FormValues>, { valueAsNumber: true })} className="input" /></td>
                <td><input type="number" step="0.01" {...register(`rows.${idx}.mdp` as Path<FormValues>, { valueAsNumber: true })} className="input" /></td>
                <td><input type="number" step="0.01" {...register(`rows.${idx}.adjusted_premium` as Path<FormValues>, { valueAsNumber: true })} className="input" /></td>
                <td><input type="number" step="0.01" {...register(`rows.${idx}.premium` as Path<FormValues>, { valueAsNumber: true })} className="input" /></td>
                <td><input type="number" step="0.01" {...register(`rows.${idx}.reinstatement_premium` as Path<FormValues>, { valueAsNumber: true })} className="input" /></td>
                <td><input type="number" step="0.01" {...register(`rows.${idx}.claims_paid` as Path<FormValues>, { valueAsNumber: true })} className="input" /></td>
                <td><input type="number" step="0.01" {...register(`rows.${idx}.claims_outstanding` as Path<FormValues>, { valueAsNumber: true })} className="input" /></td>
                <td><input type="number" step="0.01" {...register(`rows.${idx}.claims_incurred` as Path<FormValues>, { valueAsNumber: true })} className="input" /></td>
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
