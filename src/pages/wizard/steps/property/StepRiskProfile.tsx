import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { z } from 'zod';
import FormTable from '../../../../components/FormTable';
import { supabase } from '../../../../lib/supabase';
import { useAutosave } from '../../../../hooks/useAutosave';
import PasteModal from '../../../../components/PasteModal';
import { NumberCell } from '../../../../components/table/NumberCell';
import { PercentCell } from '../../../../components/table/PercentCell';
import { useAutoColumnSize, autoColumnClasses } from '../../../../components/table/useAutoColumnSize';
import { parseNumericInput, parsePercentInput } from '../../../../lib/numberFormat';
import { useViewMode } from '../../../../context/ViewMode';

// Column schema matching the Excel screenshots
// Allow negatives for all numeric fields
const BandSchema = z.object({
  lower_limit: z.number().optional().default(0),
  upper_limit: z.number().optional().default(0),
  number_of_risk_items: z.number().optional().default(0),
  total_sum_insured_ex_vat: z.number().optional().default(0),
  total_annual_premiums_ex_vat: z.number().optional().default(0),
  average_sum_insured_ex_vat: z.number().optional().default(0),
  average_premium_ex_vat: z.number().optional().default(0),
  average_rate: z.number().optional().default(0), // Stored as percent (12.5 for 12.5%)
});

type Band = z.infer<typeof BandSchema>;

type State = {
  gross_pml: Band[];
  gross_turnover: Band[];
  net_pml: Band[];
  net_turnover: Band[];
  retention: string; // allow free-form (percentages, text)
  additional_comments: string;
};

const defaultRow: Band = {
  lower_limit: 0,
  upper_limit: 0,
  number_of_risk_items: 0,
  total_sum_insured_ex_vat: 0,
  total_annual_premiums_ex_vat: 0,
  average_sum_insured_ex_vat: 0,
  average_premium_ex_vat: 0,
  average_rate: 0,
};

export default function StepRiskProfile() {
  const { submissionId } = useParams();
  const isViewMode = useViewMode();
  type Section = 'gross_pml' | 'gross_turnover' | 'net_pml' | 'net_turnover';
  
  // Table refs for auto-sizing
  const grossPmlTableRef = useAutoColumnSize();
  const grossTurnoverTableRef = useAutoColumnSize();
  const netPmlTableRef = useAutoColumnSize();
  const netTurnoverTableRef = useAutoColumnSize();
  
  const [state, setState] = useState<State>({
    gross_pml: [defaultRow],
    gross_turnover: [defaultRow],
    net_pml: [defaultRow],
    net_turnover: [defaultRow],
  retention: '',
    additional_comments: '',
  });
  const [pasteSection, setPasteSection] = useState<Section | null>(null);
  const [errors, setErrors] = useState<{
    gross_pml: Record<number, Partial<Record<keyof Band, string>>>;
    gross_turnover: Record<number, Partial<Record<keyof Band, string>>>;
    net_pml: Record<number, Partial<Record<keyof Band, string>>>;
    net_turnover: Record<number, Partial<Record<keyof Band, string>>>;
  }>({ gross_pml: {}, gross_turnover: {}, net_pml: {}, net_turnover: {} });
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load existing data for both segments and the retention/comments
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!submissionId) return;
      const [grossPmlRes, grossTurnRes, netPmlRes, netTurnRes] = await Promise.all([
        supabase.from('risk_profile_bands').select('*').eq('submission_id', submissionId).eq('segment', 'gross_pml').order('band_index', { ascending: true }),
        supabase.from('risk_profile_bands').select('*').eq('submission_id', submissionId).eq('segment', 'gross_turnover').order('band_index', { ascending: true }),
        supabase.from('risk_profile_bands').select('*').eq('submission_id', submissionId).eq('segment', 'net_pml').order('band_index', { ascending: true }),
        supabase.from('risk_profile_bands').select('*').eq('submission_id', submissionId).eq('segment', 'net_turnover').order('band_index', { ascending: true }),
      ]);

      const mapRow = (d: any): Band => ({
        lower_limit: Number(d.lower_limit) || 0,
        upper_limit: Number(d.upper_limit) || 0,
        number_of_risk_items: Number(d.number_of_risks) || 0,
        total_sum_insured_ex_vat: Number(d.total_sum_insured) || 0,
        total_annual_premiums_ex_vat: Number(d.total_annual_premiums) || 0,
        average_sum_insured_ex_vat: Number(d.avg_sum_insured) || 0,
        average_premium_ex_vat: Number(d.avg_premium) || 0,
        average_rate: Number(d.avg_rate) || 0,
      });

  const gross_pml = !grossPmlRes.error && Array.isArray(grossPmlRes.data) && grossPmlRes.data.length ? grossPmlRes.data.map(mapRow) : [defaultRow];
  const gross_turnover = !grossTurnRes.error && Array.isArray(grossTurnRes.data) && grossTurnRes.data.length ? grossTurnRes.data.map(mapRow) : [defaultRow];
  const net_pml = !netPmlRes.error && Array.isArray(netPmlRes.data) && netPmlRes.data.length ? netPmlRes.data.map(mapRow) : [defaultRow];
  const net_turnover = !netTurnRes.error && Array.isArray(netTurnRes.data) && netTurnRes.data.length ? netTurnRes.data.map(mapRow) : [defaultRow];

      // Try relational meta first
      const { data: meta, error: metaErr } = await supabase
        .from('risk_profile_meta')
        .select('retention, additional_comments')
        .eq('submission_id', submissionId)
        .maybeSingle();
      let retention = (!metaErr && meta?.retention) ? String(meta.retention) : '';
      let additional_comments = (!metaErr && meta?.additional_comments) ? String(meta.additional_comments) : '';
      // Lazy migrate from legacy blob if no relational meta
      if (!retention && !additional_comments) {
        const sb = await supabase
          .from('sheet_blobs')
          .select('payload')
          .eq('submission_id', submissionId)
          .eq('sheet_name', 'Risk Profile')
          .maybeSingle();
        const blobPayload: any = (!sb.error && sb.data?.payload && typeof sb.data.payload === 'object') ? sb.data.payload : {};
        if (blobPayload && (blobPayload.retention || blobPayload.additional_comments)) {
          await supabase.rpc('migrate_risk_profile_meta_from_blob', { p_submission_id: submissionId });
          retention = blobPayload.retention ? String(blobPayload.retention) : '';
          additional_comments = blobPayload.additional_comments ? String(blobPayload.additional_comments) : '';
        }
      }
      if (!mounted) return;
  setState({ gross_pml, gross_turnover, net_pml, net_turnover, retention, additional_comments });
    })();
    return () => { mounted = false; };
  }, [submissionId]);

  // Autosave both panels + retention/comments
  useAutosave(state, async (val) => {
    if (!submissionId) return;
    // Save Gross PML/SI
    await supabase.from('risk_profile_bands').delete().eq('submission_id', submissionId).eq('segment', 'gross_pml');
    if (val.gross_pml.length) {
      await supabase.from('risk_profile_bands').insert(
        val.gross_pml.map((r, idx) => ({
          submission_id: submissionId,
          segment: 'gross_pml',
          band_index: idx,
          lower_limit: r.lower_limit ?? 0,
          upper_limit: r.upper_limit ?? 0,
          number_of_risks: r.number_of_risk_items ?? 0,
          total_sum_insured: r.total_sum_insured_ex_vat ?? 0,
          total_annual_premiums: r.total_annual_premiums_ex_vat ?? 0,
          avg_sum_insured: r.average_sum_insured_ex_vat ?? 0,
          avg_premium: r.average_premium_ex_vat ?? 0,
          avg_rate: r.average_rate ?? 0,
        }))
      );
    }
    // Save Gross Turnover
    await supabase.from('risk_profile_bands').delete().eq('submission_id', submissionId).eq('segment', 'gross_turnover');
    if (val.gross_turnover.length) {
      await supabase.from('risk_profile_bands').insert(
        val.gross_turnover.map((r, idx) => ({
          submission_id: submissionId,
          segment: 'gross_turnover',
          band_index: idx,
          lower_limit: r.lower_limit ?? 0,
          upper_limit: r.upper_limit ?? 0,
          number_of_risks: r.number_of_risk_items ?? 0,
          total_sum_insured: r.total_sum_insured_ex_vat ?? 0,
          total_annual_premiums: r.total_annual_premiums_ex_vat ?? 0,
          avg_sum_insured: r.average_sum_insured_ex_vat ?? 0,
          avg_premium: r.average_premium_ex_vat ?? 0,
          avg_rate: r.average_rate ?? 0,
        }))
      );
    }
    // Save Net PML/SI
    await supabase.from('risk_profile_bands').delete().eq('submission_id', submissionId).eq('segment', 'net_pml');
    if (val.net_pml.length) {
      await supabase.from('risk_profile_bands').insert(
        val.net_pml.map((r, idx) => ({
          submission_id: submissionId,
          segment: 'net_pml',
          band_index: idx,
          lower_limit: r.lower_limit ?? 0,
          upper_limit: r.upper_limit ?? 0,
          number_of_risks: r.number_of_risk_items ?? 0,
          total_sum_insured: r.total_sum_insured_ex_vat ?? 0,
          total_annual_premiums: r.total_annual_premiums_ex_vat ?? 0,
          avg_sum_insured: r.average_sum_insured_ex_vat ?? 0,
          avg_premium: r.average_premium_ex_vat ?? 0,
          avg_rate: r.average_rate ?? 0,
        }))
      );
    }
    // Save Net Turnover
    await supabase.from('risk_profile_bands').delete().eq('submission_id', submissionId).eq('segment', 'net_turnover');
    if (val.net_turnover.length) {
      await supabase.from('risk_profile_bands').insert(
        val.net_turnover.map((r, idx) => ({
          submission_id: submissionId,
          segment: 'net_turnover',
          band_index: idx,
          lower_limit: r.lower_limit ?? 0,
          upper_limit: r.upper_limit ?? 0,
          number_of_risks: r.number_of_risk_items ?? 0,
          total_sum_insured: r.total_sum_insured_ex_vat ?? 0,
          total_annual_premiums: r.total_annual_premiums_ex_vat ?? 0,
          avg_sum_insured: r.average_sum_insured_ex_vat ?? 0,
          avg_premium: r.average_premium_ex_vat ?? 0,
          avg_rate: r.average_rate ?? 0,
        }))
      );
    }
    // Save retention/comments (relational meta)
    await supabase
      .from('risk_profile_meta')
      .upsert(
        [{ submission_id: submissionId, retention: val.retention ?? '', additional_comments: val.additional_comments ?? '' }],
        { onConflict: 'submission_id' }
      );
    setLastSaved(new Date());
  });

  const bandColumns = useMemo(() => [
    { key: 'lower_limit', label: 'Lower Limit', type: 'number', step: '0.01', min: 0 },
    { key: 'upper_limit', label: 'Upper Limit', type: 'number', step: '0.01', min: 0 },
    { key: 'number_of_risk_items', label: 'Number of Risk Items', type: 'number', step: '1', min: 0 },
    { key: 'total_sum_insured_ex_vat', label: 'Total Sum Insured (Ex VAT)', type: 'number', step: '0.01', min: 0 },
    { key: 'total_annual_premiums_ex_vat', label: 'Total Annual Premiums (Ex VAT)', type: 'number', step: '0.01', min: 0 },
    { key: 'average_sum_insured_ex_vat', label: 'Average Sum Insured (Ex VAT)', type: 'number', step: '0.01', min: 0 },
    { key: 'average_premium_ex_vat', label: 'Average Premium (Ex VAT)', type: 'number', step: '0.01', min: 0 },
    { key: 'average_rate', label: 'Average Rate', type: 'number', step: '0.0001', min: 0 },
  ], []);

  const validate = (r: Band) => {
    const res = BandSchema.safeParse(r);
    if (res.success) return {};
    const map: Partial<Record<keyof Band, string>> = {};
    for (const issue of res.error.issues) map[issue.path[0] as keyof Band] = issue.message;
    return map;
  };
  const withDefaults = (r: Partial<Band>): Band => ({
    lower_limit: r.lower_limit ?? 0,
    upper_limit: r.upper_limit ?? 0,
    number_of_risk_items: r.number_of_risk_items ?? 0,
    total_sum_insured_ex_vat: r.total_sum_insured_ex_vat ?? 0,
    total_annual_premiums_ex_vat: r.total_annual_premiums_ex_vat ?? 0,
    average_sum_insured_ex_vat: r.average_sum_insured_ex_vat ?? 0,
    average_premium_ex_vat: r.average_premium_ex_vat ?? 0,
    average_rate: r.average_rate ?? 0,
  });

  const onChange = (which: keyof Pick<State, 'gross_pml' | 'gross_turnover' | 'net_pml' | 'net_turnover'>) => (idx: number, key: keyof Band, value: any) => {
    setState(prev => {
      const copy = { ...prev, [which]: prev[which].slice() } as State;
      (copy[which][idx] as any)[key] = value === '' ? 0 : value;
      return copy;
    });
    setErrors(prev => ({ ...prev, [which]: { ...prev[which], [idx]: validate(withDefaults({ ...(state as any)[which][idx], [key]: value })) } } as any));
  };
  const onAddRow = (which: keyof Pick<State, 'gross_pml' | 'gross_turnover' | 'net_pml' | 'net_turnover'>) => () => setState(prev => ({ ...prev, [which]: [...prev[which], { ...defaultRow }] }));
  const onRemoveRow = (which: keyof Pick<State, 'gross_pml' | 'gross_turnover' | 'net_pml' | 'net_turnover'>) => (idx: number) => setState(prev => ({ ...prev, [which]: prev[which].length <= 1 ? prev[which] : prev[which].filter((_, i) => i !== idx) }));

  const totals = (rows: Band[]) => rows.reduce(
    (acc, r) => ({
      number_of_risk_items: acc.number_of_risk_items + (r.number_of_risk_items || 0),
      total_sum_insured_ex_vat: acc.total_sum_insured_ex_vat + (r.total_sum_insured_ex_vat || 0),
      total_annual_premiums_ex_vat: acc.total_annual_premiums_ex_vat + (r.total_annual_premiums_ex_vat || 0),
    }),
    { number_of_risk_items: 0, total_sum_insured_ex_vat: 0, total_annual_premiums_ex_vat: 0 }
  );

  const grossPmlTotals = useMemo(() => totals(state.gross_pml), [state.gross_pml]);
  const grossTurnTotals = useMemo(() => totals(state.gross_turnover), [state.gross_turnover]);
  const netPmlTotals = useMemo(() => totals(state.net_pml), [state.net_pml]);
  const netTurnTotals = useMemo(() => totals(state.net_turnover), [state.net_turnover]);

  // Paste helpers for banded tables
  const maybeHasHeader = (cells: string[], expected: string[]) => {
    const lc = (cells || []).map(c => String(c).trim().toLowerCase());
    let hits = 0;
    expected.forEach(e => { if (lc.some(c => c.includes(e))) hits += 1; });
    return hits >= Math.max(2, Math.ceil(expected.length / 2));
  };
  const applyPaste = (which: Section, grid: string[][]) => {
    if (!grid || grid.length === 0) return;
    let start = 0;
    const first = grid[0] ?? [];
    if (maybeHasHeader(first, ['lower','upper','number','total','sum','premium','average','rate'])) start = 1;
    const mapped: Band[] = grid.slice(start).map(r => ({
      lower_limit: parseNumericInput(r[0]) ?? 0,
      upper_limit: parseNumericInput(r[1]) ?? 0,
      number_of_risk_items: parseNumericInput(r[2]) ?? 0,
      total_sum_insured_ex_vat: parseNumericInput(r[3]) ?? 0,
      total_annual_premiums_ex_vat: parseNumericInput(r[4]) ?? 0,
      average_sum_insured_ex_vat: parseNumericInput(r[5]) ?? 0,
      average_premium_ex_vat: parseNumericInput(r[6]) ?? 0,
      average_rate: parsePercentInput(r[7]) ?? 0, // Parse as percent
    }));
    const cleaned = mapped.filter(m => Object.values(m).some(v => Number(v) !== 0));
    setState(prev => ({ ...prev, [which]: cleaned.length ? cleaned : [defaultRow] }));
  };

  // Render custom table with NumberCell and PercentCell
  const renderTable = (
    section: Section,
    rows: Band[],
    tableRef: React.RefObject<HTMLTableElement | null>,
    onPaste: () => void
  ) => {
    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          {!isViewMode && (
            <button
              type="button"
              onClick={onPaste}
              className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Paste from Excel
            </button>
          )}
        </div>
        <div className="overflow-x-auto w-full">
          <table
            ref={tableRef}
            className={`${autoColumnClasses.table} min-w-full border rounded`}
            style={{ tableLayout: 'auto' }}
          >
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className={autoColumnClasses.th}>Lower Limit</th>
                <th className={autoColumnClasses.th}>Upper Limit</th>
                <th className={autoColumnClasses.th}>Number of Risk Items</th>
                <th className={autoColumnClasses.th}>Total Sum Insured (Ex VAT)</th>
                <th className={autoColumnClasses.th}>Total Annual Premiums (Ex VAT)</th>
                <th className={autoColumnClasses.th}>Average Sum Insured (Ex VAT)</th>
                <th className={autoColumnClasses.th}>Average Premium (Ex VAT)</th>
                <th className={autoColumnClasses.th}>Average Rate</th>
                <th className={autoColumnClasses.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className="align-top">
                  <td className="px-2 py-1">
                    <NumberCell
                      value={row.lower_limit}
                      onChange={(v) => onChange(section)(idx, 'lower_limit', v ?? 0)}
                      decimals={2}
                      readOnly={isViewMode}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <NumberCell
                      value={row.upper_limit}
                      onChange={(v) => onChange(section)(idx, 'upper_limit', v ?? 0)}
                      decimals={2}
                      readOnly={isViewMode}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <NumberCell
                      value={row.number_of_risk_items}
                      onChange={(v) => onChange(section)(idx, 'number_of_risk_items', v ?? 0)}
                      decimals={0}
                      readOnly={isViewMode}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <NumberCell
                      value={row.total_sum_insured_ex_vat}
                      onChange={(v) => onChange(section)(idx, 'total_sum_insured_ex_vat', v ?? 0)}
                      decimals={2}
                      readOnly={isViewMode}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <NumberCell
                      value={row.total_annual_premiums_ex_vat}
                      onChange={(v) => onChange(section)(idx, 'total_annual_premiums_ex_vat', v ?? 0)}
                      decimals={2}
                      readOnly={isViewMode}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <NumberCell
                      value={row.average_sum_insured_ex_vat}
                      onChange={(v) => onChange(section)(idx, 'average_sum_insured_ex_vat', v ?? 0)}
                      decimals={2}
                      readOnly={isViewMode}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <NumberCell
                      value={row.average_premium_ex_vat}
                      onChange={(v) => onChange(section)(idx, 'average_premium_ex_vat', v ?? 0)}
                      decimals={2}
                      readOnly={isViewMode}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <PercentCell
                      value={row.average_rate}
                      onChange={(v) => onChange(section)(idx, 'average_rate', v ?? 0)}
                      digits={2}
                      readOnly={isViewMode}
                    />
                  </td>
                  <td className="px-2 py-1">
                    {!isViewMode && (
                      <button
                        type="button"
                        onClick={() => onRemoveRow(section)(idx)}
                        disabled={rows.length === 1}
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="flex justify-between items-center">
          {!isViewMode && (
            <button
              type="button"
              onClick={onAddRow(section)}
              className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Add Row
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded shadow p-4 bg-white dark:bg-gray-800">
        <h3 className="font-semibold mb-1">GROSS PROFILES (Net of Fac)</h3>
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 tracking-wide">Table 1: PML or Sum Insured</p>
        {renderTable('gross_pml', state.gross_pml, grossPmlTableRef, () => setPasteSection('gross_pml'))}
        <div className="mt-2 text-sm text-gray-700 dark:text-gray-200">
          <strong>Total:</strong>
          <span className="ml-3">Number of Risk Items: {grossPmlTotals.number_of_risk_items.toLocaleString()}</span>
          <span className="ml-3">Total Sum Insured (Ex VAT): {grossPmlTotals.total_sum_insured_ex_vat.toLocaleString()}</span>
          <span className="ml-3">Total Annual Premiums (Ex VAT): {grossPmlTotals.total_annual_premiums_ex_vat.toLocaleString()}</span>
        </div>
        <hr className="my-4" />
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 tracking-wide">Table 2: Turnover amounts</p>
        {renderTable('gross_turnover', state.gross_turnover, grossTurnoverTableRef, () => setPasteSection('gross_turnover'))}
        <div className="mt-2 text-sm text-gray-700 dark:text-gray-200">
          <strong>Total:</strong>
          <span className="ml-3">Number of Risk Items: {grossTurnTotals.number_of_risk_items.toLocaleString()}</span>
          <span className="ml-3">Total Sum Insured (Ex VAT): {grossTurnTotals.total_sum_insured_ex_vat.toLocaleString()}</span>
          <span className="ml-3">Total Annual Premiums (Ex VAT): {grossTurnTotals.total_annual_premiums_ex_vat.toLocaleString()}</span>
        </div>
      </div>
      <div className="rounded shadow p-4 bg-white dark:bg-gray-800">
        <h3 className="font-semibold mb-1">NET PROFILES</h3>
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 tracking-wide">Table 1: PML or Sum Insured</p>
        {renderTable('net_pml', state.net_pml, netPmlTableRef, () => setPasteSection('net_pml'))}
        <div className="mt-2 text-sm text-gray-700 dark:text-gray-200">
          <strong>Total:</strong>
          <span className="ml-3">Number of Risk Items: {netPmlTotals.number_of_risk_items.toLocaleString()}</span>
          <span className="ml-3">Total Sum Insured (Ex VAT): {netPmlTotals.total_sum_insured_ex_vat.toLocaleString()}</span>
          <span className="ml-3">Total Annual Premiums (Ex VAT): {netPmlTotals.total_annual_premiums_ex_vat.toLocaleString()}</span>
        </div>
        <hr className="my-4" />
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 tracking-wide">Table 2: Turnover amounts</p>
        {renderTable('net_turnover', state.net_turnover, netTurnoverTableRef, () => setPasteSection('net_turnover'))}
        <div className="mt-2 text-sm text-gray-700 dark:text-gray-200">
          <strong>Total:</strong>
          <span className="ml-3">Number of Risk Items: {netTurnTotals.number_of_risk_items.toLocaleString()}</span>
          <span className="ml-3">Total Sum Insured (Ex VAT): {netTurnTotals.total_sum_insured_ex_vat.toLocaleString()}</span>
          <span className="ml-3">Total Annual Premiums (Ex VAT): {netTurnTotals.total_annual_premiums_ex_vat.toLocaleString()}</span>
        </div>
      </div>
      <div className="rounded shadow p-4 bg-white dark:bg-gray-800 grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm font-medium mb-1">Retention</span>
          <input type="text" className="input" placeholder="e.g. 5% or 1.5M" value={state.retention} onChange={(e) => setState(prev => ({ ...prev, retention: e.target.value }))} disabled={isViewMode} />
        </label>
        <label className="block md:col-span-2">
          <span className="block text-sm font-medium mb-1">Additional Comments</span>
          <textarea className="input" value={state.additional_comments} onChange={(e) => setState(prev => ({ ...prev, additional_comments: e.target.value }))} disabled={isViewMode} />
        </label>
        <div className="md:col-span-2 text-right text-sm text-gray-500">{lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Autosaving…'}</div>
      </div>
      <PasteModal
        open={pasteSection !== null}
        onClose={() => setPasteSection(null)}
        onApply={(grid) => { if (pasteSection) applyPaste(pasteSection, grid); setPasteSection(null); }}
        title="Paste from Excel — Risk Profile"
      />
    </div>
  );
}
