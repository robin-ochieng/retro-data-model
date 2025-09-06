import React from 'react';
import { supabase } from '@/lib/supabase';
import type { Tables } from '../types/supabase';

type SubmissionMeta = Tables<'submissions'>['meta'];

export type SubmissionMetaCtx = {
  meta: SubmissionMeta | null;
  treatyType?: string;
  currencyStdUnits?: string;
  lastSavedAt?: Date;
  updateMeta: (patch: Partial<Record<string, unknown>>) => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = React.createContext<SubmissionMetaCtx | undefined>(undefined);

function deriveValues(meta: SubmissionMeta | null, headerPayload?: any) {
  // Prefer header payload if present, then fall back to meta
  const treatyType = (headerPayload?.treaty_type ?? (meta && typeof meta === 'object' ? (meta as any).treaty_type : undefined)) as string | undefined;
  const currencyStdUnits = (headerPayload?.currency_std_units ?? (meta && typeof meta === 'object' ? (meta as any).currency_std_units : undefined)) as string | undefined;
  return { treatyType, currencyStdUnits };
}

async function loadHeader(submissionId: string) {
  const { data, error } = await supabase
    .from('sheet_blobs')
    .select('payload')
    .eq('submission_id', submissionId)
    .eq('sheet_name', 'Header')
    .maybeSingle();
  if (error) return { payload: undefined as any, error };
  return { payload: data?.payload as any, error: null };
}

async function loadMeta(submissionId: string) {
  const { data, error } = await supabase
    .from('submissions')
    .select('meta')
    .eq('id', submissionId)
    .maybeSingle();
  if (error) return { meta: null as SubmissionMeta | null, error };
  return { meta: (data?.meta ?? null) as SubmissionMeta | null, error: null };
}

export const SubmissionMetaProvider: React.FC<{ submissionId: string; children: React.ReactNode }> = ({ submissionId, children }) => {
  const [meta, setMeta] = React.useState<SubmissionMeta | null>(null);
  const [treatyType, setTreatyType] = React.useState<string | undefined>(undefined);
  const [currencyStdUnits, setCurrencyStdUnits] = React.useState<string | undefined>(undefined);
  const [lastSavedAt, setLastSavedAt] = React.useState<Date | undefined>(undefined);

  const doRefresh = React.useCallback(async () => {
    if (!submissionId) return;
    const [m, h] = await Promise.all([loadMeta(submissionId), loadHeader(submissionId)]);
    if (!m.error) setMeta(m.meta);
    const { treatyType: tt, currencyStdUnits: cu } = deriveValues(m.meta, h.payload);
    setTreatyType(tt);
    setCurrencyStdUnits(cu);
  }, [submissionId]);

  React.useEffect(() => {
    void doRefresh();
  }, [doRefresh]);

  const updateMeta = React.useCallback(
    async (patch: Partial<Record<string, unknown>>) => {
      if (!submissionId || !patch || typeof patch !== 'object') return;

      // Merge with current meta locally first
      const current = meta && typeof meta === 'object' ? (meta as Record<string, unknown>) : {};
      const merged = { ...current, ...patch } as SubmissionMeta;

      // Best-effort: read-merge-write to submissions.meta
      const { error: updErr } = await supabase
        .from('submissions')
        .update({ meta: merged as any })
        .eq('id', submissionId);
      if (updErr) {
        console.warn('updateMeta submissions error:', updErr.message);
        return;
      }
      setMeta(merged);

      // If treaty_type or currency_std_units present, also update Header payload
      if (Object.prototype.hasOwnProperty.call(patch, 'treaty_type') || Object.prototype.hasOwnProperty.call(patch, 'currency_std_units')) {
        // Load current header, merge, then upsert
        const { payload } = await loadHeader(submissionId);
        const headerPayload = (payload && typeof payload === 'object' && !Array.isArray(payload) ? { ...payload } : {}) as Record<string, unknown>;
        if (Object.prototype.hasOwnProperty.call(patch, 'treaty_type')) headerPayload.treaty_type = patch.treaty_type as any;
        if (Object.prototype.hasOwnProperty.call(patch, 'currency_std_units')) headerPayload.currency_std_units = patch.currency_std_units as any;
        let upErr = null as any;
        const upRes = await supabase
          .from('sheet_blobs')
          .upsert(
            [
              {
                submission_id: submissionId,
                sheet_name: 'Header',
                payload: headerPayload as any,
              },
            ],
            { onConflict: 'submission_id,sheet_name' }
          );
        if (upRes.error) {
          upErr = upRes.error;
          // Fallback path for instances missing the composite unique/PK constraint
          if (/no unique or exclusion constraint/i.test(String(upRes.error.message))) {
            const upd = await supabase
              .from('sheet_blobs')
              .update({ payload: headerPayload as any })
              .eq('submission_id', submissionId)
              .eq('sheet_name', 'Header')
              .select('submission_id');
            if (!upd.error && Array.isArray(upd.data) && upd.data.length > 0) {
              upErr = null;
            } else if (upd.error) {
              upErr = upd.error;
            } else {
              const ins = await supabase
                .from('sheet_blobs')
                .insert([{ submission_id: submissionId, sheet_name: 'Header', payload: headerPayload as any }]);
              upErr = ins.error ?? null;
            }
          }
        }
        if (upErr) console.warn('updateMeta header save error:', upErr.message ?? upErr);
        // Reflect derived values locally
        const { treatyType: tt, currencyStdUnits: cu } = deriveValues(merged, headerPayload);
        setTreatyType(tt);
        setCurrencyStdUnits(cu);
      } else {
        // Update derived values from meta only
        const { treatyType: tt, currencyStdUnits: cu } = deriveValues(merged);
        setTreatyType(tt);
        setCurrencyStdUnits(cu);
      }

      setLastSavedAt(new Date());
    },
    [submissionId, meta]
  );

  const value = React.useMemo<SubmissionMetaCtx>(
    () => ({ meta, treatyType, currencyStdUnits, lastSavedAt, updateMeta, refresh: doRefresh }),
    [meta, treatyType, currencyStdUnits, lastSavedAt, updateMeta, doRefresh]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useSubmissionMeta(): SubmissionMetaCtx {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error('useSubmissionMeta must be used within a SubmissionMetaProvider');
  return ctx;
}
