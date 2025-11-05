import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useFieldArray, useForm, type Path } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../../../../lib/supabase';
import { useAutosave } from '../../../../hooks/useAutosave';
import PasteModal from '../../../../components/PasteModal';
import { NumberCell } from '../../../../components/table/NumberCell';
import { useAutoColumnSize, autoColumnClasses } from '../../../../components/table/useAutoColumnSize';
import { parseNumericInput } from '../../../../lib/numberFormat';
import { useViewMode } from '../../../../context/ViewMode';

const RowSchema = z.object({
  year: z.number().int().min(1900).max(2100).optional(), // 4-digit year validation
  layer: z.string().optional().default(''),
  limit: z.number().optional().default(0), // Allow negatives
  priority: z.number().optional().default(0), // Allow negatives
  ognpi: z.number().optional().default(0), // Allow negatives
  rate: z.number().optional().default(0), // Allow negatives
  mdp: z.number().optional().default(0), // Allow negatives
  adjusted_premium: z.number().optional().default(0), // Allow negatives
  premium: z.number().optional().default(0), // Allow negatives
  reinstatement_premium: z.number().optional().default(0), // Allow negatives
  claims_paid: z.number().optional().default(0), // Allow negatives
  claims_outstanding: z.number().optional().default(0), // Allow negatives
  claims_incurred: z.number().optional().default(0), // Allow negatives
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
  const isViewMode = useViewMode();
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const { control, register, reset, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { rows: [blankRow], additional_comments: '' },
  });
  const fa = useFieldArray({ control, name: 'rows' });
  const tableRef = useAutoColumnSize();

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!submissionId) return;
      let { data, error } = await supabase
        .from('sheet_blobs')
        .select('payload')
        .eq('submission_id', submissionId)
        .eq('sheet_name', 'Treaty Statistics_Non-Prop')
        .maybeSingle();
      if (error || !data?.payload) {
        const alt = await supabase
          .from('sheet_blobs')
          .select('payload')
          .eq('submission_id', submissionId)
          .eq('sheet_name', 'Treaty Statistics_Non-Prop')
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

  // Paste helpers and mapping
  const toNumber = (s: string | undefined) => {
    const parsed = parseNumericInput(s);
    return parsed ?? 0;
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
    if (maybeHasHeader(first, ['year','layer','limit','priority','ognpi','rate','mdp','adjust','premium','reinstatement','claims'])) start = 1;
    const mapped = rows.slice(start).map((r) => ({
      year: toNumber(r[0]),
      layer: (r[1] ?? '').trim(),
      limit: toNumber(r[2]),
      priority: toNumber(r[3]),
      ognpi: toNumber(r[4]),
      rate: toNumber(r[5]),
      mdp: toNumber(r[6]),
      adjusted_premium: toNumber(r[7]),
      premium: toNumber(r[8]),
      reinstatement_premium: toNumber(r[9]),
      claims_paid: toNumber(r[10]),
      claims_outstanding: toNumber(r[11]),
      claims_incurred: toNumber(r[12]),
    }));
    const cleaned = mapped.filter((m) => (m.year && m.year > 0) || Object.values(m).some((v, i) => i > 0 && (typeof v === 'string' ? v.length > 0 : Number(v) > 0)));
    setValue('rows', cleaned.length ? cleaned : [blankRow], { shouldDirty: true, shouldTouch: true, shouldValidate: true });
  };

  const columns: Array<{ key: keyof z.infer<typeof RowSchema>; label: string; isYear?: boolean; isText?: boolean }> = [
    { key: 'year', label: 'Year', isYear: true },
    { key: 'layer', label: 'Layer', isText: true },
    { key: 'limit', label: 'Limit' },
    { key: 'priority', label: 'Priority' },
    { key: 'ognpi', label: 'OGNPI' },
    { key: 'rate', label: 'Rate' },
    { key: 'mdp', label: 'MDP' },
    { key: 'adjusted_premium', label: 'Adjust. Premium' },
    { key: 'premium', label: 'Premium' },
    { key: 'reinstatement_premium', label: 'Reinstatement Premium' },
    { key: 'claims_paid', label: 'Claims Paid' },
    { key: 'claims_outstanding', label: 'Claims Outstanding' },
    { key: 'claims_incurred', label: 'Claims Incurred' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Treaty Statistics (Non-Prop)</h2>
        {!isViewMode && (
          <button type="button" className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => setPasteOpen(true)}>Paste from Excel</button>
        )}
      </div>
      <div className="bg-white dark:bg-gray-800 rounded shadow p-4">
        <div className={autoColumnClasses.container}>
          <table ref={tableRef} className={`${autoColumnClasses.table} min-w-full border rounded`}>
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                {columns.map(c => (
                  <th key={c.key} className="px-2 py-1 whitespace-nowrap text-left">{c.label}</th>
                ))}
                <th className="px-2 py-1 whitespace-nowrap text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {fa.fields.map((field, idx) => (
                <tr key={field.id}>
                  {columns.map(col => {
                    const fieldName = `rows.${idx}.${col.key}` as Path<FormValues>;
                    const value = watch(fieldName);
                    
                    // Year: plain input with 4-digit validation
                    if (col.isYear) {
                      return (
                        <td key={col.key} className="px-2 py-1">
                          <input
                            type="number"
                            {...register(fieldName, { valueAsNumber: true })}
                            className="px-2 py-1 border rounded w-full"
                            min={1900}
                            max={2100}
                            step="1"
                            pattern="^\d{4}$"
                            title="Enter a 4-digit year (1900-2100)"
                            disabled={isViewMode}
                          />
                        </td>
                      );
                    }
                    
                    // Layer: plain text input
                    if (col.isText) {
                      return (
                        <td key={col.key} className="px-2 py-1">
                          <input
                            type="text"
                            {...register(fieldName)}
                            className="px-2 py-1 border rounded w-full"
                            placeholder="Layer"
                            disabled={isViewMode}
                          />
                        </td>
                      );
                    }
                    
                    // All numeric columns with NumberCell
                    return (
                      <td key={col.key} className="px-2 py-1">
                        <NumberCell
                          value={value as number}
                          onChange={(newValue) => {
                            setValue(fieldName, newValue ?? 0, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
                          }}
                          decimals={2}
                          className="w-full"
                          readOnly={isViewMode}
                        />
                      </td>
                    );
                  })}
                  <td className="px-2 py-1">
                    {!isViewMode && (
                      <button type="button" className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600" onClick={() => fa.remove(idx)} disabled={fa.fields.length <= 1}>Remove</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-between items-center mt-3">
          {!isViewMode && (
            <button type="button" className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700" onClick={() => fa.append(blankRow)}>Add Row</button>
          )}
          <div className="text-sm text-gray-500">{lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Autosaving…'}</div>
        </div>
      </div>
      <div className="mt-6 bg-white dark:bg-gray-800 rounded shadow p-4">
        <label className="block">
          <span className="block text-sm font-medium mb-1">Additional Comments</span>
          <textarea className="input" placeholder="Any notes or guidance for this submission…" {...register('additional_comments')} disabled={isViewMode} />
        </label>
      </div>
  <PasteModal open={pasteOpen} onClose={() => setPasteOpen(false)} onApply={applyPaste} expectedColumns={13} title="Paste from Excel — Treaty Statistics (Non-Prop)" />
    </div>
  );
}
