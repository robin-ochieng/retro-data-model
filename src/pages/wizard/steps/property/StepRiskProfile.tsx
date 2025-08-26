import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { z } from 'zod';
import FormTable from '../../../../components/FormTable';
import { supabase } from '../../../../lib/supabase';
import { useAutosave } from '../../../../hooks/useAutosave';

// Column schema matching the Excel screenshots
const BandSchema = z.object({
  lower_limit: z.number().nonnegative().optional().default(0),
  upper_limit: z.number().nonnegative().optional().default(0),
  number_of_risk_items: z.number().nonnegative().optional().default(0),
  total_sum_insured_ex_vat: z.number().nonnegative().optional().default(0),
  total_annual_premiums_ex_vat: z.number().nonnegative().optional().default(0),
  average_sum_insured_ex_vat: z.number().nonnegative().optional().default(0),
  average_premium_ex_vat: z.number().nonnegative().optional().default(0),
  average_rate: z.number().nonnegative().optional().default(0),
});

type Band = z.infer<typeof BandSchema>;

type State = {
  gross_pml: Band[];
  gross_turnover: Band[];
  net_pml: Band[];
  net_turnover: Band[];
  retention: number;
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
  const [state, setState] = useState<State>({
    gross_pml: [defaultRow],
    gross_turnover: [defaultRow],
    net_pml: [defaultRow],
    net_turnover: [defaultRow],
    retention: 0,
    additional_comments: '',
  });
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

      const sb = await supabase
        .from('sheet_blobs')
        .select('payload')
        .eq('submission_id', submissionId)
        .eq('sheet_name', 'Risk Profile')
        .maybeSingle();
      const retention = (!sb.error && sb.data?.payload?.retention) ? Number(sb.data.payload.retention) : 0;
      const additional_comments = (!sb.error && sb.data?.payload?.additional_comments) ? String(sb.data.payload.additional_comments) : '';
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
    // Save retention/comments
    await supabase
      .from('sheet_blobs')
      .upsert(
        [{ submission_id: submissionId, sheet_name: 'Risk Profile', payload: { retention: val.retention ?? 0, additional_comments: val.additional_comments ?? '' } }],
        { onConflict: 'submission_id,sheet_name' }
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

  return (
    <div className="space-y-6">
      <div className="rounded shadow p-4 bg-white dark:bg-gray-800">
        <h3 className="font-semibold mb-1">GROSS PROFILES (Net of Fac)</h3>
        <p className="text-xs text-gray-500 mb-3">Table 1: PML or Sum Insured</p>
        <FormTable<Band> columns={bandColumns as any} rows={state.gross_pml} onChange={onChange('gross_pml')} onAddRow={onAddRow('gross_pml')} onRemoveRow={onRemoveRow('gross_pml')} errors={errors.gross_pml} />
        <div className="mt-2 text-sm text-gray-700 dark:text-gray-200">
          <strong>Total:</strong>
          <span className="ml-3">Number of Risk Items: {grossPmlTotals.number_of_risk_items.toLocaleString()}</span>
          <span className="ml-3">Total Sum Insured (Ex VAT): {grossPmlTotals.total_sum_insured_ex_vat.toLocaleString()}</span>
          <span className="ml-3">Total Annual Premiums (Ex VAT): {grossPmlTotals.total_annual_premiums_ex_vat.toLocaleString()}</span>
        </div>
        <hr className="my-4" />
        <p className="text-xs text-gray-500 mb-3">Table 2: Turnover amounts</p>
        <FormTable<Band> columns={bandColumns as any} rows={state.gross_turnover} onChange={onChange('gross_turnover')} onAddRow={onAddRow('gross_turnover')} onRemoveRow={onRemoveRow('gross_turnover')} errors={errors.gross_turnover} />
        <div className="mt-2 text-sm text-gray-700 dark:text-gray-200">
          <strong>Total:</strong>
          <span className="ml-3">Number of Risk Items: {grossTurnTotals.number_of_risk_items.toLocaleString()}</span>
          <span className="ml-3">Total Sum Insured (Ex VAT): {grossTurnTotals.total_sum_insured_ex_vat.toLocaleString()}</span>
          <span className="ml-3">Total Annual Premiums (Ex VAT): {grossTurnTotals.total_annual_premiums_ex_vat.toLocaleString()}</span>
        </div>
      </div>
      <div className="rounded shadow p-4 bg-white dark:bg-gray-800">
        <h3 className="font-semibold mb-1">NET PROFILES</h3>
        <p className="text-xs text-gray-500 mb-3">Table 1: PML or Sum Insured</p>
        <FormTable<Band> columns={bandColumns as any} rows={state.net_pml} onChange={onChange('net_pml')} onAddRow={onAddRow('net_pml')} onRemoveRow={onRemoveRow('net_pml')} errors={errors.net_pml} />
        <div className="mt-2 text-sm text-gray-700 dark:text-gray-200">
          <strong>Total:</strong>
          <span className="ml-3">Number of Risk Items: {netPmlTotals.number_of_risk_items.toLocaleString()}</span>
          <span className="ml-3">Total Sum Insured (Ex VAT): {netPmlTotals.total_sum_insured_ex_vat.toLocaleString()}</span>
          <span className="ml-3">Total Annual Premiums (Ex VAT): {netPmlTotals.total_annual_premiums_ex_vat.toLocaleString()}</span>
        </div>
        <hr className="my-4" />
        <p className="text-xs text-gray-500 mb-3">Table 2: Turnover amounts</p>
        <FormTable<Band> columns={bandColumns as any} rows={state.net_turnover} onChange={onChange('net_turnover')} onAddRow={onAddRow('net_turnover')} onRemoveRow={onRemoveRow('net_turnover')} errors={errors.net_turnover} />
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
          <input type="number" step="0.01" min={0} className="input" value={state.retention} onChange={(e) => setState(prev => ({ ...prev, retention: e.target.value === '' ? 0 : Number(e.target.value) }))} />
        </label>
        <label className="block md:col-span-2">
          <span className="block text-sm font-medium mb-1">Additional Comments</span>
          <textarea className="input" value={state.additional_comments} onChange={(e) => setState(prev => ({ ...prev, additional_comments: e.target.value }))} />
        </label>
        <div className="md:col-span-2 text-right text-sm text-gray-500">{lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Autosaving…'}</div>
      </div>
    </div>
  );
}
