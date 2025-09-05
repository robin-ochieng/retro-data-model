import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Use alias to match project structure
import StepHeader from '@/pages/wizard/steps/property/StepHeader';
import { SubmissionMetaProvider } from '@/context/SubmissionMeta';

// Fake timers to control debounce
vi.useFakeTimers();

// Mock Supabase client and behaviors used by StepHeader
vi.mock('@/lib/supabase', () => {
  // Minimal chainable mock for .from('sheet_blobs') calls used in Header
  const upsertSpy = vi.fn().mockResolvedValue({ data: null, error: null });

  const selectChain = {
    select: vi.fn(() => selectChain),
    eq: vi.fn(() => selectChain),
    maybeSingle: vi.fn(async () => ({
      data: {
        payload: {
          treaty_type: 'Quota Share Treaty',
          currency_std_units: 'USD',
        },
      },
      error: null,
    })),
  } as any;

  const updateChain = {
    update: vi.fn(() => updateChain),
    eq: vi.fn(() => updateChain),
    select: vi.fn(async () => ({ data: [], error: null })),
  } as any;

  const insertChain = {
    insert: vi.fn(async () => ({ data: null, error: null })),
  } as any;

  const sheetBlobsHandler = {
    select: selectChain.select,
    eq: selectChain.eq,
    maybeSingle: selectChain.maybeSingle,
    upsert: upsertSpy,
    update: updateChain.update,
    insert: insertChain.insert,
  } as any;

  // submissions table mock: select(meta).eq('id',...).maybeSingle() and update(...).eq('id',...)
  const submissionsSelectChain = {
    select: vi.fn(() => submissionsSelectChain),
    eq: vi.fn(() => submissionsSelectChain),
    maybeSingle: vi.fn(async () => ({ data: { meta: {} }, error: null })),
  } as any;

  const submissionsUpdateChain = {
    update: vi.fn(() => ({ eq: vi.fn(async () => ({ data: null, error: null })) })),
  } as any;

  return {
    supabase: {
      from: (table: string) => {
        if (table === 'sheet_blobs') return sheetBlobsHandler;
        if (table === 'submissions') {
          return {
            select: submissionsSelectChain.select,
            eq: submissionsSelectChain.eq,
            maybeSingle: submissionsSelectChain.maybeSingle,
            update: submissionsUpdateChain.update,
          } as any;
        }
        return {} as any;
      },
    },
    __mocks: { upsertSpy },
  };
});

// Helper to extract the spy from the mock module
function getUpsertSpy() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@/lib/supabase');
  return mod.__mocks.upsertSpy as ReturnType<typeof vi.fn>;
}

function renderWithProviders(ui: React.ReactElement, submissionId = 'TEST-ID') {
  return render(
    <SubmissionMetaProvider submissionId={submissionId}>
      <MemoryRouter initialEntries={[`/wizard/property/${submissionId}/header`]}>
        <Routes>
          <Route path="/wizard/property/:submissionId/header" element={ui} />
        </Routes>
      </MemoryRouter>
    </SubmissionMetaProvider>
  );
}

describe('Header tab DB wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.useFakeTimers(); // restore fake timers for next test
  });

  it('loads from sheet_blobs and prefills key fields', async () => {
    renderWithProviders(<StepHeader />);

    // Treaty Type default should be present via select; currency code appears in the select too
    // We check the select inputs by their labels
    const treatyLabel = await screen.findByLabelText('Treaty Type');
    const currencyLabel = await screen.findByLabelText('Currency (in std. units)');

    // The selects should have value matching the mocked payload
    expect((treatyLabel as HTMLSelectElement).value === 'Quota Share Treaty' || (treatyLabel as HTMLInputElement).value === 'Quota Share Treaty').toBeTruthy();
    expect((currencyLabel as HTMLSelectElement).value === 'USD' || (currencyLabel as HTMLInputElement).value === 'USD').toBeTruthy();
  });

  it('autosaves changes via upsert after debounce and shows saved indicator', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProviders(<StepHeader />);

    const nameInput = await screen.findByLabelText('Name of Company');
    await user.clear(nameInput);
    await user.type(nameInput, 'New Company PLC');

    // Advance debounce timer to trigger save (useAutosave default is 900ms)
    vi.advanceTimersByTime(1000);

    await waitFor(() => {
      const saved = screen.getByText(/Saved at/i);
      expect(saved).toBeInTheDocument();
    });

    const upsertSpy = getUpsertSpy();
    expect(upsertSpy).toHaveBeenCalledTimes(1);

  const callArgs = upsertSpy.mock.calls[0];
  expect(callArgs).toBeTruthy();
  // First arg is the records array
  const records = (callArgs?.[0] ?? []) as Array<any>;
  const opts = (callArgs?.[1] ?? {}) as any;
    expect(Array.isArray(records) && records.length === 1).toBeTruthy();
    expect(opts?.onConflict).toBe('submission_id,sheet_name');

    const rec = records[0];
    expect(rec.submission_id).toBe('TEST-ID');
    expect(rec.sheet_name).toBe('Header');
    expect(rec.payload).toMatchObject({
      name_of_company: 'New Company PLC',
      treaty_type: 'Quota Share Treaty',
      currency_std_units: 'USD',
    });
  });
});
