import React from 'react';
import { supabase } from '../lib/supabase';
import type { Tables, Database, Json } from '../types/supabase';

type SubmissionMetaType = Tables<'submissions'>['meta'];

export type SubmissionMetaCtx = {
  meta: SubmissionMetaType | null;
  treatyType?: string;
  currencyStdUnits?: string;
  lastSavedAt?: Date;
  updateMeta: (patch: Partial<Record<string, unknown>>) => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = React.createContext<SubmissionMetaCtx | undefined>(undefined);

function extractFromHeader(payload: any | null | undefined) {
  const treatyType = (payload?.treaty_type ?? payload?.programme ?? '') as string | undefined;
  const currencyStdUnits = (payload?.currency_std_units ?? payload?.currency ?? '') as string | undefined;
  return { treatyType, currencyStdUnits };
}

export const SubmissionMetaProvider: React.FC<{ submissionId: string; children: React.ReactNode }> = ({ submissionId, children }) => {
  const [meta, setMeta] = React.useState<SubmissionMetaType | null>(null);
  const [headerPayload, setHeaderPayload] = React.useState<Record<string, unknown> | null>(null);
  const [treatyType, setTreatyType] = React.useState<string | undefined>();
  const [currencyStdUnits, setCurrencyStdUnits] = React.useState<string | undefined>();
  const [lastSavedAt, setLastSavedAt] = React.useState<Date | undefined>();

  const refresh = React.useCallback(async () => {
    if (!submissionId) return;
    // Load submissions.meta
    const sub = await supabase
      .from('submissions')
      .select('meta')
      .eq('id', submissionId)
      .maybeSingle();
    if (sub.error) {
      console.warn('Failed to load submissions.meta:', sub.error.message);
    } else {
      setMeta((sub.data?.meta as SubmissionMetaType) ?? null);
    }

    // Load Header payload
    const hdr = await supabase
      .from('sheet_blobs')
      .select('payload')
      .eq('submission_id', submissionId)
      .eq('sheet_name', 'Header')
      .maybeSingle();
    if (hdr.error) {
      console.warn('Failed to load Header payload:', hdr.error.message);
    }
    const payload = (hdr.data?.payload as any) ?? null;
    setHeaderPayload(payload ?? null);
    const derived = extractFromHeader(payload);
    setTreatyType(derived.treatyType);
    setCurrencyStdUnits(derived.currencyStdUnits);
  }, [submissionId]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const updateMeta = React.useCallback<SubmissionMetaCtx['updateMeta']>(async (patch) => {
    try {
      // Merge meta client-side and persist
      const current = (meta ?? {}) as Record<string, unknown>;
      const merged = { ...current, ...patch } as SubmissionMetaType;
      const upd = await supabase
        .from('submissions')
        .update({ meta: merged as Database['public']['Tables']['submissions']['Row']['meta'] })
        .eq('id', submissionId)
        .select('meta')
        .single();
      if (upd.error) {
        console.warn('Failed to update submissions.meta:', upd.error.message);
      } else {
        setMeta(upd.data.meta as SubmissionMetaType);
        setLastSavedAt(new Date());
      }

      // If treaty_type or currency_std_units present, also upsert to Header payload (merge)
      const hasTreaty = Object.prototype.hasOwnProperty.call(patch, 'treaty_type');
      const hasCurrency = Object.prototype.hasOwnProperty.call(patch, 'currency_std_units');
      if (hasTreaty || hasCurrency) {
        const nextPayload: Json = {
          ...((headerPayload ?? {}) as any),
          ...(hasTreaty ? { treaty_type: patch.treaty_type as any } : {}),
          ...(hasCurrency ? { currency_std_units: patch.currency_std_units as any } : {}),
        } as unknown as Json;
        const up = await supabase
          .from('sheet_blobs')
          .upsert(
            [{ submission_id: submissionId, sheet_name: 'Header', payload: nextPayload }],
            { onConflict: 'submission_id,sheet_name' }
          )
          .select('payload')
          .single();
        if (up.error) {
          console.warn('Failed to upsert Header payload:', up.error.message);
        } else {
          const saved = up.data?.payload as any;
          setHeaderPayload(saved ?? null);
          const { treatyType: tt, currencyStdUnits: cu } = extractFromHeader(saved);
          setTreatyType(tt);
          setCurrencyStdUnits(cu);
          setLastSavedAt(new Date());
        }
      }
    } catch (e) {
      console.warn('updateMeta error', e);
    }
  }, [submissionId, meta, headerPayload]);

  const value = React.useMemo<SubmissionMetaCtx>(() => ({
    meta,
    treatyType,
    currencyStdUnits,
    lastSavedAt,
    updateMeta,
    refresh,
  }), [meta, treatyType, currencyStdUnits, lastSavedAt, updateMeta, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useSubmissionMeta(): SubmissionMetaCtx {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error('useSubmissionMeta must be used within SubmissionMetaProvider');
  return ctx;
}
