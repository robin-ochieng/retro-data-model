import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../../../lib/supabase';
import { useAutosave } from '../../../../hooks/useAutosave';
import FormTable from '../../../../components/FormTable';
import PasteModal from '../../../../components/PasteModal';
import { parseCsv, toCsv } from '../../../../utils/csv';

type Row = Record<string, string | number> & { metric: string };

const SHEET = 'Rate Development_Motor Specific';

function genYears(count = 10): { keys: string[]; columns: { key: string; label: string; type: 'number' }[] } {
  const current = new Date().getFullYear();
  const years = Array.from({ length: count }, (_, i) => current - i);
  const keys = years.map((y) => `y${y}`);
  const columns = years.map((y) => ({ key: `y${y}`, label: `${y}`, type: 'number' as const }));
  return { keys, columns };
}

export default function StepRateDevelopmentMotor() {
  const { submissionId } = useParams();
  const [{ keys, columns: yearCols }] = useState(() => genYears(12));
  const [topRows, setTopRows] = useState<Row[]>([
    { metric: 'Rate Development (%)', ...Object.fromEntries(keys.map((k) => [k, ''])) },
    { metric: 'Rate Index', ...Object.fromEntries(keys.map((k) => [k, ''])) },
  ]);
  const motorMetrics = [
    'Average Claim Cost for Motor Write-off',
    'Average Claim Cost for Motor Accident',
    'Average Premium for Motor Write-off',
    'Average Premium for Motor Accident',
  ];
  const [motorRows, setMotorRows] = useState<Row[]>(motorMetrics.map((m) => ({ metric: m, ...Object.fromEntries(keys.map((k) => [k, ''])) })));
  const [comments, setComments] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showPasteTop, setShowPasteTop] = useState(false);
  const [showPasteMotor, setShowPasteMotor] = useState(false);
  const fileRefTop = useRef<HTMLInputElement | null>(null);
  const fileRefMotor = useRef<HTMLInputElement | null>(null);

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
        setTopRows(data.payload.topRows ?? topRows);
        setMotorRows(data.payload.motorRows ?? motorRows);
        setComments(String(data.payload.comments ?? ''));
      }
    })();
    return () => {
      mounted = false;
    };
  }, [submissionId]);

  useAutosave({ topRows, motorRows, comments }, async (val) => {
    if (!submissionId) return;
    const up = await supabase
      .from('sheet_blobs')
      .upsert(
        [{ submission_id: submissionId, sheet_name: SHEET, payload: { topRows: val.topRows, motorRows: val.motorRows, comments: val.comments } }],
        { onConflict: 'submission_id,sheet_name' }
      );
    if (!up.error) setLastSaved(new Date());
  });

  const columns = useMemo(() => [{ key: 'metric', label: 'U/W Years', type: 'text' as const }, ...yearCols], [yearCols]);
  const headers = useMemo(() => ['metric', ...yearCols.map(c => c.key)], [yearCols]);

  const onChangeTop = (idx: number, key: keyof Row, value: any) => {
    const copy = topRows.slice();
    (copy[idx] as any)[key] = value;
    setTopRows(copy);
  };
  const onChangeMotor = (idx: number, key: keyof Row, value: any) => {
    const copy = motorRows.slice();
    (copy[idx] as any)[key] = value;
    setMotorRows(copy);
  };

  function applyTop(grid: string[][]) {
    if (!grid.length) return;
    const looksLikeHeader = grid[0]?.[0]?.toLowerCase?.().includes('u/w') || grid[0]?.[0]?.toLowerCase?.().includes('uw');
    const start = looksLikeHeader ? 1 : 0;
    const next = topRows.map((r) => ({ ...r }));
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
    setTopRows(next);
  }

  function applyMotor(grid: string[][]) {
    if (!grid.length) return;
    const looksLikeHeader = grid[0]?.[0]?.toLowerCase?.().includes('u/w') || grid[0]?.[0]?.toLowerCase?.().includes('uw');
    const start = looksLikeHeader ? 1 : 0;
    const next = motorRows.map((r) => ({ ...r }));
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
    setMotorRows(next);
  }

  return (
    <div className="space-y-6">
      <div className="rounded shadow p-4 bg-white dark:bg-gray-800">
        <h3 className="font-semibold mb-3">Rate Development</h3>
        <FormTable<Row>
          columns={columns as any}
          rows={topRows}
          onChange={onChangeTop}
          onPaste={() => setShowPasteTop(true)}
          onImportCsv={() => fileRefTop.current?.click()}
          onExportCsv={() => {
            const blob = new Blob([toCsv(topRows as any[], headers)], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `${SHEET}-top.csv`; a.click(); URL.revokeObjectURL(url);
          }}
        />
        <input ref={fileRefTop} type="file" accept=".csv" className="hidden" onChange={async (e) => { const f=e.target.files?.[0]; if(!f) return; const grid=parseCsv(await f.text()); applyTop(grid); e.target.value=''; }} />
        <PasteModal open={showPasteTop} onClose={() => setShowPasteTop(false)} onApply={applyTop} title="Paste Rate Development" />
      </div>
      <div className="rounded shadow p-4 bg-white dark:bg-gray-800">
        <h3 className="font-semibold mb-3">Motor Specific Information</h3>
        <FormTable<Row>
          columns={columns as any}
          rows={motorRows}
          onChange={onChangeMotor}
          onPaste={() => setShowPasteMotor(true)}
          onImportCsv={() => fileRefMotor.current?.click()}
          onExportCsv={() => {
            const blob = new Blob([toCsv(motorRows as any[], headers)], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `${SHEET}-motor.csv`; a.click(); URL.revokeObjectURL(url);
          }}
        />
        <input ref={fileRefMotor} type="file" accept=".csv" className="hidden" onChange={async (e) => { const f=e.target.files?.[0]; if(!f) return; const grid=parseCsv(await f.text()); applyMotor(grid); e.target.value=''; }} />
        <PasteModal open={showPasteMotor} onClose={() => setShowPasteMotor(false)} onApply={applyMotor} title="Paste Motor Specific" />
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
