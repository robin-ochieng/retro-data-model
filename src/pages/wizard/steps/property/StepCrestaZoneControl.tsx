import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../../../lib/supabase';
import { useAutosave } from '../../../../hooks/useAutosave';
import { getCresta, replaceCrestaSection, upsertCrestaCell } from '../../../../lib/cresta';
import PasteModal from '../../../../components/PasteModal';
import { NumberCell } from '../../../../components/table/NumberCell';
import { parseNumericInput } from '../../../../lib/formatUtils';
import { useViewMode } from '../../../../context/ViewMode';

type Pair = { gross: number; net: number };
type Row = { zone: number | 'Unallocated'; zone_description: string; values: Record<string, Pair> };
type TableDef = { key: keyof State; title: string; categories: { key: string; label: string }[] };

type State = {
  sum_insured: SimpleRow[];
  personal: Row[];
  commercial: Row[];
  industrial: Row[];
  engineering: Row[];
};

type SimpleRow = { zone: number | 'Unallocated'; zone_description: string; gross: number; net: number };

const PERSONAL_CATEGORIES = [
  { key: 'buildings', label: 'Buildings' },
  { key: 'content', label: 'Content' },
  { key: 'buildings_contents', label: 'Buildings/Contents' },
  { key: 'motor', label: 'Motor' },
  { key: 'others', label: 'Others' },
] as const;

const COMMERCIAL_CATEGORIES = [
  { key: 'buildings', label: 'Buildings' },
  { key: 'content', label: 'Content' },
  { key: 'buildings_contents', label: 'Buildings/Contents' },
  { key: 'motor', label: 'Motor' },
  { key: 'bi', label: 'BI' },
  { key: 'others', label: 'Others' },
] as const;

const INDUSTRIAL_CATEGORIES = [
  { key: 'buildings', label: 'Buildings' },
  { key: 'content', label: 'Content' },
  { key: 'buildings_contents', label: 'Buildings/Contents' },
  { key: 'motor', label: 'Motor' },
  { key: 'bi', label: 'BI' },
  { key: 'others', label: 'Others' },
] as const;

const ENGINEERING_CATEGORIES = [
  { key: 'engineering', label: 'Engineering' },
] as const;

const TABLES: TableDef[] = [
  { key: 'personal', title: 'Personal Lines', categories: PERSONAL_CATEGORIES as any },
  { key: 'commercial', title: 'Commercial Lines', categories: COMMERCIAL_CATEGORIES as any },
  { key: 'industrial', title: 'Industrial', categories: INDUSTRIAL_CATEGORIES as any },
  { key: 'engineering', title: 'Engineering', categories: ENGINEERING_CATEGORIES as any },
];

function makeDefaultRows(categories: readonly { key: string; label: string }[]): Row[] {
  const mkValues = (): Record<string, Pair> => Object.fromEntries(categories.map(c => [c.key, { gross: 0, net: 0 }])) as Record<string, Pair>;
  const arr: Row[] = [];
  for (let i = 1; i <= 19; i++) arr.push({ zone: i, zone_description: '', values: mkValues() });
  arr.push({ zone: 'Unallocated', zone_description: '', values: mkValues() });
  return arr;
}

function makeSimpleRows(): SimpleRow[] {
  const arr: SimpleRow[] = [];
  for (let i = 1; i <= 19; i++) arr.push({ zone: i, zone_description: '', gross: 0, net: 0 });
  arr.push({ zone: 'Unallocated', zone_description: '', gross: 0, net: 0 });
  return arr;
}

export default function StepCrestaZoneControl() {
  const { submissionId } = useParams();
  const isViewMode = useViewMode();
  const [state, setState] = useState<State>({
    sum_insured: makeSimpleRows(),
    personal: makeDefaultRows(PERSONAL_CATEGORIES),
    commercial: makeDefaultRows(COMMERCIAL_CATEGORIES),
    industrial: makeDefaultRows(INDUSTRIAL_CATEGORIES),
    engineering: makeDefaultRows(ENGINEERING_CATEGORIES),
  });
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [pasteTarget, setPasteTarget] = useState<keyof State | null>(null);

  // Load normalized values and map into UI state
  useEffect(() => {
    (async () => {
      if (!submissionId) return;
      const rows = await getCresta(submissionId);
      if (!rows || rows.length === 0) return; // fresh submission; state remains defaults

      // Build empty shells first
      const next: State = {
        sum_insured: makeSimpleRows(),
        personal: makeDefaultRows(PERSONAL_CATEGORIES),
        commercial: makeDefaultRows(COMMERCIAL_CATEGORIES),
        industrial: makeDefaultRows(INDUSTRIAL_CATEGORIES),
        engineering: makeDefaultRows(ENGINEERING_CATEGORIES),
      };
      const zoneToIndex = (z: number) => (z === 0 ? 19 : Math.max(0, Math.min(18, z - 1)));

      for (const r of rows) {
        const zi = zoneToIndex(r.zone);
        if (r.section === 'sum_insured') {
          const s = next.sum_insured[zi]!;
          next.sum_insured[zi] = {
            zone: s.zone,
            zone_description: r.zone_description ?? '',
            gross: Number(r.gross ?? 0),
            net: Number(r.net ?? 0),
          };
        } else {
          const target = next[r.section as keyof Omit<State,'sum_insured'>] as Row[];
          const row = target[zi]!;
          target[zi] = {
            zone: row.zone,
            zone_description: r.zone_description ?? '',
            values: {
              ...row.values,
              [r.category ?? (r.section === 'engineering' ? 'engineering' : '')]: {
                gross: Number(r.gross ?? 0),
                net: Number(r.net ?? 0),
              },
            },
          };
        }
      }
      setState(next);
    })();
  }, [submissionId]);

  // Per-cell autosave: store last edited payload and flush via RPC
  const [pendingCell, setPendingCell] = useState<null | {
    section: keyof State;
    rowIdx: number;
    category: string | null;
  }>(null);

  const [pendingZoneDesc, setPendingZoneDesc] = useState<null | {
    section: keyof State;
    rowIdx: number;
  }>(null);

  useAutosave(pendingCell, async (cell) => {
    if (!submissionId || !cell) return;
    const zone = cell.rowIdx === 19 ? 0 : cell.rowIdx + 1;
    if (cell.section === 'sum_insured') {
      const r = state.sum_insured[cell.rowIdx]!;
      await upsertCrestaCell({
        submissionId,
        section: 'sum_insured',
        zone,
        category: null,
        zoneDescription: r.zone_description,
        gross: Number(r.gross) || 0,
        net: Number(r.net) || 0,
      });
    } else {
      const rows = state[cell.section] as Row[];
      const row = rows[cell.rowIdx]!;
      const v = row.values[cell.category as string] || { gross: 0, net: 0 };
      await upsertCrestaCell({
        submissionId,
        section: cell.section as any,
        zone,
        category: cell.category,
        zoneDescription: row.zone_description,
        gross: Number(v.gross) || 0,
        net: Number(v.net) || 0,
      });
    }
    setLastSaved(new Date());
  }, 600);

  // Autosave for zone description edits: update all categories for the row
  useAutosave(pendingZoneDesc, async (desc) => {
    if (!submissionId || !desc) return;
    const zone = desc.rowIdx === 19 ? 0 : desc.rowIdx + 1;
    if (desc.section === 'sum_insured') {
      const r = state.sum_insured[desc.rowIdx]!;
      await upsertCrestaCell({
        submissionId,
        section: 'sum_insured',
        zone,
        category: null,
        zoneDescription: r.zone_description,
        gross: Number(r.gross) || 0,
        net: Number(r.net) || 0,
      });
    } else {
      const cats = desc.section === 'personal' ? PERSONAL_CATEGORIES
        : desc.section === 'commercial' ? COMMERCIAL_CATEGORIES
        : desc.section === 'industrial' ? INDUSTRIAL_CATEGORIES
        : ENGINEERING_CATEGORIES;
      const rows = state[desc.section] as Row[];
      const row = rows[desc.rowIdx]!;
      for (const c of cats) {
        const v = row.values[c.key] || { gross: 0, net: 0 };
        await upsertCrestaCell({
          submissionId,
          section: desc.section as any,
          zone,
          category: c.key,
          zoneDescription: row.zone_description,
          gross: Number(v.gross) || 0,
          net: Number(v.net) || 0,
        });
      }
    }
    setLastSaved(new Date());
  }, 600);

  function setZoneDesc(tab: keyof State, rowIdx: number, v: string) {
    setState((prev) => {
      const copy = { ...prev } as State;
      if (tab === 'sum_insured') {
        copy.sum_insured = copy.sum_insured.map((r, i) => (i === rowIdx ? { ...r, zone_description: v } : r));
      } else {
        const rows = (copy[tab] as Row[]).map((r, i) => (i === rowIdx ? { ...r, zone_description: v } : r));
        (copy[tab] as Row[]) = rows;
      }
      return copy;
    });
  setPendingZoneDesc({ section: tab, rowIdx });
  }
  function setCell(tab: Exclude<keyof State, 'sum_insured'>, rowIdx: number, catKey: string, field: keyof Pair, v: number | string) {
    setState((prev) => {
      const copy = { ...prev } as State;
      const rows = (copy[tab] as Row[]).map((r, i) => {
        if (i !== rowIdx) return r;
        const next = { ...r.values[catKey], [field]: v === '' ? 0 : Number(v) } as Pair;
        return { ...r, values: { ...r.values, [catKey]: next } };
      });
      (copy[tab] as Row[]) = rows;
      return copy;
    });
    setPendingCell({ section: tab, rowIdx, category: catKey });
  }

  // Simple table setters
  function setSimpleDesc(rowIdx: number, v: string) {
    setState((prev) => {
      const copy = { ...prev } as State;
      copy.sum_insured = copy.sum_insured.map((r, i) => (i === rowIdx ? { ...r, zone_description: v } : r));
      return copy;
    });
    setPendingCell({ section: 'sum_insured', rowIdx, category: null });
  }
  function setSimpleCell(rowIdx: number, field: keyof Omit<SimpleRow, 'zone' | 'zone_description'>, v: number | string) {
    setState((prev) => {
      const copy = { ...prev } as State;
      copy.sum_insured = copy.sum_insured.map((r, i) => (i === rowIdx ? { ...r, [field]: v === '' ? 0 : Number(v) } : r));
      return copy;
    });
    setPendingCell({ section: 'sum_insured', rowIdx, category: null });
  }

  function totals(rows: Row[], categories: { key: string; label: string }[]) {
    const res: Record<string, Pair> = Object.fromEntries(categories.map(c => [c.key, { gross: 0, net: 0 }])) as Record<string, Pair>;
    for (const r of rows) {
      for (const c of categories) {
        const rv = r.values[c.key];
        res[c.key]!.gross += Number(rv?.gross ?? 0) || 0;
        res[c.key]!.net += Number(rv?.net ?? 0) || 0;
      }
    }
    return res;
  }

  function totalsSimple(rows: SimpleRow[]) {
    return rows.reduce((acc, r) => ({ gross: acc.gross + (Number(r.gross) || 0), net: acc.net + (Number(r.net) || 0) }), { gross: 0, net: 0 });
  }

  // Use parseNumericInput for robust Excel paste support (handles commas, negatives, decimals)
  const toNumber = (s: string | undefined) => {
    return parseNumericInput(s) ?? 0;
  };
  const maybeHasHeader = (cells: string[] = [], expected: string[]) => {
    const lc = cells.map((c) => String(c).trim().toLowerCase());
    let hits = 0;
    expected.forEach((e) => { if (lc.some((c) => c.includes(e))) hits += 1; });
    return hits >= Math.max(2, Math.ceil(expected.length / 2));
  };
  function applyPasteSimple(grid: string[][]) {
    if (!grid || grid.length === 0) return;
    let start = 0;
    const first = grid[0] ?? [];
    if (maybeHasHeader(first, ['zone','description','gross','net'])) start = 1;
    setState((prev) => {
      const copy = { ...prev } as State;
      const rows: SimpleRow[] = copy.sum_insured.slice();
      for (let i = 0; i < rows.length && (i + start) < grid.length; i++) {
        const r = grid[i + start] ?? [];
        let c = 0;
        // Optional zone number present
        if (/^\d+$/.test(String(r[0] ?? ''))) c = 1;
        rows[i] = {
          zone: rows[i]!.zone,
          zone_description: String(r[c + 0] ?? '').trim(),
          gross: toNumber(r[c + 1]),
          net: toNumber(r[c + 2]),
        };
      }
      copy.sum_insured = rows;
      return copy;
    });
    // batch replace using newly parsed grid -> computed rows
    if (submissionId) {
      const rowsNew: Array<{ zone: number; zone_description: string; category: string | null; gross: number; net: number }> = [];
      for (let i = 0; i < 20; i++) {
        const zone = i === 19 ? 0 : i + 1;
        const r = i < grid.length - start ? grid[i + start] ?? [] : [];
        let c = 0;
        if (/^\d+$/.test(String(r[0] ?? ''))) c = 1;
        rowsNew.push({
          zone,
          zone_description: String(r[c + 0] ?? '').trim(),
          category: null,
          gross: toNumber(r[c + 1]),
          net: toNumber(r[c + 2]),
        });
      }
      replaceCrestaSection({ submissionId, section: 'sum_insured', rows: rowsNew }).then(() => setLastSaved(new Date()));
    }
  }
  function applyPasteComplex(key: Exclude<keyof State, 'sum_insured'>, def: { categories: { key: string; label: string }[] }, grid: string[][]) {
    if (!grid || grid.length === 0) return;
    let start = 0;
    const first = grid[0] ?? [];
    const hdrKeywords = ['zone','description','gross','net', ...def.categories.map(c => c.label.toLowerCase().split(/\s+/)).flat()];
    if (maybeHasHeader(first, hdrKeywords)) start = 1;
    setState((prev) => {
      const copy = { ...prev } as State;
      const rows: Row[] = (copy[key] as Row[]).slice();
      for (let i = 0; i < rows.length && (i + start) < grid.length; i++) {
        const r = grid[i + start] ?? [];
        let ci = 0;
        // Optional zone number present
        if (/^\d+$/.test(String(r[0] ?? ''))) ci = 1;
        const desc = String(r[ci++] ?? '').trim();
        const row = rows[i]!;
        const nextValues: Record<string, Pair> = { ...row.values };
        for (const cat of def.categories) {
          const g = toNumber(r[ci++]);
          const n = toNumber(r[ci++]);
          nextValues[cat.key] = { gross: g, net: n };
        }
        rows[i] = { zone: row.zone, zone_description: desc, values: nextValues };
      }
      (copy[key] as Row[]) = rows;
      return copy;
    });
    // batch replace section using parsed grid
    if (submissionId) {
      const rowsArr: Array<{ zone: number; zone_description: string; category: string | null; gross: number; net: number }> = [];
      for (let i = 0; i < 20; i++) {
        const zone = i === 19 ? 0 : i + 1;
        const r = i < grid.length - start ? grid[i + start] ?? [] : [];
        let ci = 0;
        if (/^\d+$/.test(String(r[0] ?? ''))) ci = 1;
        const desc = String(r[ci++] ?? '').trim();
        for (const cat of def.categories) {
          const g = toNumber(r[ci++]);
          const n = toNumber(r[ci++]);
          rowsArr.push({ zone, zone_description: desc, category: cat.key, gross: g, net: n });
        }
      }
      replaceCrestaSection({ submissionId, section: key as any, rows: rowsArr }).then(() => setLastSaved(new Date()));
    }
  }

  const Table = ({ def }: { def: TableDef }) => {
    const rows = state[def.key] as Row[];
    const t = useMemo(() => totals(rows, def.categories), [rows, def.categories]);
    return (
      <div className="overflow-x-auto overscroll-contain bg-white dark:bg-gray-800 rounded shadow p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold">{def.title}</h4>
          {!isViewMode && <button type="button" className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => setPasteTarget(def.key)}>Paste from Excel</button>}
        </div>
        <table className="w-full table-auto border" style={{ tableLayout: 'auto' }}>
          <thead>
            {/* Layer 1: Title row */}
            <tr className="thead-layer-1 thead-sticky">
              <th className="th-tight text-left" colSpan={2 + def.categories.length * 2}>{def.title}</th>
            </tr>
            {/* Layer 2a: Category groups */}
            <tr className="thead-layer-2 thead-sticky">
              <th className="th-tight text-left">Zone</th>
              <th className="th-tight text-left">Zone Description</th>
              {def.categories.map((c) => (
                <th key={`${c.key}-cat`} className="th-tight text-center" colSpan={2}>{c.label}</th>
              ))}
            </tr>
            {/* Layer 2b: Column labels */}
            <tr className="thead-layer-2 thead-sticky">
              <th className="th-tight"></th>
              <th className="th-tight"></th>
              {def.categories.map((c) => (
                <React.Fragment key={`${c.key}-labels`}>
                  <th className="th-tight text-right">Gross (net of Fac)</th>
                  <th className="th-tight text-right">Net</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={String(r.zone)} className="border-t align-top hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-3 py-2 whitespace-nowrap align-top">{typeof r.zone === 'number' ? r.zone : 'Unallocated'}</td>
                <td className="px-3 py-2 whitespace-normal break-words align-top">
                  <input 
                    className="w-full min-w-0 border rounded px-3 py-2" 
                    value={r.zone_description} 
                    onChange={(e) => setZoneDesc(def.key, i, e.target.value)}
                    disabled={isViewMode}
                  />
                </td>
                {def.categories.map((c) => (
                  <React.Fragment key={`${i}-${c.key}-frag`}>
                    <td className="px-3 py-2 text-right whitespace-nowrap align-top">
                      <NumberCell
                        value={r.values[c.key]?.gross ?? 0}
                        onChange={(v) => setCell(def.key as Exclude<keyof State, 'sum_insured'>, i, c.key, 'gross', v ?? 0)}
                        decimals={2}
                        readOnly={isViewMode}
                      />
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap align-top">
                      <NumberCell
                        value={r.values[c.key]?.net ?? 0}
                        onChange={(v) => setCell(def.key as Exclude<keyof State, 'sum_insured'>, i, c.key, 'net', v ?? 0)}
                        decimals={2}
                        readOnly={isViewMode}
                      />
                    </td>
                  </React.Fragment>
                ))}
              </tr>
            ))}
            {/* Total row */}
            <tr className="border-t bg-gray-50 dark:bg-gray-900">
              <td className="px-3 py-2 font-semibold">Total</td>
              <td className="px-3 py-2"></td>
              {def.categories.map((c) => (
                <React.Fragment key={`tot-${c.key}-frag`}>
                  <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">{t[c.key]!.gross.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">{t[c.key]!.net.toLocaleString()}</td>
                </React.Fragment>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const SimpleTable = () => {
    const rows = state.sum_insured;
    const t = useMemo(() => totalsSimple(rows), [rows]);
    return (
      <div className="overflow-x-auto overscroll-contain bg-white dark:bg-gray-800 rounded shadow p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold">Sum Insured</h4>
          {!isViewMode && <button type="button" className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => setPasteTarget('sum_insured')}>Paste from Excel</button>}
        </div>
        <table className="w-full table-auto border" style={{ tableLayout: 'auto' }}>
          <thead>
            {/* Layer 1: Title row */}
            <tr className="thead-layer-1 thead-sticky">
              <th className="th-tight text-left" colSpan={4}>Sum Insured</th>
            </tr>
            {/* Layer 2: Column labels */}
            <tr className="thead-layer-2 thead-sticky">
              <th className="th-tight text-left">Zone</th>
              <th className="th-tight text-left">Zone Description</th>
              <th className="th-tight text-right">Gross (net of Fac)</th>
              <th className="th-tight text-right">Net</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={String(r.zone)} className="border-t align-top hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-3 py-2 whitespace-nowrap align-top">{typeof r.zone === 'number' ? r.zone : 'Unallocated'}</td>
                <td className="px-3 py-2 whitespace-normal break-words align-top">
                  <input 
                    className="w-full min-w-0 border rounded px-3 py-2" 
                    value={r.zone_description} 
                    onChange={(e) => setSimpleDesc(i, e.target.value)}
                    disabled={isViewMode}
                  />
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap align-top">
                  <NumberCell
                    value={r.gross}
                    onChange={(v) => setSimpleCell(i, 'gross', v ?? 0)}
                    decimals={2}
                    readOnly={isViewMode}
                  />
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap align-top">
                  <NumberCell
                    value={r.net}
                    onChange={(v) => setSimpleCell(i, 'net', v ?? 0)}
                    decimals={2}
                    readOnly={isViewMode}
                  />
                </td>
              </tr>
            ))}
            <tr className="border-t bg-gray-50 dark:bg-gray-900">
              <td className="px-3 py-2 font-semibold">Total</td>
              <td className="px-3 py-2" />
              <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">{t.gross.toLocaleString()}</td>
              <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">{t.net.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Cresta Zone Control</h3>
        <div className="text-xs text-gray-500">{lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Autosave ready'}</div>
      </div>
      {/* New Sum Insured table at the top */}
      <SimpleTable />
      {TABLES.map((def) => (
        <Table key={def.key as string} def={def} />
      ))}
      <PasteModal
        open={pasteTarget !== null}
        onClose={() => setPasteTarget(null)}
        title="Paste from Excel"
        onApply={(rows) => {
          if (!pasteTarget) return;
          if (pasteTarget === 'sum_insured') applyPasteSimple(rows);
          else {
            const def = TABLES.find(t => t.key === pasteTarget)!;
            applyPasteComplex(pasteTarget as Exclude<keyof State, 'sum_insured'>, { categories: def.categories }, rows);
          }
          setPasteTarget(null);
        }}
      />
    </div>
  );
}
