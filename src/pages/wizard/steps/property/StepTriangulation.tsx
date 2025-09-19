import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import FormTable from '../../../../components/FormTable';
import PasteModal from '../../../../components/PasteModal';
import { useAutosave } from '../../../../hooks/useAutosave';
import { parseCsv } from '../../../../utils/csv';
import { toNumberStrict } from '../../../../utils/clipboard';
import { getPropertyTriangle, replacePropertyTriangle, upsertPropertyTriangleCell, type TriangleRow, type TriangleMeasure } from '../../../../lib/triangles';

// Aggregate Triangulation (Property)
// Mirrors the Casualty version: six sections rendered with Year + development months (12-120).
// Data model: normalized rows in property_aggregate_triangle_values with autosave per cell.

type Cell = number | '';
type Grid = Cell[][]; // rows x devCols

type SectionKey = 'written_premium' | 'number_of_losses' | 'paid_losses' | 'loss_reserves' | 'incurred_losses' | 'wi_lr_pct';

const LABELS: Record<SectionKey, string> = {
  written_premium: 'Written Premium',
  number_of_losses: 'Number of Losses',
  paid_losses: 'Paid Losses',
  loss_reserves: 'Loss Reserves',
  incurred_losses: 'Incurred Losses',
  wi_lr_pct: 'W/I L/R (0-1)'
};

export default function StepTriangulation() {
  const { submissionId } = useParams();
  const [years, setYears] = useState<Array<number | ''>>([]);
  const [devMonths, setDevMonths] = useState<number[]>([12,24,36,48,60,72,84,96,108,120]);
  const [sections, setSections] = useState<Record<SectionKey, Grid>>({
    written_premium: [],
    number_of_losses: [],
    paid_losses: [],
    loss_reserves: [],
    incurred_losses: [],
    wi_lr_pct: [],
  });
  const [pasteOpenFor, setPasteOpenFor] = useState<SectionKey | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  type PendingEdit = { measure: TriangleMeasure; uw_year: number; development_months: number; value: number | null };
  const [pending, setPending] = useState<PendingEdit[]>([]);

  // Load
  useEffect(() => {
    (async () => {
      if (!submissionId) return;
      setLoading(true);
      try {
        const rows = await getPropertyTriangle(submissionId);
        // derive years and dev months from data if present
        const yearsSet = new Set<number>();
        const devSet = new Set<number>();
        rows.forEach((r) => { yearsSet.add(r.uw_year); devSet.add(r.development_months); });
        const yearsArr = Array.from(yearsSet).sort((a,b)=>a-b);
        const devArr = Array.from(devSet).sort((a,b)=>a-b);
        if (yearsArr.length) setYears(yearsArr);
        if (devArr.length) setDevMonths(devArr);
        // build grids per measure
        const byMeasure: Record<SectionKey, Grid> = {
          written_premium: [], number_of_losses: [], paid_losses: [], loss_reserves: [], incurred_losses: [], wi_lr_pct: []
        };
        const yearIdx = new Map<number, number>();
        const yrs = yearsArr.length ? yearsArr : years.filter((y): y is number => typeof y === 'number');
        yrs.forEach((y, i) => yearIdx.set(y, i));
        const devIdx = new Map<number, number>();
        const devs = (devArr.length ? devArr : devMonths);
        devs.forEach((d, i) => devIdx.set(d, i));
        (Object.keys(byMeasure) as SectionKey[]).forEach((m) => {
          byMeasure[m] = new Array(yrs.length).fill(null).map(() => new Array(devs.length).fill(''));
        });
        rows.forEach((r) => {
          const m = r.measure as SectionKey;
          const ri = yearIdx.get(r.uw_year); const ci = devIdx.get(r.development_months);
          if (ri === undefined || ci === undefined) return;
          (byMeasure[m]![ri]![ci] as any) = r.value ?? '';
        });
        setSections(byMeasure);
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId]);

  // Autosave pending edits to relational table
  useAutosave(pending, async (items) => {
    if (!submissionId || !items.length) return;
    // keep last edit per key
    const map = new Map<string, PendingEdit>();
    for (const it of items) {
      const k = `${it.measure}|${it.uw_year}|${it.development_months}`;
      map.set(k, it);
    }
    const todo = Array.from(map.values());
    for (const e of todo) {
      await upsertPropertyTriangleCell({
        submissionId,
        measure: e.measure as TriangleMeasure,
        uwYear: e.uw_year,
        developmentMonths: e.development_months,
        value: e.value,
      });
    }
    setLastSaved(new Date());
    setPending([]);
  }, 900, true);

  // Helpers for table rendering
  const columns = useMemo(() => [{ key: 'year', label: 'Year', type: 'number' as const }, ...devMonths.map((m) => ({ key: String(m), label: `${m} months`, type: 'number' as const, step: '0.01', min: 0 }))], [devMonths]);

  function getRows(grid: Grid) {
    const rowCount = Math.max(years.length, grid.length);
    return new Array(rowCount).fill(null).map((_, rIdx) => ({
      year: years[rIdx] ?? '',
      ...Object.fromEntries(devMonths.map((m, cIdx) => [String(m), grid[rIdx]?.[cIdx] ?? '']))
    }));
  }

  function setCell(key: SectionKey, row: number, colKey: string, value: any) {
    const c = devMonths.indexOf(Number(colKey)); if (c < 0) return;
    setSections((prev) => {
      const copy: Record<SectionKey, Grid> = { ...prev } as any;
      const g = (copy[key] ?? []).map((r) => r.slice());
      const needed = Math.max(years.length, row + 1);
      while (g.length < needed) g.push(new Array(devMonths.length).fill(''));
      const rowArr = g[row] ?? (g[row] = new Array(devMonths.length).fill(''));
      while (rowArr.length < devMonths.length) rowArr.push('');
      const v = value === '' ? '' : toNumberStrict(String(value));
      rowArr[c] = v;
      copy[key] = g;
      return copy;
    });
    const yr = years[row];
    const uwYear = typeof yr === 'number' ? yr : undefined;
    if (submissionId && uwYear !== undefined) {
      setPending((prev) => [
        ...prev,
        { measure: key as TriangleMeasure, uw_year: uwYear, development_months: Number(colKey), value: (value === '' ? null : Number(toNumberStrict(String(value)))) },
      ]);
    }
  }

  function applyPaste(key: SectionKey, data: string[][]) {
    if (!data.length) return;
    // Determine if first column is Year, and whether first row is a header.
    const cellText = (r: number, c: number) => (data[r]?.[c] ?? '').toString();
    const hasHeader = /year/i.test(cellText(0, 0));
    const startRow = hasHeader ? 1 : 0;
    const firstDataCell = cellText(startRow, 0);
    const firstYearCandidate = toNumberStrict(firstDataCell);
    const looksLikeYear = Number.isFinite(firstYearCandidate) && firstYearCandidate >= 1800 && firstYearCandidate <= 2200;
    const colOffset = looksLikeYear ? 1 : 0;

    const dataRows = data.slice(startRow);
    const neededRows = Math.max(years.length, dataRows.length);
    let newYears: Array<number | ''> = years.slice();
    if (colOffset === 1) {
      newYears = new Array(dataRows.length).fill('');
      for (let r = 0; r < dataRows.length; r++) {
        const yrCell = dataRows[r]?.[0];
        const parsed = yrCell == null || yrCell === '' ? '' : toNumberStrict(yrCell);
        newYears[r] = (typeof parsed === 'number' && parsed >= 1800 && parsed <= 2200) ? parsed : '';
      }
      setYears(newYears);
    } else {
      while (newYears.length < neededRows) newYears.push('');
      setYears(newYears);
    }

    // Build grid and prepare rows for RPC
    const g: Grid = new Array(neededRows).fill(null).map(() => new Array(devMonths.length).fill(''));
    const rows: TriangleRow[] = [];
    for (let r = 0; r < Math.min(dataRows.length, neededRows); r++) {
      const row = dataRows[r] ?? [];
      const yr = newYears[r];
      if (typeof yr !== 'number') continue;
      for (let c = 0; c < devMonths.length; c++) {
        const src = row[colOffset + c];
        const val = src == null || src === '' ? '' : toNumberStrict(src);
        g[r]![c] = val;
        if (val !== '') {
          rows.push({ measure: key as TriangleMeasure, uw_year: yr, development_months: devMonths[c]!, value: Number(val) });
        }
      }
    }
    setSections((prev) => ({ ...prev, [key]: g } as any));
    if (submissionId && rows.length) {
      // Upsert only provided rows, do not delete others by default
      replacePropertyTriangle({ submissionId, rows, deleteMissing: false }).then(() => setLastSaved(new Date()));
    }
  }

  const onAddRow = () => {
    setYears((prev) => [...prev, '']);
    setSections((prev) => {
      const next = { ...prev } as Record<SectionKey, Grid>;
      (Object.keys(next) as SectionKey[]).forEach((k) => {
        next[k] = [...(next[k] ?? []), new Array(devMonths.length).fill('')];
      });
      return next;
    });
  };

  const onRemoveRow = (idx: number) => {
    setYears((prev) => prev.filter((_, i) => i !== idx));
    setSections((prev) => {
      const next = { ...prev } as Record<SectionKey, Grid>;
      (Object.keys(next) as SectionKey[]).forEach((k) => {
        next[k] = (next[k] ?? []).filter((_, i) => i !== idx);
      });
      return next;
    });
  };

  function exportSectionJSON(sk: SectionKey) {
    const rows: TriangleRow[] = [];
    for (let r = 0; r < years.length; r++) {
      const yr = years[r]; if (typeof yr !== 'number') continue;
      for (let c = 0; c < devMonths.length; c++) {
        const v = sections[sk]?.[r]?.[c];
        if (v !== '' && v != null) rows.push({ measure: sk as TriangleMeasure, uw_year: yr, development_months: devMonths[c]!, value: Number(v) });
      }
    }
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${sk}-triangle.json`; a.click();
    URL.revokeObjectURL(url);
  }

  const Section = ({ sk }: { sk: SectionKey }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">{LABELS[sk]}</h4>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700"
            onClick={() => exportSectionJSON(sk)}
            title="Export section as JSON"
          >
            Export JSON
          </button>
          <div className="text-xs text-gray-500">{loading ? 'Loading…' : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Autosave ready'}</div>
        </div>
      </div>
      <FormTable<any>
        columns={columns as any}
        rows={getRows(sections[sk])}
        onChange={(r, key, value) => {
          if (key === 'year') {
            setYears((prev) => {
              const arr = prev.slice();
              if (r < 0 || r >= arr.length) return arr;
              if (value === '') { arr[r] = ''; return arr; }
              const num = Number(value);
              const cur = arr[r] as number | '';
              arr[r] = Number.isFinite(num) ? (num as number) : cur;
              return arr;
            });
          } else {
            setCell(sk, r, key as string, value);
          }
        }}
        onAddRow={onAddRow}
        onRemoveRow={(idx) => onRemoveRow(idx)}
        onPaste={() => setPasteOpenFor(sk)}
        onImportCsv={() => {
          const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.csv,text/csv';
          inp.onchange = async () => { const f = inp.files?.[0]; if (!f) return; const txt = await f.text(); applyPaste(sk, parseCsv(txt)); };
          inp.click();
        }}
      />
    </div>
  );

  return (
    <div className="space-y-8">
      {(['written_premium','number_of_losses','paid_losses','loss_reserves','incurred_losses','wi_lr_pct'] as SectionKey[]).map((sk) => (
        <Section key={sk} sk={sk} />
      ))}

      <PasteModal
        open={pasteOpenFor !== null}
        onClose={() => setPasteOpenFor(null)}
        title="Paste rows (Year column optional)"
        onApply={(rows) => { if (pasteOpenFor) applyPaste(pasteOpenFor, rows); setPasteOpenFor(null); }}
      />
    </div>
  );
}
