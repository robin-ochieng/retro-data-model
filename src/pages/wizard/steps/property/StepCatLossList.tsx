import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { z } from 'zod';
import FormTable from '../../../../components/FormTable';
import PasteModal from '../../../../components/PasteModal';
import { supabase } from '../../../../lib/supabase';
import { useAutosave } from '../../../../hooks/useAutosave';

const RowSchema = z.object({
  loss_id: z.number().int().optional(),
  uw_year: z.number().int().nonnegative().optional(),
  name: z.string().optional(),
  dol: z.string().optional(),
  type_of_loss: z.string().optional(),
  gross_sum_insured: z.number().nonnegative().optional().default(0),
  gross_incurred: z.number().nonnegative().optional().default(0),
  paid_to_date: z.number().nonnegative().optional().default(0),
  gross_outstanding: z.number().nonnegative().optional().default(0),
  fac_amount: z.number().nonnegative().optional().default(0),
  net_of_fac: z.number().nonnegative().optional().default(0),
  surplus_cession: z.number().nonnegative().optional().default(0),
  qs_cession: z.number().nonnegative().optional().default(0),
  net_of_proportional: z.number().nonnegative().optional().default(0),
  xol_payment: z.number().nonnegative().optional().default(0),
});

type Row = z.infer<typeof RowSchema>;

export default function StepCatLossList() {
  const { submissionId } = useParams();
  const [rows, setRows] = useState<Row[]>([
    { loss_id: 1, uw_year: undefined, name: '', dol: undefined, type_of_loss: '', gross_sum_insured: 0, gross_incurred: 0, paid_to_date: 0, gross_outstanding: 0, fac_amount: 0, net_of_fac: 0, surplus_cession: 0, qs_cession: 0, net_of_proportional: 0, xol_payment: 0 },
  ]);
  const [errors, setErrors] = useState<Record<number, Partial<Record<keyof Row, string>>>>({});
  const [additionalComments, setAdditionalComments] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showPaste, setShowPaste] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!submissionId) return;
      const { data, error } = await supabase.from('cat_loss_list').select('*').eq('submission_id', submissionId);
      if (!mounted) return;
      if (!error && Array.isArray(data) && data.length) {
        const mapped = data.map((d: any, i: number) => ({
          loss_id: i + 1,
          uw_year: d.uw_year ?? undefined,
          name: d.event_name ?? '',
          dol: d.event_start ?? d.dol ?? undefined,
          type_of_loss: d.type_of_loss ?? '',
          gross_sum_insured: Number(d.gross_sum_insured) || 0,
          gross_incurred: Number(d.gross_incurred ?? d.gross_amount) || 0,
          paid_to_date: Number(d.paid_to_date) || 0,
          gross_outstanding: Number(d.gross_outstanding) || 0,
          fac_amount: Number(d.fac_amount) || 0,
          net_of_fac: Number(d.net_of_fac) || 0,
          surplus_cession: Number(d.surplus_cession) || 0,
          qs_cession: Number((d as any).qs_cession) || 0,
          net_of_proportional: Number((d as any).net_of_proportional ?? d.net_amount) || 0,
          xol_payment: Number((d as any).xol_payment) || 0,
        } as Row));
        setRows(mapped);
      }
      const cm = await supabase.from('sheet_blobs').select('payload').eq('submission_id', submissionId).eq('sheet_name', 'Cat Loss List').maybeSingle();
      if (!cm.error && cm.data?.payload?.additional_comments) setAdditionalComments(String(cm.data.payload.additional_comments));
    })();
    return () => { mounted = false; };
  }, [submissionId]);

  useAutosave({ rows, additionalComments }, async (val) => {
    if (!submissionId) return;
    await supabase.from('cat_loss_list').delete().eq('submission_id', submissionId);
    if (val.rows.length) {
      const toInsert = val.rows.map((r: any) => ({
        submission_id: submissionId,
        uw_year: r.uw_year ?? null,
        event_name: r.name ?? null,
        event_start: r.dol ?? null,
        type_of_loss: r.type_of_loss ?? null,
        gross_sum_insured: r.gross_sum_insured ?? 0,
        gross_incurred: r.gross_incurred ?? 0,
        paid_to_date: r.paid_to_date ?? 0,
        gross_outstanding: r.gross_outstanding ?? 0,
        fac_amount: r.fac_amount ?? 0,
        net_of_fac: r.net_of_fac ?? 0,
        surplus_cession: r.surplus_cession ?? 0,
        qs_cession: r.qs_cession ?? 0,
        net_of_proportional: r.net_of_proportional ?? 0,
        xol_payment: r.xol_payment ?? 0,
      }));
      let ins = await supabase.from('cat_loss_list').insert(toInsert as any[]);
      if (ins.error && /does not exist/i.test(ins.error.message)) {
        // Fallback to base cols used earlier
        const fallback = val.rows.map((r: any) => ({
          submission_id: submissionId,
          event_name: r.name ?? null,
          event_start: r.dol ?? null,
          gross_amount: r.gross_incurred ?? 0,
          net_amount: r.net_of_proportional ?? 0,
          notes: null,
        }));
        await supabase.from('cat_loss_list').insert(fallback);
      }
    }
    await supabase.from('sheet_blobs').upsert([{ submission_id: submissionId, sheet_name: 'Cat Loss List', payload: { additional_comments: val.additionalComments ?? '' } }], { onConflict: 'submission_id,sheet_name' });
    setLastSaved(new Date());
  });

  const columns = useMemo(() => [
    { key: 'loss_id', label: 'loss id', type: 'number' },
    { key: 'uw_year', label: 'UNDERWRITING YEAR', type: 'number', step: '1', min: 1900 },
    { key: 'name', label: 'NAME' },
    { key: 'dol', label: 'DOL', type: 'date' },
    { key: 'type_of_loss', label: 'TYPE OF LOSS' },
    { key: 'gross_sum_insured', label: 'GROSS SUM INSURED', type: 'number', step: '0.01', min: 0 },
    { key: 'gross_incurred', label: 'GROSS INCURRED', type: 'number', step: '0.01', min: 0 },
    { key: 'paid_to_date', label: 'PAID TO DATE', type: 'number', step: '0.01', min: 0 },
    { key: 'gross_outstanding', label: 'GROSS OUTSTANDING', type: 'number', step: '0.01', min: 0 },
    { key: 'fac_amount', label: 'FAC AMOUNT', type: 'number', step: '0.01', min: 0 },
    { key: 'net_of_fac', label: 'NET OF FAC', type: 'number', step: '0.01', min: 0 },
    { key: 'surplus_cession', label: 'SURPLUS CESSION', type: 'number', step: '0.01', min: 0 },
    { key: 'qs_cession', label: 'QS CESSION', type: 'number', step: '0.01', min: 0 },
    { key: 'net_of_proportional', label: 'NET OF PROPORTIONAL', type: 'number', step: '0.01', min: 0 },
    { key: 'xol_payment', label: 'XOL PAYMENT', type: 'number', step: '0.01', min: 0 },
  ], []);

  const validateRow = (r: Row): Partial<Record<keyof Row, string>> => {
    const res = RowSchema.safeParse(r);
    if (res.success) return {};
    const map: Partial<Record<keyof Row, string>> = {};
    for (const issue of res.error.issues) { map[issue.path[0] as keyof Row] = issue.message; }
    return map;
  };

  const onChange = (idx: number, key: keyof Row, value: any) => {
    const copy = rows.slice();
    (copy[idx] as any)[key] = key === 'loss_id' ? copy[idx]?.loss_id ?? idx + 1 : value;
    setRows(copy);
    setErrors(prev => ({ ...prev, [idx]: validateRow(copy[idx] as Row) }));
  };
  const onAddRow = () => setRows(prev => [...prev, { loss_id: prev.length + 1, uw_year: undefined, name: '', dol: undefined, type_of_loss: '', gross_sum_insured: 0, gross_incurred: 0, paid_to_date: 0, gross_outstanding: 0, fac_amount: 0, net_of_fac: 0, surplus_cession: 0, qs_cession: 0, net_of_proportional: 0, xol_payment: 0 }]);
  const onRemoveRow = (idx: number) => setRows(prev => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));

  // Paste helpers
  const toNumber = (s: string | undefined) => {
    if (s == null) return 0;
    const cleaned = String(s).replace(/[\s,]/g, '');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  };
  const isYear = (s: string | undefined) => {
    const n = toNumber(s);
    const y = new Date().getFullYear() + 1;
    return n >= 1900 && n <= y && String(s ?? '').trim().length >= 4;
  };
  const maybeHasHeader = (cells: string[] = [], expected: string[]) => {
    const lc = cells.map((c) => String(c).trim().toLowerCase());
    let hits = 0;
    expected.forEach((e) => { if (lc.some((c) => c.includes(e))) hits += 1; });
    return hits >= Math.max(2, Math.ceil(expected.length / 2));
  };
  const applyPaste = (grid: string[][]) => {
    if (!grid || grid.length === 0) return;
    let start = 0;
    const first = grid[0] ?? [];
    if (maybeHasHeader(first, ['uw','year','name','dol','type','gross','incurred','paid','outstanding','fac','net','surplus','qs','proportional','xol'])) start = 1;
    // Detect possible loss id in first col
    let cOffset = 0;
    if (start === 1) {
      const lc = first.map((c) => String(c).toLowerCase());
      if (lc.some((c) => c.includes('loss') && c.includes('id'))) cOffset = 1;
    } else if (grid.length > 0) {
      const r0 = grid[0] ?? [];
      if (!isYear(r0[0]) && isYear(r0[1])) cOffset = 1;
    }
    const mapped: Row[] = grid.slice(start).map((r, i) => ({
      loss_id: i + 1,
      uw_year: toNumber(r[cOffset + 0]) || undefined,
      name: String(r[cOffset + 1] ?? '').trim(),
      dol: String(r[cOffset + 2] ?? '').trim() || undefined,
      type_of_loss: String(r[cOffset + 3] ?? '').trim(),
      gross_sum_insured: toNumber(r[cOffset + 4]),
      gross_incurred: toNumber(r[cOffset + 5]),
      paid_to_date: toNumber(r[cOffset + 6]),
      gross_outstanding: toNumber(r[cOffset + 7]),
      fac_amount: toNumber(r[cOffset + 8]),
      net_of_fac: toNumber(r[cOffset + 9]),
      surplus_cession: toNumber(r[cOffset + 10]),
      qs_cession: toNumber(r[cOffset + 11]),
      net_of_proportional: toNumber(r[cOffset + 12]),
      xol_payment: toNumber(r[cOffset + 13]),
    }));
    const cleaned = mapped.filter((m) => (
      (m.uw_year && m.uw_year > 0) ||
      (m.name && m.name.length > 0) ||
      [m.gross_sum_insured, m.gross_incurred, m.paid_to_date, m.gross_outstanding, m.fac_amount, m.net_of_fac, m.surplus_cession, m.qs_cession, m.net_of_proportional, m.xol_payment]
        .some((v) => Number(v) > 0)
    ));
    setRows(cleaned.length ? cleaned : [{ loss_id: 1, uw_year: undefined, name: '', dol: undefined, type_of_loss: '', gross_sum_insured: 0, gross_incurred: 0, paid_to_date: 0, gross_outstanding: 0, fac_amount: 0, net_of_fac: 0, surplus_cession: 0, qs_cession: 0, net_of_proportional: 0, xol_payment: 0 }]);
  };

  const totals = useMemo(() => {
    return rows.reduce((acc, r) => ({
      gross_sum_insured: acc.gross_sum_insured + (r.gross_sum_insured || 0),
      gross_incurred: acc.gross_incurred + (r.gross_incurred || 0),
      paid_to_date: acc.paid_to_date + (r.paid_to_date || 0),
      gross_outstanding: acc.gross_outstanding + (r.gross_outstanding || 0),
      fac_amount: acc.fac_amount + (r.fac_amount || 0),
      net_of_fac: acc.net_of_fac + (r.net_of_fac || 0),
      surplus_cession: acc.surplus_cession + (r.surplus_cession || 0),
      qs_cession: acc.qs_cession + (r.qs_cession || 0),
      net_of_proportional: acc.net_of_proportional + (r.net_of_proportional || 0),
      xol_payment: acc.xol_payment + (r.xol_payment || 0),
    }), { gross_sum_insured: 0, gross_incurred: 0, paid_to_date: 0, gross_outstanding: 0, fac_amount: 0, net_of_fac: 0, surplus_cession: 0, qs_cession: 0, net_of_proportional: 0, xol_payment: 0 });
  }, [rows]);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Cat Loss List</h2>
      <FormTable<Row>
        columns={columns as any}
        rows={rows}
        onChange={onChange}
        onAddRow={onAddRow}
        onRemoveRow={onRemoveRow}
        errors={errors}
        onPaste={() => setShowPaste(true)}
      />
      <div className="mt-3 text-sm text-gray-700 dark:text-gray-200">
        <strong>Totals:</strong>
        <span className="ml-3">Gross Sum Insured: {totals.gross_sum_insured.toLocaleString()}</span>
        <span className="ml-3">Gross Incurred: {totals.gross_incurred.toLocaleString()}</span>
        <span className="ml-3">Paid to Date: {totals.paid_to_date.toLocaleString()}</span>
        <span className="ml-3">Gross Outstanding: {totals.gross_outstanding.toLocaleString()}</span>
        <span className="ml-3">FAC Amount: {totals.fac_amount.toLocaleString()}</span>
        <span className="ml-3">Net of FAC: {totals.net_of_fac.toLocaleString()}</span>
        <span className="ml-3">Surplus Cession: {totals.surplus_cession.toLocaleString()}</span>
        <span className="ml-3">QS Cession: {totals.qs_cession.toLocaleString()}</span>
        <span className="ml-3">Net of Proportional: {totals.net_of_proportional.toLocaleString()}</span>
        <span className="ml-3">XoL Payment: {totals.xol_payment.toLocaleString()}</span>
        <span className="ml-3 text-gray-500">{lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Autosaving…'}</span>
      </div>
      <div className="mt-6 bg-white dark:bg-gray-800 rounded shadow p-4">
        <label className="block">
          <span className="block text-sm font-medium mb-1">Additional Comments</span>
          <textarea className="input" placeholder="Any notes…" value={additionalComments} onChange={(e) => setAdditionalComments(e.target.value)} />
        </label>
      </div>
  <PasteModal open={showPaste} onClose={() => setShowPaste(false)} onApply={applyPaste} title="Paste from Excel — Cat Loss List" />
    </div>
  );
}
