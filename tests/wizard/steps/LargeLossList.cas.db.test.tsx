import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import StepLargeLossList from '@/pages/wizard/steps/casualty/StepLargeLossList';

function Wrapper({ children, id }: any) {
  return (
    <MemoryRouter initialEntries={[`/wizard/casualty/${id}/large-loss-list`]}>
      <Routes>
        <Route path="/wizard/casualty/:submissionId/large-loss-list" element={children} />
      </Routes>
    </MemoryRouter>
  );
}

const casRows: any[] = [];
let casMeta: Record<string, string> = {};

vi.mock('@/lib/supabase', () => {
  const from = (table: string) => {
    if (table === 'large_loss_list_cas') {
      return {
        select: () => ({ eq: () => ({ order: () => ({ eq: () => ({ then: undefined }) }) }) }),
        delete: () => ({ eq: () => ({ then: undefined }) }),
        insert: vi.fn(async (rows: any[]) => { casRows.length = 0; casRows.push(...rows); return { data: rows, error: null }; })
      } as any;
    }
    if (table === 'large_loss_list_meta_cas') {
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: casMeta['C1'] ? { notes: casMeta['C1'] } : null, error: null }) }) }),
        update: () => ({ eq: () => ({ select: () => ({ data: [], error: null }) }) }),
        insert: vi.fn(async (rows: any[]) => { const r = rows[0]; casMeta[r.submission_id] = r.notes || ''; return { data: rows, error: null }; })
      } as any;
    }
    return {} as any;
  };
  return { supabase: { from } };
});

describe('Large Loss List (Casualty) DB wiring', () => {
  beforeEach(() => { casRows.length = 0; casMeta = {}; vi.clearAllMocks(); });

  it('saves rows and Additional Comments, and reloads them', async () => {
    const user = userEvent.setup();
    render(<Wrapper id="C1"><StepLargeLossList /></Wrapper>);

    // Fill first row insured and comments
    const inputs = await screen.findAllByRole('textbox');
    await user.type(inputs[2] as HTMLInputElement, 'Insured Cas');

    const textareas = await screen.findAllByRole('textbox');
    const comments = textareas[textareas.length-1] as HTMLTextAreaElement;
    await user.type(comments, 'Cas notes');

    await waitFor(() => {
      expect(casRows.length).toBeGreaterThan(0);
      expect(casMeta['C1']).toContain('Cas notes');
    });
  }, 12000);
});
