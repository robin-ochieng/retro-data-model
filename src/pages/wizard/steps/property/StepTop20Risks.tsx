import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { z } from 'zod';
import FormTable from '../../../../components/FormTable';
import PasteModal from '../../../../components/PasteModal';
import { supabase } from '../../../../lib/supabase';
import { useAutosave } from '../../../../hooks/useAutosave';
import { chunkedSave } from '../../../../utils/chunkedSave';
import { toCsv } from '../../../../utils/csv';

const RowSchema = z.object({
  rank: z.number().int().min(1),
  insured: z.string().optional().default(''),
  class_of_business: z.string().optional().default(''),
  occupation: z.string().optional().default(''),
  gross_sum_insured: z.number().nonnegative().default(0),
  fac_sum_insured: z.number().nonnegative().default(0),
  surplus_sum_insured: z.number().nonnegative().default(0),
  quota_share_sum_insured: z.number().nonnegative().default(0),
  net_sum_insured: z.number().nonnegative().default(0),
  gross_premium: z.number().nonnegative().default(0),
  fac_premium: z.number().nonnegative().default(0),
  surplus_premium: z.number().nonnegative().default(0),
});
type Row = z.infer<typeof RowSchema>;

export default function StepTop20Risks() {
  const { submissionId } = useParams();
  const [rows, setRows] = useState<Row[]>(Array.from({ length: 20 }, (_, i) => ({ rank: i + 1, insured: '', class_of_business: '', occupation: '', gross_sum_insured: 0, fac_sum_insured: 0, surplus_sum_insured: 0, quota_share_sum_insured: 0, net_sum_insured: 0, gross_premium: 0, fac_premium: 0, surplus_premium: 0 })));
  const [errors, setErrors] = useState<Record<number, Partial<Record<keyof Row, string>>>>({});
  const [pasteOpen, setPasteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    (async () => {
      if (!submissionId) return;
      const { data, error } = await supabase.from('top_risks').select('*').eq('submission_id', submissionId);
      if (!error && Array.isArray(data) && data.length) {
        // Normalize to exactly 20 rows by rank 1..20
        const base: Row[] = Array.from({ length: 20 }, (_, i) => ({
          rank: i + 1,
          insured: '',
          class_of_business: '',
          occupation: '',
          gross_sum_insured: 0,
          fac_sum_insured: 0,
          surplus_sum_insured: 0,
          quota_share_sum_insured: 0,
          net_sum_insured: 0,
          gross_premium: 0,
          fac_premium: 0,
          surplus_premium: 0,
        }));
        for (const d of data as any[]) {
          const r = Number(d.rank);
          if (Number.isFinite(r) && r >= 1 && r <= 20) {
            base[r - 1] = {
              rank: r,
              insured: d.insured ?? '',
              class_of_business: d.class_of_business ?? '',
              occupation: d.occupation ?? '',
              gross_sum_insured: Number(d.gross_sum_insured) || 0,
              fac_sum_insured: Number(d.fac_sum_insured) || 0,
              surplus_sum_insured: Number(d.surplus_sum_insured) || 0,
              quota_share_sum_insured: Number(d.quota_share_sum_insured) || 0,
              net_sum_insured: Number(d.net_sum_insured) || 0,
              gross_premium: Number(d.gross_premium) || 0,
              fac_premium: Number(d.fac_premium) || 0,
              surplus_premium: Number(d.surplus_premium) || 0,
            };
          }
        }
        setRows(base);
      }
    })();
  }, [submissionId]);

  useAutosave(rows, async (val) => {
    if (!submissionId) return;
    setSaving(true);
    await supabase.from('top_risks').delete().eq('submission_id', submissionId);
    const toInsert = val.map(r => ({ submission_id: submissionId, ...r }));
    await chunkedSave(toInsert, 400, async (chunk) => { await supabase.from('top_risks').insert(chunk); });
    setSaving(false);
    setLastSaved(new Date());
  });

  const columns = useMemo(() => [
    { key: 'rank', label: 'rank', type: 'number', step: '1', min: 1, className: '', },
    { key: 'insured', label: 'insured' },
    { key: 'class_of_business', label: 'class_of_business' },
    { key: 'occupation', label: 'occupation' },
    { key: 'gross_sum_insured', label: 'gross_sum_insured', type: 'number', step: '0.01', min: 0 },
    { key: 'fac_sum_insured', label: 'fac_sum_insured', type: 'number', step: '0.01', min: 0 },
    { key: 'surplus_sum_insured', label: 'surplus_sum_insured', type: 'number', step: '0.01', min: 0 },
    { key: 'quota_share_sum_insured', label: 'quota_share_sum_insured', type: 'number', step: '0.01', min: 0 },
    { key: 'net_sum_insured', label: 'net_sum_insured', type: 'number', step: '0.01', min: 0 },
    { key: 'gross_premium', label: 'gross_premium', type: 'number', step: '0.01', min: 0 },
    { key: 'fac_premium', label: 'fac_premium', type: 'number', step: '0.01', min: 0 },
    { key: 'surplus_premium', label: 'surplus_premium', type: 'number', step: '0.01', min: 0 },
  ], []);

  const onChange = (idx: number, key: keyof Row, value: any) => {
    const copy = rows.slice();
    (copy[idx] as any)[key] = value;
    const res = RowSchema.safeParse(copy[idx]);
    setErrors(prev => ({ ...prev, [idx]: res.success ? {} : { [res.error.issues[0]?.path[0] as keyof Row]: res.error.issues[0]?.message } }));
    setRows(copy);
  };

  const totals = useMemo(() => rows.reduce((acc, r) => ({
    gross_sum_insured: acc.gross_sum_insured + (r.gross_sum_insured || 0),
    fac_sum_insured: acc.fac_sum_insured + (r.fac_sum_insured || 0),
    surplus_sum_insured: acc.surplus_sum_insured + (r.surplus_sum_insured || 0),
    quota_share_sum_insured: acc.quota_share_sum_insured + (r.quota_share_sum_insured || 0),
    net_sum_insured: acc.net_sum_insured + (r.net_sum_insured || 0),
    gross_premium: acc.gross_premium + (r.gross_premium || 0),
    fac_premium: acc.fac_premium + (r.fac_premium || 0),
    surplus_premium: acc.surplus_premium + (r.surplus_premium || 0),
  }), { gross_sum_insured: 0, fac_sum_insured: 0, surplus_sum_insured: 0, quota_share_sum_insured: 0, net_sum_insured: 0, gross_premium: 0, fac_premium: 0, surplus_premium: 0 }), [rows]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Top 20 Risks</h3>
        <div className="text-xs text-gray-500">{saving ? 'Saving…' : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : ''}</div>
      </div>
      <FormTable<Row>
        columns={columns as any}
        rows={rows}
        onChange={onChange as any}
        onPaste={() => setPasteOpen(true)}
        onExportCsv={() => {
          const csv = toCsv(rows as any, columns.map(c => c.key));
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'top_20_risks.csv'; a.click(); URL.revokeObjectURL(url);
        }}
        footerRender={
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 text-sm">
            <div>Gross SI: {totals.gross_sum_insured.toLocaleString()}</div>
            <div>FAC SI: {totals.fac_sum_insured.toLocaleString()}</div>
            <div>Surplus SI: {totals.surplus_sum_insured.toLocaleString()}</div>
            <div>QS SI: {totals.quota_share_sum_insured.toLocaleString()}</div>
            <div>Net SI: {totals.net_sum_insured.toLocaleString()}</div>
            <div>Gross Prem: {totals.gross_premium.toLocaleString()}</div>
            <div>FAC Prem: {totals.fac_premium.toLocaleString()}</div>
            <div>Surplus Prem: {totals.surplus_premium.toLocaleString()}</div>
          </div>
        }
      />
      <PasteModal open={pasteOpen} onClose={() => setPasteOpen(false)} onApply={(data) => {
        setRows(prev => {
          // Start from current rows; overwrite up to 20 entries.
          const next = prev.slice(0, 20);
          let seqIndex = 0;
          const placeNext = (obj: Row, idx?: number) => {
            if (idx !== undefined && idx >= 0 && idx < 20) {
              next[idx] = { ...obj, rank: idx + 1 };
              return;
            }
            while (seqIndex < 20 && next[seqIndex]) seqIndex++;
            if (seqIndex < 20) {
              next[seqIndex] = { ...obj, rank: seqIndex + 1 };
              seqIndex++;
            }
          };
          for (const cols of data) {
            const [rank, insured, cob, occ, gsi, fsi, ssi, qsi, nsi, gp, fp, sp] = cols;
            const obj: Row = {
              rank: 0,
              insured: insured ?? '',
              class_of_business: cob ?? '',
              occupation: occ ?? '',
              gross_sum_insured: Number(gsi) || 0,
              fac_sum_insured: Number(fsi) || 0,
              surplus_sum_insured: Number(ssi) || 0,
              quota_share_sum_insured: Number(qsi) || 0,
              net_sum_insured: Number(nsi) || 0,
              gross_premium: Number(gp) || 0,
              fac_premium: Number(fp) || 0,
              surplus_premium: Number(sp) || 0,
            };
            const r = Number(rank);
            if (Number.isFinite(r) && r >= 1 && r <= 20) placeNext(obj, r - 1);
            else placeNext(obj);
          }
          // Ensure exactly 20 rows exist
          while (next.length < 20) {
            next.push({ rank: next.length + 1, insured: '', class_of_business: '', occupation: '', gross_sum_insured: 0, fac_sum_insured: 0, surplus_sum_insured: 0, quota_share_sum_insured: 0, net_sum_insured: 0, gross_premium: 0, fac_premium: 0, surplus_premium: 0 });
          }
          return next.slice(0, 20);
        });
      }} />
    </div>
  );
}
