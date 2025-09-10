import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import StepClimateExposure from '@/pages/wizard/steps/property/StepClimateExposure';
import { SubmissionMetaProvider } from '@/pages/wizard/SubmissionMetaContext';

// In-memory climate_exposure rows (post-migration table)
interface CERec { submission_id: string; policy_inception_date: string | null; policy_expiry_date: string | null; insured: string | null; policy_category: string | null; policy_description: string | null; nature_of_risk: string | null; gross_exposure_tsi: number | null; cedants_exposure_tsi: number | null; eml_mpl_limit_applied: number | null; eml_mpl_limit: number | null; ceded_prop_reinsurance_exposure: number | null; net_inuring_prop_reinsurance_exposure: number | null; gross_premium: number | null; cedants_premium: number | null; ceded_prop_reinsurance_premium: number | null; net_prop_reinsurance_premium: number | null; }
const ceStore: CERec[] = [];
const spies = { insert: vi.fn(), delete: vi.fn(), select: vi.fn() };

vi.mock('@/lib/supabase', () => {
  // climate_exposure table handler
  const climateHandler: any = {
    select: vi.fn(() => ({
      eq: (_col: string, submissionId: string) => ({ data: ceStore.filter(r => r.submission_id === submissionId), error: null })
    })),
    delete: vi.fn(() => ({
      eq: (_c: string, submissionId: string) => {
        spies.delete();
        for (let i = ceStore.length - 1; i >= 0; i--) if (ceStore[i]!.submission_id === submissionId) ceStore.splice(i, 1);
        return { data: null, error: null };
      }
    })),
    insert: vi.fn(async (rows: any[]) => {
      spies.insert(rows);
      ceStore.push(...rows);
      return { data: rows, error: null };
    })
  };

  // submissions table handler (meta only)
  const submissionsHandler: any = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(async () => ({ data: { meta: {} }, error: null }))
      }))
    }))
  };

  // sheet_blobs handler (only chains used by SubmissionMeta load/update)
  const sheetBlobsHandler: any = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: null, error: null }))
        }))
      }))
    })),
    upsert: vi.fn(async () => ({ data: null, error: null })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({ data: [], error: null }))
        }))
      }))
    })),
    insert: vi.fn(async () => ({ data: null, error: null }))
  };

  const rpc = vi.fn(async () => ({ data: 0, error: null }));

  return {
    supabase: {
      from: (t: string) => (t === 'climate_exposure'
        ? climateHandler
        : t === 'submissions'
          ? submissionsHandler
          : t === 'sheet_blobs'
            ? sheetBlobsHandler
            : ({} as any)),
      rpc
    }
  };
});

function renderStep(submissionId = 'CLIM-1') {
  return render(
    <SubmissionMetaProvider submissionId={submissionId}>
      <MemoryRouter initialEntries={[`/wizard/property/${submissionId}/climate-exposure`]}> 
        <Routes>
          <Route path="/wizard/:lob/:submissionId/climate-exposure" element={<StepClimateExposure />} />
        </Routes>
      </MemoryRouter>
    </SubmissionMetaProvider>
  );
}

describe('Climate change exposure DB wiring', () => {
  beforeEach(() => {
  ceStore.length = 0;
    vi.clearAllMocks();
  });

  it('autosaves single row edit with normalized dates', async () => {
    const user = userEvent.setup();
    renderStep('CLIM-ONE');

    // Textboxes appear in column order; first two are inception/expiry, third is insured
    const textboxes = await screen.findAllByRole('textbox');
    const inception = textboxes[0] as HTMLInputElement;
    const expiry = textboxes[1] as HTMLInputElement;
    const insured = textboxes[2] as HTMLInputElement;

    await user.type(inception, '01/01/2025');
    await user.type(expiry, '31/12/2025');
    await user.type(insured, 'Mega Corp');

    await waitFor(() => {
  expect(spies.insert).toHaveBeenCalled();
  const row = ceStore.find(r => r.submission_id === 'CLIM-ONE');
  expect(row).toBeTruthy();
  expect(row!.policy_inception_date).toBe('2025-01-01');
  expect(row!.policy_expiry_date).toBe('2025-12-31');
  expect(row!.insured).toBe('Mega Corp');
    });
  }, 12000);

  it('persists paste replacement (placeholder removal) for two rows', async () => {
    const user = userEvent.setup();
    renderStep('CLIM-PASTE');

    // Open paste modal
    const pasteBtn = screen.getByText('Paste from Excel');
    await user.click(pasteBtn);
    const textarea = await screen.findByPlaceholderText(/Paste cells/);

    // Provide full header (16 columns) + two data rows separated by \n and \t
    const header = 'policy_inception_date\tpolicy_expiry_date\tinsured\tpolicy_category\tpolicy_description\tnature_of_risk\tgross_exposure_tsi\tcedants_exposure_tsi\teml_mpl_limit_applied\teml_mpl_limit\tceded_prop_reinsurance_exposure\tnet_inuring_prop_reinsurance_exposure\tgross_premium\tcedants_premium\tceded_prop_reinsurance_premium\tnet_prop_reinsurance_premium';
    const row1 = '2025-01-01\t2025-12-31\tRow One Inc\tCat\tDesc1\tWind\t1000\t800\t1\t500\t200\t800\t250\t200\t50\t200';
    const row2 = '01/02/2025\t31/12/2025\tRow Two LLC\tFac\tDesc2\tFlood\t2000\t1600\t\t\t400\t1600\t500\t400\t100\t400';

    await user.type(textarea, `${header}\n${row1}\n${row2}`);

    // Apply (should be enabled because column count matches)
    const apply = screen.getByText('Apply');
    expect(apply).not.toBeDisabled();
    await user.click(apply);

    await waitFor(() => {
  const rows = ceStore.filter(r => r.submission_id === 'CLIM-PASTE');
  expect(rows.length).toBe(2);
  expect(rows[0]!.insured).toBe('Row One Inc');
  expect(rows[1]!.insured).toBe('Row Two LLC');
  expect(rows[1]!.policy_inception_date).toBe('2025-02-01');
  expect(rows[0]!.gross_exposure_tsi).toBe(1000);
  expect(rows[0]!.net_prop_reinsurance_premium).toBe(200);
    });
  }, 12000);
});
