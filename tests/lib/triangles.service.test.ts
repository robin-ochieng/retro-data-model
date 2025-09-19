import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase', () => {
  return {
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      })),
      rpc: vi.fn(async () => ({ data: 1, error: null })),
    },
  };
});

import { supabase } from '@/lib/supabase';
import { getPropertyTriangle, replacePropertyTriangle, upsertPropertyTriangleCell } from '@/lib/triangles';

describe('triangles service', () => {
  beforeEach(() => {
    (supabase.from as any).mockClear?.();
    (supabase.rpc as any).mockClear?.();
  });

  it('fetches triangle rows ordered and filtered', async () => {
    await getPropertyTriangle('sub-1');
    expect(supabase.from).toHaveBeenCalledWith('property_aggregate_triangle_values');
  });

  it('upserts a single cell via RPC', async () => {
    await upsertPropertyTriangleCell({
      submissionId: 'sub-1',
      measure: 'written_premium',
      uwYear: 2024,
      developmentMonths: 12,
      value: 123.45,
    });
    expect(supabase.rpc).toHaveBeenCalledWith('upsert_property_aggregate_triangle_cell', {
      p_submission_id: 'sub-1',
      p_measure: 'written_premium',
      p_uw_year: 2024,
      p_development_months: 12,
      p_value: 123.45,
    });
  });

  it('batch replaces rows via RPC', async () => {
    const count = await replacePropertyTriangle({
      submissionId: 'sub-1',
      rows: [
        { measure: 'paid_losses', uw_year: 2023, development_months: 6, value: 100 },
        { measure: 'loss_reserves', uw_year: 2023, development_months: 6, value: 50 },
      ] as any,
      deleteMissing: true,
    });
    expect(count).toBe(1);
    expect(supabase.rpc).toHaveBeenCalledWith('replace_property_aggregate_triangle', {
      p_submission_id: 'sub-1',
      p_rows: [
        { measure: 'paid_losses', uw_year: 2023, development_months: 6, value: 100 },
        { measure: 'loss_reserves', uw_year: 2023, development_months: 6, value: 50 },
      ],
      p_delete_missing: true,
    });
  });
});
