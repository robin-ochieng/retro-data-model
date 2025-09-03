import React from 'react';
import { supabase } from '../../lib/supabase';

type SubmissionMeta = {
  treatyType: string;
  refresh: () => Promise<void>;
  updateFromHeader: (payload: any) => void;
};

const Ctx = React.createContext<SubmissionMeta | null>(null);

export function SubmissionMetaProvider({ submissionId, children }: { submissionId?: string; children: React.ReactNode }) {
  const [treatyType, setTreatyType] = React.useState<string>('');

  const refresh = React.useCallback(async () => {
    if (!submissionId) return;
    const { data, error } = await supabase
      .from('sheet_blobs')
      .select('payload')
      .eq('submission_id', submissionId)
      .eq('sheet_name', 'Header')
      .maybeSingle();
    if (!error && data?.payload) {
      const t = (data.payload as any)?.treaty_type || 'Quota Share Treaty';
      setTreatyType(t);
    }
  }, [submissionId]);

  const updateFromHeader = React.useCallback((payload: any) => {
    const t = payload?.treaty_type || 'Quota Share Treaty';
    setTreatyType(t);
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const value = React.useMemo(() => ({ treatyType, refresh, updateFromHeader }), [treatyType, refresh, updateFromHeader]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSubmissionMeta() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error('useSubmissionMeta must be used within SubmissionMetaProvider');
  return ctx;
}
