import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { z } from 'zod';
import FormTable from '../../../../components/FormTable';
import PasteModal from '../../../../components/PasteModal';
import { supabase } from '../../../../lib/supabase';
import { useAutosave } from '../../../../hooks/useAutosave';
import { chunkedSave } from '../../../../utils/chunkedSave';

type Measure = 'paid' | 'incurred' | 'count';

const CellSchema = z.object({ origin_year: z.number().int(), dev_months: z.number().int(), value: z.number().nonnegative().default(0) });
type Cell = z.infer<typeof CellSchema>;

export default function StepTriangulation() {
  const { submissionId } = useParams();
  const [measure, setMeasure] = useState<Measure>('paid');
  const [devEnd, setDevEnd] = useState(120);
  const [originStart, setOriginStart] = useState(2015);
  const [originEnd, setOriginEnd] = useState(new Date().getFullYear());
  const [grid, setGrid] = useState<Record<number, Record<number, number | ''>>>({}); // origin_year -> dev -> value
  const [pasteOpen, setPasteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const devColumns = useMemo(() => { const a:number[]=[]; for(let m=0;m<=devEnd;m+=3) a.push(m); return a; }, [devEnd]);
  const originYears = useMemo(() => { const out:number[]=[]; for(let y=originStart;y<=originEnd;y++) out.push(y); return out; }, [originStart, originEnd]);

  useEffect(() => {
    (async () => {
      if (!submissionId) return;
      const { data, error } = await supabase
        .from('triangle_values')
        .select('*')
        .eq('submission_id', submissionId)
        .eq('sheet_name', 'Triangulation');
      if (error) return;
      const next: Record<number, Record<number, number>> = {};
      (data || []).forEach((r: any) => {
        if (r.measure !== measure) return;
        const oy = Number(r.origin_year);
        const dm = Number(r.dev_months);
        if (!Number.isFinite(oy) || !Number.isFinite(dm)) return;
        if (!next[oy]) next[oy] = {};
        (next[oy] as Record<number, number>)[dm] = Number(r.value) || 0;
      });
      setGrid(next);
    })();
  }, [submissionId]);

  useAutosave({ measure, grid, originYears, devColumns }, async (val) => {
    if (!submissionId) return;
    setSaving(true);
    await supabase.from('triangle_values').delete()
      .eq('submission_id', submissionId)
      .eq('sheet_name', 'Triangulation')
      .eq('measure', val.measure);
    const rows: any[] = [];
    for (const y of val.originYears) {
      for (const m of val.devColumns) {
        const v = val.grid[y]?.[m];
        if (v !== undefined && v !== '') {
          rows.push({ submission_id: submissionId, sheet_name: 'Triangulation', measure: val.measure, origin_year: y, dev_months: m, value: Number(v) || 0 });
        }
      }
    }
    await chunkedSave(rows, 500, async (chunk) => { await supabase.from('triangle_values').insert(chunk); });
    setSaving(false);
    setLastSaved(new Date());
  });

  const columns = useMemo(() => [{ key: 'origin_year', label: 'Origin Year' }, ...devColumns.map(m => ({ key: String(m), label: `Dev ${m}`, type: 'number', step: '0.01', min: 0 }))], [devColumns]);
  const rows = originYears.map(y => devColumns.reduce<any>((acc, m) => { acc.origin_year = y; acc[String(m)] = grid[y]?.[m] ?? ''; return acc; }, {}));
  const onChange = (idx: number, key: string, value: any) => {
    const y = Number(originYears[idx]);
    if (!Number.isFinite(y) || key === 'origin_year') return;
    const m = Number(key);
    setGrid(prev => {
      const row: Record<number, number | ''> = { ...(prev[y] || {}) };
      row[m] = value === '' ? '' : Number(value);
      return { ...prev, [y]: row } as Record<number, Record<number, number | ''>>;
    });
  };

  const totalsRow = useMemo(() => {
    const sumPerDev = devColumns.map(m => originYears.reduce((s, y) => s + (Number(grid[y]?.[m]) || 0), 0));
    const total = sumPerDev.reduce((a, b) => a + b, 0);
    return { sumPerDev, total };
  }, [grid, devColumns, originYears]);

  return (
    <div>
      <div className="flex flex-wrap gap-3 items-center mb-3">
        <h3 className="font-semibold">Triangulation</h3>
        <select className="border rounded px-2 py-1" value={measure} onChange={(e) => setMeasure(e.target.value as Measure)}>
          <option value="paid">Paid</option>
          <option value="incurred">Incurred</option>
          <option value="count">Count</option>
        </select>
        <label className="text-sm">Dev end (months)
          <input className="ml-2 border rounded px-2 py-1 w-24" type="number" value={devEnd} step={3} min={0} onChange={(e) => setDevEnd(Number(e.target.value))} />
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
        footerRender={<div className="text-sm">Grand total: {totalsRow.total.toLocaleString()}</div>}
      />
      <PasteModal open={pasteOpen} onClose={() => setPasteOpen(false)} title="Paste triangle for selected measure"
        onApply={(data) => {
          // Assume first col is origin_year, remaining are devs left->right
          setGrid(prev => {
            const copy = { ...prev } as typeof prev;
            data.forEach(row => {
              const y = Number(row[0]);
              if (!Number.isFinite(y)) return;
              const current = (copy[y] || {}) as Record<number, number | ''>;
              for (let i = 1; i < row.length && (i - 1) < devColumns.length; i++) {
                const m = Number(devColumns[i - 1]);
                if (!Number.isFinite(m)) continue;
                const v = Number(row[i]);
                if (!Number.isNaN(v)) current[m] = v;
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
