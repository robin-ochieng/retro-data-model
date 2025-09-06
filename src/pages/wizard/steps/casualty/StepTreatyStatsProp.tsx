import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useFieldArray, useForm, type Path } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../../../../lib/supabase';
import { useAutosave } from '../../../../hooks/useAutosave';
import PasteModal from '../../../../components/PasteModal';

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
  const [pasteOpen, setPasteOpen] = useState(false);
  const { control, register, reset, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { rows: [blankRow], additional_comments: '' },
  });
  const fa = useFieldArray({ control, name: 'rows' });

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!submissionId) return;
      let { data, error } = await supabase
        .from('sheet_blobs')
        .select('payload')
        .eq('submission_id', submissionId)
        .eq('sheet_name', 'Treaty Statistics_Prop (Casualty)')
        .maybeSingle();
      if (error || !data?.payload) {
        const alt = await supabase
          .from('sheet_blobs')
          .select('payload')
          .eq('submission_id', submissionId)
          .eq('sheet_name', 'Treaty Statistics_Prop (Casualty)')
          .limit(1);
        data = (alt as any).data?.[0];
        error = (alt as any).error;
      }
      if (!mounted) return;
      if (!error && data?.payload) reset(data.payload as FormValues);
    })();
    return () => { mounted = false; };
  }, [submissionId, reset]);

  useAutosave(watch(), async (val) => {
    if (!submissionId) return;
    const upd = await supabase
      .from('sheet_blobs')
      .update({ payload: val as any })
      .eq('submission_id', submissionId)
      .eq('sheet_name', 'Treaty Statistics_Prop (Casualty)')
      .select('submission_id');
    const zeroUpd = Array.isArray((upd as any).data) && ((upd as any).data?.length ?? 0) === 0;
    if (upd.error || zeroUpd) {
      await supabase
        .from('sheet_blobs')
        .insert([{ submission_id: submissionId, sheet_name: 'Treaty Statistics_Prop (Casualty)', payload: val as any }]);
    }
    setLastSaved(new Date());
  });

  // Paste helpers and apply
  const toNumber = (s: string | undefined) => {
    if (s == null) return 0;
    const cleaned = String(s).replace(/[,\s]/g, '');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  };
  const maybeHasHeader = (cells: string[], expected: string[]) => {
    const lc = cells.map((c) => c.trim().toLowerCase());
    let hits = 0;
    expected.forEach((e) => { if (lc.some((c) => c.includes(e))) hits += 1; });
    return hits >= Math.max(2, Math.ceil(expected.length / 2));
  };
  const applyPaste = (rows: string[][]) => {
    if (!rows || rows.length === 0) return;
    let start = 0;
    const first = rows[0] ?? [];
    if (maybeHasHeader(first, ['year', 'written', 'claims', 'outstanding', 'commission', 'profit'])) start = 1;
    const mapped = rows.slice(start).map((r) => ({
      year: toNumber(r[0]),
      written_premium: toNumber(r[1]),
      claims_paid: toNumber(r[2]),
      claims_incurred: toNumber(r[3]),
      claims_outstanding: toNumber(r[4]),
      commission: toNumber(r[5]),
      profit_commission: toNumber(r[6]),
    }));
    const cleaned = mapped.filter((m) => (m.year && m.year > 0) || Object.values(m).some((v, i) => i > 0 && Number(v) > 0));
    setValue('rows', cleaned.length ? cleaned : [blankRow], { shouldDirty: true, shouldTouch: true, shouldValidate: true });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Treaty Statistics (Prop)</h2>
        <button type="button" className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => setPasteOpen(true)}>
          Paste from Excel
        </button>
      </div>
      <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded shadow p-4">
        <table className="min-w-full table-auto border rounded">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              {['UW Year','Written Premium','Claims Paid','Claims Incurred','Claims Outstanding','Commission','Profit Commission','Actions'].map(h => (
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
  <PasteModal open={pasteOpen} onClose={() => setPasteOpen(false)} onApply={applyPaste} expectedColumns={7} title="Paste from Excel — Treaty Statistics (Prop)" />
    </div>
  );
}
