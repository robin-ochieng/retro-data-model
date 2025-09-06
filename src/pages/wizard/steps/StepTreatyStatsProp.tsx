import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAutosave } from '../../../hooks/useAutosave';
import { supabase } from '../../../lib/supabase';
import FormTable from '../../../components/FormTable';
import { z } from 'zod';
import { Path, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import PasteModal from '../../../components/PasteModal';

const RowSchema = z.object({
  uw_year: z.number().int().nonnegative(),
  written_premium: z.number().nonnegative().optional().default(0),
  earned_premium: z.number().nonnegative().optional().default(0),
  commission_amount: z.number().nonnegative().optional().default(0),
  commission_pct: z.number().nonnegative().optional().default(0),
  profit_commission: z.number().nonnegative().optional().default(0),
  total_commission: z.number().nonnegative().optional().default(0),
  paid_losses: z.number().nonnegative().optional().default(0),
  os_losses: z.number().nonnegative().optional().default(0),
  incurred_losses: z.number().nonnegative().optional().default(0),
  loss_ratio: z.number().nonnegative().optional().default(0),
  uw_profit: z.number().nonnegative().optional().default(0),
});

type Row = z.infer<typeof RowSchema>;
const FormSchema = z.object({ rows: z.array(RowSchema), additional_comments: z.string().optional().default('') });
type FormValues = z.infer<typeof FormSchema>;

export default function StepTreatyStatsProp() {
  const { submissionId } = useParams();
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const { control, register, reset, formState, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { rows: [{ uw_year: new Date().getFullYear(), written_premium: 0 } as Row], additional_comments: '' },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'rows' });

  // Load existing
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!submissionId) return;
      const { data, error } = await supabase
        .from('treaty_stats_prop')
        .select('*')
        .eq('submission_id', submissionId)
        .order('uw_year', { ascending: true });
      if (!mounted) return;
      if (!error && Array.isArray(data) && data.length) {
        const mapped = data.map((d: any) => ({
          uw_year: Number(d.uw_year) || new Date().getFullYear(),
          written_premium: Number(d.written_premium) || 0,
          earned_premium: Number(d.earned_premium) || 0,
          commission_amount: Number(d.commission_amount) || 0,
          commission_pct: Number(d.commission_pct) || 0,
          profit_commission: Number(d.profit_commission) || 0,
          total_commission: Number(d.total_commission) || 0,
          paid_losses: Number(d.paid_losses) || 0,
          os_losses: Number(d.os_losses) || 0,
          incurred_losses: Number(d.incurred_losses) || 0,
          loss_ratio: Number(d.loss_ratio) || 0,
          uw_profit: Number(d.uw_profit) || 0,
        } as Row));
        // Load any comments from sheet_blobs with fallback in case of duplicates
        let cm: any = await supabase
          .from('sheet_blobs')
          .select('payload')
          .eq('submission_id', submissionId)
          .eq('sheet_name', 'Treaty Statistics_Prop')
          .maybeSingle();
        if (cm.error || !cm.data?.payload) {
          cm = await supabase
            .from('sheet_blobs')
            .select('payload')
            .eq('submission_id', submissionId)
            .eq('sheet_name', 'Treaty Statistics_Prop')
            .limit(1);
        }
        const cmPayload = (!cm.error && (cm.data?.payload || (Array.isArray(cm.data) && cm.data[0]?.payload))) ? (cm.data.payload ?? cm.data[0]?.payload) : undefined;
        reset({ rows: mapped, additional_comments: cmPayload?.additional_comments ? String(cmPayload.additional_comments) : '' });
      }
    })();
    return () => { mounted = false; };
  }, [submissionId, reset]);

  // Autosave rows using watched values
  const watchedRows = watch('rows');
  useAutosave(watch(), async (formVal) => {
    if (!submissionId) return;
    // Save rows
    await supabase.from('treaty_stats_prop').delete().eq('submission_id', submissionId);
    const value = formVal.rows ?? [];
    if (value.length) {
      await supabase
        .from('treaty_stats_prop')
        .insert(value.map((v: any) => ({ ...v, submission_id: submissionId })));
    }
    // Save comments to sheet_blobs (update-then-insert fallback)
    const additional_comments = formVal.additional_comments ?? '';
    const upd = await supabase
      .from('sheet_blobs')
      .update({ payload: { additional_comments } as any })
      .eq('submission_id', submissionId)
      .eq('sheet_name', 'Treaty Statistics_Prop')
      .select('submission_id');
    const zeroUpd = Array.isArray((upd as any).data) && ((upd as any).data?.length ?? 0) === 0;
    if (upd.error || zeroUpd) {
      await supabase
        .from('sheet_blobs')
        .insert([{ submission_id: submissionId, sheet_name: 'Treaty Statistics_Prop', payload: { additional_comments } as any }]);
    }
    setLastSaved(new Date());
  }, 900);

  // Paste helpers
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
    if (maybeHasHeader(first, ['uw', 'year', 'written', 'earned', 'commission', 'paid', 'os', 'incurred', 'loss', 'profit'])) {
      start = 1;
    }
    const mapped: Row[] = rows.slice(start).map((r) => ({
      uw_year: toNumber(r[0]) || new Date().getFullYear(),
      written_premium: toNumber(r[1]),
      earned_premium: toNumber(r[2]),
      commission_amount: toNumber(r[3]),
      commission_pct: toNumber(r[4]),
      profit_commission: toNumber(r[5]),
      total_commission: toNumber(r[6]),
      paid_losses: toNumber(r[7]),
      os_losses: toNumber(r[8]),
      incurred_losses: toNumber(r[9]),
      loss_ratio: toNumber(r[10]),
      uw_profit: toNumber(r[11]),
    }));
    // Keep rows that have at least year or any non-zero metric
    const cleaned = mapped.filter((m) => Number(m.uw_year) > 0 || Object.keys(m).some((k) => k !== 'uw_year' && (m as any)[k] > 0));
    setValue('rows', cleaned.length ? cleaned : [{ uw_year: new Date().getFullYear(), written_premium: 0 } as Row], { shouldDirty: true, shouldTouch: true, shouldValidate: true });
  };

  type Key = keyof Row;
  const columns = useMemo(() => [
    { key: 'uw_year' as Key, label: 'UW Year', type: 'number', step: '1', min: 1900 },
    { key: 'written_premium' as Key, label: 'Written Premium', type: 'number', step: '0.01', min: 0 },
    { key: 'earned_premium' as Key, label: 'Earned Premium', type: 'number', step: '0.01', min: 0 },
    { key: 'commission_amount' as Key, label: 'Commission Amount', type: 'number', step: '0.01', min: 0 },
    { key: 'commission_pct' as Key, label: 'Commission %', type: 'number', step: '0.01', min: 0 },
    { key: 'profit_commission' as Key, label: 'Profit Commission', type: 'number', step: '0.01', min: 0 },
    { key: 'total_commission' as Key, label: 'Total Commission', type: 'number', step: '0.01', min: 0 },
    { key: 'paid_losses' as Key, label: 'Paid Losses', type: 'number', step: '0.01', min: 0 },
    { key: 'os_losses' as Key, label: 'OS Losses', type: 'number', step: '0.01', min: 0 },
    { key: 'incurred_losses' as Key, label: 'Incurred Losses', type: 'number', step: '0.01', min: 0 },
    { key: 'loss_ratio' as Key, label: 'Loss Ratio', type: 'number', step: '0.01', min: 0 },
    { key: 'uw_profit' as Key, label: 'UW Profit', type: 'number', step: '0.01', min: 0 },
  ], []);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Treaty Statistics (Prop)</h2>
        <button
          type="button"
          className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
          onClick={() => setPasteOpen(true)}
        >
          Paste from Excel
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto border rounded">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="px-2 py-1 text-left whitespace-nowrap">{c.label}</th>
              ))}
              <th className="px-2 py-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, idx) => (
              <tr key={field.id} className="align-top">
                {columns.map((col) => (
                  <td key={col.key} className="px-2 py-1 min-w-[8rem]">
                    {(() => {
                      const name = (`rows.${idx}.${col.key}`) as Path<FormValues>;
                      return (
                        <input
                          type={col.type ?? 'text'}
                          step={col.step}
                          min={col.min}
                          {...(col.type === 'number' ? { ...register(name, { valueAsNumber: true }) } : { ...register(name) })}
                          className="px-2 py-1 border rounded w-full"
                        />
                      );
                    })()}
                  </td>
                ))}
                <td className="px-2 py-1">
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
          onClick={() => append({ uw_year: new Date().getFullYear(), written_premium: 0 } as Row)}
        >
          Add Year
        </button>
        <span className="text-gray-500 text-sm">{lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'All changes are autosaved'}</span>
      </div>
      <div className="mt-6 bg-white dark:bg-gray-800 rounded shadow p-4">
        <label className="block">
          <span className="block text-sm font-medium mb-1">Additional Comments</span>
          <textarea className="input" placeholder="Any notes or guidance for this submission…" {...register('additional_comments')} />
        </label>
      </div>
      <PasteModal
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
  onApply={applyPaste}
  expectedColumns={12}
        title="Paste from Excel — Treaty Statistics (Prop)"
      />
    </div>
  );
}
