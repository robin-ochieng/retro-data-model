import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import FormTable from '../../../../components/FormTable';
import PasteModal from '../../../../components/PasteModal';
import { supabase } from '../../../../lib/supabase';
import { useAutosave } from '../../../../hooks/useAutosave';
import { chunkedSave } from '../../../../utils/chunkedSave';
import { normalizeDateString } from '../../../../types/climateExposure';

// Property Large Loss Triangulation
// Replicates the Casualty structure: a header list and a multi-row development grid.
// Persistence:
//   - Header fields -> table large_loss_triangle_header_prop (incl. date_of_loss, claim_policy_no)
//   - Development values -> split tables: large_loss_triangle_paid_prop, _reserved_prop, _incurred_prop

type HeaderRow = {
  loss_identifier?: string;
  year?: number | '';
  loss_description?: string;
  date_of_loss?: string;
  threshold?: number | '';
  claim_policy_no?: string;
  claim_status?: string;
};

export default function StepLargeLossTriangulation() {
  const { submissionId } = useParams();
  const [headers, setHeaders] = useState<HeaderRow[]>([
    { loss_identifier: 'LOSS-1', year: '', loss_description: '', date_of_loss: '', threshold: '', claim_policy_no: '', claim_status: '' },
  ]);
  const [devMonths, setDevMonths] = useState<number[]>([12, 24, 36, 48, 60, 72, 84]);
  const [gridPaid, setGridPaid] = useState<number[][]>([[0, 0, 0, 0, 0, 0, 0]]);
  const [gridReserved, setGridReserved] = useState<number[][]>([[0, 0, 0, 0, 0, 0, 0]]);
  const [gridIncurred, setGridIncurred] = useState<number[][]>([[0, 0, 0, 0, 0, 0, 0]]);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load headers + grids from property dataset
  useEffect(() => {
    (async () => {
      if (!submissionId) return;
      // Load header rows
      const hq = await (supabase as any)
        .from('large_loss_triangle_header_prop')
        .select('*')
        .eq('submission_id', submissionId);
      const loadedHeaders: HeaderRow[] = (hq.data as any[] | null)?.map((r: any) => ({
        loss_identifier: r.loss_identifier,
        year: r.uw_or_acc_year ?? '',
        loss_description: r.loss_description ?? '',
        date_of_loss: r.date_of_loss ?? '',
        threshold: r.threshold ?? '',
        claim_policy_no: r.claim_policy_no ?? '',
        claim_status: r.claim_status ?? 'Open',
      })) ?? [];
      setHeaders(loadedHeaders.length ? loadedHeaders : [{ loss_identifier: 'LOSS-1', year: '', loss_description: '', date_of_loss: '', threshold: '', claim_policy_no: '', claim_status: '' }]);

      // Load dev values for paid & reserved; incurred will be recomputed and loaded if exists
      const [pq, rq, iq] = await Promise.all([
        (supabase as any).from('large_loss_triangle_paid_prop').select('*').eq('submission_id', submissionId),
        (supabase as any).from('large_loss_triangle_reserved_prop').select('*').eq('submission_id', submissionId),
        (supabase as any).from('large_loss_triangle_incurred_prop').select('*').eq('submission_id', submissionId),
      ]);
      const allDev = [pq.data, rq.data, iq.data].flat().filter(Boolean) as any[];
      const uniqueDev: number[] = Array.from(new Set<number>(allDev.map((r: any) => Number(r.development_months) || 0)))
        .filter((n: number) => Number.isFinite(n) && n > 0)
        .sort((a: number, b: number) => a - b);
      const devs: number[] = uniqueDev.length ? uniqueDev : devMonths;
      setDevMonths(devs as number[]);
      const ids = (loadedHeaders.length ? loadedHeaders : [{ loss_identifier: 'LOSS-1' }]).map(h => String(h.loss_identifier));
      const toGrid = (rows: any[]): number[][] => {
        const byLoss = new Map<string, Map<number, number>>();
        (rows || []).forEach((r: any) => {
          const id = String(r.loss_identifier);
          if (!byLoss.has(id)) byLoss.set(id, new Map());
          byLoss.get(id)!.set(Number(r.development_months), Number(r.amount) || 0);
        });
        return ids.map((id) => devs.map((m) => byLoss.get(id)?.get(m) ?? 0));
      };
      const paidGrid = toGrid((pq.data as any[]) || []);
      const reservedGrid = toGrid((rq.data as any[]) || []);
      const incurredGrid = ids.map((_, r) => devs.map((_, c) => (paidGrid[r]?.[c] ?? 0) + (reservedGrid[r]?.[c] ?? 0)));
      setGridPaid(paidGrid.length ? paidGrid : [[0, 0, 0, 0, 0, 0, 0]]);
      setGridReserved(reservedGrid.length ? reservedGrid : [[0, 0, 0, 0, 0, 0, 0]]);
      setGridIncurred(incurredGrid.length ? incurredGrid : [[0, 0, 0, 0, 0, 0, 0]]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId]);

  // Autosave to property dataset
  // Autosave header + grids (paid/reserved). Incurred is derived but we also persist it for reporting consistency.
  useAutosave({ headers, gridPaid, gridReserved, gridIncurred, devMonths }, async (payload) => {
    if (!submissionId) return;
    setSaving(true);
    setSaveError(null);
    // Normalize headers with ids and persist header table
    const baseIds = payload.headers.map((h, i) => ({ ...h, loss_identifier: h.loss_identifier || `LOSS-${i + 1}` }));
    // Ensure unique loss_identifier values to satisfy unique(submission_id, loss_identifier)
    const seen = new Set<string>();
    const withIds = baseIds.map((h) => {
      let id = String(h.loss_identifier || '').trim();
      if (!id) id = 'LOSS-1';
      if (!seen.has(id)) { seen.add(id); return { ...h, loss_identifier: id }; }
      // duplicate: find next available LOSS-n
      const m = id.match(/LOSS-(\d+)/);
      let n = m ? Number(m[1]) || 1 : 1;
      let cand = id;
      while (seen.has(cand)) { n += 1; cand = `LOSS-${n}`; }
      seen.add(cand);
      return { ...h, loss_identifier: cand };
    });
    // Upsert header rows for this submission; then cleanup rows no longer present
    const headerRows = withIds.map(h => ({
      submission_id: submissionId,
      loss_identifier: String(h.loss_identifier),
      uw_or_acc_year: h.year || null,
      loss_description: h.loss_description || null,
      // Normalize various user-entered formats (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY)
      date_of_loss: normalizeDateString(h.date_of_loss || '') || null,
      threshold: h.threshold === '' ? null : (h.threshold as any),
      claim_policy_no: h.claim_policy_no || null,
      claim_status: h.claim_status || 'Open',
      updated_at: new Date().toISOString(),
    }));
    const idsNow = withIds.map(h => String(h.loss_identifier));
    if (headerRows.length) {
      const { error: delErr } = await (supabase as any)
        .from('large_loss_triangle_header_prop')
        .delete()
        .eq('submission_id', submissionId);
      if (delErr) { setSaving(false); setSaveError(delErr.message || 'Failed to clear header rows before save'); return; }
      try {
        await chunkedSave(headerRows, 400, async (chunk) => {
          const { error } = await (supabase as any)
            .from('large_loss_triangle_header_prop')
            .insert(chunk);
          if (error) throw new Error(error.message || 'Failed to insert header rows');
        });
      } catch (e: any) {
        setSaving(false); setSaveError(e?.message || 'Failed to insert header rows'); return;
      }
      const verify = await (supabase as any)
        .from('large_loss_triangle_header_prop')
        .select('id')
        .eq('submission_id', submissionId)
        .limit(1);
      if (!verify.error && (!verify.data || verify.data.length === 0)) {
        setSaving(false); setSaveError('Saved grids but header not visible. Check submission ownership (RLS).'); return;
      }
    } else {
      // If no headers, clear all
      const { error } = await (supabase as any)
        .from('large_loss_triangle_header_prop')
        .delete()
        .eq('submission_id', submissionId);
      if (error) { setSaving(false); setSaveError(error.message || 'Failed to clear header rows'); return; }
    }

    // Helper to upsert grid rows
    const replaceGrid = async (table: string, rows: number[][]) => {
      const map = new Map<string, any>();
      withIds.forEach((h, rIdx) => {
        const lid = String(h.loss_identifier);
        payload.devMonths.forEach((m, cIdx) => {
          const v = rows[rIdx]?.[cIdx];
          if (v === undefined || v === null) return;
          const key = `${lid}__${m}`;
          map.set(key, { submission_id: submissionId, loss_identifier: lid, development_months: m, amount: Number(v) || 0 });
        });
      });
      const toInsert: any[] = Array.from(map.values());
      if (toInsert.length) {
        await chunkedSave(toInsert, 400, async (chunk) => {
          const { error } = await (supabase as any).from(table).upsert(chunk, { onConflict: 'submission_id,loss_identifier,development_months' });
          if (error) throw new Error(error.message || `Failed to upsert into ${table}`);
        });
      }
    };
    // Recompute incurred from paid + reserved just before save
    const computedIncurred = withIds.map((_, r) => payload.devMonths.map((_, c) => (payload.gridPaid[r]?.[c] ?? 0) + (payload.gridReserved[r]?.[c] ?? 0)));
    setGridIncurred(computedIncurred);
    try {
      await replaceGrid('large_loss_triangle_paid_prop', payload.gridPaid);
      await replaceGrid('large_loss_triangle_reserved_prop', payload.gridReserved);
      await replaceGrid('large_loss_triangle_incurred_prop', computedIncurred);
      setSaving(false);
      setLastSaved(new Date());
    } catch (e: any) {
      setSaving(false);
      setSaveError(e?.message || 'Failed to save development grids');
    }
  });

  // UI config similar to Casualty
  const headerCols = [
    { key: 'year', label: 'UW or Acc Year', type: 'number', step: '1', min: 1900 },
    { key: 'loss_description', label: 'Loss Description' },
    { key: 'date_of_loss', label: 'Date of Loss' },
    { key: 'threshold', label: 'Threshold', type: 'number', step: '0.01', min: 0 },
    { key: 'claim_policy_no', label: 'Claim / Policy No.' },
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
    setHeaders((prev) => {
      const maxN = prev.reduce((m, h) => {
        const mtx = String(h.loss_identifier || '').match(/LOSS-(\d+)/);
        const n = mtx ? Number(mtx[1]) : 0;
        return Number.isFinite(n) ? Math.max(m, n) : m;
      }, 0);
      const nextId = `LOSS-${maxN + 1}`;
      return [...prev, { loss_identifier: nextId, year: '', loss_description: '', date_of_loss: '', threshold: '', claim_policy_no: '', claim_status: '' }];
    });
    setGridPaid((prev) => [...prev, new Array(devMonths.length).fill(0)]);
    setGridReserved((prev) => [...prev, new Array(devMonths.length).fill(0)]);
    setGridIncurred((prev) => [...prev, new Array(devMonths.length).fill(0)]);
  };
  const removeHeader = (idx: number) => {
    setHeaders((prev) => prev.filter((_, i) => i !== idx));
    setGridPaid((prev) => prev.filter((_, i) => i !== idx));
    setGridReserved((prev) => prev.filter((_, i) => i !== idx));
    setGridIncurred((prev) => prev.filter((_, i) => i !== idx));
  };

  const devCols = useMemo(() => devMonths.map((m) => ({ key: String(m), label: `${m} months`, type: 'number', step: '0.01', min: 0 })), [devMonths]);
  const rowsFromGrid = (grid: number[][]) => headers.map((_, r) => devMonths.reduce<Record<string, any>>((acc, m, cIdx) => { acc[String(m)] = grid[r]?.[cIdx] ?? 0; return acc; }, {}));
  const [pasteTarget, setPasteTarget] = useState<'headers' | 'paid' | 'reserved' | 'incurred'>('headers');
  const onGridChange = (which: 'paid' | 'reserved', row: number, key: string, value: any) => {
    const c = devMonths.indexOf(Number(key)); if (c < 0) return;
    const setFor = which === 'paid' ? setGridPaid : setGridReserved;
    setFor((prev) => {
      const copy = prev.map((r) => r.slice());
      while (copy.length <= row) copy.push(new Array(devMonths.length).fill(0));
      const rowArr = copy[row] ?? (copy[row] = new Array(devMonths.length).fill(0));
      while (rowArr.length < devMonths.length) rowArr.push(0);
      rowArr[c] = value === '' ? 0 : Number(value);
      return copy;
    });
    setGridIncurred((prev) => {
      const copy = prev.map((r) => r.slice());
      while (copy.length <= row) copy.push(new Array(devMonths.length).fill(0));
      const rowArr = copy[row] ?? (copy[row] = new Array(devMonths.length).fill(0));
      const paidVal = which === 'paid' ? (value === '' ? 0 : Number(value)) : (gridPaid[row]?.[c] ?? 0);
      const resVal = which === 'reserved' ? (value === '' ? 0 : Number(value)) : (gridReserved[row]?.[c] ?? 0);
      rowArr[c] = paidVal + resVal;
      return copy;
    });
  };
  const addDev = () => {
    setDevMonths((prev) => [...prev, (prev[prev.length - 1] ?? 0) + 12]);
    setGridPaid((prev) => prev.map((r) => [...r, 0]));
    setGridReserved((prev) => prev.map((r) => [...r, 0]));
    setGridIncurred((prev) => prev.map((r) => [...r, 0]));
  };
  const totalsByCol = (grid: number[][]) => devMonths.map((_, c) => grid.reduce((s, r) => s + (Number(r[c]) || 0), 0));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Loss Header</h3>
        <div className="flex items-center gap-2 text-sm">
          {saveError ? (
            <span className="text-red-500">Save error: {saveError}</span>
          ) : (
            <span className="text-gray-500">{saving ? 'Saving…' : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : ''}</span>
          )}
        </div>
      </div>
      <FormTable<HeaderRow>
        columns={headerCols as any}
        rows={headers}
        onChange={onHeaderChange as any}
        onRemoveRow={removeHeader}
        onPaste={() => setPasteOpen(true)}
      />

      <div className="flex justify-between items-center mt-2">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          type="button"
          onClick={addHeader}
        >
          Add Row
        </button>
        <span className="text-gray-500 text-sm">All changes are autosaved</span>
      </div>

      <div className="flex items-center justify-between mt-6">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Development Grid — Paid</h3>
          <button className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700" onClick={addDev}>Add 12m</button>
        </div>
        <div className="text-xs text-gray-500">Totals: {totalsByCol(gridPaid).map((t) => t.toLocaleString()).join(' | ')}</div>
      </div>

      <FormTable<any>
        columns={devCols as any}
        rows={rowsFromGrid(gridPaid)}
        onChange={(r, k, v) => onGridChange('paid', r, k as any, v)}
        onRemoveRow={removeHeader}
        onPaste={() => { setPasteTarget('paid'); setPasteOpen(true); }}
      />

      <div className="flex items-center justify-between mt-6">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Development Grid — Reserved</h3>
          <button className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700" onClick={addDev}>Add 12m</button>
        </div>
        <div className="text-xs text-gray-500">Totals: {totalsByCol(gridReserved).map((t) => t.toLocaleString()).join(' | ')}</div>
      </div>

      <FormTable<any>
        columns={devCols as any}
        rows={rowsFromGrid(gridReserved)}
        onChange={(r, k, v) => onGridChange('reserved', r, k as any, v)}
        onRemoveRow={removeHeader}
        onPaste={() => { setPasteTarget('reserved'); setPasteOpen(true); }}
      />

      <div className="flex items-center justify-between mt-6">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Development Grid — Incurred (auto)</h3>
        </div>
        <div className="text-xs text-gray-500">Totals: {totalsByCol(gridIncurred).map((t) => t.toLocaleString()).join(' | ')}</div>
      </div>

      <FormTable<any>
        columns={devCols as any}
        rows={rowsFromGrid(gridIncurred)}
        onChange={() => { /* read-only */ }}
        onRemoveRow={removeHeader}
        onPaste={() => { setPasteTarget('incurred'); setPasteOpen(true); }}
      />

      <div className="flex justify-between items-center mt-2">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          type="button"
          onClick={addHeader}
        >
          Add Row
        </button>
        <span className="text-gray-500 text-sm">All changes are autosaved</span>
      </div>

      <PasteModal
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        title="Paste rows (header table or Paid/Reserved grids)"
        onApply={(rows) => {
          if (!rows || rows.length === 0) return;
          const first = rows[0] ?? [];
          // Decide by pasteTarget or by column count
          if (pasteTarget === 'paid' || pasteTarget === 'reserved' || first.length > 6) {
            if (pasteTarget === 'incurred') {
              alert('Incurred is calculated. Paste into Paid or Reserved.');
              return;
            }
            const gridVals = rows.map((r) => r.map((v) => Number(v) || 0));
            if (pasteTarget === 'paid') setGridPaid(gridVals);
            else setGridReserved(gridVals);
            const need = gridVals.length - headers.length;
            if (need > 0) setHeaders((prev) => [
              ...prev,
              ...Array.from({ length: need }, (_, i) => ({
                loss_identifier: `LOSS-${prev.length + i + 1}`,
                year: '' as const,
                loss_description: '',
                date_of_loss: '',
                threshold: '' as const,
                claim_policy_no: '',
                claim_status: '',
              })),
            ]);
            // recompute incurred
            const paid = pasteTarget === 'paid' ? gridVals : gridPaid;
            const res = pasteTarget === 'reserved' ? gridVals : gridReserved;
            setGridIncurred(paid.map((row, r) => row.map((v, c) => v + (res[r]?.[c] ?? 0))));
          } else {
            // header paste
            const mapped = rows.map((r, i) => ({
              loss_identifier: `LOSS-${i + 1}`,
              year: r[0] ? Number(r[0]) : ('' as const),
              loss_description: r[1] ?? '',
              date_of_loss: r[2] ?? '',
              threshold: r[3] ? Number(r[3]) : ('' as const),
              claim_policy_no: r[4] ?? '',
              claim_status: r[5] ?? '',
            }));
            setHeaders(mapped);
            // align grid rows
            const align = (set: React.Dispatch<React.SetStateAction<number[][]>>) => set(prev => {
              const copy = prev.map((r) => r.slice());
              while (copy.length < mapped.length) copy.push(new Array(devMonths.length).fill(0));
              while (copy.length > mapped.length) copy.pop();
              return copy;
            });
            align(setGridPaid); align(setGridReserved); align(setGridIncurred);
          }
        }}
      />
    </div>
  );
}
