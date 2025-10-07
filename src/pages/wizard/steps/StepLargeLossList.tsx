import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useAutosave } from '../../../hooks/useAutosave';
import FormTable from '../../../components/FormTable';
import PasteModal from '../../../components/PasteModal';
import { z } from 'zod';
import { humanizeHeader } from '../../../lib/headerFormat';

const RowSchema = z.object({
  loss_id: z.number().int().optional(), // UI only
  uw_year: z.number().int().nonnegative().optional(),
  name: z.string().optional(),
  dol: z.string().optional(), // ISO date string
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

export default function StepLargeLossList() {
  const { submissionId } = useParams();
  const [rows, setRows] = useState<Row[]>([
    { loss_id: 1, uw_year: undefined, name: '', dol: undefined, type_of_loss: '', gross_sum_insured: 0, gross_incurred: 0, paid_to_date: 0, gross_outstanding: 0, fac_amount: 0, net_of_fac: 0, surplus_cession: 0, qs_cession: 0, net_of_proportional: 0, xol_payment: 0 },
  ]);
  const [errors, setErrors] = useState<Record<number, Partial<Record<keyof Row, string>>>>({});
  const [additionalComments, setAdditionalComments] = useState<string>('');
  const [optionalCols, setOptionalCols] = useState<{ qs_cession?: boolean; net_of_proportional?: boolean; xol_payment?: boolean }>({});
  const [showPaste, setShowPaste] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const normalizeDate = (s: string | undefined | null): string | null => {
    if (!s) return null;
    const v = String(s).trim();
    if (!v) return null;
    // Already ISO like 2024-07-01
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    // dd/mm/yyyy or dd-mm-yyyy (also handle mm/dd/yyyy where month<=12 and day>12 ambiguity by assuming dd/mm)
    const m = v.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if (m) {
      const d = parseInt(m[1] ?? '0', 10);
      const mo = parseInt(m[2] ?? '0', 10);
      const y = parseInt(m[3] ?? '0', 10);
      if (y >= 1900 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
        const mm = String(mo).padStart(2, '0');
        const dd = String(d).padStart(2, '0');
        return `${y}-${mm}-${dd}`;
      }
    }
    // yyyy/mm/dd or yyyy.mm.dd
    const m2 = v.match(/^(\d{4})[\/.](\d{1,2})[\/.](\d{1,2})$/);
    if (m2) {
      const y = parseInt(m2[1] ?? '0', 10);
      const mo = parseInt(m2[2] ?? '0', 10);
      const d = parseInt(m2[3] ?? '0', 10);
      if (y >= 1900 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
        const mm = String(mo).padStart(2, '0');
        const dd = String(d).padStart(2, '0');
        return `${y}-${mm}-${dd}`;
      }
    }
    return null;
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!submissionId) return;
      const { data, error } = await (supabase as any)
        .from('large_loss_list_prop')
        .select('*')
        .eq('submission_id', submissionId);
      if (!mounted) return;
  if (!error && Array.isArray(data) && data.length) {
        // Detect optional columns presence from first row
        const first = data[0] as any;
        setOptionalCols({
          qs_cession: Object.prototype.hasOwnProperty.call(first, 'qs_cession'),
          net_of_proportional: Object.prototype.hasOwnProperty.call(first, 'net_of_proportional'),
          xol_payment: Object.prototype.hasOwnProperty.call(first, 'xol_payment'),
        });
        const mapped = data.map((d: any, i: number) => ({
          loss_id: i + 1,
          uw_year: d.uw_year ?? undefined,
          name: d.name ?? '',
          dol: d.dol ?? undefined,
          type_of_loss: d.type_of_loss ?? '',
          gross_sum_insured: Number(d.gross_sum_insured) || 0,
          gross_incurred: Number(d.gross_incurred) || 0,
          paid_to_date: Number(d.paid_to_date) || 0,
          gross_outstanding: Number(d.gross_outstanding) || 0,
          fac_amount: Number(d.fac_amount) || 0,
          net_of_fac: Number(d.net_of_fac) || 0,
          surplus_cession: Number(d.surplus_cession) || 0,
          qs_cession: Number((d as any).qs_cession) || 0,
          net_of_proportional: Number((d as any).net_of_proportional) || 0,
          xol_payment: Number((d as any).xol_payment) || 0,
        } as Row));
        setRows(mapped);
      }
      // Load comments from meta table
      const cm = await (supabase as any)
        .from('large_loss_list_meta_prop')
        .select('notes')
        .eq('submission_id', submissionId)
        .maybeSingle();
      if (!cm.error && cm.data) {
        setAdditionalComments(String((cm.data as any).notes ?? ''));
      }
    })();
    return () => { mounted = false; };
  }, [submissionId]);

  useAutosave({ rows, additionalComments }, async (value) => {
    if (!submissionId) return;
    setSaving(true);
    setSaveError(null);
    // Save rows
    try {
      await (supabase as any).from('large_loss_list_prop').delete().eq('submission_id', submissionId);
    } catch (e: any) {
      setSaving(false);
      setSaveError(e?.message ?? 'Failed deleting existing rows');
      return;
    }
    if (value.rows.length) {
      const toInsertAll = value.rows.map((v: any) => ({
        submission_id: submissionId,
        uw_year: v.uw_year ?? null,
        name: v.name ?? null,
        dol: normalizeDate(v.dol) /* may be null if unparsable */,
        type_of_loss: v.type_of_loss ?? null,
        gross_sum_insured: v.gross_sum_insured ?? 0,
        gross_incurred: v.gross_incurred ?? 0,
        paid_to_date: v.paid_to_date ?? 0,
        gross_outstanding: v.gross_outstanding ?? 0,
        fac_amount: v.fac_amount ?? 0,
        net_of_fac: v.net_of_fac ?? 0,
        surplus_cession: v.surplus_cession ?? 0,
        qs_cession: v.qs_cession ?? 0,
        net_of_proportional: v.net_of_proportional ?? 0,
        xol_payment: v.xol_payment ?? 0,
      }));
      let ins = await (supabase as any).from('large_loss_list_prop').insert(toInsertAll as any[]);
      if (ins.error && /does not exist/i.test(ins.error.message)) {
        // Retry without optional columns if DB hasn’t been extended yet
        const toInsertFallback = toInsertAll.map((o) => {
          const c: any = { ...o };
          if (ins.error!.message.includes('qs_cession')) delete c.qs_cession;
          if (ins.error!.message.includes('net_of_proportional')) delete c.net_of_proportional;
          if (ins.error!.message.includes('xol_payment')) delete c.xol_payment;
          return c;
        });
        const ins2 = await (supabase as any).from('large_loss_list_prop').insert(toInsertFallback);
        if (ins2.error) {
          setSaving(false);
          setSaveError(ins2.error.message ?? 'Insert failed');
          return;
        }
      } else if (ins.error) {
        setSaving(false);
        setSaveError(ins.error.message ?? 'Insert failed');
        return;
      }
    }
    // Save comments
    // Upsert meta row (update else insert)
    const upd = await (supabase as any)
      .from('large_loss_list_meta_prop')
      .update({ notes: value.additionalComments ?? '', updated_at: new Date().toISOString() })
      .eq('submission_id', submissionId)
      .select('submission_id');
    if (upd.error) {
      setSaving(false);
      setSaveError(upd.error.message ?? 'Meta update failed');
      return;
    }
    if (!upd.data || (Array.isArray(upd.data) && upd.data.length === 0)) {
      const insMeta = await (supabase as any).from('large_loss_list_meta_prop').insert([{ submission_id: submissionId, notes: value.additionalComments ?? '' }]);
      if (insMeta.error) {
        setSaving(false);
        setSaveError(insMeta.error.message ?? 'Meta insert failed');
        return;
      }
    }
    setSaving(false);
    setLastSaved(new Date());
  });

  const columns = useMemo(() => {
    const base = [
      { key: 'loss_id', label: humanizeHeader('loss_id'), type: 'number' },
      { key: 'uw_year', label: humanizeHeader('uw_year'), type: 'number', step: '1', min: 1900 },
      { key: 'name', label: humanizeHeader('name') },
  // DOL changed from date input to text to enable seamless Excel multi-cell paste
  { key: 'dol', label: humanizeHeader('dol') },
      { key: 'type_of_loss', label: humanizeHeader('type_of_loss') },
      { key: 'gross_sum_insured', label: humanizeHeader('gross_sum_insured'), type: 'number', step: '0.01', min: 0 },
      { key: 'gross_incurred', label: humanizeHeader('gross_incurred'), type: 'number', step: '0.01', min: 0 },
      { key: 'paid_to_date', label: humanizeHeader('paid_to_date'), type: 'number', step: '0.01', min: 0 },
      { key: 'gross_outstanding', label: humanizeHeader('gross_outstanding'), type: 'number', step: '0.01', min: 0 },
      { key: 'fac_amount', label: humanizeHeader('fac_amount'), type: 'number', step: '0.01', min: 0 },
      { key: 'net_of_fac', label: humanizeHeader('net_of_fac'), type: 'number', step: '0.01', min: 0 },
      { key: 'surplus_cession', label: humanizeHeader('surplus_cession'), type: 'number', step: '0.01', min: 0 },
    ];
    // Optional splits
    const opt: any[] = [];
    opt.push({ key: 'qs_cession', label: humanizeHeader('qs_cession'), type: 'number', step: '0.01', min: 0 });
    opt.push({ key: 'net_of_proportional', label: humanizeHeader('net_of_proportional'), type: 'number', step: '0.01', min: 0 });
    opt.push({ key: 'xol_payment', label: humanizeHeader('xol_payment'), type: 'number', step: '0.01', min: 0 });
    return [...base, ...opt];
  }, []);

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
    (copy[idx] as any)[key] = key === 'loss_id' ? copy[idx]?.loss_id ?? idx + 1 : value;
    setRows(copy as Row[]);
    const e = validateRow(copy[idx] as Row);
    setErrors(prev => ({ ...prev, [idx]: e }));
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
    const y = new Date().getFullYear() + 1; // allow next year too
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
    // Detect if first column is a pasted loss id to offset columns
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
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Large Loss List</h2>
  <div className="text-xs text-gray-500">{saveError ? `Error: ${saveError}` : saving ? 'Saving…' : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : ''}</div>
      </div>
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
      </div>
  <div className="mt-6 bg-white dark:bg-gray-800 rounded shadow p-4">
        <label className="block">
          <span className="block text-sm font-medium mb-1">Additional Comments</span>
          <textarea className="input" placeholder="Any notes or guidance for this submission…" value={additionalComments} onChange={(e) => setAdditionalComments(e.target.value)} />
        </label>
      </div>
  <PasteModal open={showPaste} onClose={() => setShowPaste(false)} onApply={applyPaste} title="Paste from Excel — Large Loss List" />
    </div>
  );
}
