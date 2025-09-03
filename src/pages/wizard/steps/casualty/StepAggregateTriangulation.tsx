import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import FormTable from '../../../../components/FormTable';
import PasteModal from '../../../../components/PasteModal';
import { supabase } from '../../../../lib/supabase';
import { useAutosave } from '../../../../hooks/useAutosave';
// CSV import removed per requirements

// Aggregate Triangulation (Casualty)
// 6 triangles in order as per screenshots:
// 1) Written Premium, 2) Number of Losses, 3) Paid Losses, 4) Loss Reserves, 5) Paid Losses (contd), 6) Loss Reserves (contd)
// UX: Render six sections with a Year column and dev columns 12-120 months (12m steps).
// Data model: store entire payload in sheet_blobs with sheet_name = 'Aggregate Triangulation (Casualty)'.

type Grid = number[][]; // rows x devCols

type SectionKey = 'written_premium' | 'number_of_losses' | 'paid_losses_1' | 'loss_reserves_1' | 'incurred_losses' | 'loss_reserves_2';

const LABELS: Record<SectionKey, string> = {
  written_premium: 'Written Premium',
  number_of_losses: 'Number of Losses',
  paid_losses_1: 'Paid Losses',
  loss_reserves_1: 'Loss Reserves',
  incurred_losses: 'Incurred Losses',
  loss_reserves_2: 'W/I L/R in%'
};

export default function StepAggregateTriangulation() {
  const { submissionId } = useParams();
  const [years, setYears] = useState<number[]>([1890,1891,1892,1893,1894,1895,1896,1897,1898,1899]);
  const [devMonths, setDevMonths] = useState<number[]>([12,24,36,48,60,72,84,96,108,120]);
  const [sections, setSections] = useState<Record<SectionKey, Grid>>({
    written_premium: Array(years.length).fill(0).map(() => new Array(10).fill(0)),
    number_of_losses: Array(years.length).fill(0).map(() => new Array(10).fill(0)),
    paid_losses_1: Array(years.length).fill(0).map(() => new Array(10).fill(0)),
    loss_reserves_1: Array(years.length).fill(0).map(() => new Array(10).fill(0)),
    incurred_losses: Array(years.length).fill(0).map(() => new Array(10).fill(0)),
    loss_reserves_2: Array(years.length).fill(0).map(() => new Array(10).fill(0)),
  });
  const [pasteOpenFor, setPasteOpenFor] = useState<SectionKey | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load
  useEffect(() => {
    (async () => {
      if (!submissionId) return;
      const { data } = await supabase
        .from('sheet_blobs')
        .select('data')
        .eq('submission_id', submissionId)
        .eq('sheet_name', 'Aggregate Triangulation (Casualty)')
        .maybeSingle();
      const payload = (data as any)?.data as any | undefined;
      if (payload) {
        setYears(payload.years ?? years);
        setDevMonths(payload.devMonths ?? devMonths);
        setSections(payload.sections ?? sections);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId]);

  // Autosave
  useAutosave({ years, devMonths, sections }, async (val) => {
    if (!submissionId) return;
    await supabase
      .from('sheet_blobs')
      .upsert({ submission_id: submissionId, sheet_name: 'Aggregate Triangulation (Casualty)', data: val, updated_at: new Date().toISOString() }, { onConflict: 'submission_id,sheet_name' });
    setLastSaved(new Date());
  });

  // Helpers for table rendering
  const columns = useMemo(() => [{ key: 'year', label: 'Year' }, ...devMonths.map((m) => ({ key: String(m), label: `${m} months`, type: 'number', step: '0.01', min: 0 }))], [devMonths]);

  function getRows(grid: Grid) {
    return years.map((y, rIdx) => ({ year: y, ...Object.fromEntries(devMonths.map((m, cIdx) => [String(m), grid[rIdx]?.[cIdx] ?? 0])) }));
  }

  function setCell(key: SectionKey, row: number, colKey: string, value: any) {
    const c = devMonths.indexOf(Number(colKey)); if (c < 0) return;
    setSections((prev) => {
      const copy: Record<SectionKey, Grid> = { ...prev } as any;
      const g = copy[key].map((r) => r.slice());
      while (g.length < years.length) g.push(new Array(devMonths.length).fill(0));
      const rowArr = g[row] ?? (g[row] = new Array(devMonths.length).fill(0));
      while (rowArr.length < devMonths.length) rowArr.push(0);
      rowArr[c] = value === '' ? 0 : Number(value);
      copy[key] = g;
      return copy;
    });
  }

  function applyPaste(key: SectionKey, data: string[][]) {
    if (!data.length) return;
    setSections((prev) => {
      const copy: Record<SectionKey, Grid> = { ...prev } as any;
      const g = years.map(() => new Array(devMonths.length).fill(0));
      for (let r = 0; r < Math.min(data.length, years.length); r++) {
        const row = data[r] ?? [];
        const rArr = g[r] ?? (g[r] = new Array(devMonths.length).fill(0));
        for (let c = 0; c < Math.min(row.length, devMonths.length); c++) rArr[c] = Number(row[c] ?? 0) || 0;
      }
      copy[key] = g;
      return copy;
    });
  }

  const Section = ({ sk }: { sk: SectionKey }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">{LABELS[sk]}</h4>
        <div className="text-xs text-gray-500">{lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Autosave ready'}</div>
      </div>
      <FormTable<any>
        columns={columns as any}
        rows={getRows(sections[sk])}
    onChange={(r, key, value) => {
      if (key === 'year') {
            setYears((prev) => {
              const arr = prev.slice();
              if (r < 0 || r >= arr.length) return arr;
              const current = prev[r] ?? 0;
        const num = Number(value);
        arr[r] = Number.isFinite(num) ? num : current;
        return arr;
            });
          } else {
            setCell(sk, r, key as string, value);
          }
        }}
  onPaste={() => setPasteOpenFor(sk)}
      />
    </div>
  );

  return (
    <div className="space-y-8">
      {(['written_premium','number_of_losses','paid_losses_1','loss_reserves_1','incurred_losses','loss_reserves_2'] as SectionKey[]).map((sk) => (
        <Section key={sk} sk={sk} />
      ))}

      <PasteModal
        open={pasteOpenFor !== null}
        onClose={() => setPasteOpenFor(null)}
        title="Paste triangle rows (values only)"
        onApply={(rows) => { if (pasteOpenFor) applyPaste(pasteOpenFor, rows); setPasteOpenFor(null); }}
      />
    </div>
  );
}
