import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import FormTable from '../../../../components/FormTable';
import PasteModal from '../../../../components/PasteModal';
import { supabase } from '../../../../lib/supabase';
import { useAutosave } from '../../../../hooks/useAutosave';
import { chunkedSave } from '../../../../utils/chunkedSave';

// Simple triangle editor for CAT losses (Casualty)
// Storage: triangle_values table with sheet_name = 'CAT Loss Triangulation (Casualty)'
// Dimensions: Origin years (rows) x Dev months 0..120 step 12 by default; supports paste/import/export and autosave

 type Measure = 'paid' | 'reserved' | 'incurred' | 'count';

export default function StepCatLossTriangulationCasualty() {
  const { submissionId } = useParams();
  const [measure, setMeasure] = useState<Measure>('paid');
  const [devStep, setDevStep] = useState<number>(12);
  const [devEnd, setDevEnd] = useState<number>(120);
  const [originStart, setOriginStart] = useState<number>(new Date().getFullYear() - 9);
  const [originEnd, setOriginEnd] = useState<number>(new Date().getFullYear());
  const [grid, setGrid] = useState<Record<number, Record<number, number | ''>>>({});
  const [pasteOpen, setPasteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const SHEET = 'CAT Loss Triangulation (Casualty)';

  const devColumns = useMemo(() => {
    const arr:number[]=[]; for (let m = 0; m <= devEnd; m += devStep) arr.push(m); return arr;
  }, [devEnd, devStep]);
  const originYears = useMemo(() => {
    const out:number[]=[]; for (let y = originStart; y <= originEnd; y++) out.push(y); return out;
  }, [originStart, originEnd]);

  // Load existing values for current measure
  useEffect(() => {
    (async () => {
      if (!submissionId) return;
      const { data, error } = await supabase
        .from('triangle_values')
        .select('origin_year,dev_months,value,measure')
        .eq('submission_id', submissionId)
        .eq('sheet_name', SHEET)
        .eq('measure', measure);
      if (error) return;
      const next: Record<number, Record<number, number>> = {};
      (data || []).forEach((r: any) => {
        const oy = Number(r.origin_year); const dm = Number(r.dev_months);
        if (!Number.isFinite(oy) || !Number.isFinite(dm)) return;
        next[oy] = next[oy] || {}; (next[oy] as any)[dm] = Number(r.value) || 0;
      });
      setGrid(next);
    })();
  }, [submissionId, measure, SHEET]);

  // Autosave slice
  useAutosave({ grid, devColumns, originYears, measure }, async (val) => {
    if (!submissionId) return;
    setSaving(true);
    await supabase.from('triangle_values')
      .delete()
      .eq('submission_id', submissionId)
      .eq('sheet_name', SHEET)
      .eq('measure', val.measure);
    const rows: any[] = [];
    for (const y of val.originYears) {
      for (const m of val.devColumns) {
        const v = val.grid[y]?.[m];
        if (v !== undefined && v !== '') rows.push({ submission_id: submissionId, sheet_name: SHEET, measure: val.measure, origin_year: y, dev_months: m, value: Number(v) || 0 });
      }
    }
    await chunkedSave(rows, 400, async (chunk) => { await supabase.from('triangle_values').insert(chunk); });
    setSaving(false);
    setLastSaved(new Date());
  });

  const columns = useMemo(() => [
    { key: 'origin_year', label: 'Origin Year' },
    ...devColumns.map(m => ({ key: String(m), label: `Dev ${m}`, type: 'number', step: '0.01', min: 0 }))
  ], [devColumns]);
  const rows = originYears.map(y => devColumns.reduce<any>((acc, m) => { acc.origin_year = y; (acc as any)[String(m)] = grid[y]?.[m] ?? ''; return acc; }, {}));
  const onChange = (idx: number, key: string, value: any) => {
    const y = Number(originYears[idx]); if (!Number.isFinite(y) || key === 'origin_year') return; const m = Number(key);
    setGrid(prev => ({ ...prev, [y]: { ...(prev[y] || {}), [m]: value === '' ? '' : Number(value) } }));
  };

  const totals = useMemo(() => devColumns.reduce((s, m) => s + originYears.reduce((t, y) => t + (Number(grid[y]?.[m]) || 0), 0), 0), [devColumns, originYears, grid]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <h3 className="font-semibold">CAT Loss Triangulation</h3>
        <select className="border rounded px-2 py-1" value={measure} onChange={(e) => setMeasure(e.target.value as Measure)}>
          <option value="paid">Paid</option>
          <option value="reserved">Reserved</option>
          <option value="incurred">Incurred</option>
          <option value="count">Count</option>
        </select>
        <label className="text-sm">Dev step
          <input className="ml-2 border rounded px-2 py-1 w-20" type="number" value={devStep} min={1} step={1} onChange={(e) => setDevStep(Math.max(1, Number(e.target.value)))} />
        </label>
        <label className="text-sm">Dev end
          <input className="ml-2 border rounded px-2 py-1 w-24" type="number" value={devEnd} min={0} step={devStep} onChange={(e) => setDevEnd(Number(e.target.value))} />
        </label>
        <label className="text-sm">Origin start
          <input className="ml-2 border rounded px-2 py-1 w-24" type="number" value={originStart} onChange={(e) => setOriginStart(Number(e.target.value))} />
        </label>
        <label className="text-sm">Origin end
          <input className="ml-2 border rounded px-2 py-1 w-24" type="number" value={originEnd} onChange={(e) => setOriginEnd(Number(e.target.value))} />
        </label>
        <div className="ml-auto text-xs text-gray-500">{saving ? 'Saving…' : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : ''}</div>
      </div>
      <FormTable<any>
        columns={columns as any}
        rows={rows}
        onChange={onChange as any}
        onPaste={() => setPasteOpen(true)}
        footerRender={<div className="text-sm">Grand total: {totals.toLocaleString()}</div>}
      />
      <PasteModal open={pasteOpen} onClose={() => setPasteOpen(false)} title="Paste CAT loss triangle"
        onApply={(data) => {
          setGrid(prev => {
            const copy = { ...prev } as typeof prev;
            data.forEach(row => {
              const y = Number(row[0]); if (!Number.isFinite(y)) return;
              const current = { ...(copy[y] || {}) } as Record<number, number | ''>;
              for (let i = 1; i < row.length && (i - 1) < devColumns.length; i++) {
                const m = Number(devColumns[i - 1]); const v = Number(row[i]); if (!Number.isNaN(v)) current[m] = v;
              }
              copy[y] = current as any;
            });
            return copy;
          });
        }}
      />
    </div>
  );
}
