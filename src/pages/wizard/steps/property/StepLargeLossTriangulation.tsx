import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import FormTable from '../../../../components/FormTable';
import PasteModal from '../../../../components/PasteModal';
import { supabase } from '../../../../lib/supabase';
import { useAutosave } from '../../../../hooks/useAutosave';
import { chunkedSave } from '../../../../utils/chunkedSave';

// Property Large Loss Triangulation
// Replicates the Casualty structure: a header list and a multi-row development grid.
// Persistence:
//   - Core values -> table large_loss_triangle_values (per loss_identifier, measure, dev_months)
//   - Extra header fields (date_of_loss, claim_no) -> sheet_blobs 'Large Loss Triangulation (Property)'

type HeaderRow = {
  // not shown in UI but required for storage mapping
  loss_identifier?: string;
  year?: number | '';
  loss_description?: string;
  date_of_loss?: string;
  threshold?: number | '';
  claim_no?: string;
  claim_status?: string; // Settled/Open
};

type Measure = 'paid' | 'reserved' | 'incurred';

export default function StepLargeLossTriangulation() {
  const { submissionId } = useParams();
  const [headers, setHeaders] = useState<HeaderRow[]>([
    { loss_identifier: 'LOSS-1', year: '', loss_description: '', date_of_loss: '', threshold: '', claim_no: '', claim_status: '' },
  ]);
  const [measure, setMeasure] = useState<Measure>('paid');
  const [devMonths, setDevMonths] = useState<number[]>([12, 24, 36, 48, 60, 72, 84]);
  const [grid, setGrid] = useState<number[][]>([[0, 0, 0, 0, 0, 0, 0]]);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load headers + grid from property dataset
  useEffect(() => {
    (async () => {
      if (!submissionId) return;
      // Load values from table and reconstruct headers and grid for current measure
      const { data, error } = await supabase
        .from('large_loss_triangle_values')
        .select('*')
        .eq('submission_id', submissionId);
      if (error) return;
      const losses = Array.from(new Set((data || []).map((r: any) => String(r.loss_identifier))));
      // Map header info
      const headerById = new Map<string, HeaderRow>();
      for (const id of losses) {
        const row = (data || []).find((r: any) => String(r.loss_identifier) === id);
        headerById.set(id, {
          loss_identifier: id,
          year: row?.uw_or_acc_year ?? '',
          loss_description: row?.description ?? '',
          threshold: row?.threshold ?? '',
          claim_status: row?.status ?? 'Open',
          date_of_loss: '',
          claim_no: '',
        });
      }
      // Load extra header fields from sheet_blobs if present
      const blob = await supabase
        .from('sheet_blobs')
        .select('payload')
        .eq('submission_id', submissionId)
        .eq('sheet_name', 'Large Loss Triangulation (Property)')
        .maybeSingle();
      const extra = !blob.error && blob.data?.payload?.headers ? (blob.data.payload.headers as any[]) : [];
      extra.forEach((h: any) => {
        const id = String(h.loss_identifier ?? '');
        if (!id) return;
        const existing = headerById.get(id) ?? { loss_identifier: id };
        headerById.set(id, { ...existing, date_of_loss: h.date_of_loss ?? '', claim_no: h.claim_no ?? '' });
      });

      const loadedHeaders = Array.from(headerById.values());
      setHeaders(loadedHeaders.length ? loadedHeaders : [{ loss_identifier: 'LOSS-1', year: '', loss_description: '', date_of_loss: '', threshold: '', claim_no: '', claim_status: '' }]);

      // Build grid for current measure and dev months set
      const current = (data || []).filter((r: any) => r.measure === measure);
      const uniqueDev = Array.from(new Set(current.map((r: any) => Number(r.dev_months) || 0))).filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
      const devs = uniqueDev.length ? uniqueDev : devMonths;
      setDevMonths(devs);
      const mapByLoss = new Map<string, Map<number, number>>();
      current.forEach((r: any) => {
        const id = String(r.loss_identifier);
        if (!mapByLoss.has(id)) mapByLoss.set(id, new Map());
        mapByLoss.get(id)!.set(Number(r.dev_months), Number(r.value) || 0);
      });
      const nextGrid = (loadedHeaders.length ? loadedHeaders : [{ loss_identifier: 'LOSS-1' }]).map((h) => {
        const rowMap = mapByLoss.get(String(h.loss_identifier)) ?? new Map<number, number>();
        return devs.map((m) => rowMap.get(m) ?? 0);
      });
      setGrid(nextGrid.length ? nextGrid : [[0, 0, 0, 0, 0, 0, 0]]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId]);

  // Autosave to property dataset
  useAutosave({ headers, grid, devMonths, measure }, async (payload) => {
    if (!submissionId) return;
    setSaving(true);
    // Normalize headers with ids
    const withIds = payload.headers.map((h, i) => ({ ...h, loss_identifier: h.loss_identifier || `LOSS-${i + 1}` }));
    // Delete existing rows for this measure
    await supabase
      .from('large_loss_triangle_values')
      .delete()
      .eq('submission_id', submissionId)
      .eq('measure', payload.measure);
    // Build insert rows
    const toInsert: any[] = [];
    withIds.forEach((h, rIdx) => {
      payload.devMonths.forEach((m, cIdx) => {
        const v = payload.grid[rIdx]?.[cIdx];
        // grid values are numeric; skip only if truly absent
        if (v === undefined || v === null) return;
        toInsert.push({
          submission_id: submissionId,
          loss_identifier: String(h.loss_identifier),
          uw_or_acc_year: h.year || null,
          description: h.loss_description || null,
          threshold: h.threshold || 0,
          status: h.claim_status || 'Open',
          measure: payload.measure,
          dev_months: m,
          value: Number(v) || 0,
        });
      });
    });
    // Insert in chunks
    await chunkedSave(toInsert.length ? toInsert : [{
      submission_id: submissionId,
      loss_identifier: String(withIds[0]?.loss_identifier || 'LOSS-1'),
      uw_or_acc_year: withIds[0]?.year || null,
      description: withIds[0]?.loss_description || null,
      threshold: withIds[0]?.threshold || 0,
      status: withIds[0]?.claim_status || 'Open',
      measure: payload.measure,
      dev_months: payload.devMonths[0] ?? 12,
      value: 0,
    }], 400, async (chunk) => {
      await supabase.from('large_loss_triangle_values').insert(chunk);
    });
    // Save extra header fields in blob
    await supabase
      .from('sheet_blobs')
      .upsert({
        submission_id: submissionId,
        sheet_name: 'Large Loss Triangulation (Property)',
        payload: { headers: withIds.map(({ loss_identifier, date_of_loss, claim_no }) => ({ loss_identifier, date_of_loss, claim_no })) },
      }, { onConflict: 'submission_id,sheet_name' });
    setSaving(false);
    setLastSaved(new Date());
  });

  // UI config similar to Casualty
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
      if (!next[row]?.loss_identifier) next[row] = { ...(next[row] || {}), loss_identifier: `LOSS-${row + 1}` };
      (next[row] as any)[key] = value;
      return next;
    });
  };
  const addHeader = () => {
    setHeaders((prev) => [...prev, { loss_identifier: `LOSS-${prev.length + 1}`, year: '', loss_description: '', date_of_loss: '', threshold: '', claim_no: '', claim_status: '' }]);
    setGrid((prev) => [...prev, new Array(devMonths.length).fill(0)]);
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
          const first = rows[0] ?? [];
          if (first.length > 6) {
            // grid paste
            const nextGrid = rows.map((r) => r.map((v) => Number(v) || 0));
            setGrid(nextGrid);
            // ensure headers count matches
            const need = nextGrid.length - headers.length;
            if (need > 0) setHeaders((prev) => [
              ...prev,
              ...Array.from({ length: need }, (_, i) => ({
                loss_identifier: `LOSS-${prev.length + i + 1}`,
                year: '' as const,
                loss_description: '',
                date_of_loss: '',
                threshold: '' as const,
                claim_no: '',
                claim_status: '',
              })),
            ]);
          } else {
            // header paste
            const mapped = rows.map((r, i) => ({
              loss_identifier: `LOSS-${i + 1}`,
              year: r[0] ? Number(r[0]) : ('' as const),
              loss_description: r[1] ?? '',
              date_of_loss: r[2] ?? '',
              threshold: r[3] ? Number(r[3]) : ('' as const),
              claim_no: r[4] ?? '',
              claim_status: r[5] ?? '',
            }));
            setHeaders(mapped);
            // align grid rows
            setGrid((prev) => {
              const copy = prev.map((r) => r.slice());
              while (copy.length < mapped.length) copy.push(new Array(devMonths.length).fill(0));
              while (copy.length > mapped.length) copy.pop();
              return copy;
            });
          }
        }}
      />
    </div>
  );
}
