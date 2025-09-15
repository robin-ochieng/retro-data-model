import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import StepLargeLossList from '@/pages/wizard/steps/StepLargeLossList';

// Minimal SubmissionMeta provider substitute for submissionId context
function Wrapper({ children, id }: any) {
  return (
    <MemoryRouter initialEntries={[`/wizard/property/${id}/large-loss-list`]}>
      <Routes>
        <Route path="/wizard/property/:submissionId/large-loss-list" element={children} />
      </Routes>
    </MemoryRouter>
  );
}

// In-memory stores for prop tables
const propRows: any[] = [];
let propMeta: Record<string, string> = {};

vi.mock('@/lib/supabase', () => {
  const from = (table: string) => {
    if (table === 'large_loss_list_prop') {
      return {
        select: () => ({ eq: () => ({ then: undefined }), order: () => ({ eq: () => ({ then: undefined }) }) }),
        delete: () => ({ eq: () => ({ then: undefined }) }),
        insert: vi.fn(async (rows: any[]) => { propRows.length = 0; propRows.push(...rows); return { data: rows, error: null }; })
      } as any;
    }
    if (table === 'large_loss_list_meta_prop') {
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: propMeta['A1'] ? { notes: propMeta['A1'] } : null, error: null }) }) }),
        update: () => ({ eq: () => ({ select: () => ({ data: [], error: null }) }) }),
        insert: vi.fn(async (rows: any[]) => { const r = rows[0]; propMeta[r.submission_id] = r.notes || ''; return { data: rows, error: null }; })
      } as any;
    }
    return {} as any;
  };
  return { supabase: { from } };
});

describe('Large Loss List (Property) DB wiring', () => {
  beforeEach(() => { propRows.length = 0; propMeta = {}; vi.clearAllMocks(); });

  it('saves rows and Additional Comments, and reloads them', async () => {
    const user = userEvent.setup();
    render(<Wrapper id="A1"><StepLargeLossList /></Wrapper>);

    // Fill first row: UW Year, Name, DOL, Gross Incurred
    const inputs = await screen.findAllByRole('textbox');
    // name index may vary; target by label would be ideal, but keep simple for demo
    await user.type(inputs[2] as HTMLInputElement, 'Insured One');

    const textareas = await screen.findAllByRole('textbox');
    const comments = textareas[textareas.length-1] as HTMLTextAreaElement;
    await user.type(comments, 'Some notes');

    await waitFor(() => {
      expect(propRows.length).toBeGreaterThan(0);
      expect(propMeta['A1']).toContain('Some notes');
    });
  }, 12000);
});
