import React from 'react';
import { SubmissionMetaProvider as BaseProvider, useSubmissionMeta as useBase } from '../../context/SubmissionMeta';

export const SubmissionMetaProvider = BaseProvider as React.FC<{ submissionId: string; children: React.ReactNode }>;

export function useSubmissionMeta() {
  const ctx = useBase();
  const updateFromHeader = React.useCallback((payload: any) => {
    const patch: Record<string, unknown> = {};
    if (payload && Object.prototype.hasOwnProperty.call(payload, 'treaty_type')) patch.treaty_type = payload.treaty_type;
    if (payload && Object.prototype.hasOwnProperty.call(payload, 'currency_std_units')) patch.currency_std_units = payload.currency_std_units;
    if (Object.keys(patch).length) {
      void ctx.updateMeta(patch);
    }
  }, [ctx]);
  return { ...ctx, updateFromHeader } as unknown as { treatyType?: string; currencyStdUnits?: string; lastSavedAt?: Date; meta: any; updateMeta: typeof ctx.updateMeta; refresh: typeof ctx.refresh; updateFromHeader: (payload: any) => void };
}
