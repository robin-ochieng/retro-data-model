import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { z } from 'zod';
import FormTable from '../../../../components/FormTable';
import PasteModal from '../../../../components/PasteModal';
import { supabase } from '../../../../lib/supabase';
import { useAutosave } from '../../../../hooks/useAutosave';
import { chunkedSave } from '../../../../utils/chunkedSave';
import { toCsv } from '../../../../utils/csv';
import { humanizeHeader } from '../../../../lib/headerFormat';
import { NumberCell } from '../../../../components/table/NumberCell';
import { useAutoColumnSize, autoColumnClasses } from '../../../../components/table/useAutoColumnSize';
import { parseNumericInput } from '../../../../lib/numberFormat';

const RowSchema = z.object({
  rank: z.number().int().min(1),
  insured: z.string().optional().default(''),
  class_of_business: z.string().optional().default(''),
  occupation: z.string().optional().default(''),
  gross_sum_insured: z.number().default(0), // Allow negatives
  fac_sum_insured: z.number().default(0), // Allow negatives
  surplus_sum_insured: z.number().default(0), // Allow negatives
  quota_share_sum_insured: z.number().default(0), // Allow negatives (QS Sum Insured)
  net_sum_insured: z.number().default(0), // Allow negatives
  gross_premium: z.number().default(0), // Allow negatives
  fac_premium: z.number().default(0), // Allow negatives
  surplus_premium: z.number().default(0), // Allow negatives
});
type Row = z.infer<typeof RowSchema>;

export default function StepTop20Risks() {
  const { submissionId, lob } = useParams();
  const [rows, setRows] = useState<Row[]>(Array.from({ length: 20 }, (_, i) => ({ rank: i + 1, insured: '', class_of_business: '', occupation: '', gross_sum_insured: 0, fac_sum_insured: 0, surplus_sum_insured: 0, quota_share_sum_insured: 0, net_sum_insured: 0, gross_premium: 0, fac_premium: 0, surplus_premium: 0 })));
  const [errors, setErrors] = useState<Record<number, Partial<Record<keyof Row, string>>>>({});
  const [pasteOpen, setPasteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const tableRef = useAutoColumnSize();

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
    { key: 'rank', label: humanizeHeader('rank'), type: 'number', step: '1', min: 1, className: '', },
    { key: 'insured', label: humanizeHeader('insured') },
    { key: 'class_of_business', label: humanizeHeader('class_of_business') },
    { key: 'occupation', label: humanizeHeader('occupation') },
    { key: 'gross_sum_insured', label: humanizeHeader('gross_sum_insured'), type: 'number', step: '0.01', min: 0 },
    { key: 'fac_sum_insured', label: humanizeHeader('fac_sum_insured'), type: 'number', step: '0.01', min: 0 },
    { key: 'surplus_sum_insured', label: humanizeHeader('surplus_sum_insured'), type: 'number', step: '0.01', min: 0 },
    { key: 'quota_share_sum_insured', label: humanizeHeader('quota_share_sum_insured'), type: 'number', step: '0.01', min: 0 },
    { key: 'net_sum_insured', label: humanizeHeader('net_sum_insured'), type: 'number', step: '0.01', min: 0 },
    { key: 'gross_premium', label: humanizeHeader('gross_premium'), type: 'number', step: '0.01', min: 0 },
    { key: 'fac_premium', label: humanizeHeader('fac_premium'), type: 'number', step: '0.01', min: 0 },
    { key: 'surplus_premium', label: humanizeHeader('surplus_premium'), type: 'number', step: '0.01', min: 0 },
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

  // Define which columns are numeric (for NumberCell rendering)
  const numericColumns = new Set([
    'gross_sum_insured',
    'fac_sum_insured',
    'surplus_sum_insured',
    'quota_share_sum_insured',
    'net_sum_insured',
    'gross_premium',
    'fac_premium',
    'surplus_premium',
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Top 20 Risks</h3>
        <div className="flex gap-2 items-center">
          <button type="button" className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => setPasteOpen(true)}>
            Paste from Excel
          </button>
          {lob !== 'casualty' && (
            <button type="button" className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700" onClick={() => {
              // Use human-friendly headers for CSV export
              const keys = columns.map(c => c.key);
              const headers = columns.map(c => c.label);
              const csvRows = [
                headers.join(','),
                ...rows.map(row => keys.map(key => {
                  const val = (row as any)[key];
                  return typeof val === 'string' && val.includes(',') ? `"${val}"` : String(val ?? '');
                }).join(','))
              ];
              const csv = csvRows.join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'top_20_risks.csv'; a.click(); URL.revokeObjectURL(url);
            }}>
              Export CSV
            </button>
          )}
          <div className="text-xs text-gray-500">{saving ? 'Saving…' : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : ''}</div>
        </div>
      </div>

      <div className={autoColumnClasses.container}>
        <table ref={tableRef} className={`${autoColumnClasses.table} min-w-full border rounded`}>
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              {columns.map(col => (
                <th key={col.key} className="px-2 py-1 text-left whitespace-nowrap">{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="align-top">
                {columns.map(col => {
                  const colKey = col.key as keyof Row;
                  const value = row[colKey];

                  // Render NumberCell for numeric columns
                  if (numericColumns.has(col.key)) {
                    return (
                      <td key={col.key} className="px-2 py-1">
                        <NumberCell
                          value={value as number}
                          onChange={(newValue) => onChange(idx, colKey, newValue ?? 0)}
                          decimals={2}
                          className="w-full"
                        />
                      </td>
                    );
                  }

                  // Render plain input for text/rank columns
                  return (
                    <td key={col.key} className="px-2 py-1">
                      <input
                        type={col.type ?? 'text'}
                        step={col.step}
                        min={col.min}
                        aria-label={col.label}
                        value={value ?? ''}
                        onChange={e => {
                          const newValue = col.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value;
                          onChange(idx, colKey, newValue);
                        }}
                        className="px-2 py-1 border rounded w-full"
                      />
                      {errors?.[idx]?.[colKey] && (
                        <div className="text-xs text-red-600 mt-1">{String(errors[idx]![colKey])}</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={columns.length} className="px-2 py-2 bg-gray-50 dark:bg-gray-900">
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
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <PasteModal open={pasteOpen} onClose={() => setPasteOpen(false)} onApply={(data) => {
        setRows(prev => {
          // Helper to parse numbers with Excel paste compatibility
          const toNumber = (s: string | undefined) => {
            const parsed = parseNumericInput(s);
            return parsed ?? 0;
          };

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
              gross_sum_insured: toNumber(gsi),
              fac_sum_insured: toNumber(fsi),
              surplus_sum_insured: toNumber(ssi),
              quota_share_sum_insured: toNumber(qsi),
              net_sum_insured: toNumber(nsi),
              gross_premium: toNumber(gp),
              fac_premium: toNumber(fp),
              surplus_premium: toNumber(sp),
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
