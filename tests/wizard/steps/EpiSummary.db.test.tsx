import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import StepEpiSummary from '@/pages/wizard/steps/StepEpiSummary';
import { SubmissionMetaProvider } from '@/pages/wizard/SubmissionMetaContext';

// Spies we assert on
const api = { epiDelete: vi.fn(), epiInsert: vi.fn(), sheetUpdate: vi.fn(), sheetInsert: vi.fn() };

// Supabase mock
vi.mock('@/lib/supabase', () => {
  // Chainable helpers
  const mkEq = (next: any) => vi.fn(() => next);

  const epiDeleteChain: any = {
    delete: vi.fn(() => ({ eq: vi.fn(async () => { api.epiDelete(); return { data: null, error: null }; }) })),
  };

  const epiInsert: any = vi.fn(async (_rows: any[]) => { api.epiInsert(_rows); return { data: [], error: null }; });

  // For loads: return some default rows for initial render
  const epiHandler: any = {
    select: vi.fn(() => ({ eq: vi.fn(async () => ({
      data: [
        { estimate_type: 'Estimate A', period_label: '2024', epi_value: 120000, programme: 'Quota Share Treaty', treaty_type: 'Quota Share Treaty' },
      ], error: null,
    })) })),
    delete: epiDeleteChain.delete,
    insert: epiInsert,
  };

  // sheet_blobs select for EPI Summary and Header maybeSingle
  const sheetSelectChain: any = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          // Path used by SubmissionMeta: maybeSingle
          maybeSingle: vi.fn(async () => ({ data: { payload: { treaty_type: 'Quota Share Treaty', currency_std_units: 'USD' } }, error: null })),
          // Path used by EPI Summary load: order/limit
          order: vi.fn(() => ({ limit: vi.fn(async () => ({ data: [{ payload: { gwp_split: [{ section: 'Fire', premium: 1000 }], additional_comments: 'Loaded notes', treaty_type: 'Quota Share Treaty' } }], error: null })) })),
        })),
      })),
    })),
  };

  // Update chain: update(...).eq(...).eq(...).select('submission_id')
  const sheetUpdate: any = vi.fn(() => ({
    eq: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(async () => { api.sheetUpdate(); return { data: [{ submission_id: 'TEST-ID' }], error: null }; })
      }))
    }))
  }));
  const sheetInsert: any = vi.fn(async () => { api.sheetInsert(); return { data: [], error: null }; });

  const sheetHandler: any = {
    select: sheetSelectChain.select,
    update: sheetUpdate,
    insert: sheetInsert,
    eq: sheetSelectChain.eq,
    order: sheetSelectChain.order,
    limit: sheetSelectChain.limit,
  };

  // For SubmissionMetaProvider internal loads
  const headerMaybeSingle = async () => ({ data: { payload: { treaty_type: 'Quota Share Treaty', currency_std_units: 'USD' } }, error: null });
  const subMaybeSingle = async () => ({ data: { meta: {} }, error: null });

  return {
    supabase: {
      from: (table: string) => {
        if (table === 'epi_summary') return epiHandler;
        if (table === 'sheet_blobs') return sheetHandler;
        if (table === 'submissions') {
          return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: subMaybeSingle })) })) } as any;
        }
        return {} as any;
      },
    },
  };
});

function renderWithProviders(lob = 'property', submissionId = 'TEST-ID') {
  return render(
    <SubmissionMetaProvider submissionId={submissionId}>
      <MemoryRouter initialEntries={[`/wizard/${lob}/${submissionId}/epi-summary`]}> 
        <Routes>
          <Route path="/wizard/:lob/:submissionId/epi-summary" element={<StepEpiSummary />} />
        </Routes>
      </MemoryRouter>
    </SubmissionMetaProvider>
  );
}

describe('EPI Summary DB wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads rows and GWP split from DB', async () => {
    renderWithProviders();

    // EPI table should include the loaded Estimate Type
    const estimate = await screen.findByDisplayValue('Estimate A');
    expect(estimate).toBeTruthy();

    // GWP Split loaded
  const gwpSection = await screen.findByDisplayValue('Fire');
  expect(gwpSection).toBeTruthy();

    // Additional comments loaded
    const comments = screen.getByLabelText('Additional Comments');
    expect((comments as HTMLTextAreaElement).value).toBe('Loaded notes');
  });

  it('autosaves changes (delete+insert rows, update gwp blob)', async () => {
    const user = userEvent.setup();
    renderWithProviders();

    const comments = await screen.findByLabelText('Additional Comments');
    await user.clear(comments);
    await user.type(comments, 'New EPI note');

    await waitFor(() => {
      // Sheet update called
      expect(api.sheetUpdate).toHaveBeenCalled();
      // EPI table delete then insert
      expect(api.epiDelete).toHaveBeenCalled();
      expect(api.epiInsert).toHaveBeenCalled();
    });
  }, 10000);
});
