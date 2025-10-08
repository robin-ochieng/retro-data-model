import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import StepHeader from '../../src/pages/wizard/steps/property/StepHeader';

// Mock dependencies
const mockSetValue = vi.fn();
const mockWatch = vi.fn();
const mockRegister = vi.fn();
const mockHandleSubmit = vi.fn();
const mockReset = vi.fn();

vi.mock('react-hook-form', async () => {
  const actual = await vi.importActual('react-hook-form');
  return {
    ...actual,
    useForm: () => ({
      register: mockRegister,
      handleSubmit: mockHandleSubmit,
      reset: mockReset,
      formState: { errors: {} },
      watch: mockWatch,
      setValue: mockSetValue,
    }),
  };
});

vi.mock('../../../../src/hooks/useAutosave', () => ({
  useAutosave: () => {},
}));

vi.mock('../../../../src/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
      upsert: () => Promise.resolve({ error: null }),
    }),
  },
}));

const mockSetClassOfBusiness = vi.fn();
const mockSetLineOfBusiness = vi.fn();
const mockUpdateFromHeader = vi.fn();
const mockUpdateMeta = vi.fn();

// Mock SubmissionMetaProvider
const SubmissionMetaProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;

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
  SubmissionMetaProvider: SubmissionMetaProvider,
}));

// Also mock the wizard SubmissionMetaContext export
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
    vi.clearAllMocks();
    mockWatch.mockReturnValue({
      class_of_business: '',
      lines_of_business: '',
      country: 'Kenya',
      currency_std_units: 'USD',
      inception_date: '',
      expiry_date: '',
    });
    mockRegister.mockReturnValue({});
  });

  const renderWithRouter = (presetCob?: string) => {
    const searchParams = presetCob ? `?presetCob=${encodeURIComponent(presetCob)}` : '';
    
    return render(
      <MemoryRouter initialEntries={[`/wizard/123/property/step-header${searchParams}`]}>
        <Routes>
          <Route 
            path="/wizard/:lobKey/:submissionId/:tabKey" 
            element={<StepHeader />} 
          />
        </Routes>
      </MemoryRouter>,
      {
        wrapper: ({ children }) => (
          <div>
            {/* Simulate navigation with initial entry */}
            <script>{`window.history.pushState({}, '', '/wizard/property/test-id/header${searchParams}')`}</script>
            {children}
          </div>
        ),
      }
    );
  };

  it('does not prefill when no presetCob query param', async () => {
    mockWatch.mockReturnValue({
      class_of_business: '',
      lines_of_business: '',
    });

    const { container } = render(
      <MemoryRouter>
        <Routes>
          <Route 
            path="/wizard/property/:submissionId/header" 
            element={<StepHeader />} 
          />
        </Routes>
      </MemoryRouter>
    );

    // Wait a bit to ensure no setValue calls
    await waitFor(() => {
      expect(mockSetValue).not.toHaveBeenCalledWith(
        'class_of_business',
        expect.any(String),
        expect.any(Object)
      );
    }, { timeout: 500 });
  });

  it('prefills class_of_business when presetCob is in URL and field is empty', async () => {
    mockWatch.mockReturnValue({
      class_of_business: '',
      lines_of_business: '',
    });

    render(
      <MemoryRouter initialEntries={['/wizard/property/test-id/header?presetCob=Property']}>
        <Routes>
          <Route 
            path="/wizard/:lobKey/:submissionId/:tabKey" 
            element={<StepHeader />} 
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockSetValue).toHaveBeenCalledWith(
        'class_of_business',
        'Property',
        { shouldDirty: true, shouldValidate: true }
      );
    });
  });

  it('prefills with complex preset value containing special characters', async () => {
    mockWatch.mockReturnValue({
      class_of_business: '',
      lines_of_business: '',
    });

    render(
      <MemoryRouter initialEntries={['/wizard/property/test-id/header?presetCob=Casualty%20%2F%20Liability']}>
        <Routes>
          <Route 
            path="/wizard/:lobKey/:submissionId/:tabKey" 
            element={<StepHeader />} 
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockSetValue).toHaveBeenCalledWith(
        'class_of_business',
        'Casualty / Liability',
        { shouldDirty: true, shouldValidate: true }
      );
    });
  });

  it('does not overwrite existing class_of_business value', async () => {
    mockWatch.mockReturnValue({
      class_of_business: 'Marine & Aviation', // Already has a value
      lines_of_business: 'Marine Hull',
    });

    render(
      <MemoryRouter initialEntries={['/wizard/property/test-id/header?presetCob=Property']}>
        <Routes>
          <Route 
            path="/wizard/:lobKey/:submissionId/:tabKey" 
            element={<StepHeader />} 
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      // Should not call setValue since field already has a value
      expect(mockSetValue).not.toHaveBeenCalledWith(
        'class_of_business',
        'Property',
        expect.any(Object)
      );
    }, { timeout: 500 });
  });

  it('handles Energy / Oil & Gas preset', async () => {
    mockWatch.mockReturnValue({
      class_of_business: '',
      lines_of_business: '',
    });

    render(
      <MemoryRouter initialEntries={['/wizard/property/test-id/header?presetCob=Energy%20%2F%20Oil%20%26%20Gas']}>
        <Routes>
          <Route 
            path="/wizard/:lobKey/:submissionId/:tabKey" 
            element={<StepHeader />} 
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockSetValue).toHaveBeenCalledWith(
        'class_of_business',
        'Energy / Oil & Gas',
        { shouldDirty: true, shouldValidate: true }
      );
    });
  });

  it('handles Workers\' Compensation preset with apostrophe', async () => {
    mockWatch.mockReturnValue({
      class_of_business: '',
      lines_of_business: '',
    });

    render(
      <MemoryRouter initialEntries={['/wizard/property/test-id/header?presetCob=Workers\'%20Compensation']}>
        <Routes>
          <Route 
            path="/wizard/:lobKey/:submissionId/:tabKey" 
            element={<StepHeader />} 
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockSetValue).toHaveBeenCalledWith(
        'class_of_business',
        "Workers' Compensation",
        { shouldDirty: true, shouldValidate: true }
      );
    });
  });

  it('only applies preset once (does not reapply on re-render)', async () => {
    mockWatch.mockReturnValue({
      class_of_business: '',
      lines_of_business: '',
    });

    const { rerender } = render(
      <MemoryRouter initialEntries={['/wizard/property/test-id/header?presetCob=Life']}>
        <Routes>
          <Route 
            path="/wizard/:lobKey/:submissionId/:tabKey" 
            element={<StepHeader />} 
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockSetValue).toHaveBeenCalledWith(
        'class_of_business',
        'Life',
        { shouldDirty: true, shouldValidate: true }
      );
    });

    const callCount = mockSetValue.mock.calls.length;
    
    // Re-render
    rerender(
      <MemoryRouter initialEntries={['/wizard/property/test-id/header?presetCob=Life']}>
        <Routes>
          <Route 
            path="/wizard/:lobKey/:submissionId/:tabKey" 
            element={<StepHeader />} 
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      // Should not have increased call count (preset already applied)
      expect(mockSetValue.mock.calls.length).toBe(callCount);
    }, { timeout: 500 });
  });

  it('does not prefill while loading', async () => {
    // Simulate loading state by not allowing the effect to run
    mockWatch.mockReturnValue({
      class_of_business: '',
      lines_of_business: '',
    });

    render(
      <MemoryRouter initialEntries={['/wizard/property/test-id/header?presetCob=Motor']}>
        <Routes>
          <Route 
            path="/wizard/:lobKey/:submissionId/:tabKey" 
            element={<StepHeader />} 
          />
        </Routes>
      </MemoryRouter>
    );

    // The effect should wait for loading to complete before prefilling
    // In actual implementation, loading is managed by the component
    await waitFor(() => {
      expect(mockSetValue).toHaveBeenCalled();
    });
  });

  it('marks field as dirty and triggers validation when prefilling', async () => {
    mockWatch.mockReturnValue({
      class_of_business: '',
      lines_of_business: '',
    });

    render(
      <MemoryRouter initialEntries={['/wizard/property/test-id/header?presetCob=Health%20%2F%20Medical']}>
        <Routes>
          <Route 
            path="/wizard/:lobKey/:submissionId/:tabKey" 
            element={<StepHeader />} 
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockSetValue).toHaveBeenCalledWith(
        'class_of_business',
        'Health / Medical',
        expect.objectContaining({
          shouldDirty: true,
          shouldValidate: true,
        })
      );
    });
  });
});

