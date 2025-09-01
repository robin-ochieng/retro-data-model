import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../../../lib/supabase';
import { useAutosave } from '../../../../hooks/useAutosave';
import PasteModal from '../../../../components/PasteModal';

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
  const [state, setState] = useState<State>({
    sum_insured: makeSimpleRows(),
    personal: makeDefaultRows(PERSONAL_CATEGORIES),
    commercial: makeDefaultRows(COMMERCIAL_CATEGORIES),
    industrial: makeDefaultRows(INDUSTRIAL_CATEGORIES),
    engineering: makeDefaultRows(ENGINEERING_CATEGORIES),
  });
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [pasteTarget, setPasteTarget] = useState<keyof State | null>(null);

  // Load persisted payload (sheet_blobs is flexible for evolving schema)
  useEffect(() => {
    (async () => {
      if (!submissionId) return;
      const { data } = await supabase
        .from('sheet_blobs')
        .select('payload')
        .eq('submission_id', submissionId)
        .eq('sheet_name', 'Cresta Zone Control (Property)')
        .maybeSingle();
      const payload = (data as any)?.payload as Partial<State> | undefined;
      if (payload) setState((prev) => ({ ...prev, ...payload }));
    })();
  }, [submissionId]);

  // Autosave entire structure
  useAutosave(state, async (val) => {
    if (!submissionId) return;
    await supabase
      .from('sheet_blobs')
      .upsert({ submission_id: submissionId, sheet_name: 'Cresta Zone Control (Property)', payload: val }, { onConflict: 'submission_id,sheet_name' });
    setLastSaved(new Date());
  }, 800);

  const numberInput = 'w-full border rounded px-2 py-1 text-right';
  const textInput = 'w-full border rounded px-2 py-1';

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
  }

  // Simple table setters
  function setSimpleDesc(rowIdx: number, v: string) {
    setState((prev) => {
      const copy = { ...prev } as State;
      copy.sum_insured = copy.sum_insured.map((r, i) => (i === rowIdx ? { ...r, zone_description: v } : r));
      return copy;
    });
  }
  function setSimpleCell(rowIdx: number, field: keyof Omit<SimpleRow, 'zone' | 'zone_description'>, v: number | string) {
    setState((prev) => {
      const copy = { ...prev } as State;
      copy.sum_insured = copy.sum_insured.map((r, i) => (i === rowIdx ? { ...r, [field]: v === '' ? 0 : Number(v) } : r));
      return copy;
    });
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

  const toNumber = (s: string | undefined) => {
    if (s == null) return 0;
    const cleaned = String(s).replace(/[\s,]/g, '');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
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
  }

  const Table = ({ def }: { def: TableDef }) => {
    const rows = state[def.key] as Row[];
    const t = useMemo(() => totals(rows, def.categories), [rows, def.categories]);
    return (
      <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded shadow p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold">{def.title}</h4>
          <button type="button" className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => setPasteTarget(def.key)}>Paste from Excel</button>
        </div>
        <table className="min-w-full table-auto border">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-700">
              <th className="px-2 py-1 w-20"></th>
              <th className="px-2 py-1"></th>
              <th className="px-2 py-1 text-center" colSpan={def.categories.length * 2}>{def.title}</th>
            </tr>
            <tr className="bg-gray-100 dark:bg-gray-700">
              <th className="px-2 py-1 text-left">Zone</th>
              <th className="px-2 py-1 text-left">Zone Description</th>
              {def.categories.map((c) => (
                <th key={`${c.key}-gross`} className="px-2 py-1 text-left" colSpan={2}>{c.label}</th>
              ))}
            </tr>
            <tr className="bg-gray-100 dark:bg-gray-700">
              <th></th>
              <th></th>
              {def.categories.map((c) => (
                <>
                  <th key={`${c.key}-gross-h`} className="px-2 py-1 text-left">Gross (net of Fac)</th>
                  <th key={`${c.key}-net-h`} className="px-2 py-1 text-left">Net</th>
                </>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={String(r.zone)} className="border-t">
                <td className="px-2 py-1 whitespace-nowrap">{typeof r.zone === 'number' ? r.zone : 'Unallocated'}</td>
                <td className="px-2 py-1"><input className={textInput} value={r.zone_description} onChange={(e) => setZoneDesc(def.key, i, e.target.value)} /></td>
                {def.categories.map((c) => (
                  <React.Fragment key={`${i}-${c.key}-frag`}>
                    <td className="px-2 py-1 w-32"><input className={numberInput} type="number" step="0.01" min="0" value={r.values[c.key]?.gross ?? 0} onChange={(e) => setCell(def.key as Exclude<keyof State, 'sum_insured'>, i, c.key, 'gross', e.target.value)} /></td>
                    <td className="px-2 py-1 w-32"><input className={numberInput} type="number" step="0.01" min="0" value={r.values[c.key]?.net ?? 0} onChange={(e) => setCell(def.key as Exclude<keyof State, 'sum_insured'>, i, c.key, 'net', e.target.value)} /></td>
                  </React.Fragment>
                ))}
              </tr>
            ))}
            {/* Total row */}
            <tr className="border-t bg-gray-50 dark:bg-gray-900">
              <td className="px-2 py-1 font-semibold">Total</td>
              <td className="px-2 py-1"></td>
              {def.categories.map((c) => (
                <React.Fragment key={`tot-${c.key}-frag`}>
                  <td className="px-2 py-1 text-right font-semibold">{t[c.key]!.gross.toLocaleString()}</td>
                  <td className="px-2 py-1 text-right font-semibold">{t[c.key]!.net.toLocaleString()}</td>
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
      <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded shadow p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold">Sum Insured</h4>
          <button type="button" className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => setPasteTarget('sum_insured')}>Paste from Excel</button>
        </div>
        <table className="min-w-full table-auto border">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-700">
              <th className="px-2 py-1 w-20"></th>
              <th className="px-2 py-1"></th>
              <th className="px-2 py-1 text-center" colSpan={2}>Sum Insured</th>
            </tr>
            <tr className="bg-gray-100 dark:bg-gray-700">
              <th className="px-2 py-1 text-left">Zone</th>
              <th className="px-2 py-1 text-left">Zone Description</th>
              <th className="px-2 py-1 text-left">Gross (net of Fac)</th>
              <th className="px-2 py-1 text-left">Net</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={String(r.zone)} className="border-t">
                <td className="px-2 py-1 whitespace-nowrap">{typeof r.zone === 'number' ? r.zone : 'Unallocated'}</td>
                <td className="px-2 py-1"><input className={textInput} value={r.zone_description} onChange={(e) => setSimpleDesc(i, e.target.value)} /></td>
                <td className="px-2 py-1 w-32"><input className={numberInput} type="number" step="0.01" min="0" value={r.gross} onChange={(e) => setSimpleCell(i, 'gross', e.target.value)} /></td>
                <td className="px-2 py-1 w-32"><input className={numberInput} type="number" step="0.01" min="0" value={r.net} onChange={(e) => setSimpleCell(i, 'net', e.target.value)} /></td>
              </tr>
            ))}
            <tr className="border-t bg-gray-50 dark:bg-gray-900">
              <td className="px-2 py-1 font-semibold">Total</td>
              <td className="px-2 py-1" />
              <td className="px-2 py-1 text-right font-semibold">{t.gross.toLocaleString()}</td>
              <td className="px-2 py-1 text-right font-semibold">{t.net.toLocaleString()}</td>
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
