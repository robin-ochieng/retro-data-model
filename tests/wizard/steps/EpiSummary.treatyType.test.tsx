import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import StepEpiSummary from '@/pages/wizard/steps/StepEpiSummary';
import { SubmissionMetaProvider, useSubmissionMeta } from '@/pages/wizard/SubmissionMetaContext';

// Spies we assert on
const api = { epiDelete: vi.fn(), epiInsert: vi.fn(), sheetUpdate: vi.fn(), sheetInsert: vi.fn() };

// Supabase mock
vi.mock('@/lib/supabase', () => {
  // epi_summary table handlers
  const epiDeleteChain: any = {
    delete: vi.fn(() => ({ eq: vi.fn(async () => { api.epiDelete(); return { data: null, error: null }; }) })),
  };
  const epiInsert: any = vi.fn(async (rows: any[]) => { api.epiInsert(rows); return { data: [], error: null }; });

  // For loads: return no rows initially so UI starts blank/default
  const epiHandler: any = {
    select: vi.fn(() => ({ eq: vi.fn(async () => ({ data: [], error: null })) })),
    delete: epiDeleteChain.delete,
    insert: epiInsert,
  };

  // sheet_blobs select for Header maybeSingle and EPI Summary payload order/limit
  const sheetSelectChain: any = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          // Path used by SubmissionMeta: maybeSingle
          maybeSingle: vi.fn(async () => ({ data: { payload: { treaty_type: 'Quota Share Treaty', currency_std_units: 'USD' } }, error: null })),
          // Path used by EPI Summary load: order/limit
          order: vi.fn(() => ({ limit: vi.fn(async () => ({ data: [], error: null })) })),
          limit: vi.fn(async () => ({ data: [], error: null })),
        })),
      })),
    })),
  };

  // Update chain: update(...).eq(...).eq(...).select('submission_id')
  const sheetUpdate: any = vi.fn(() => ({
    eq: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(async () => { api.sheetUpdate(); return { data: [], error: null }; })
      }))
    }))
  }));
  const sheetInsert: any = vi.fn(async () => { api.sheetInsert(); return { data: [], error: null }; });
  const sheetUpsert: any = vi.fn(async (_rows: any[]) => ({ data: [], error: null }));

  const sheetHandler: any = {
    select: sheetSelectChain.select,
    update: sheetUpdate,
  insert: sheetInsert,
  upsert: sheetUpsert,
    eq: sheetSelectChain.eq,
    order: sheetSelectChain.order,
    limit: sheetSelectChain.limit,
  };

  // For SubmissionMetaProvider internal loads/updates
  const submissionsSelectChain: any = {
    select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: { meta: {} }, error: null })) })) })),
  };
  const submissionsUpdateChain: any = {
    update: vi.fn(() => ({ eq: vi.fn(async () => ({ data: null, error: null })) })),
  };

  return {
    supabase: {
      from: (table: string) => {
        if (table === 'epi_summary') return epiHandler;
        if (table === 'sheet_blobs') return sheetHandler;
        if (table === 'submissions') {
          return {
            select: submissionsSelectChain.select,
            eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: { meta: {} }, error: null })) })),
            update: submissionsUpdateChain.update,
          } as any;
        }
        return {} as any;
      },
    },
  };
});

function renderWithProviders(lob = 'property', submissionId = 'TEST-ID', extra?: React.ReactNode) {
  return render(
    <SubmissionMetaProvider submissionId={submissionId}>
      {extra}
      <MemoryRouter initialEntries={[`/wizard/${lob}/${submissionId}/epi-summary`]}> 
        <Routes>
          <Route path="/wizard/:lob/:submissionId/epi-summary" element={<StepEpiSummary />} />
        </Routes>
      </MemoryRouter>
    </SubmissionMetaProvider>
  );
}

function MetaChanger() {
  const { updateMeta } = useSubmissionMeta();
  return (
    <button onClick={() => updateMeta({ treaty_type: 'Surplus Treaty' })} aria-label="Change Treaty">Change Treaty</button>
  );
}

describe('EPI Summary treatyType enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('overrides pasted treaty type with Client Details treatyType', async () => {
    const user = userEvent.setup();
    renderWithProviders('property', 'TEST-ID');

  // Open Paste from Excel within the EPI section only
  const epiHeader = await screen.findByText('Premium Summary (EPI)');
  const epiSection = epiHeader.closest('div');
  expect(epiSection).toBeTruthy();
  const pasteBtn = within(epiSection as HTMLElement).getByText('Paste from Excel');
  await user.click(pasteBtn);

    const textarea = await screen.findByPlaceholderText('Paste cells from Excel or CSV here');
    // TSV with a mismatched treaty type in col1 (ignored), then Estimate, Period, EPI
    await user.type(textarea, 'Surplus Treaty\tEstimate X\t2024\t1,234.56');

    // Apply
    const apply = screen.getByRole('button', { name: 'Apply' });
    await user.click(apply);

    // Treaty Type input should reflect Client Details (Quota Share), not pasted value
    const treatyInputs = await screen.findAllByLabelText('Treaty Type (from Client Details)');
    expect((treatyInputs[0] as HTMLInputElement).value).toBe('Quota Share Treaty');

    // Estimate field present
    const estInput = await screen.findByDisplayValue('Estimate X');
    expect(estInput).toBeInTheDocument();
  }, 15000);

  it('cascades treatyType change and autosaves (delete+insert)', async () => {
    const user = userEvent.setup();
    renderWithProviders('property', 'TEST-ID', <MetaChanger />);

    // Seed one row via paste so autosave has content to write
  const epiHeader = await screen.findByText('Premium Summary (EPI)');
  const epiSection = epiHeader.closest('div');
  expect(epiSection).toBeTruthy();
  const pasteBtn = within(epiSection as HTMLElement).getByText('Paste from Excel');
  await user.click(pasteBtn);
    const textarea = await screen.findByPlaceholderText('Paste cells from Excel or CSV here');
    await user.type(textarea, 'Quota Share Treaty\tEstimate Y\t2025\t2,000');
    const apply = screen.getByRole('button', { name: 'Apply' });
    await user.click(apply);

    // Change treaty via meta
    const changeBtn = await screen.findByLabelText('Change Treaty');
    await user.click(changeBtn);

    // Treaty inputs should update to new value
    await waitFor(async () => {
      const treatyInputs = await screen.findAllByLabelText('Treaty Type (from Client Details)');
      expect((treatyInputs[0] as HTMLInputElement).value).toBe('Surplus Treaty');
    }, { timeout: 10000 });

    // Autosave should have triggered delete then insert
    await waitFor(() => {
      expect(api.epiDelete).toHaveBeenCalled();
      expect(api.epiInsert).toHaveBeenCalled();
    }, { timeout: 12000 });
  }, 20000);
});
