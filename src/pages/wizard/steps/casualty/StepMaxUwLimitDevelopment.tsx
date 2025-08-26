import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../../../lib/supabase';
import { useAutosave } from '../../../../hooks/useAutosave';
import FormTable from '../../../../components/FormTable';
import PasteModal from '../../../../components/PasteModal';
import { parseCsv, toCsv } from '../../../../utils/csv';

type Row = Record<string, string | number> & { metric: string };

const SHEET = 'Max UW Limit Development';

function genYears(count = 10): { keys: string[]; columns: { key: string; label: string; type: 'number' }[] } {
  const current = new Date().getFullYear();
  const years = Array.from({ length: count }, (_, i) => current - i);
  const keys = years.map((y) => `y${y}`);
  const columns = years.map((y) => ({ key: `y${y}`, label: `${y}`, type: 'number' as const }));
  return { keys, columns };
}

export default function StepMaxUwLimitDevelopment() {
  const { submissionId } = useParams();
  const [{ keys, columns: yearCols }] = useState(() => genYears(12));
  const [rows, setRows] = useState<Row[]>([
    { metric: 'Max UW Limit', ...Object.fromEntries(keys.map((k) => [k, ''])) },
  ]);
  const [comments, setComments] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showPaste, setShowPaste] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

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
        setRows(data.payload.rows ?? rows);
        setComments(String(data.payload.comments ?? ''));
      }
    })();
    return () => {
      mounted = false;
    };
  }, [submissionId]);

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

  const columns = useMemo(() => [{ key: 'metric', label: 'U/W Years', type: 'text' as const }, ...yearCols], [yearCols]);
  const headers = useMemo(() => ['metric', ...yearCols.map(c => c.key)], [yearCols]);

  const onChange = (idx: number, key: keyof Row, value: any) => {
    const copy = rows.slice();
    (copy[idx] as any)[key] = value;
    setRows(copy);
  };
  function applyGrid(grid: string[][]) {
    if (!grid.length) return;
    const looksLikeHeader = grid[0]?.[0]?.toLowerCase?.().includes('u/w') || grid[0]?.[0]?.toLowerCase?.().includes('uw');
    const start = looksLikeHeader ? 1 : 0;
    const next = rows.map((r) => ({ ...r }));
    for (let i = 0; i < Math.min(grid.length - start, next.length); i++) {
      const src = grid[start + i];
      if (!src) continue;
      if (src[0]) (next[i] as any).metric = src[0];
      for (let c = 0; c < yearCols.length; c++) {
        const key = yearCols[c]!.key;
        const val = src[c + 1];
        if (val !== undefined) (next[i] as any)[key] = val;
      }
    }
    setRows(next);
  }
  const onImportCsv = () => fileRef.current?.click();
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return; const text = await f.text(); const grid = parseCsv(text); applyGrid(grid); e.target.value = '';
  };
  const onExportCsv = () => {
    const blob = new Blob([toCsv(rows as any[], headers)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${SHEET}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="rounded shadow p-4 bg-white dark:bg-gray-800">
        <h3 className="font-semibold mb-3">Max UW Limit Development</h3>
        <FormTable<Row>
          columns={columns as any}
          rows={rows}
          onChange={onChange}
          onPaste={() => setShowPaste(true)}
          onImportCsv={onImportCsv}
          onExportCsv={onExportCsv}
        />
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={onFile} />
        <PasteModal open={showPaste} onClose={() => setShowPaste(false)} onApply={applyGrid} title="Paste Max UW Limit Development" />
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
