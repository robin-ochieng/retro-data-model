import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import StepTop20Risks from '@/pages/wizard/steps/property/StepTop20Risks';
import { SubmissionMetaProvider } from '@/pages/wizard/SubmissionMetaContext';

// In-memory store for top_risks rows keyed by submission_id
interface TopRiskRow { submission_id: string; rank: number; insured: string; class_of_business: string; occupation: string; gross_sum_insured: number; fac_sum_insured: number; surplus_sum_insured: number; quota_share_sum_insured: number; net_sum_insured: number; gross_premium: number; fac_premium: number; surplus_premium: number; }
const store: { top_risks: TopRiskRow[] } = { top_risks: [] };

const spies = { delete: vi.fn(), insert: vi.fn() };

vi.mock('@/lib/supabase', () => {
  const topRisksHandler: any = {
    select: vi.fn(() => ({ eq: vi.fn(async (_col: string, submission_id: string) => ({ data: store.top_risks.filter(r => r.submission_id === submission_id), error: null })) })),
    delete: vi.fn(() => ({ eq: vi.fn(async (_col: string, submission_id: string) => { spies.delete(); store.top_risks = store.top_risks.filter(r => r.submission_id !== submission_id); return { data: null, error: null }; }) })),
    insert: vi.fn(async (rows: any[]) => { spies.insert(rows); store.top_risks.push(...rows); return { data: rows, error: null }; }),
  };
  // sheet_blobs handler used by SubmissionMeta context to load header etc.
  const sheetBlobsHandler: any = {
    select: vi.fn(() => ({
      eq: function (_c1: string, submission_id: string) {
        return {
          eq: (_c2: string, sheet_name: string) => ({
            maybeSingle: async () => ({ data: { payload: { rows: [] } }, error: null })
          })
        };
      }
    })),
    upsert: vi.fn(async () => ({ data: null, error: null })),
  };
  const submissionsHandler: any = {
    select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: { meta: {} }, error: null })) })) })),
  };
  return { supabase: { from: (table: string) => (table === 'top_risks' ? topRisksHandler : table === 'sheet_blobs' ? sheetBlobsHandler : table === 'submissions' ? submissionsHandler : ({} as any)) } };
});

function renderWithProviders(submissionId = 'S-1') {
  return render(
    <SubmissionMetaProvider submissionId={submissionId}>
      <MemoryRouter initialEntries={[`/wizard/property/${submissionId}/top-20-risks`]}> 
        <Routes>
          <Route path="/wizard/:lob/:submissionId/top-20-risks" element={<StepTop20Risks />} />
        </Routes>
      </MemoryRouter>
    </SubmissionMetaProvider>
  );
}

describe('Top 20 Risks autosave & persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.top_risks = [];
  });
  afterEach(() => { vi.useRealTimers(); });

  it('autosaves edited row (delete+insert) and persists on reload', async () => {
    const user = userEvent.setup();
    renderWithProviders('SUB-1');

    // Edit first row insured & a numeric field
  // Find all text inputs; after rank numeric field, first text input is insured
  const allInputs = await screen.findAllByRole('textbox');
  const insuredInput = allInputs[0] as HTMLElement;
  await user.type(insuredInput!, 'Acme Corp');

  // NumberCell renders as a clickable div in display mode, need to click to enter edit mode
  // Find the first NumberCell (gross_sum_insured) by its button role with text "0" or "Edit number: 0"
  const numberCells = await screen.findAllByRole('button', { name: /Edit number/ });
  // Click the first numeric cell to enter edit mode
  await user.click(numberCells[0]!);
  
  // Now find the input that appeared in edit mode, type the value, and commit with Enter
  const editInput = await screen.findByLabelText('Edit number');
  await user.clear(editInput);
  await user.type(editInput, '1000{Enter}');

    await waitFor(() => {
      expect(spies.delete).toHaveBeenCalled();
      expect(spies.insert).toHaveBeenCalled();
      // Data persisted in store
      const saved = store.top_risks.filter(r => r.submission_id === 'SUB-1');
      expect(saved.length).toBe(20);
  expect(saved.find(r => r.rank === 1)?.insured).toBe('Acme Corp');
      expect(saved.find(r => r.rank === 1)?.gross_sum_insured).toBe(1000);
    });

    // Simulate component remount (reload) to verify persistence
    renderWithProviders('SUB-1');
    await waitFor(() => {
      // The input should have the persisted value (Acme Corp)
      const persisted = screen.getByDisplayValue('Acme Corp');
      expect(persisted).toBeTruthy();
    });
  }, 12000);

  it('persists clearing a row value', async () => {
    const user = userEvent.setup();
    renderWithProviders('SUB-2');
    // Set then clear a value
  const allInputs = await screen.findAllByRole('textbox');
  const insuredInput = allInputs[0] as HTMLElement;
  await user.type(insuredInput!, 'Temp Name');
    await waitFor(() => { expect(spies.insert).toHaveBeenCalled(); });
    // Clear again
  await user.clear(insuredInput!);
    await waitFor(() => {
      const saved = store.top_risks.filter(r => r.submission_id === 'SUB-2');
      const first = saved.find(r => r.rank === 1);
      expect(first?.insured).toBe('');
    });
  }, 12000);
});
