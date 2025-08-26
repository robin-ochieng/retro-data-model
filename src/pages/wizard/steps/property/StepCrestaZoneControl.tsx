import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { z } from 'zod';
import FormTable from '../../../../components/FormTable';
import PasteModal from '../../../../components/PasteModal';
import { supabase } from '../../../../lib/supabase';
import { useAutosave } from '../../../../hooks/useAutosave';
import { chunkedSave } from '../../../../utils/chunkedSave';
import { toCsv, parseCsv } from '../../../../utils/csv';

const RowSchema = z.object({
  zone_code: z.string().min(1),
  zone_description: z.string().optional().default(''),
  class_name: z.enum(['Buildings', 'Contents', 'Motor', 'BI', 'Others']),
  amount_gross_net_of_fac: z.number().nonnegative().default(0),
  amount_net: z.number().nonnegative().default(0),
});
type Row = z.infer<typeof RowSchema>;

export default function StepCrestaZoneControl() {
  const { submissionId } = useParams();
  const [rows, setRows] = useState<Row[]>([{ zone_code: '', zone_description: '', class_name: 'Buildings', amount_gross_net_of_fac: 0, amount_net: 0 }]);
  const [errors, setErrors] = useState<Record<number, Partial<Record<keyof Row, string>>>>({});
  const [pasteOpen, setPasteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    (async () => {
      if (!submissionId) return;
      const { data, error } = await supabase.from('cresta_zone_aggregates').select('*').eq('submission_id', submissionId);
      if (!error && Array.isArray(data) && data.length) {
        setRows(data.map((d: any) => ({
          zone_code: d.zone_code,
          zone_description: d.zone_description ?? '',
          class_name: (d.class_name as Row['class_name']) ?? 'Buildings',
          amount_gross_net_of_fac: Number(d.amount_gross_net_of_fac) || 0,
          amount_net: Number(d.amount_net) || 0,
        })));
      }
    })();
  }, [submissionId]);

  useAutosave(rows, async (val) => {
    if (!submissionId) return;
    setSaving(true);
    await supabase.from('cresta_zone_aggregates').delete().eq('submission_id', submissionId);
    const toInsert = val.map(r => ({ submission_id: submissionId, ...r }));
    await chunkedSave(toInsert, 400, async (chunk) => { await supabase.from('cresta_zone_aggregates').insert(chunk); });
    setSaving(false);
    setLastSaved(new Date());
  });

  const columns = useMemo(() => [
    { key: 'zone_code', label: 'zone_code' },
    { key: 'zone_description', label: 'zone_description' },
    { key: 'class_name', label: 'class_name' },
    { key: 'amount_gross_net_of_fac', label: 'amount_gross_net_of_fac', type: 'number', step: '0.01', min: 0 },
    { key: 'amount_net', label: 'amount_net', type: 'number', step: '0.01', min: 0 },
  ], []);

  const onChange = (idx: number, key: keyof Row, value: any) => {
    const copy = rows.slice();
    (copy[idx] as any)[key] = value;
    const res = RowSchema.safeParse(copy[idx]);
    setErrors(prev => ({ ...prev, [idx]: res.success ? {} : { [res.error.issues[0]?.path[0] as keyof Row]: res.error.issues[0]?.message } }));
    setRows(copy);
  };

  const totals = useMemo(() => rows.reduce((acc, r) => ({
    amount_gross_net_of_fac: acc.amount_gross_net_of_fac + (r.amount_gross_net_of_fac || 0),
    amount_net: acc.amount_net + (r.amount_net || 0),
  }), { amount_gross_net_of_fac: 0, amount_net: 0 }), [rows]);

  const grouped = useMemo(() => {
    const map = new Map<string, { rows: Row[]; subtotal_gross: number; subtotal_net: number }>();
    rows.forEach(r => {
      const g = map.get(r.zone_code) || { rows: [], subtotal_gross: 0, subtotal_net: 0 };
      g.rows.push(r);
      g.subtotal_gross += r.amount_gross_net_of_fac || 0;
      g.subtotal_net += r.amount_net || 0;
      map.set(r.zone_code, g);
    });
    return Array.from(map.entries());
  }, [rows]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Cresta Zone Control</h3>
        <div className="text-xs text-gray-500">{saving ? 'Saving…' : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : ''}</div>
      </div>
      <FormTable<Row>
        columns={columns as any}
        rows={rows}
        onChange={onChange as any}
        onAddRow={() => setRows(prev => [...prev, { zone_code: '', zone_description: '', class_name: 'Buildings', amount_gross_net_of_fac: 0, amount_net: 0 }])}
        onRemoveRow={(i) => setRows(prev => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)))}
        onPaste={() => setPasteOpen(true)}
        onExportCsv={() => {
          const csv = toCsv(rows as any, columns.map(c => c.key));
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'cresta_zone_control.csv'; a.click(); URL.revokeObjectURL(url);
        }}
      />

      <div className="mt-4 p-3 rounded bg-gray-50 dark:bg-gray-900 text-sm">
        <div className="font-medium mb-1">Grand totals</div>
        <div className="flex gap-6">
          <div>amount_gross_net_of_fac: {totals.amount_gross_net_of_fac.toLocaleString()}</div>
          <div>amount_net: {totals.amount_net.toLocaleString()}</div>
        </div>
      </div>

      <div className="mt-6">
        <div className="font-medium mb-2">Grouped by zone_code</div>
        <div className="space-y-3">
          {grouped.map(([zone, g]) => (
            <div key={zone} className="border rounded p-2">
              <div className="text-sm font-semibold mb-1">{zone}</div>
              <div className="text-xs text-gray-600 mb-2">Subtotal gross: {g.subtotal_gross.toLocaleString()} • Subtotal net: {g.subtotal_net.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>

      <PasteModal open={pasteOpen} onClose={() => setPasteOpen(false)} onApply={(data) => {
        setRows(prev => {
          const copy = [...prev];
          data.forEach(cols => {
            const [zone_code, zone_description, class_name, gross, net] = cols;
            copy.push({ zone_code: zone_code ?? '', zone_description: zone_description ?? '', class_name: (class_name as any) ?? 'Buildings', amount_gross_net_of_fac: Number(gross) || 0, amount_net: Number(net) || 0 });
          });
          return copy;
        });
      }} />
    </div>
  );
}
