import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { z } from 'zod';
import FormTable from '../../../../components/FormTable';
import PasteModal from '../../../../components/PasteModal';
import { supabase } from '../../../../lib/supabase';
import { useAutosave } from '../../../../hooks/useAutosave';
// CSV import/export removed per requirements

// Columns per screenshot: Policy Description, Number of Risks, Sum Insured (Gross, Net, Q/S, 1st Surplus, Fac), Premium (Gross, Net, Q/S, 1st Surplus, Fac)
const RowSchema = z.object({
  policy_description: z.string().optional().default(''),
  number_of_risks: z.number().nonnegative().optional().default(0),
  si_gross: z.number().nonnegative().optional().default(0),
  si_net: z.number().nonnegative().optional().default(0),
  si_qs: z.number().nonnegative().optional().default(0),
  si_first_surplus: z.number().nonnegative().optional().default(0),
  si_fac: z.number().nonnegative().optional().default(0),
  prem_gross: z.number().nonnegative().optional().default(0),
  prem_net: z.number().nonnegative().optional().default(0),
  prem_qs: z.number().nonnegative().optional().default(0),
  prem_first_surplus: z.number().nonnegative().optional().default(0),
  prem_fac: z.number().nonnegative().optional().default(0),
});
type Row = z.infer<typeof RowSchema>;

const SHEET = 'Motor Fleet List (Casualty)';

export default function StepMotorFleetList() {
  const { submissionId } = useParams();
  const [rows, setRows] = useState<Row[]>([{ policy_description: '', number_of_risks: 0, si_gross: 0, si_net: 0, si_qs: 0, si_first_surplus: 0, si_fac: 0, prem_gross: 0, prem_net: 0, prem_qs: 0, prem_first_surplus: 0, prem_fac: 0 }]);
  const [comments, setComments] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
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
        setRows(Array.isArray(pRows) && pRows.length ? pRows : rows);
        setComments(String(pComments ?? ''));
      }
    })();
    return () => { mounted = false; };
  }, [submissionId]);

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
    { key: 'policy_description', label: 'Policy Description' },
    { key: 'number_of_risks', label: 'Number of Risks', type: 'number', step: '1', min: 0 },
    { key: 'si_gross', label: 'SI Gross', type: 'number', step: '0.01', min: 0 },
    { key: 'si_net', label: 'SI Net', type: 'number', step: '0.01', min: 0 },
    { key: 'si_qs', label: 'SI Q/S', type: 'number', step: '0.01', min: 0 },
    { key: 'si_first_surplus', label: 'SI 1st Surplus', type: 'number', step: '0.01', min: 0 },
    { key: 'si_fac', label: 'SI Fac', type: 'number', step: '0.01', min: 0 },
    { key: 'prem_gross', label: 'Premium Gross', type: 'number', step: '0.01', min: 0 },
    { key: 'prem_net', label: 'Premium Net', type: 'number', step: '0.01', min: 0 },
    { key: 'prem_qs', label: 'Premium Q/S', type: 'number', step: '0.01', min: 0 },
    { key: 'prem_first_surplus', label: 'Premium 1st Surplus', type: 'number', step: '0.01', min: 0 },
    { key: 'prem_fac', label: 'Premium Fac', type: 'number', step: '0.01', min: 0 },
  ], []);

  // CSV export headers removed

  const onChange = (idx: number, key: keyof Row, value: any) => {
    const copy = rows.slice();
    (copy[idx] as any)[key] = value === '' ? (typeof (rows[idx] as any)[key] === 'number' ? 0 : '') : (typeof (rows[idx] as any)[key] === 'number' ? Number(value) : value);
    setRows(copy);
  };

  const onAddRow = () => setRows(prev => [...prev, { policy_description: '', number_of_risks: 0, si_gross: 0, si_net: 0, si_qs: 0, si_first_surplus: 0, si_fac: 0, prem_gross: 0, prem_net: 0, prem_qs: 0, prem_first_surplus: 0, prem_fac: 0 }]);
  const onRemoveRow = (i: number) => setRows(prev => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));

  function applyGrid(grid: string[][]) {
    if (!grid.length) return;
    const looksLikeHeader = grid[0]?.[0]?.toLowerCase?.().includes('policy') || grid[0]?.[2]?.toLowerCase?.().includes('gross');
    const start = looksLikeHeader ? 1 : 0;
    const next = rows.map(r => ({ ...r }));
    for (let i = 0; i < Math.min(grid.length - start, next.length); i++) {
      const src = grid[start + i];
      if (!src) continue;
      const mapIdx = (j: number) => src[j] ?? '';
      const num = (s: string) => (s === '' ? 0 : Number(s));
      next[i] = {
        policy_description: String(mapIdx(0) ?? ''),
        number_of_risks: num(mapIdx(1)),
        si_gross: num(mapIdx(2)),
        si_net: num(mapIdx(3)),
        si_qs: num(mapIdx(4)),
        si_first_surplus: num(mapIdx(5)),
        si_fac: num(mapIdx(6)),
        prem_gross: num(mapIdx(7)),
        prem_net: num(mapIdx(8)),
        prem_qs: num(mapIdx(9)),
        prem_first_surplus: num(mapIdx(10)),
        prem_fac: num(mapIdx(11)),
      } as Row;
    }
    setRows(next);
  }

  const totals = useMemo(() => {
    return rows.reduce((acc, r) => ({
      number_of_risks: acc.number_of_risks + (r.number_of_risks || 0),
      si_gross: acc.si_gross + (r.si_gross || 0),
      si_net: acc.si_net + (r.si_net || 0),
      si_qs: acc.si_qs + (r.si_qs || 0),
      si_first_surplus: acc.si_first_surplus + (r.si_first_surplus || 0),
      si_fac: acc.si_fac + (r.si_fac || 0),
      prem_gross: acc.prem_gross + (r.prem_gross || 0),
      prem_net: acc.prem_net + (r.prem_net || 0),
      prem_qs: acc.prem_qs + (r.prem_qs || 0),
      prem_first_surplus: acc.prem_first_surplus + (r.prem_first_surplus || 0),
      prem_fac: acc.prem_fac + (r.prem_fac || 0),
    }), { number_of_risks: 0, si_gross: 0, si_net: 0, si_qs: 0, si_first_surplus: 0, si_fac: 0, prem_gross: 0, prem_net: 0, prem_qs: 0, prem_first_surplus: 0, prem_fac: 0 });
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="rounded shadow p-4 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Motor Fleet List</h3>
          <div className="flex gap-2">
            <button type="button" className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => setShowPaste(true)}>Paste from Excel</button>
          </div>
        </div>
        <FormTable<Row>
          columns={columns as any}
          rows={rows}
          onChange={onChange}
          onAddRow={onAddRow}
          onRemoveRow={onRemoveRow}
        />
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>Risks: {totals.number_of_risks.toLocaleString()}</div>
          <div>SI Gross: {totals.si_gross.toLocaleString()}</div>
          <div>SI Net: {totals.si_net.toLocaleString()}</div>
          <div>Premium Gross: {totals.prem_gross.toLocaleString()}</div>
          <div>Premium Net: {totals.prem_net.toLocaleString()}</div>
        </div>
  {/* CSV import removed */}
  <PasteModal open={showPaste} onClose={() => setShowPaste(false)} onApply={applyGrid} expectedColumns={12} title="Paste Motor Fleet List" />
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
