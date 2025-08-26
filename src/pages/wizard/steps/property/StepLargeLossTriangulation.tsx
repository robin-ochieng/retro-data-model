import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { z } from 'zod';
import FormTable from '../../../../components/FormTable';
import PasteModal from '../../../../components/PasteModal';
import { supabase } from '../../../../lib/supabase';
import { useAutosave } from '../../../../hooks/useAutosave';
import { chunkedSave } from '../../../../utils/chunkedSave';
import { parseCsv } from '../../../../utils/csv';

const HeaderSchema = z.object({
  loss_identifier: z.string().min(1),
  uw_or_acc_year: z.number().int().optional(),
  description: z.string().optional().default(''),
  threshold: z.number().nonnegative().optional().default(0),
  status: z.enum(['Open', 'Settled']).optional().default('Open'),
});
type Header = z.infer<typeof HeaderSchema>;

type Measure = 'paid' | 'reserved' | 'incurred';

export default function StepLargeLossTriangulation() {
  const { submissionId } = useParams();
  const [headers, setHeaders] = useState<Header[]>([]);
  const [selectedLossId, setSelectedLossId] = useState<string | null>(null);
  const [measure, setMeasure] = useState<Measure>('paid');
  const [devEnd, setDevEnd] = useState<number>(60);
  const [values, setValues] = useState<Record<number, number | ''>>({}); // devMonths -> value
  const [pasteOpen, setPasteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [progress, setProgress] = useState<string>('');

  const devColumns = useMemo(() => {
    const arr: number[] = []; for (let m = 0; m <= devEnd; m += 3) arr.push(m); return arr;
  }, [devEnd]);

  useEffect(() => {
    (async () => {
      if (!submissionId) return;
      // load distinct losses and the latest selected slice
      const { data, error } = await supabase
        .from('large_loss_triangle_values')
        .select('*')
        .eq('submission_id', submissionId);
      if (error) return;
      const headerMap = new Map<string, Header>();
      data.forEach((r: any) => {
        if (!headerMap.has(r.loss_identifier)) {
          headerMap.set(r.loss_identifier, {
            loss_identifier: r.loss_identifier,
            uw_or_acc_year: r.uw_or_acc_year ?? undefined,
            description: r.description ?? '',
            threshold: Number(r.threshold) || 0,
            status: (r.status as any) ?? 'Open',
          });
        }
      });
      const loadedHeaders = Array.from(headerMap.values());
      setHeaders(loadedHeaders.length ? loadedHeaders : [{ loss_identifier: 'LOSS-1', uw_or_acc_year: undefined, description: '', threshold: 0, status: 'Open' }]);
      const first = (loadedHeaders[0]?.loss_identifier) ?? 'LOSS-1';
      setSelectedLossId(first);
      // hydrate current measure values
      const slice = data.filter((r: any) => r.loss_identifier === first && r.measure === measure);
      const next: Record<number, number> = {};
      slice.forEach((r: any) => { next[r.dev_months] = Number(r.value) || 0; });
      setValues(next);
    })();
  }, [submissionId]);

  // Load values when switching loss or measure
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('large_loss_triangle_values')
        .select('dev_months,value')
        .eq('submission_id', submissionId)
        .eq('loss_identifier', selectedLossId)
        .eq('measure', measure);
      if (error) return;
      const next: Record<number, number> = {};
      (data || []).forEach((r: any) => { next[r.dev_months] = Number(r.value) || 0; });
      setValues(next);
    })();
  }, [selectedLossId, measure, submissionId]);

  // autosave current slice on changes
  useAutosave({ selectedLossId, measure, values }, async (payload) => {
    if (!submissionId || !payload.selectedLossId) return;
    setSaving(true);
    // delete slice
    await supabase.from('large_loss_triangle_values')
      .delete()
      .eq('submission_id', submissionId)
      .eq('loss_identifier', payload.selectedLossId)
      .eq('measure', payload.measure);
    // ensure header exists in DB by inserting zero-value row if none will be inserted
    const rows = devColumns
      .filter((m) => payload.values[m] !== undefined && payload.values[m] !== '')
      .map((m) => ({
        submission_id: submissionId,
        loss_identifier: payload.selectedLossId!,
        uw_or_acc_year: headers.find(h => h.loss_identifier === payload.selectedLossId!)?.uw_or_acc_year ?? null,
        description: headers.find(h => h.loss_identifier === payload.selectedLossId!)?.description ?? null,
        threshold: headers.find(h => h.loss_identifier === payload.selectedLossId!)?.threshold ?? 0,
        status: headers.find(h => h.loss_identifier === payload.selectedLossId!)?.status ?? 'Open',
        measure: payload.measure,
        dev_months: m,
        value: Number(payload.values[m]) || 0,
      }));
    const toInsert = rows.length ? rows : [{
      submission_id: submissionId,
      loss_identifier: payload.selectedLossId!,
      uw_or_acc_year: headers.find(h => h.loss_identifier === payload.selectedLossId!)?.uw_or_acc_year ?? null,
      description: headers.find(h => h.loss_identifier === payload.selectedLossId!)?.description ?? null,
      threshold: headers.find(h => h.loss_identifier === payload.selectedLossId!)?.threshold ?? 0,
      status: headers.find(h => h.loss_identifier === payload.selectedLossId!)?.status ?? 'Open',
      measure: payload.measure,
      dev_months: 0,
      value: 0,
    }];
    setProgress('0/0');
    await chunkedSave(toInsert, 400, async (chunk) => {
      await supabase.from('large_loss_triangle_values').insert(chunk);
    }, (done, total) => setProgress(`${done}/${total}`));
    setSaving(false);
    setLastSaved(new Date());
    setProgress('');
  });

  const headerColumns = [
    { key: 'loss_identifier', label: 'loss_identifier' },
    { key: 'uw_or_acc_year', label: 'uw_or_acc_year', type: 'number', step: '1', min: 1900 },
    { key: 'description', label: 'description' },
    { key: 'threshold', label: 'threshold', type: 'number', step: '0.01', min: 0 },
    { key: 'status', label: 'status' },
  ];

  const onHeaderChange = (idx: number, key: keyof Header, value: any) => {
    const copy = headers.slice();
    (copy[idx] as any)[key] = key === 'status' ? (value as string) : value;
    setHeaders(copy);
  };

  const addLoss = () => {
    const nextId = `LOSS-${headers.length + 1}`;
    setHeaders(prev => [...prev, { loss_identifier: nextId, description: '', threshold: 0, status: 'Open', uw_or_acc_year: undefined }]);
    setSelectedLossId(nextId);
    setValues({});
  };
  const removeLoss = (idx: number) => {
    if (headers.length <= 1) return;
    const id = headers[idx]?.loss_identifier;
    setHeaders(prev => prev.filter((_, i) => i !== idx));
    if (selectedLossId === id) setSelectedLossId((headers[0]?.loss_identifier) ?? null);
  };

  const devColumnsConfig = devColumns.map((m) => ({ key: String(m), label: `Dev ${m}`, type: 'number', step: '0.01', min: 0 }));
  const devRows = [devColumns.reduce<Record<string, any>>((acc, m) => { acc[String(m)] = values[m] ?? ''; return acc; }, {})];
  const onDevChange = (_: number, key: string, value: any) => {
    const m = Number(key);
    setValues(prev => ({ ...prev, [m]: value === '' ? '' : Number(value) }));
  };

  const addDevColumn = () => setDevEnd(prev => prev + 3);

  const totals = useMemo(() => devColumns.reduce((s, m) => s + (Number(values[m]) || 0), 0), [devColumns, values]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Loss Header List</h3>
          <button className="px-2 py-1 bg-blue-600 text-white rounded" onClick={addLoss}>Add Loss</button>
        </div>
        <FormTable<Header>
          columns={headerColumns as any}
          rows={headers}
          onChange={onHeaderChange as any}
          onRemoveRow={removeLoss}
          footerRender={
            <div className="flex gap-2 items-center text-sm">
              <span>Selected:</span>
              <select className="border rounded px-2 py-1" value={selectedLossId ?? ''} onChange={(e) => setSelectedLossId(e.target.value)}>
                {headers.map(h => (<option key={h.loss_identifier} value={h.loss_identifier}>{h.loss_identifier}</option>))}
              </select>
            </div>
          }
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Development Grid</h3>
            <select className="border rounded px-2 py-1" value={measure} onChange={(e) => setMeasure(e.target.value as Measure)}>
              <option value="paid">Paid</option>
              <option value="reserved">Reserved</option>
              <option value="incurred">Incurred</option>
            </select>
            <button className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded" onClick={addDevColumn}>Add Dev +3</button>
          </div>
          <div className="text-xs text-gray-500">{saving ? `Saving… ${progress}` : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : ''}</div>
        </div>
        <FormTable<any>
          columns={devColumnsConfig as any}
          rows={devRows}
          onChange={onDevChange as any}
          onPaste={() => setPasteOpen(true)}
          onImportCsv={() => {
            const inp = document.createElement('input');
            inp.type = 'file'; inp.accept = '.csv,text/csv';
            inp.onchange = async () => {
              const file = inp.files?.[0]; if (!file) return; const text = await file.text();
              const data = parseCsv(text);
              const first = data[0] ?? [];
              setValues(prev => {
                const next = { ...prev } as Record<number, number | ''>;
                for (let i = 0; i < first.length && i < devColumns.length; i++) {
                  const m = Number(devColumns[i]);
                  if (!Number.isFinite(m)) continue;
                  const v = Number(first[i]); if (!Number.isNaN(v)) next[m] = v;
                }
                return next;
              });
            };
            inp.click();
          }}
          footerRender={<div className="text-sm">Total: {totals.toLocaleString()}</div>}
        />
      </div>

      <PasteModal
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        title="Paste dev values (row across)"
        onApply={(rows) => {
          const first = rows[0] ?? [];
          setValues(prev => {
            const next = { ...prev } as Record<number, number | ''>;
            for (let i = 0; i < first.length && i < devColumns.length; i++) {
              const m = Number(devColumns[i]);
              if (!Number.isFinite(m)) continue;
              const v = Number(first[i]);
              if (!Number.isNaN(v)) next[m] = v;
            }
            return next;
          });
        }}
      />
    </div>
  );
}
