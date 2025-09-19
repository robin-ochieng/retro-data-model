import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as supa from '../../src/lib/supabase';
import { replaceCrestaSection, upsertCrestaCell } from '../../src/lib/cresta';

vi.mock('../../src/lib/supabase', () => {
  return {
    supabase: {
      rpc: vi.fn(() => ({ data: 1, error: null })),
    },
  };
});

describe('cresta service', () => {
  beforeEach(() => {
    (supa.supabase.rpc as any).mockClear();
  });

  it('upsertCrestaCell calls RPC with correct args', async () => {
    await upsertCrestaCell({
      submissionId: 'sub1',
      section: 'personal',
      zone: 3,
      category: 'buildings',
      zoneDescription: 'Z3',
      gross: 100,
      net: 80,
    });
    expect(supa.supabase.rpc).toHaveBeenCalledWith('upsert_property_cresta_zone_value', expect.objectContaining({
      p_submission_id: 'sub1',
      p_section: 'personal',
      p_zone: 3,
      p_category: 'buildings',
      p_zone_description: 'Z3',
      p_gross: 100,
      p_net: 80,
    }));
  });

  it('replaceCrestaSection calls RPC with rows', async () => {
    await replaceCrestaSection({
      submissionId: 'sub1',
      section: 'sum_insured',
      rows: [
        { zone: 1, zone_description: 'A', category: null, gross: 10, net: 9 },
        { zone: 0, zone_description: 'Unallocated', category: null, gross: 5, net: 4 },
      ],
    });
    expect(supa.supabase.rpc).toHaveBeenCalledWith('replace_property_cresta_zone_section', expect.objectContaining({
      p_submission_id: 'sub1',
      p_section: 'sum_insured',
      p_rows: expect.any(Array),
      p_delete_missing: false,
    }));
  });
});
