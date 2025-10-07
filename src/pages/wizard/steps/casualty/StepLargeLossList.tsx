import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../../../lib/supabase';
import { useAutosave } from '../../../../hooks/useAutosave';
import FormTable from '../../../../components/FormTable';
import PasteModal from '../../../../components/PasteModal';
import { humanizeHeader } from '../../../../lib/headerFormat';
// CSV import/export removed per requirements

type Row = {
  date_of_loss: string;
  uw_year: number | '';
  insured: string;
  cause_of_loss: string;
  incurred_fgu: number | '';
  paid_fgu: number | '';
  os_fgu: number | '';
  fac_paid: number | '';
  fac_os: number | '';
  surplus_paid: number | '';
  surplus_os: number | '';
  quota_share_paid: number | '';
  quota_share_os: number | '';
  net_paid: number | '';
  net_os: number | '';
};

const SHEET = 'Large Loss List (Casualty)';

export default function StepLargeLossList() {
  const { submissionId } = useParams();
  const [rows, setRows] = useState<Row[]>(Array.from({ length: 10 }, () => ({
    date_of_loss: '', uw_year: '', insured: '', cause_of_loss: '', incurred_fgu: '', paid_fgu: '', os_fgu: '',
    fac_paid: '', fac_os: '', surplus_paid: '', surplus_os: '', quota_share_paid: '', quota_share_os: '', net_paid: '', net_os: ''
  })));
  const [comments, setComments] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showPaste, setShowPaste] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!submissionId) return;
      const { data: list } = await (supabase as any)
        .from('large_loss_list_cas')
        .select('*')
        .eq('submission_id', submissionId)
        .order('id', { ascending: true });
      if (!mounted) return;
      if (Array.isArray(list) && list.length) {
        const mapped = list.map((r: any) => ({
          date_of_loss: r.dol ?? '',
          uw_year: r.uw_year ?? '',
          insured: r.insured ?? '',
          cause_of_loss: r.cause_of_loss ?? '',
          incurred_fgu: r.incurred_fgu ?? '',
          paid_fgu: r.paid_fgu ?? '',
          os_fgu: r.os_fgu ?? '',
          fac_paid: r.fac_paid ?? '',
          fac_os: r.fac_os ?? '',
          surplus_paid: r.surplus_paid ?? '',
          surplus_os: r.surplus_os ?? '',
          quota_share_paid: r.qs_paid ?? '',
          quota_share_os: r.qs_os ?? '',
          net_paid: r.net_paid ?? '',
          net_os: r.net_os ?? '',
        } as Row));
        setRows(mapped);
      }
      const { data: meta } = await (supabase as any)
        .from('large_loss_list_meta_cas')
        .select('notes')
        .eq('submission_id', submissionId)
        .maybeSingle();
      if (meta) setComments(String((meta as any).notes ?? ''));
    })();
    return () => { mounted = false; };
  }, [submissionId]);

  useAutosave({ rows, comments }, async (val) => {
    if (!submissionId) return;
    // Replace pattern: delete old rows then insert current
    await (supabase as any).from('large_loss_list_cas').delete().eq('submission_id', submissionId);
    if (Array.isArray(val.rows) && val.rows.length) {
      const toInsert = val.rows.map((r) => ({
        submission_id: submissionId,
        dol: r.date_of_loss || null,
        uw_year: r.uw_year === '' ? null : Number(r.uw_year),
        insured: r.insured || null,
        cause_of_loss: r.cause_of_loss || null,
        incurred_fgu: r.incurred_fgu === '' ? null : Number(r.incurred_fgu),
        paid_fgu: r.paid_fgu === '' ? null : Number(r.paid_fgu),
        os_fgu: r.os_fgu === '' ? null : Number(r.os_fgu),
        fac_paid: r.fac_paid === '' ? null : Number(r.fac_paid),
        fac_os: r.fac_os === '' ? null : Number(r.fac_os),
        surplus_paid: r.surplus_paid === '' ? null : Number(r.surplus_paid),
        surplus_os: r.surplus_os === '' ? null : Number(r.surplus_os),
        qs_paid: r.quota_share_paid === '' ? null : Number(r.quota_share_paid),
        qs_os: r.quota_share_os === '' ? null : Number(r.quota_share_os),
        net_paid: r.net_paid === '' ? null : Number(r.net_paid),
        net_os: r.net_os === '' ? null : Number(r.net_os),
      }));
      await (supabase as any).from('large_loss_list_cas').insert(toInsert);
    }
    const upd = await (supabase as any)
      .from('large_loss_list_meta_cas')
      .update({ notes: val.comments ?? '', updated_at: new Date().toISOString() })
      .eq('submission_id', submissionId)
      .select('submission_id');
    if (!upd.data || (Array.isArray(upd.data) && upd.data.length === 0)) {
      await (supabase as any).from('large_loss_list_meta_cas').insert([{ submission_id: submissionId, notes: val.comments ?? '' }]);
    }
    setLastSaved(new Date());
  });

  const columns = useMemo(() => [
    { key: 'date_of_loss', label: humanizeHeader('dol'), type: 'text' as const },
    { key: 'uw_year', label: humanizeHeader('uw_year'), type: 'number' as const },
    { key: 'insured', label: humanizeHeader('insured'), type: 'text' as const },
    { key: 'cause_of_loss', label: humanizeHeader('cause_of_loss'), type: 'text' as const },
    { key: 'incurred_fgu', label: 'Incurred Claims F.G.U.*', type: 'number' as const },
    { key: 'paid_fgu', label: 'Paid Claims F.G.U.*', type: 'number' as const },
    { key: 'os_fgu', label: 'O/S Claims F.G.U.*', type: 'number' as const },
    { key: 'fac_paid', label: humanizeHeader('fac_paid'), type: 'number' as const },
    { key: 'fac_os', label: 'FAC O/S', type: 'number' as const },
    { key: 'surplus_paid', label: humanizeHeader('surplus_paid'), type: 'number' as const },
    { key: 'surplus_os', label: 'Surplus O/S', type: 'number' as const },
    { key: 'quota_share_paid', label: humanizeHeader('quota_share_paid'), type: 'number' as const },
    { key: 'quota_share_os', label: humanizeHeader('quota_share_os'), type: 'number' as const },
    { key: 'net_paid', label: humanizeHeader('net_paid'), type: 'number' as const },
    { key: 'net_os', label: 'Net O/S', type: 'number' as const },
  ], []);
  // CSV export headers removed

  const onChange = (idx: number, key: keyof Row, value: any) => {
    const copy = rows.slice();
    if (['uw_year','incurred_fgu','paid_fgu','os_fgu','fac_paid','fac_os','surplus_paid','surplus_os','quota_share_paid','quota_share_os','net_paid','net_os'].includes(key as string)) {
      (copy[idx] as any)[key] = value === '' ? '' : Number(value);
    } else {
      (copy[idx] as any)[key] = value;
    }
    setRows(copy);
  };

  function applyGrid(grid: string[][]) {
    if (!grid.length) return;
    const looksLikeHeader = grid[0]?.[0]?.toLowerCase?.().includes('d.o.l') || grid[0]?.[1]?.toLowerCase?.().includes('u/w');
    const start = looksLikeHeader ? 1 : 0;
    const next = rows.map(r => ({ ...r }));
    for (let i = 0; i < grid.length - start; i++) {
      const src = grid[start + i]; if (!src) break;
      const idx = i < next.length ? i : -1;
      const parsed: Partial<Row> = {
        date_of_loss: src[0] ?? '',
        uw_year: src[1] ? Number(src[1]) : '',
        insured: src[2] ?? '',
        cause_of_loss: src[3] ?? '',
        incurred_fgu: src[4] ? Number(src[4]) : '',
        paid_fgu: src[5] ? Number(src[5]) : '',
        os_fgu: src[6] ? Number(src[6]) : '',
        fac_paid: src[7] ? Number(src[7]) : '',
        fac_os: src[8] ? Number(src[8]) : '',
        surplus_paid: src[9] ? Number(src[9]) : '',
        surplus_os: src[10] ? Number(src[10]) : '',
        quota_share_paid: src[11] ? Number(src[11]) : '',
        quota_share_os: src[12] ? Number(src[12]) : '',
        net_paid: src[13] ? Number(src[13]) : '',
        net_os: src[14] ? Number(src[14]) : '',
      };
      if (idx >= 0) next[idx] = { ...next[idx], ...parsed } as Row;
      else next.push(parsed as Row);
    }
    setRows(next);
  }

  // CSV import/export removed

  return (
    <div className="space-y-6">
      <div className="rounded shadow p-4 bg-white dark:bg-gray-800">
        <h3 className="font-semibold mb-3">Large Loss List</h3>
        <FormTable<Row>
          columns={columns as any}
          rows={rows}
          onChange={onChange}
          onPaste={() => setShowPaste(true)}
          onAddRow={() => setRows(prev => [...prev, { date_of_loss: '', uw_year: '', insured: '', cause_of_loss: '', incurred_fgu: '', paid_fgu: '', os_fgu: '', fac_paid: '', fac_os: '', surplus_paid: '', surplus_os: '', quota_share_paid: '', quota_share_os: '', net_paid: '', net_os: '' }])}
          onRemoveRow={(idx) => setRows(prev => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)))}
        />
        <PasteModal open={showPaste} onClose={() => setShowPaste(false)} onApply={applyGrid} title="Paste Large Loss List" />
      </div>
      <div className="rounded shadow p-4 bg-white dark:bg-gray-800">
        <label className="block">
          <span className="block text-sm font-medium mb-1">Additional Comments</span>
          <textarea className="input" placeholder="Notes…" value={comments} onChange={(e) => setComments(e.target.value)} />
        </label>
        <div className="text-right text-sm text-gray-500 mt-2">{lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Autosaving…'}</div>
      </div>
    </div>
  );
}
