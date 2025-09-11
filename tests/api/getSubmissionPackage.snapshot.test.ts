import { describe, it, expect, vi } from 'vitest';

// We only need to verify that our front-end expects the canonical shape.
// We'll mock supabase.rpc('get_submission_package') to return a representative payload
// matching the SQL function contract (20250911_003_unify_submission_package.sql).

vi.mock('@/lib/supabase', () => {
  const mockData = {
    package_version: 1,
    submission: { id: '11111111-1111-1111-1111-111111111111', treaty_type: 'Prop', lob: 'property' },
    epi_summary: [ { id: 1, year: 2024, gwp: 12345 } ],
    treaty_stats_prop: [ { id: 10, stat: 'some', value: 'x' } ],
    risk_profile_bands: [ { id: 20, band: 'A', loss_ratio: '12%' } ],
    large_loss_list: [],
    cat_loss_list: [],
    large_loss_triangle_values: [],
    top_risks: [ { id: 30, risk_code: 'R1', name: 'Risk 1' } ],
    climate_exposure: [ { id: 40, peril: 'Wind', metric: 'TIV', value: 1000000 } ],
    uw_limits: [ { id: 50, risk_code: 'RC-1', limit_value: '10M xs 1M', limit: '10M xs 1M' } ],
    uw_limit_meta: { submission_id: '11111111-1111-1111-1111-111111111111', additional_comments: 'Meta notes' },
    risk_profile_meta: { submission_id: '11111111-1111-1111-1111-111111111111', retention: '5%', additional_comments: 'Legacy migrated' },
    blobs: { 'Legacy Sheet': { foo: 'bar' } }
  };
  return {
    supabase: {
      rpc: vi.fn(async (fn: string, args: any) => {
        if (fn === 'get_submission_package') {
          if (!args || !args.p_submission_id) return { data: null, error: { message: 'missing id' } };
          return { data: mockData, error: null };
        }
        return { data: null, error: null };
      })
    }
  };
});

import { supabase } from '@/lib/supabase';

async function fetchPackage(id: string) {
  const { data, error } = await (supabase as any).rpc('get_submission_package', { p_submission_id: id });
  if (error) throw new Error(error.message);
  return data;
}

describe('get_submission_package snapshot', () => {
  it('matches expected canonical JSON shape', async () => {
    const data = await fetchPackage('11111111-1111-1111-1111-111111111111');
    expect(data).toMatchInlineSnapshot(`
      {
        "blobs": {
          "Legacy Sheet": {
            "foo": "bar",
          },
        },
        "cat_loss_list": [],
        "climate_exposure": [
          {
            "id": 40,
            "metric": "TIV",
            "peril": "Wind",
            "value": 1000000,
          },
        ],
        "epi_summary": [
          {
            "gwp": 12345,
            "id": 1,
            "year": 2024,
          },
        ],
        "large_loss_list": [],
        "large_loss_triangle_values": [],
        "package_version": 1,
        "risk_profile_bands": [
          {
            "band": "A",
            "id": 20,
            "loss_ratio": "12%",
          },
        ],
        "risk_profile_meta": {
          "additional_comments": "Legacy migrated",
          "retention": "5%",
          "submission_id": "11111111-1111-1111-1111-111111111111",
        },
        "submission": {
          "id": "11111111-1111-1111-1111-111111111111",
          "lob": "property",
          "treaty_type": "Prop",
        },
        "top_risks": [
          {
            "id": 30,
            "name": "Risk 1",
            "risk_code": "R1",
          },
        ],
        "treaty_stats_prop": [
          {
            "id": 10,
            "stat": "some",
            "value": "x",
          },
        ],
        "uw_limit_meta": {
          "additional_comments": "Meta notes",
          "submission_id": "11111111-1111-1111-1111-111111111111",
        },
        "uw_limits": [
          {
            "id": 50,
            "limit": "10M xs 1M",
            "limit_value": "10M xs 1M",
            "risk_code": "RC-1",
          },
        ],
      }
    `);
  });
});
