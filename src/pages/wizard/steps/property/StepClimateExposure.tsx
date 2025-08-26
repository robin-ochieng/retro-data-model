import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { z } from 'zod';
import FormTable from '../../../../components/FormTable';
import PasteModal from '../../../../components/PasteModal';
import { supabase } from '../../../../lib/supabase';
import { useAutosave } from '../../../../hooks/useAutosave';
import { toCsv } from '../../../../utils/csv';

const RowSchema = z.object({
  region_or_zone: z.string().min(1),
  peril: z.enum(['Flood', 'Drought', 'Windstorm', 'Cyclone', 'Wildfire', 'Earthquake', 'Other']),
  tsi: z.number().nonnegative().default(0),
  premium: z.number().nonnegative().default(0),
  notes: z.string().optional().default(''),
});
type Row = z.infer<typeof RowSchema>;

export default function StepClimateExposure() {
  const { submissionId } = useParams();
  const [rows, setRows] = useState<Row[]>([{ region_or_zone: '', peril: 'Flood', tsi: 0, premium: 0, notes: '' }]);
  const [errors, setErrors] = useState<Record<number, Partial<Record<keyof Row, string>>>>({});
  const [pasteOpen, setPasteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    (async () => {
      if (!submissionId) return;
      const res = await supabase.from('sheet_blobs').select('payload').eq('submission_id', submissionId).eq('sheet_name', 'Climate change exposure').maybeSingle();
      const payload = res.data?.payload as any;
      if (payload?.exposures) setRows(payload.exposures);
    })();
  }, [submissionId]);

  useAutosave(rows, async (val) => {
    if (!submissionId) return;
    setSaving(true);
    await supabase.from('sheet_blobs').upsert([
      { submission_id: submissionId, sheet_name: 'Climate change exposure', payload: { exposures: val } }
    ], { onConflict: 'submission_id,sheet_name' });
    setSaving(false);
    setLastSaved(new Date());
  });

  const columns = useMemo(() => [
    { key: 'region_or_zone', label: 'region_or_zone' },
    { key: 'peril', label: 'peril' },
    { key: 'tsi', label: 'tsi', type: 'number', step: '0.01', min: 0 },
    { key: 'premium', label: 'premium', type: 'number', step: '0.01', min: 0 },
    { key: 'notes', label: 'notes' },
  ], []);

  const onChange = (idx: number, key: keyof Row, value: any) => {
    const copy = rows.slice();
    (copy[idx] as any)[key] = value;
    const res = RowSchema.safeParse(copy[idx]);
    setErrors(prev => ({ ...prev, [idx]: res.success ? {} : { [res.error.issues[0]?.path[0] as keyof Row]: res.error.issues[0]?.message } }));
    setRows(copy);
  };

  const totals = useMemo(() => rows.reduce((acc, r) => ({ tsi: acc.tsi + (r.tsi || 0), premium: acc.premium + (r.premium || 0) }), { tsi: 0, premium: 0 }), [rows]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Climate change exposure</h3>
        <div className="text-xs text-gray-500">{saving ? 'Saving…' : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : ''}</div>
      </div>
      <FormTable<Row>
        columns={columns as any}
        rows={rows}
        onChange={onChange as any}
        onAddRow={() => setRows(prev => [...prev, { region_or_zone: '', peril: 'Flood', tsi: 0, premium: 0, notes: '' }])}
        onRemoveRow={(i) => setRows(prev => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)))}
        onPaste={() => setPasteOpen(true)}
        onExportCsv={() => {
          const csv = toCsv(rows as any, columns.map(c => c.key));
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'climate_exposure.csv'; a.click(); URL.revokeObjectURL(url);
        }}
        footerRender={<div className="text-sm">Totals — TSI: {totals.tsi.toLocaleString()} • Premium: {totals.premium.toLocaleString()}</div>}
      />
      <PasteModal open={pasteOpen} onClose={() => setPasteOpen(false)} onApply={(data) => {
        setRows(prev => {
          const copy = [...prev];
          data.forEach(cols => {
            const [region_or_zone, peril, tsi, premium, notes] = cols;
            copy.push({ region_or_zone: region_or_zone ?? '', peril: (peril as any) ?? 'Flood', tsi: Number(tsi) || 0, premium: Number(premium) || 0, notes: notes ?? '' });
          });
          return copy;
        });
      }} />
    </div>
  );
}
