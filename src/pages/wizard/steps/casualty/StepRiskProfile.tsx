import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../../../lib/supabase';
import { useAutosave } from '../../../../hooks/useAutosave';
import FormTable from '../../../../components/FormTable';
import PasteModal from '../../../../components/PasteModal';
// CSV import/export removed per requirements

type Row = {
  band: number;
  from: number | '';
  to: number | '';
  avg_sum_insured: number | '';
  gross_written_premium: number | '';
  number_of_risks: number | '';
  aggregate_sum_insured: number | '';
  number_of_claims: number | '';
  paid_claims_amount: number | '';
  outstanding_claims_amount: number | '';
};

const SHEET = 'Risk Profile (Casualty)';

function makeDefaultRows(count = 15): Row[] {
  return Array.from({ length: count }, (_, i) => ({
    band: i + 1,
    from: '',
    to: '',
    avg_sum_insured: '',
    gross_written_premium: '',
    number_of_risks: '',
    aggregate_sum_insured: '',
    number_of_claims: '',
    paid_claims_amount: '',
    outstanding_claims_amount: '',
  }));
}

export default function StepRiskProfile() {
  const { submissionId } = useParams();
  const [rows, setRows] = useState<Row[]>(() => makeDefaultRows());
  const [comments, setComments] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showPaste, setShowPaste] = useState(false);
  // File input removed (no CSV import)

  // Load
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!submissionId) return;
      const { data } = await supabase
        .from('sheet_blobs')
        .select('payload')
        .eq('submission_id', submissionId)
        .eq('sheet_name', SHEET)
        .maybeSingle();
      if (!mounted) return;
      if (data?.payload) {
        const payload = (typeof data.payload === 'object' && !Array.isArray(data.payload)) ? (data.payload as any) : null;
        const pRows = payload?.rows as Row[] | undefined;
        const pComments = payload?.comments as string | undefined;
        setRows(Array.isArray(pRows) && pRows.length ? pRows : makeDefaultRows());
        setComments(String(pComments ?? ''));
      }
    })();
    return () => { mounted = false; };
  }, [submissionId]);

  // Compute avg if possible when source fields change
  useEffect(() => {
    setRows(prev => prev.map(r => {
      const risks = typeof r.number_of_risks === 'number' ? r.number_of_risks : NaN;
      const agg = typeof r.aggregate_sum_insured === 'number' ? r.aggregate_sum_insured : NaN;
      if (Number.isFinite(risks) && risks > 0 && Number.isFinite(agg)) {
        const val = +(agg / risks).toFixed(2);
        return { ...r, avg_sum_insured: val };
      }
      return r;
    }));
  }, [rows.map(r => `${r.number_of_risks}|${r.aggregate_sum_insured}`).join('|')]);

  // Autosave
  useAutosave({ rows, comments }, async (val) => {
    if (!submissionId) return;
    const up = await supabase
      .from('sheet_blobs')
      .upsert(
        [{ submission_id: submissionId, sheet_name: SHEET, payload: { rows: val.rows, comments: val.comments } }],
        { onConflict: 'submission_id,sheet_name' }
      );
    if (!up.error) setLastSaved(new Date());
  });

  const columns = useMemo(() => [
    { key: 'band', label: 'Risk Range', type: 'number', className: 'w-20' },
    { key: 'from', label: 'From', type: 'number', className: 'w-32' },
    { key: 'to', label: 'To', type: 'number', className: 'w-32' },
    { key: 'avg_sum_insured', label: 'Average Sum Insured Per Band', type: 'number', className: 'w-40' },
    { key: 'gross_written_premium', label: 'Gross Written Premium Per Band', type: 'number', className: 'w-40' },
    { key: 'number_of_risks', label: 'Number of Risks Per Band', type: 'number', className: 'w-40' },
    { key: 'aggregate_sum_insured', label: 'Aggregate Sum Insured Per Band', type: 'number', className: 'w-44' },
    { key: 'number_of_claims', label: 'Number of Claims Per Band', type: 'number', className: 'w-40' },
    { key: 'paid_claims_amount', label: 'Paid Claims Amount Per Band', type: 'number', className: 'w-40' },
    { key: 'outstanding_claims_amount', label: 'Outstanding Claims Amount Per Band', type: 'number', className: 'w-48' },
  ], []);

  // CSV export headers removed

  const totals = useMemo(() => {
    const sum = (k: keyof Row) => rows.reduce((acc, r) => acc + (typeof r[k] === 'number' ? (r[k] as number) : 0), 0);
    return {
      gross_written_premium: sum('gross_written_premium'),
      number_of_risks: sum('number_of_risks'),
      aggregate_sum_insured: sum('aggregate_sum_insured'),
      number_of_claims: sum('number_of_claims'),
      paid_claims_amount: sum('paid_claims_amount'),
      outstanding_claims_amount: sum('outstanding_claims_amount'),
    };
  }, [rows]);

  const onChange = (idx: number, key: keyof Row, value: any) => {
    const copy = rows.slice();
    if (key === 'band') {
      (copy[idx] as any)[key] = Number(value) || 0;
    } else if (['from','to','avg_sum_insured','gross_written_premium','number_of_risks','aggregate_sum_insured','number_of_claims','paid_claims_amount','outstanding_claims_amount'].includes(key as string)) {
      (copy[idx] as any)[key] = value === '' ? '' : Number(value);
    } else {
      (copy[idx] as any)[key] = value;
    }
    setRows(copy);
  };

  function applyGrid(grid: string[][]) {
    if (!grid.length) return;
    const looksLikeHeader = grid[0]?.[0]?.toLowerCase?.().includes('risk') || grid[0]?.[1]?.toLowerCase?.().includes('from');
    const start = looksLikeHeader ? 1 : 0;
    const next = rows.map(r => ({ ...r }));
    for (let i = 0; i < Math.min(grid.length - start, next.length); i++) {
      const src = grid[start + i];
      if (!src) continue;
      const current = next[i];
      if (!current) continue;
      // Expected order: band, from, to, avg, gwp, risks, agg, claims, paid, os
      const mapIdx = (j: number) => src[j] ?? '';
      const numOrBlank = (s: string) => (s === '' ? '' : Number(s));
      const intOrPrev = (s: string, prev: number) => {
        if (s === '') return prev;
        const n = Number(s);
        return Number.isFinite(n) ? n : prev;
      };
      const parsed = {
        band: intOrPrev(mapIdx(0), current.band),
        from: numOrBlank(mapIdx(1)),
        to: numOrBlank(mapIdx(2)),
        avg_sum_insured: numOrBlank(mapIdx(3)),
        gross_written_premium: numOrBlank(mapIdx(4)),
        number_of_risks: numOrBlank(mapIdx(5)),
        aggregate_sum_insured: numOrBlank(mapIdx(6)),
        number_of_claims: numOrBlank(mapIdx(7)),
        paid_claims_amount: numOrBlank(mapIdx(8)),
        outstanding_claims_amount: numOrBlank(mapIdx(9)),
      } as Partial<Row>;
  next[i] = { ...current, ...parsed } as Row;
    }
    setRows(next);
  }

  // CSV import/export removed

  return (
    <div className="space-y-6">
      <div className="rounded shadow p-4 bg-white dark:bg-gray-800">
        <h3 className="font-semibold mb-3">Risk Profile</h3>
        <FormTable<Row>
          columns={columns as any}
          rows={rows}
          onChange={onChange}
          onPaste={() => setShowPaste(true)}
        />
  <PasteModal open={showPaste} onClose={() => setShowPaste(false)} onApply={applyGrid} expectedColumns={10} title="Paste Risk Profile" />
        <div className="mt-3 grid grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-300">
          <div>Total GWP: <span className="font-medium">{totals.gross_written_premium.toLocaleString()}</span></div>
          <div>Total Risks: <span className="font-medium">{totals.number_of_risks.toLocaleString()}</span></div>
          <div>Total Agg SI: <span className="font-medium">{totals.aggregate_sum_insured.toLocaleString()}</span></div>
          <div>Total Claims: <span className="font-medium">{totals.number_of_claims.toLocaleString()}</span></div>
          <div>Total Paid: <span className="font-medium">{totals.paid_claims_amount.toLocaleString()}</span></div>
          <div>Total O/S: <span className="font-medium">{totals.outstanding_claims_amount.toLocaleString()}</span></div>
        </div>
      </div>
      <div className="rounded shadow p-4 bg-white dark:bg-gray-800">
        <label className="block">
          <span className="block text-sm font-medium mb-1">Additional Comments</span>
          <textarea className="input" placeholder="Notes…" value={comments} onChange={(e) => setComments(e.target.value)} />
        </label>
        <div className="text-right text-sm text-gray-500 mt-2">{lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Autosaving…'}</div>
      </div>
    </div>
  );
}
