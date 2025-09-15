import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import StepLargeLossList from '@/pages/wizard/steps/StepLargeLossList';

// In-memory tables
const largeLossTable: any[] = [];
const sheetBlobs: any[] = [];

vi.mock('@/lib/supabase', () => {
  function handler(table: string) {
    return {
      _table: table,
      _filters: [] as any[],
      select() { return this; },
      eq(col: string, val: any) { this._filters.push([col, val]); return this; },
      delete() { // delete matching submission rows
        const submission = this._filters.find(f => f[0] === 'submission_id')?.[1];
        if (table === 'large_loss_list') {
          for (let i = largeLossTable.length -1; i >=0; i--) if (largeLossTable[i].submission_id === submission) largeLossTable.splice(i,1);
        }
        return this;
      },
      insert(rows: any[]) {
        if (table === 'large_loss_list') largeLossTable.push(...rows);
        return Promise.resolve({ data: rows, error: null });
      },
      upsert(rows: any[]) {
        if (table === 'sheet_blobs') {
          rows.forEach(r => {
            const existing = sheetBlobs.find(b => b.submission_id === r.submission_id && b.sheet_name === r.sheet_name);
            if (existing) existing.payload = r.payload; else sheetBlobs.push({ ...r });
          });
        }
        return Promise.resolve({ data: rows, error: null });
      },
      maybeSingle() {
        if (table === 'sheet_blobs') {
          const submission = this._filters.find(f => f[0] === 'submission_id')?.[1];
          const sheet = this._filters.find(f => f[0] === 'sheet_name')?.[1];
            const row = sheetBlobs.find(r => r.submission_id === submission && r.sheet_name === sheet) || null;
            return Promise.resolve({ data: row ? { payload: row.payload } : null, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      },
    };
  }
  return { supabase: { from: (t: string) => handler(t) } };
});

function renderStep(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/wizard/property/${id}/large-loss-list`]}> 
      <Routes>
        <Route path="/wizard/:lob/:submissionId/large-loss-list" element={<StepLargeLossList />} />
      </Routes>
    </MemoryRouter>
  );
}

describe.skip('Large Loss List autosave & persistence', () => {
  beforeEach(() => { largeLossTable.length = 0; sheetBlobs.length = 0; vi.clearAllMocks(); });

  it('autosaves edited row + comments and reloads', async () => {
    const user = userEvent.setup();
    renderStep('LL-1');
  // Note: number inputs (loss_id, uw_year, numeric columns) have role 'spinbutton' in JSDOM, not 'textbox'
  const textboxes = (await screen.findAllByRole('textbox')) as HTMLInputElement[]; // name, dol, type_of_loss, comments
  const spinboxes = screen.getAllByRole('spinbutton') as HTMLInputElement[]; // number fields
  expect(textboxes.length).toBeGreaterThanOrEqual(3); // at least the three text columns before comments
  expect(spinboxes.length).toBeGreaterThanOrEqual(2); // loss_id + uw_year
  const uwYearInput = (spinboxes[1] || spinboxes[0]) as HTMLInputElement;
  await user.clear(uwYearInput);
  await user.type(uwYearInput, '2024');
  // Fill row textual fields
  await user.clear(textboxes[0]!); // name
  await user.type(textboxes[0]!, 'Big Storm');
  await user.clear(textboxes[1]!); // dol (now plain text)
  await user.type(textboxes[1]!, '2024-07-01');
  await user.clear(textboxes[2]!); // type_of_loss
  await user.type(textboxes[2]!, 'Wind');

    const comment = screen.getByPlaceholderText(/Any notes or guidance/i) as HTMLTextAreaElement;
    await user.type(comment, 'Initial comment');

    await waitFor(() => {
      // After debounce flush (unmount not needed because timer executes)
      expect(largeLossTable.length).toBe(1);
      const row = largeLossTable[0];
      expect(row.uw_year).toBe(2024);
      expect(row.insured).toBe('Big Storm');
      expect(row.loss_date).toBe('2024-07-01');
      const blob = sheetBlobs.find(b => b.submission_id === 'LL-1' && b.sheet_name === 'Large Loss List');
      expect(blob).toBeTruthy();
      expect(blob.payload.additional_comments).toContain('Initial comment');
    });

    // Remount to verify load
    renderStep('LL-1');
  const inputs2 = await screen.findAllByRole('textbox');
  // Order: name, dol, type_of_loss, comments
  expect((inputs2[0] as HTMLInputElement).value).toBe('Big Storm');
  expect((inputs2[1] as HTMLInputElement).value).toBe('2024-07-01');
  expect((inputs2[2] as HTMLInputElement).value).toBe('Wind');
  }, 15000);
});
