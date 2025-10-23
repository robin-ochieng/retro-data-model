import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import StepHeader from '../../src/pages/wizard/steps/property/StepHeader';

vi.mock('../../src/hooks/useAutosave', () => ({
  useAutosave: () => {},
}));

let sheetPayload: Record<string, any> | null = null;

vi.mock('../../src/lib/supabase', () => {
  const makeSheetQuery = () => {
    const query: any = {
      eq: () => query,
      maybeSingle: () => Promise.resolve(sheetPayload ? { data: { payload: { ...sheetPayload } }, error: null } : { data: null, error: null }),
    };
    return query;
  };

  const makeUpdateChain = () => ({
    eq: () => ({
      eq: () => ({ error: null }),
    }),
  });

  return {
    supabase: {
      from: (table: string) => {
        if (table === 'sheet_blobs') {
          return {
            select: () => makeSheetQuery(),
            upsert: () => Promise.resolve({ error: null }),
            update: () => makeUpdateChain(),
            insert: () => Promise.resolve({ error: null }),
          };
        }
        if (table === 'submissions') {
          return {
            update: () => makeUpdateChain(),
          } as any;
        }
        return {
          select: () => makeSheetQuery(),
          upsert: () => Promise.resolve({ error: null }),
          update: () => makeUpdateChain(),
          insert: () => Promise.resolve({ error: null }),
        } as any;
      },
    },
  };
});

vi.mock('../../src/lib/mirrorCobLob', () => ({
  __esModule: true,
  mirrorCobLobToSubmission: vi.fn().mockResolvedValue(true),
}));

const mockSetClassOfBusiness = vi.fn();
const mockSetLineOfBusiness = vi.fn();
const mockUpdateFromHeader = vi.fn();
const mockUpdateMeta = vi.fn();

vi.mock('../../../src/context/SubmissionMeta', () => ({
  useSubmissionMeta: () => ({
    isReadOnly: false,
    setClassOfBusiness: mockSetClassOfBusiness,
    setLineOfBusiness: mockSetLineOfBusiness,
    updateFromHeader: mockUpdateFromHeader,
    updateMeta: mockUpdateMeta,
    meta: null,
    refresh: vi.fn(),
  }),
  SubmissionMetaProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../src/pages/wizard/SubmissionMetaContext', () => ({
  useSubmissionMeta: () => ({
    isReadOnly: false,
    setClassOfBusiness: mockSetClassOfBusiness,
    setLineOfBusiness: mockSetLineOfBusiness,
    updateFromHeader: mockUpdateFromHeader,
    updateMeta: mockUpdateMeta,
    meta: null,
    refresh: vi.fn(),
  }),
}));

describe('StepHeader Preset Prefill', () => {
  beforeEach(() => {
    sheetPayload = null;
    vi.clearAllMocks();
  });

  const renderStepHeader = (path: string) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/wizard/:lobKey/:submissionId/:tabKey" element={<StepHeader />} />
        </Routes>
      </MemoryRouter>
    );

  const getClassSelect = async () => {
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    return screen.getByLabelText('Class of Business') as HTMLSelectElement;
  };

  it('leaves class empty when presetCob is absent', async () => {
    renderStepHeader('/wizard/property/test-id/header');
    const classSelect = await getClassSelect();
    expect(classSelect.value).toBe('');
  });

  it('prefills class when presetCob is provided', async () => {
    renderStepHeader('/wizard/property/test-id/header?presetCob=Property');
    const classSelect = await getClassSelect();

    await waitFor(() => {
      expect(classSelect.value).toBe('Property');
    });
  });

  it('handles preset strings with special characters', async () => {
    renderStepHeader('/wizard/property/test-id/header?presetCob=Casualty%20%2F%20Liability');
    const classSelect = await getClassSelect();

    await waitFor(() => {
      expect(classSelect.value).toBe('Casualty / Liability');
    });
  });

  it('does not override existing class loaded from supabase', async () => {
    sheetPayload = { class_of_business: 'Marine & Aviation' };
    renderStepHeader('/wizard/property/test-id/header?presetCob=Property');
    const classSelect = await getClassSelect();

    await waitFor(() => {
      expect(classSelect.value).toBe('Marine & Aviation');
    });
  });

  it('supports Energy / Oil & Gas preset value', async () => {
    renderStepHeader('/wizard/property/test-id/header?presetCob=Energy%20%2F%20Oil%20%26%20Gas');
    const classSelect = await getClassSelect();

    await waitFor(() => {
      expect(classSelect.value).toBe('Energy / Oil & Gas');
    });
  });

  it("routes Workers' Compensation preset through the Other field", async () => {
    renderStepHeader("/wizard/property/test-id/header?presetCob=Workers'%20Compensation");
    const classSelect = await getClassSelect();

    await waitFor(() => {
      expect(classSelect.value).toBe('__OTHER__');
    });

  const otherInput = await screen.findByPlaceholderText('Enter other class') as HTMLInputElement;
    expect(otherInput.value).toBe("Workers' Compensation");
  });
});

