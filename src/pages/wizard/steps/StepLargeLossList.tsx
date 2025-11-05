import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useAutosave } from '../../../hooks/useAutosave';
import PasteModal from '../../../components/PasteModal';
import { NumberCell } from '../../../components/table/NumberCell';
import { YearCell } from '../../../components/table/YearCell';
import { DateCell } from '../../../components/table/DateCell';
import { useAutoColumnSize, autoColumnClasses } from '../../../components/table/useAutoColumnSize';
import { z } from 'zod';
import { humanizeHeader } from '../../../lib/headerFormat';
import { parseNumericInput, parseYearInput, parseDateInput, formatNumberDisplay } from '../../../lib/numberFormat';
import { useViewMode } from '../../../context/ViewMode';

const RowSchema = z.object({
  loss_id: z.number().int().optional(), // UI only
  uw_year: z.number().int().optional(),
  name: z.string().optional(),
  dol: z.string().optional(), // ISO date string
  type_of_loss: z.string().optional(),
  gross_sum_insured: z.number().optional().default(0),
  gross_incurred: z.number().optional().default(0),
  paid_to_date: z.number().optional().default(0),
  gross_outstanding: z.number().optional().default(0),
  fac_amount: z.number().optional().default(0),
  net_of_fac: z.number().optional().default(0),
  surplus_cession: z.number().optional().default(0),
  qs_cession: z.number().optional().default(0),
  net_of_proportional: z.number().optional().default(0),
  xol_payment: z.number().optional().default(0),
});

type Row = z.infer<typeof RowSchema>;

export default function StepLargeLossList() {
  const { submissionId } = useParams();
  const isViewMode = useViewMode();
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
  const tableRef = useAutoColumnSize();

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
      const firstYear = parseYearInput(r0[0]);
      const secondYear = parseYearInput(r0[1]);
      if (!firstYear && secondYear) cOffset = 1;
    }
    
    const mapped: Row[] = grid.slice(start).map((r, i) => ({
      loss_id: i + 1,
      uw_year: parseYearInput(r[cOffset + 0]) ?? undefined,
      name: String(r[cOffset + 1] ?? '').trim(),
      dol: parseDateInput(r[cOffset + 2]) ?? undefined,
      type_of_loss: String(r[cOffset + 3] ?? '').trim(),
      gross_sum_insured: parseNumericInput(r[cOffset + 4]) ?? 0,
      gross_incurred: parseNumericInput(r[cOffset + 5]) ?? 0,
      paid_to_date: parseNumericInput(r[cOffset + 6]) ?? 0,
      gross_outstanding: parseNumericInput(r[cOffset + 7]) ?? 0,
      fac_amount: parseNumericInput(r[cOffset + 8]) ?? 0,
      net_of_fac: parseNumericInput(r[cOffset + 9]) ?? 0,
      surplus_cession: parseNumericInput(r[cOffset + 10]) ?? 0,
      qs_cession: parseNumericInput(r[cOffset + 11]) ?? 0,
      net_of_proportional: parseNumericInput(r[cOffset + 12]) ?? 0,
      xol_payment: parseNumericInput(r[cOffset + 13]) ?? 0,
    }));
    
    const cleaned = mapped.filter((m) => (
      (m.uw_year && m.uw_year > 0) ||
      (m.name && m.name.length > 0) ||
      [m.gross_sum_insured, m.gross_incurred, m.paid_to_date, m.gross_outstanding, m.fac_amount, m.net_of_fac, m.surplus_cession, m.qs_cession, m.net_of_proportional, m.xol_payment]
        .some((v) => Number(v) !== 0)
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
        <div className="flex items-center gap-3">
          {!isViewMode && (
            <button
              onClick={() => setShowPaste(true)}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Paste from Excel
            </button>
          )}
          <div className="text-xs text-gray-500">
            {saveError ? `Error: ${saveError}` : saving ? 'Saving…' : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : ''}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-300 dark:border-gray-600 rounded">
        <table ref={tableRef} className="w-full min-w-max text-sm" style={{ tableLayout: 'auto' }}>
          <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
            <tr>
              <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">#</th>
              <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">{humanizeHeader('uw_year')}</th>
              <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">{humanizeHeader('name')}</th>
              <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">{humanizeHeader('dol')}</th>
              <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">{humanizeHeader('type_of_loss')}</th>
              <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">{humanizeHeader('gross_sum_insured')}</th>
              <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">{humanizeHeader('gross_incurred')}</th>
              <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">{humanizeHeader('paid_to_date')}</th>
              <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">{humanizeHeader('gross_outstanding')}</th>
              <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">{humanizeHeader('fac_amount')}</th>
              <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">{humanizeHeader('net_of_fac')}</th>
              <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">{humanizeHeader('surplus_cession')}</th>
              <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">{humanizeHeader('qs_cession')}</th>
              <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">{humanizeHeader('net_of_proportional')}</th>
              <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">{humanizeHeader('xol_payment')}</th>
              <th className="px-2 py-2 text-center font-semibold whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-2 py-1 align-top whitespace-nowrap">{row.loss_id}</td>
                <td className="px-2 py-1 align-top">
                  <YearCell
                    value={row.uw_year ?? null}
                    onChange={(val) => onChange(idx, 'uw_year', val)}
                    disabled={isViewMode}
                  />
                </td>
                <td className="px-2 py-1 align-top whitespace-normal break-words">
                  <input
                    type="text"
                    value={row.name || ''}
                    onChange={(e) => onChange(idx, 'name', e.target.value)}
                    className="w-full min-w-0 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                    disabled={isViewMode}
                  />
                </td>
                <td className="px-2 py-1 align-top whitespace-nowrap">
                  <DateCell
                    value={row.dol}
                    onChange={(val) => onChange(idx, 'dol', val)}
                    onCommit={() => {}}
                    readOnly={isViewMode}
                  />
                </td>
                <td className="px-2 py-1 align-top whitespace-normal break-words">
                  <input
                    type="text"
                    value={row.type_of_loss || ''}
                    onChange={(e) => onChange(idx, 'type_of_loss', e.target.value)}
                    className="w-full min-w-0 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                    disabled={isViewMode}
                  />
                </td>
                <td className="px-2 py-1 align-top whitespace-nowrap text-right">
                  <NumberCell
                    value={row.gross_sum_insured}
                    onChange={(val) => onChange(idx, 'gross_sum_insured', val)}
                    readOnly={isViewMode}
                  />
                </td>
                <td className="px-2 py-1 align-top whitespace-nowrap text-right">
                  <NumberCell
                    value={row.gross_incurred}
                    onChange={(val) => onChange(idx, 'gross_incurred', val)}
                    readOnly={isViewMode}
                  />
                </td>
                <td className="px-2 py-1 align-top whitespace-nowrap text-right">
                  <NumberCell
                    value={row.paid_to_date}
                    onChange={(val) => onChange(idx, 'paid_to_date', val)}
                    readOnly={isViewMode}
                  />
                </td>
                <td className="px-2 py-1 align-top whitespace-nowrap text-right">
                  <NumberCell
                    value={row.gross_outstanding}
                    onChange={(val) => onChange(idx, 'gross_outstanding', val)}
                    readOnly={isViewMode}
                  />
                </td>
                <td className="px-2 py-1 align-top whitespace-nowrap text-right">
                  <NumberCell
                    value={row.fac_amount}
                    onChange={(val) => onChange(idx, 'fac_amount', val)}
                    readOnly={isViewMode}
                  />
                </td>
                <td className="px-2 py-1 align-top whitespace-nowrap text-right">
                  <NumberCell
                    value={row.net_of_fac}
                    onChange={(val) => onChange(idx, 'net_of_fac', val)}
                    readOnly={isViewMode}
                  />
                </td>
                <td className="px-2 py-1 align-top whitespace-nowrap text-right">
                  <NumberCell
                    value={row.surplus_cession}
                    onChange={(val) => onChange(idx, 'surplus_cession', val)}
                    readOnly={isViewMode}
                  />
                </td>
                <td className="px-2 py-1 align-top whitespace-nowrap text-right">
                  <NumberCell
                    value={row.qs_cession}
                    onChange={(val) => onChange(idx, 'qs_cession', val)}
                    readOnly={isViewMode}
                  />
                </td>
                <td className="px-2 py-1 align-top whitespace-nowrap text-right">
                  <NumberCell
                    value={row.net_of_proportional}
                    onChange={(val) => onChange(idx, 'net_of_proportional', val)}
                    readOnly={isViewMode}
                  />
                </td>
                <td className="px-2 py-1 align-top whitespace-nowrap text-right">
                  <NumberCell
                    value={row.xol_payment}
                    onChange={(val) => onChange(idx, 'xol_payment', val)}
                    readOnly={isViewMode}
                  />
                </td>
                <td className="px-2 py-1 align-top text-center whitespace-nowrap">
                  {!isViewMode && (
                    <button
                      onClick={() => onRemoveRow(idx)}
                      disabled={rows.length <= 1}
                      className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!isViewMode && (
        <button
          onClick={onAddRow}
          className="mt-3 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Add Row
        </button>
      )}

      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">
        <div className="font-semibold mb-2">Totals:</div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Gross Sum Insured:</span>
            <div className="font-medium">{formatNumberDisplay(totals.gross_sum_insured, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</div>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Gross Incurred:</span>
            <div className="font-medium">{formatNumberDisplay(totals.gross_incurred, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</div>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Paid to Date:</span>
            <div className="font-medium">{formatNumberDisplay(totals.paid_to_date, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</div>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Gross Outstanding:</span>
            <div className="font-medium">{formatNumberDisplay(totals.gross_outstanding, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</div>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">FAC Amount:</span>
            <div className="font-medium">{formatNumberDisplay(totals.fac_amount, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</div>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Net of FAC:</span>
            <div className="font-medium">{formatNumberDisplay(totals.net_of_fac, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</div>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Surplus Cession:</span>
            <div className="font-medium">{formatNumberDisplay(totals.surplus_cession, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</div>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">QS Cession:</span>
            <div className="font-medium">{formatNumberDisplay(totals.qs_cession, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</div>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Net of Proportional:</span>
            <div className="font-medium">{formatNumberDisplay(totals.net_of_proportional, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</div>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">XoL Payment:</span>
            <div className="font-medium">{formatNumberDisplay(totals.xol_payment, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white dark:bg-gray-800 rounded shadow p-4">
        <label className="block">
          <span className="block text-sm font-medium mb-1">Additional Comments</span>
          <textarea 
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800" 
            placeholder="Any notes or guidance for this submission…" 
            value={additionalComments} 
            onChange={(e) => setAdditionalComments(e.target.value)}
            rows={4}
            disabled={isViewMode}
          />
        </label>
      </div>

      <PasteModal 
        open={showPaste} 
        onClose={() => setShowPaste(false)} 
        onApply={applyPaste} 
        title="Paste from Excel — Large Loss List" 
      />
    </div>
  );
}
