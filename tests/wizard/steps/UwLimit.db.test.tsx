import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import StepUwLimit from '@/pages/wizard/steps/property/StepUwLimit';
import { SubmissionMetaProvider } from '@/pages/wizard/SubmissionMetaContext';

// In-memory blob store keyed by (submission_id, sheet_name)
interface BlobRow { submission_id: string; sheet_name: string; payload: any }
const blobStore: BlobRow[] = [];
const spies = { upsert: vi.fn(), update: vi.fn(), insert: vi.fn(), select: vi.fn() };

vi.mock('@/lib/supabase', () => {
  const sheetHandler: any = {
    select: vi.fn(() => ({ eq: vi.fn(function(this: any) { return this; }), maybeSingle: vi.fn(() => {
      const row = blobStore.find(r => r.sheet_name === 'UW Limit' && r.submission_id === currentSubmissionId);
      return { data: row ? { payload: row.payload } : null, error: null };
    }) })),
    upsert: vi.fn(async (rows: any[]) => { spies.upsert(rows); for (const r of rows) {
      const existing = blobStore.find(b => b.submission_id === r.submission_id && b.sheet_name === r.sheet_name);
      if (existing) existing.payload = r.payload; else blobStore.push({ ...r });
    } return { data: rows, error: null }; }),
    update: vi.fn(() => ({ eq: vi.fn(function(this: any){ return this; }), select: vi.fn(() => ({ data: [], error: null })) })),
    insert: vi.fn(async (rows: any[]) => { spies.insert(rows); blobStore.push(...rows); return { data: rows, error: null }; }),
  };
  const submissionsHandler: any = { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: { meta: {} }, error: null })) })) })) };
  let current = { from: (t: string) => (t === 'sheet_blobs' ? sheetHandler : t === 'submissions' ? submissionsHandler : sheetHandler) };
  return { supabase: current };
});

let currentSubmissionId = 'UWTEST-1';
function renderStep(id='UWTEST-1') {
  currentSubmissionId = id;
  return render(
    <SubmissionMetaProvider submissionId={id}>
      <MemoryRouter initialEntries={[`/wizard/property/${id}/uw-limit`]}> 
        <Routes>
          <Route path="/wizard/:lob/:submissionId/uw-limit" element={<StepUwLimit />} />
        </Routes>
      </MemoryRouter>
    </SubmissionMetaProvider>
  );
}

describe('UW Limit autosave & persistence', () => {
  beforeEach(() => { blobStore.length = 0; vi.clearAllMocks(); });

  it('autosaves row edit and reloads persisted data', async () => {
    const user = userEvent.setup();
    renderStep('UW-A1');

    const inputs = await screen.findAllByRole('textbox');
    const riskCode = inputs[0] as HTMLInputElement;
    const limit = inputs[1] as HTMLInputElement;

    await user.type(riskCode, 'RC-001');
    await user.type(limit, '10M xs 1M');

    await waitFor(() => {
      // Upsert called once after debounce
      expect(spies.upsert).toHaveBeenCalled();
      const row = blobStore.find(r => r.submission_id === 'UW-A1' && r.sheet_name === 'UW Limit');
      expect(row).toBeTruthy();
      expect(row!.payload.limits[0].risk_code).toBe('RC-001');
      expect(row!.payload.limits[0].limit).toBe('10M xs 1M');
    });

    // Simulate navigating away and back (unmount + remount)
    renderStep('UW-A1');
    const reInputs = await screen.findAllByRole('textbox');
    expect((reInputs[0] as HTMLInputElement).value).toBe('RC-001');
    expect((reInputs[1] as HTMLInputElement).value).toBe('10M xs 1M');
  }, 12000);
});
