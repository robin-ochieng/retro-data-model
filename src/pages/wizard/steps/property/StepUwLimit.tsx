import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { z } from 'zod';
import { supabase } from '../../../../lib/supabase';
import { useAutosave } from '../../../../hooks/useAutosave';
import FormTable from '../../../../components/FormTable';
import PasteModal from '../../../../components/PasteModal';

const RowSchema = z.object({
  risk_code: z.string().optional().default(''),
  limit: z.string().optional().default(''), // free text or numeric string
});
type Row = z.infer<typeof RowSchema>;

const SHEET = 'UW Limit';

export default function StepUwLimit() {
  const { submissionId } = useParams();
  const [rows, setRows] = useState<Row[]>([{ risk_code: '', limit: '' }]);
  const [errors, setErrors] = useState<Record<number, Partial<Record<keyof Row, string>>>>({});
  const [additionalComments, setAdditionalComments] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showPaste, setShowPaste] = useState(false);

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
        setRows(limits.map((l: any) => ({ risk_code: l.risk_code ?? '', limit: (l as any).limit_value ?? '' })));
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
            if (limits2 && limits2.length) setRows(limits2.map((l: any) => ({ risk_code: l.risk_code ?? '', limit: (l as any).limit_value ?? '' })));
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
    // Provide both legacy 'limit' JSON key (used by replace_uw_limits function) and an explicit 'limit_value' mirror for future-proofing.
    const cleaned = (val.rows || []).map(r => ({ risk_code: r.risk_code ?? '', limit: r.limit ?? '', limit_value: r.limit ?? '' }));
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
    (copy[idx] as any)[key] = value;
    setRows(copy);
    setErrors(prev => ({ ...prev, [idx]: validateRow(copy[idx] as Row) }));
  };
  const onAddRow = () => setRows(prev => [...prev, { risk_code: '', limit: '' }]);
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
      limit: String(r[1] ?? '').trim(),
    }));
    const cleaned = mapped.filter(m => (m.risk_code?.length ?? 0) > 0 || (m.limit?.length ?? 0) > 0);
    setRows(cleaned.length ? cleaned : [{ risk_code: '', limit: '' }]);
  }

  return (
    <div className="space-y-6">
      <div className="rounded shadow p-4 bg-white dark:bg-gray-800">
        <h3 className="font-semibold mb-3">UW Limit</h3>
        <FormTable<Row>
          columns={columns as any}
          rows={rows}
          onChange={onChange}
          onAddRow={onAddRow}
          onRemoveRow={onRemoveRow}
          errors={errors}
          onPaste={() => setShowPaste(true)}
          lastSavedAt={lastSaved}
        />
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
