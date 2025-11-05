import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { z } from 'zod';
import PasteModal from '../../../../components/PasteModal';
import { NumberCell } from '../../../../components/table/NumberCell';
import { YearCell } from '../../../../components/table/YearCell';
import { DateCell } from '../../../../components/table/DateCell';
import { useAutoColumnSize, autoColumnClasses } from '../../../../components/table/useAutoColumnSize';
import { supabase } from '../../../../lib/supabase';
import { useAutosave } from '../../../../hooks/useAutosave';
import { humanizeHeader } from '../../../../lib/headerFormat';
import { parseNumericInput, parseYearInput, parseDateInput, formatNumberDisplay } from '../../../../lib/numberFormat';
import { useViewMode } from '../../../../context/ViewMode';

const RowSchema = z.object({
  loss_id: z.number().int().optional(),
  uw_year: z.number().int().optional(),
  name: z.string().optional(),
  dol: z.string().optional(),
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

export default function StepCatLossList() {
  const { submissionId } = useParams();
  const isViewMode = useViewMode();
  const [rows, setRows] = useState<Row[]>([
    { loss_id: 1, uw_year: undefined, name: '', dol: undefined, type_of_loss: '', gross_sum_insured: 0, gross_incurred: 0, paid_to_date: 0, gross_outstanding: 0, fac_amount: 0, net_of_fac: 0, surplus_cession: 0, qs_cession: 0, net_of_proportional: 0, xol_payment: 0 },
  ]);
  const [errors, setErrors] = useState<Record<number, Partial<Record<keyof Row, string>>>>({});
  const [additionalComments, setAdditionalComments] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showPaste, setShowPaste] = useState(false);
  const tableRef = useAutoColumnSize();

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!submissionId) return;
  const { data, error } = await (supabase as any).from('cat_loss_list_prop').select('*').eq('submission_id', submissionId);
      if (!mounted) return;
      if (!error && Array.isArray(data) && data.length) {
        const mapped = data.map((d: any, i: number) => ({
          loss_id: i + 1,
          uw_year: d.uw_year ?? undefined,
          name: d.name ?? d.event_name ?? '',
          dol: d.dol ?? d.event_start ?? undefined,
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
      const cm = await (supabase as any)
        .from('cat_loss_list_meta_prop')
        .select('notes')
        .eq('submission_id', submissionId)
        .maybeSingle();
      if (!cm.error && cm.data) setAdditionalComments(String((cm.data as any).notes ?? ''));
    })();
    return () => { mounted = false; };
  }, [submissionId]);

  useAutosave({ rows, additionalComments }, async (val) => {
    if (!submissionId) return;
  await (supabase as any).from('cat_loss_list_prop').delete().eq('submission_id', submissionId);
    if (val.rows.length) {
      const toInsert = val.rows.map((r: any) => ({
        submission_id: submissionId,
        uw_year: r.uw_year ?? null,
        name: r.name ?? null,
        dol: parseDateInput(r.dol) ?? null,
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
  let ins = await (supabase as any).from('cat_loss_list_prop').insert(toInsert as any[]);
      if (ins.error && /does not exist/i.test(ins.error.message)) {
        // Fallback to base cols used earlier
        const fallback = val.rows.map((r: any) => ({
          submission_id: submissionId,
          name: r.name ?? null,
          dol: parseDateInput(r.dol) ?? null,
          gross_incurred: r.gross_incurred ?? 0,
          net_of_proportional: r.net_of_proportional ?? 0,
          notes: null,
        }));
  await (supabase as any).from('cat_loss_list_prop').insert(fallback);
      }
    }
    // Upsert meta notes
    const upd = await (supabase as any)
      .from('cat_loss_list_meta_prop')
      .update({ notes: val.additionalComments ?? '', updated_at: new Date().toISOString() })
      .eq('submission_id', submissionId)
      .select('submission_id');
    if (upd.error) { setLastSaved(new Date()); return; }
    if (!upd.data || (Array.isArray(upd.data) && upd.data.length === 0)) {
      await (supabase as any).from('cat_loss_list_meta_prop').insert([{ submission_id: submissionId, notes: val.additionalComments ?? '' }]);
    }
    setLastSaved(new Date());
  });

  const columns = useMemo(() => [
    { key: 'loss_id', label: humanizeHeader('loss_id'), type: 'number' },
    { key: 'uw_year', label: humanizeHeader('uw_year'), type: 'number', step: '1', min: 1900 },
    { key: 'name', label: humanizeHeader('name') },
    // DOL as text to allow Excel-style pasted dates (e.g., dd/mm/yyyy)
    { key: 'dol', label: humanizeHeader('dol') },
    { key: 'type_of_loss', label: humanizeHeader('type_of_loss') },
    { key: 'gross_sum_insured', label: humanizeHeader('gross_sum_insured'), type: 'number', step: '0.01', min: 0 },
    { key: 'gross_incurred', label: humanizeHeader('gross_incurred'), type: 'number', step: '0.01', min: 0 },
    { key: 'paid_to_date', label: humanizeHeader('paid_to_date'), type: 'number', step: '0.01', min: 0 },
    { key: 'gross_outstanding', label: humanizeHeader('gross_outstanding'), type: 'number', step: '0.01', min: 0 },
    { key: 'fac_amount', label: humanizeHeader('fac_amount'), type: 'number', step: '0.01', min: 0 },
    { key: 'net_of_fac', label: humanizeHeader('net_of_fac'), type: 'number', step: '0.01', min: 0 },
    { key: 'surplus_cession', label: humanizeHeader('surplus_cession'), type: 'number', step: '0.01', min: 0 },
    { key: 'qs_cession', label: humanizeHeader('qs_cession'), type: 'number', step: '0.01', min: 0 },
    { key: 'net_of_proportional', label: humanizeHeader('net_of_proportional'), type: 'number', step: '0.01', min: 0 },
    { key: 'xol_payment', label: humanizeHeader('xol_payment'), type: 'number', step: '0.01', min: 0 },
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
        <h2 className="text-lg font-semibold">Cat Loss List</h2>
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
            {lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Autosaving…'}
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
            placeholder="Any notes…" 
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
        title="Paste from Excel — Cat Loss List" 
      />
    </div>
  );
}
