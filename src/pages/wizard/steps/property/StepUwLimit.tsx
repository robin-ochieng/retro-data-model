import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { z } from 'zod';
import { supabase } from '../../../../lib/supabase';
import { useAutosave } from '../../../../hooks/useAutosave';
import FormTable from '../../../../components/FormTable';
import PasteModal from '../../../../components/PasteModal';
import { NumberCell } from '../../../../components/table/NumberCell';
import { useAutoColumnSize, autoColumnClasses } from '../../../../components/table/useAutoColumnSize';
import { parseNumericInput } from '../../../../lib/numberFormat';

const RowSchema = z.object({
  risk_code: z.string().optional().default(''),
  limit: z.number().nullable().optional().default(null), // Allow negatives and decimals
});
type Row = z.infer<typeof RowSchema>;

const SHEET = 'UW Limit';

export default function StepUwLimit() {
  const { submissionId } = useParams();
  const [rows, setRows] = useState<Row[]>([{ risk_code: '', limit: null }]);
  const [errors, setErrors] = useState<Record<number, Partial<Record<keyof Row, string>>>>({});
  const [additionalComments, setAdditionalComments] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showPaste, setShowPaste] = useState(false);
  const tableRef = useAutoColumnSize();

  // Load relational data; fallback migrate from blob if needed
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!submissionId) return;
      // 1. Try relational rows
      const { data: limits, error: limitsErr } = await supabase
        .from('uw_limits')
        .select('risk_code,limit_value')
        .eq('submission_id', submissionId)
        .order('id', { ascending: true });
      if (!mounted) return;
      if (!limitsErr && limits && limits.length) {
        setRows(limits.map((l: any) => ({ 
          risk_code: l.risk_code ?? '', 
          limit: parseNumericInput((l as any).limit_value) 
        })));
      }

      // 2. Meta (comments)
      const { data: meta, error: metaErr } = await supabase
        .from('uw_limit_meta')
        .select('additional_comments')
        .eq('submission_id', submissionId)
        .maybeSingle();
      if (!mounted) return;
      if (!metaErr && meta) {
        setAdditionalComments(meta.additional_comments ?? '');
      }

      // 3. If no relational data loaded AND legacy blob exists, attempt server migration
      if ((!limits || limits.length === 0) && (!meta || !meta.additional_comments)) {
        const { data: blob, error: blobErr } = await supabase
          .from('sheet_blobs')
          .select('payload')
          .eq('submission_id', submissionId)
          .eq('sheet_name', SHEET)
          .maybeSingle();
        if (!mounted) return;
        if (!blobErr && blob?.payload) {
          // Attempt RPC migration
            await supabase.rpc('migrate_uw_limit_from_blob', { p_submission_id: submissionId });
            // Reload relational after migration
            const { data: limits2 } = await supabase
              .from('uw_limits')
              .select('risk_code,limit_value')
              .eq('submission_id', submissionId)
              .order('id', { ascending: true });
            if (!mounted) return;
            if (limits2 && limits2.length) setRows(limits2.map((l: any) => ({ 
              risk_code: l.risk_code ?? '', 
              limit: parseNumericInput((l as any).limit_value) 
            })));
            const { data: meta2 } = await supabase
              .from('uw_limit_meta')
              .select('additional_comments')
              .eq('submission_id', submissionId)
              .maybeSingle();
            if (meta2) setAdditionalComments(meta2.additional_comments ?? '');
        }
      }
    })();
    return () => { mounted = false; };
  }, [submissionId]);

  // Autosave to relational tables via RPC replace_uw_limits
  useAutosave({ rows, additionalComments }, async (val) => {
    if (!submissionId) return;
    // Convert numeric limits to strings for database storage
    const cleaned = (val.rows || []).map(r => ({ 
      risk_code: r.risk_code ?? '', 
      limit: r.limit != null ? String(r.limit) : '', 
      limit_value: r.limit != null ? String(r.limit) : '' 
    }));
    const { error } = await supabase.rpc('replace_uw_limits', {
      p_submission_id: submissionId,
      p_rows: cleaned as any, // supabase-js will jsonb encode
      p_additional_comments: val.additionalComments ?? ''
    });
    if (!error) setLastSaved(new Date()); else {
      // Basic diagnostic logging (could be surfaced in UI if needed later)
      // eslint-disable-next-line no-console
      console.error('replace_uw_limits failed', error.message);
    }
  });

  const columns = useMemo(() => [
    { key: 'risk_code', label: 'Risk Code' },
    { key: 'limit', label: 'Limits' },
  ], []);

  const validateRow = (r: Row) => {
    const res = RowSchema.safeParse(r);
    if (res.success) return {};
    const map: Partial<Record<keyof Row, string>> = {};
    for (const issue of res.error.issues) map[issue.path[0] as keyof Row] = issue.message;
    return map;
  };

  const onChange = (idx: number, key: keyof Row, value: any) => {
    const copy = rows.slice();
    if (key === 'risk_code') {
      // Trim risk_code on change
      (copy[idx] as any)[key] = typeof value === 'string' ? value.trim() : value;
    } else {
      (copy[idx] as any)[key] = value;
    }
    setRows(copy);
    setErrors(prev => ({ ...prev, [idx]: validateRow(copy[idx] as Row) }));
  };
  const onAddRow = () => setRows(prev => [...prev, { risk_code: '', limit: null }]);
  const onRemoveRow = (idx: number) => setRows(prev => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));

  // Paste helpers
  const maybeHasHeader = (cells: string[], expected: string[]) => {
    const lc = (cells || []).map(c => String(c).trim().toLowerCase());
    let hits = 0;
    expected.forEach(e => { if (lc.some(c => c.includes(e))) hits += 1; });
    return hits >= Math.max(1, Math.ceil(expected.length / 3));
  };
  function applyGrid(grid: string[][]) {
    if (!grid || grid.length === 0) return;
    let start = 0;
    const first = grid[0] ?? [];
    if (maybeHasHeader(first, ['risk', 'code', 'limit'])) start = 1;
    const mapped: Row[] = grid.slice(start).map(r => ({
      risk_code: String(r[0] ?? '').trim(),
      limit: parseNumericInput(r[1]), // Parse numeric input for Excel compatibility
    }));
    const cleaned = mapped.filter(m => (m.risk_code?.length ?? 0) > 0 || m.limit != null);
    setRows(cleaned.length ? cleaned : [{ risk_code: '', limit: null }]);
  }

  return (
    <div className="space-y-6">
      <div className="rounded shadow p-4 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">UW Limit</h3>
          <div className="flex gap-2 items-center">
            <button type="button" className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => setShowPaste(true)}>
              Paste from Excel
            </button>
            <div className="text-xs text-gray-500">{lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Autosaving…'}</div>
          </div>
        </div>

        <div className={autoColumnClasses.container}>
          <table ref={tableRef} className={`${autoColumnClasses.table} min-w-full border rounded`}>
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                {columns.map(col => (
                  <th key={col.key} className="px-2 py-1 text-left whitespace-nowrap">{col.label}</th>
                ))}
                <th className="px-2 py-1 text-left whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className="align-top">
                  <td className="px-2 py-1">
                    <div>
                      <input
                        type="text"
                        value={row.risk_code ?? ''}
                        onChange={(e) => onChange(idx, 'risk_code', e.target.value)}
                        placeholder="Risk Code"
                        className="px-2 py-1 border rounded w-full"
                      />
                      {errors[idx]?.risk_code && (
                        <div className="text-xs text-red-600 mt-1">{errors[idx]!.risk_code}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-1">
                    <div>
                      <NumberCell
                        value={row.limit}
                        onChange={(newValue) => onChange(idx, 'limit', newValue)}
                        decimals={2}
                        className="w-full"
                      />
                      {errors[idx]?.limit && (
                        <div className="text-xs text-red-600 mt-1">{errors[idx]!.limit}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-1">
                    <button
                      type="button"
                      className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      onClick={() => onRemoveRow(idx)}
                      disabled={rows.length <= 1}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center mt-3">
          <button
            type="button"
            className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
            onClick={onAddRow}
          >
            Add Row
          </button>
        </div>
      </div>
      <div className="rounded shadow p-4 bg-white dark:bg-gray-800">
        <label className="block">
          <span className="block text-sm font-medium mb-1">Additional Comments</span>
          <textarea className="input" placeholder="Notes…" value={additionalComments} onChange={(e) => setAdditionalComments(e.target.value)} />
        </label>
        <div className="text-right text-sm text-gray-500 mt-2">{lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Autosaving…'}</div>
      </div>
      <PasteModal open={showPaste} onClose={() => setShowPaste(false)} onApply={applyGrid} title="Paste from Excel — UW Limit" />
    </div>
  );
}
