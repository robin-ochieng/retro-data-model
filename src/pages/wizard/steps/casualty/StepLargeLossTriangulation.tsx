import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import FormTable from '../../../../components/FormTable';
import PasteModal from '../../../../components/PasteModal';
import { supabase } from '../../../../lib/supabase';
import { useAutosave } from '../../../../hooks/useAutosave';
// CSV import removed per requirements

// Casualty Large Loss Triangulation
// Combines header list (year, loss desc, date of loss, threshold, claim no, status)
// with a development grid at 12m steps up to 84m for Paid/Reserved/Incurred slices.
// Data persistence: sheet_blobs with sheet_name = 'Large Loss Triangulation (Casualty)'.

type HeaderRow = {
  year?: number | '';
  loss_description?: string;
  date_of_loss?: string;
  threshold?: number | '';
  claim_no?: string;
  claim_status?: string; // Settled/Open
};

type Measure = 'paid' | 'reserved' | 'incurred';

export default function StepLargeLossTriangulationCasualty() {
  const { submissionId } = useParams();
  const [headers, setHeaders] = useState<HeaderRow[]>([{ year: '', loss_description: '', date_of_loss: '', threshold: '', claim_no: '', claim_status: '' }]);
  const [measure, setMeasure] = useState<Measure>('paid');
  const [devMonths, setDevMonths] = useState<number[]>([12,24,36,48,60,72,84]);
  const [grid, setGrid] = useState<number[][]>([[0,0,0,0,0,0,0]]); // rows align to headers
  const [pasteOpen, setPasteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // load
  useEffect(() => {
    (async () => {
      if (!submissionId) return;
      const { data, error } = await supabase
        .from('sheet_blobs')
        .select('data')
        .eq('submission_id', submissionId)
        .eq('sheet_name', 'Large Loss Triangulation (Casualty)')
        .maybeSingle();
      if (error) return;
      const payload = (data as any)?.data as any | undefined;
      if (payload) {
        setHeaders(payload.headers ?? headers);
        setGrid(payload.grid ?? grid);
        setMeasure((payload.measure as Measure) ?? 'paid');
        setDevMonths(payload.devMonths ?? devMonths);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId]);

  // autosave
  useAutosave({ headers, measure, grid, devMonths }, async (payload) => {
    if (!submissionId) return;
    setSaving(true);
    const { error } = await supabase
      .from('sheet_blobs')
      .upsert({
        submission_id: submissionId,
        sheet_name: 'Large Loss Triangulation (Casualty)',
        data: payload,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'submission_id,sheet_name' });
    setSaving(false);
    if (!error) setLastSaved(new Date());
  });

  const headerCols = [
    { key: 'year', label: 'UW or Acc Year', type: 'number', step: '1', min: 1900 },
    { key: 'loss_description', label: 'Loss Description' },
    { key: 'date_of_loss', label: 'Date of Loss' },
    { key: 'threshold', label: 'Threshold', type: 'number', step: '0.01', min: 0 },
    { key: 'claim_no', label: 'Claim / Policy No.' },
    { key: 'claim_status', label: 'Claim Status (Settled/Open)' },
  ];

  const onHeaderChange = (row: number, key: keyof HeaderRow, value: any) => {
    setHeaders((prev) => {
      const next = prev.slice();
      (next[row] as any)[key] = value;
      return next;
    });
  };

  const ensureGridRows = (rows: number) => {
    setGrid((prev) => {
      const copy = prev.map((r) => r.slice());
      while (copy.length < rows) copy.push(new Array(devMonths.length).fill(0));
      while (copy.length > rows) copy.pop();
      // normalize column counts
      for (const r of copy) {
        while (r.length < devMonths.length) r.push(0);
        while (r.length > devMonths.length) r.pop();
      }
      return copy;
    });
  };

  const addHeader = () => {
    setHeaders((prev) => [...prev, { year: '', loss_description: '', date_of_loss: '', threshold: '', claim_no: '', claim_status: '' }]);
    ensureGridRows(headers.length + 1);
  };
  const removeHeader = (idx: number) => {
    setHeaders((prev) => prev.filter((_, i) => i !== idx));
    setGrid((prev) => prev.filter((_, i) => i !== idx));
  };

  const devCols = useMemo(() => devMonths.map((m) => ({ key: String(m), label: `${m} months`, type: 'number', step: '0.01', min: 0 })), [devMonths]);
  const gridRows = useMemo(() => headers.map((_, r) => devMonths.reduce<Record<string, any>>((acc, m, cIdx) => { acc[String(m)] = grid[r]?.[cIdx] ?? 0; return acc; }, {})), [headers, devMonths, grid]);
  const onGridChange = (row: number, key: string, value: any) => {
    const c = devMonths.indexOf(Number(key)); if (c < 0) return;
    setGrid((prev) => {
      const copy = prev.map((r) => r.slice());
  while (copy.length <= row) copy.push(new Array(devMonths.length).fill(0));
  const rowArr = copy[row] ?? (copy[row] = new Array(devMonths.length).fill(0));
  while (rowArr.length < devMonths.length) rowArr.push(0);
  rowArr[c] = value === '' ? 0 : Number(value);
      return copy;
    });
  };

  const addDev = () => setDevMonths((prev) => [...prev, (prev[prev.length - 1] ?? 0) + 12]);

  const totalsByCol = useMemo(() => devMonths.map((_, c) => grid.reduce((s, r) => s + (Number(r[c]) || 0), 0)), [grid, devMonths]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Loss Header</h3>
        <div className="flex items-center gap-2 text-sm">
          <button className="px-2 py-1 rounded bg-blue-600 text-white" onClick={addHeader}>Add Row</button>
          <span className="text-gray-500">{saving ? 'Saving…' : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : ''}</span>
        </div>
      </div>
      <FormTable<HeaderRow>
        columns={headerCols as any}
        rows={headers}
        onChange={onHeaderChange as any}
        onRemoveRow={removeHeader}
  onPaste={() => setPasteOpen(true)}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Development Grid</h3>
          <select className="border rounded px-2 py-1" value={measure} onChange={(e) => setMeasure(e.target.value as Measure)}>
            <option value="paid">Paid</option>
            <option value="reserved">Reserved</option>
            <option value="incurred">Incurred</option>
          </select>
          <button className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700" onClick={addDev}>Add 12m</button>
        </div>
        <div className="text-xs text-gray-500">Totals: {totalsByCol.map((t) => t.toLocaleString()).join(' | ')}</div>
      </div>

      <FormTable<any>
        columns={devCols as any}
        rows={gridRows}
        onChange={onGridChange as any}
        onRemoveRow={removeHeader}
  onPaste={() => setPasteOpen(true)}
      />

      <PasteModal
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        title="Paste rows (header table first; grid supports multi-row)"
        onApply={(rows) => {
          if (!rows || rows.length === 0) return;
          // Heuristic: if columns > 6 treat as grid paste else header paste
          const first = rows[0] ?? [];
          if (first.length > 6) {
            setGrid(rows.map((r) => r.map((v) => Number(v) || 0)));
            ensureGridRows(rows.length);
          } else {
            setHeaders(rows.map((r) => ({
              year: r[0] ? Number(r[0]) : '',
              loss_description: r[1] ?? '',
              date_of_loss: r[2] ?? '',
              threshold: r[3] ? Number(r[3]) : '',
              claim_no: r[4] ?? '',
              claim_status: r[5] ?? '',
            })));
            ensureGridRows(rows.length);
          }
        }}
      />
    </div>
  );
}
