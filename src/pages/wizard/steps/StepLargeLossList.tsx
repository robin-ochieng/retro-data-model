import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useAutosave } from '../../../hooks/useAutosave';
import FormTable from '../../../components/FormTable';
import { z } from 'zod';

const RowSchema = z.object({
  loss_date: z.string().optional(), // ISO date string
  uw_year: z.number().int().nonnegative().optional(),
  insured: z.string().optional(),
  cause_of_loss: z.string().optional(),
  gross_sum_insured: z.number().nonnegative().optional().default(0),
  gross_incurred: z.number().nonnegative().optional().default(0),
  paid_to_date: z.number().nonnegative().optional().default(0),
  gross_outstanding: z.number().nonnegative().optional().default(0),
  currency: z.string().optional().default('USD'),
  notes: z.string().optional(),
});

type Row = z.infer<typeof RowSchema>;

export default function StepLargeLossList() {
  const { submissionId } = useParams();
  const [rows, setRows] = useState<Row[]>([{
    loss_date: undefined,
    uw_year: undefined,
    insured: '',
    cause_of_loss: '',
    gross_sum_insured: 0,
    gross_incurred: 0,
    paid_to_date: 0,
    gross_outstanding: 0,
    currency: 'USD',
    notes: '',
  }]);
  const [errors, setErrors] = useState<Record<number, Partial<Record<keyof Row, string>>>>({});
  const [additionalComments, setAdditionalComments] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!submissionId) return;
      const { data, error } = await supabase
        .from('large_loss_list')
        .select('*')
        .eq('submission_id', submissionId);
      if (!mounted) return;
      if (!error && Array.isArray(data) && data.length) {
        const mapped = data.map((d: any) => ({
          loss_date: d.loss_date ?? undefined,
          uw_year: d.uw_year ?? undefined,
          insured: d.insured ?? '',
          cause_of_loss: d.cause_of_loss ?? '',
          gross_sum_insured: Number(d.gross_sum_insured) || 0,
          gross_incurred: Number(d.gross_incurred) || 0,
          paid_to_date: Number(d.paid_to_date) || 0,
          gross_outstanding: Number(d.gross_outstanding) || 0,
          currency: d.currency ?? 'USD',
          notes: d.notes ?? '',
        } as Row));
        setRows(mapped);
      }
      // Load comments from sheet_blobs
      const cm = await supabase
        .from('sheet_blobs')
        .select('payload')
        .eq('submission_id', submissionId)
        .eq('sheet_name', 'Large Loss List')
        .maybeSingle();
      if (!cm.error && cm.data?.payload?.additional_comments) {
        setAdditionalComments(String(cm.data.payload.additional_comments));
      }
    })();
    return () => { mounted = false; };
  }, [submissionId]);

  useAutosave({ rows, additionalComments }, async (value) => {
    if (!submissionId) return;
    // Save rows
    await supabase.from('large_loss_list').delete().eq('submission_id', submissionId);
    if (value.rows.length) {
      await supabase.from('large_loss_list').insert(value.rows.map((v: any) => ({ ...v, submission_id: submissionId })));
    }
    // Save comments
    await supabase
      .from('sheet_blobs')
      .upsert(
        [{ submission_id: submissionId, sheet_name: 'Large Loss List', payload: { additional_comments: value.additionalComments ?? '' } }],
        { onConflict: 'submission_id,sheet_name' }
      );
  });

  const columns = useMemo(() => [
    { key: 'loss_date', label: 'Loss Date', type: 'date' },
    { key: 'uw_year', label: 'UW Year', type: 'number', step: '1', min: 1900 },
    { key: 'insured', label: 'Insured' },
    { key: 'cause_of_loss', label: 'Cause of Loss' },
    { key: 'gross_sum_insured', label: 'Gross Sum Insured', type: 'number', step: '0.01', min: 0 },
    { key: 'gross_incurred', label: 'Gross Incurred', type: 'number', step: '0.01', min: 0 },
    { key: 'paid_to_date', label: 'Paid to Date', type: 'number', step: '0.01', min: 0 },
    { key: 'gross_outstanding', label: 'Gross Outstanding', type: 'number', step: '0.01', min: 0 },
    { key: 'currency', label: 'Currency' },
    { key: 'notes', label: 'Notes' },
  ], []);

  const validateRow = (r: Row): Partial<Record<keyof Row, string>> => {
    const res = RowSchema.safeParse(r);
    if (res.success) return {};
    const map: Partial<Record<keyof Row, string>> = {};
    for (const issue of res.error.issues) {
      const k = issue.path[0] as keyof Row;
      map[k] = issue.message;
    }
    return map;
  };

  const onChange = (idx: number, key: keyof Row, value: any) => {
    const copy = rows.slice();
    const normalized = typeof value === 'number' && !Number.isNaN(value) ? value : value;
    (copy[idx] as any)[key] = normalized;
    setRows(copy as Row[]);
    const e = validateRow(copy[idx] as Row);
    setErrors(prev => ({ ...prev, [idx]: e }));
  };

  const onAddRow = () => setRows(prev => [...prev, {
    loss_date: undefined,
    uw_year: undefined,
    insured: '',
    cause_of_loss: '',
    gross_sum_insured: 0,
    gross_incurred: 0,
    paid_to_date: 0,
    gross_outstanding: 0,
    currency: 'USD',
    notes: '',
  }]);
  const onRemoveRow = (idx: number) => setRows(prev => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Large Loss List</h2>
      <FormTable<Row>
        columns={columns as any}
        rows={rows}
        onChange={onChange}
        onAddRow={onAddRow}
        onRemoveRow={onRemoveRow}
        errors={errors}
      />
      <div className="mt-6 bg-white dark:bg-gray-800 rounded shadow p-4">
        <label className="block">
          <span className="block text-sm font-medium mb-1">Additional Comments</span>
          <textarea className="input" placeholder="Any notes or guidance for this submission…" value={additionalComments} onChange={(e) => setAdditionalComments(e.target.value)} />
        </label>
      </div>
    </div>
  );
}
