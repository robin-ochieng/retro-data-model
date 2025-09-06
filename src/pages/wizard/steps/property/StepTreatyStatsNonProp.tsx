import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useFieldArray, useForm, type Path } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../../../../lib/supabase';
import { useAutosave } from '../../../../hooks/useAutosave';
import PasteModal from '../../../../components/PasteModal';

const RowSchema = z.object({
  treaty_year: z.number().int().nonnegative().optional(),
  limit: z.number().nonnegative().optional().default(0),
  excess: z.number().nonnegative().optional().default(0),
  gnrpi: z.number().nonnegative().optional().default(0),
  premium_rate: z.number().nonnegative().optional().default(0),
  minimum_premium: z.number().nonnegative().optional().default(0),
  earned_premium: z.number().nonnegative().optional().default(0),
  reinstatement_premium: z.number().nonnegative().optional().default(0),
  paid_losses: z.number().nonnegative().optional().default(0),
  os_losses: z.number().nonnegative().optional().default(0),
  incurred_losses: z.number().nonnegative().optional().default(0),
  balance: z.number().optional(),
});

const FormSchema = z.object({
  overall: z.array(RowSchema).default([]),
  cat_layer1: z.array(RowSchema).default([]),
  cat_layer2: z.array(RowSchema).default([]),
  additional_comments: z.string().optional().default(''),
});

type FormValues = z.infer<typeof FormSchema>;
type SectionName = 'overall' | 'cat_layer1' | 'cat_layer2';

const blankRow: z.infer<typeof RowSchema> = {
  treaty_year: undefined,
  limit: 0,
  excess: 0,
  gnrpi: 0,
  premium_rate: 0,
  minimum_premium: 0,
  earned_premium: 0,
  reinstatement_premium: 0,
  paid_losses: 0,
  os_losses: 0,
  incurred_losses: 0,
  balance: undefined,
};

export default function StepTreatyStatsNonProp() {
  const { submissionId } = useParams();
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const [pasteSection, setPasteSection] = useState<SectionName | null>(null);

  const { control, register, reset, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { overall: [blankRow], cat_layer1: [blankRow], cat_layer2: [blankRow], additional_comments: '' },
  });
  const overall = useFieldArray({ control, name: 'overall' });
  const cat1 = useFieldArray({ control, name: 'cat_layer1' });
  const cat2 = useFieldArray({ control, name: 'cat_layer2' });

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
      if (!error && data?.payload) {
        reset(data.payload as FormValues);
      }
    })();
    return () => { mounted = false; };
  }, [submissionId, reset]);

  useAutosave(watch(), async (val) => {
    if (!submissionId) return;
    const upd = await supabase
      .from('sheet_blobs')
      .update({ payload: val as any })
      .eq('submission_id', submissionId)
      .eq('sheet_name', 'Treaty Statistics_Non-Prop')
      .select('submission_id');
    const zeroUpd = Array.isArray((upd as any).data) && ((upd as any).data?.length ?? 0) === 0;
    if (upd.error || zeroUpd) {
      await supabase
        .from('sheet_blobs')
        .insert([{ submission_id: submissionId, sheet_name: 'Treaty Statistics_Non-Prop', payload: val as any }]);
    }
    setLastSaved(new Date());
  });

  // Paste helpers
  const toNumber = (s: string | undefined) => {
    if (s == null) return 0;
    const cleaned = String(s).replace(/[\s,]/g, '');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  };
  const maybeHasHeader = (cells: string[], expected: string[]) => {
    const lc = (cells || []).map((c) => String(c).trim().toLowerCase());
    let hits = 0;
    expected.forEach((e) => { if (lc.some((c) => c.includes(e))) hits += 1; });
    return hits >= Math.max(2, Math.ceil(expected.length / 2));
  };
  const applyPaste = (section: SectionName, grid: string[][]) => {
    if (!grid || grid.length === 0) return;
    let start = 0;
    const first = grid[0] ?? [];
    if (maybeHasHeader(first, ['treaty','year','limit','excess','gnrpi','rate','minimum','earned','reinstatement','paid','os','incurred','balance'])) start = 1;
    const mapped = grid.slice(start).map((r) => ({
      treaty_year: toNumber(r[0]),
      limit: toNumber(r[1]),
      excess: toNumber(r[2]),
      gnrpi: toNumber(r[3]),
      premium_rate: toNumber(r[4]),
      minimum_premium: toNumber(r[5]),
      earned_premium: toNumber(r[6]),
      reinstatement_premium: toNumber(r[7]),
      paid_losses: toNumber(r[8]),
      os_losses: toNumber(r[9]),
      incurred_losses: toNumber(r[10]),
      balance: toNumber(r[11]) || undefined,
    }));
  const cleaned = mapped.filter((m) => (m.treaty_year && m.treaty_year > 0) || Object.keys(m as Record<string, unknown>).some((k) => k !== 'treaty_year' && Number((m as any)[k] ?? 0) > 0));
    setValue(section, (cleaned.length ? cleaned : [blankRow]) as any, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
  };

  const renderTable = (title: string, name: SectionName, fa: ReturnType<typeof useFieldArray<FormValues>>) => (
    <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded shadow p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">{title}</h3>
        <button type="button" className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => setPasteSection(name)}>
          Paste from Excel
        </button>
      </div>
      <table className="min-w-full table-auto border rounded">
        <thead className="bg-gray-100 dark:bg-gray-700">
          <tr>
            {['Treaty Year','Limit','Excess','GNRPI','Premium Rate','Minimum Premium','Earned Premium','Reinstatement Premium','Paid Losses','OS Losses','Incurred Losses','Balance','Actions'].map(h => (
              <th key={h} className="px-2 py-1 whitespace-nowrap text-left">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fa.fields.map((field, idx) => (
            <tr key={field.id}>
              <td><input type="number" step="1" {...register(`${name}.${idx}.treaty_year` as Path<FormValues>, { valueAsNumber: true })} className="input" /></td>
              <td><input type="number" step="0.01" {...register(`${name}.${idx}.limit` as Path<FormValues>, { valueAsNumber: true })} className="input w-36" /></td>
              <td><input type="number" step="0.01" {...register(`${name}.${idx}.excess` as Path<FormValues>, { valueAsNumber: true })} className="input w-36" /></td>
              <td><input type="number" step="0.01" {...register(`${name}.${idx}.gnrpi` as Path<FormValues>, { valueAsNumber: true })} className="input w-36" /></td>
              <td><input type="number" step="0.01" {...register(`${name}.${idx}.premium_rate` as Path<FormValues>, { valueAsNumber: true })} className="input" /></td>
              <td><input type="number" step="0.01" {...register(`${name}.${idx}.minimum_premium` as Path<FormValues>, { valueAsNumber: true })} className="input" /></td>
              <td><input type="number" step="0.01" {...register(`${name}.${idx}.earned_premium` as Path<FormValues>, { valueAsNumber: true })} className="input" /></td>
              <td><input type="number" step="0.01" {...register(`${name}.${idx}.reinstatement_premium` as Path<FormValues>, { valueAsNumber: true })} className="input" /></td>
              <td><input type="number" step="0.01" {...register(`${name}.${idx}.paid_losses` as Path<FormValues>, { valueAsNumber: true })} className="input" /></td>
              <td><input type="number" step="0.01" {...register(`${name}.${idx}.os_losses` as Path<FormValues>, { valueAsNumber: true })} className="input" /></td>
              <td><input type="number" step="0.01" {...register(`${name}.${idx}.incurred_losses` as Path<FormValues>, { valueAsNumber: true })} className="input" /></td>
              <td><input type="number" step="0.01" {...register(`${name}.${idx}.balance` as Path<FormValues>, { valueAsNumber: true })} className="input" /></td>
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
  );

  return (
    <div className="space-y-6">
  {renderTable('XL: All Layers (Overall)', 'overall', overall)}
  {renderTable('Cat XL: Layer 1', 'cat_layer1', cat1)}
  {renderTable('Cat XL: Layer 2', 'cat_layer2', cat2)}
      <div className="bg-white dark:bg-gray-800 rounded shadow p-4">
        <label className="block">
          <span className="block text-sm font-medium mb-1">Additional Comments</span>
          <textarea className="input" placeholder="Any notes or guidance for this submission…" {...register('additional_comments')} />
        </label>
      </div>
      <PasteModal
        open={pasteSection !== null}
        onClose={() => setPasteSection(null)}
  onApply={(grid) => { if (pasteSection) applyPaste(pasteSection, grid); setPasteSection(null); }}
  expectedColumns={12}
        title="Paste from Excel — Treaty Statistics (Non-Prop)"
      />
    </div>
  );
}
