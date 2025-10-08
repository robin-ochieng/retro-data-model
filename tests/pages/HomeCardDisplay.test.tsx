import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Home from '../../src/pages/Home';

// Mock components to isolate card rendering
vi.mock('../../src/components/HomeStartCard', () => ({
  HomeStartCard: () => <div data-testid="home-start-card">HomeStartCard</div>,
}));

vi.mock('../../src/components/Logo', () => ({
  default: () => <div>Logo</div>,
}));

vi.mock('../../src/components/ThemeToggle', () => ({
  default: () => <div>ThemeToggle</div>,
}));

// Mock auth
const mockSignOut = vi.fn();
vi.mock('../../src/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com', user_metadata: { full_name: 'Test User' } },
    signOut: mockSignOut,
  }),
}));

vi.mock('../../src/auth/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock supabase with test data
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockNeq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockMaybeSingle = vi.fn();
const mockFrom = vi.fn();

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

describe('Home Card Display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock profile query for loadProfile useEffect
    mockMaybeSingle.mockResolvedValue({ data: { full_name: 'Test User' }, error: null });
    
    // Setup default mock chains
    mockLimit.mockResolvedValue({ data: [], error: null });
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockNeq.mockReturnValue({ order: mockOrder });
    mockEq.mockReturnValue({ 
      order: mockOrder,
      eq: mockEq,
      neq: mockNeq,
      maybeSingle: mockMaybeSingle,
    });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );
  };

  describe('Recent Submissions Cards', () => {
    it('displays Class of Business as main title', async () => {
      const mockSubmissions = [
        {
          id: 'sub-1',
          user_id: 'test-user-id',
          line_of_business: 'Property',
          lob_class: 'Property',
          lob_line: 'Fire & Allied Perils',
          status: 'in_progress',
          meta: { client: 'Test Client', year: 2025 },
          created_at: '2025-01-01',
        },
      ];

      mockLimit.mockResolvedValue({ data: mockSubmissions, error: null });
      
      renderComponent();

      const cobElement = await screen.findByText('Property');
      expect(cobElement).toBeInTheDocument();
      expect(cobElement).toHaveClass('font-semibold');
    });

    it('displays Line of Business below Class of Business', async () => {
      const mockSubmissions = [
        {
          id: 'sub-1',
          user_id: 'test-user-id',
          line_of_business: 'Property',
          lob_class: 'Property',
          lob_line: 'Fire & Allied Perils',
          status: 'in_progress',
          meta: { client: 'Test Client', year: 2025 },
          created_at: '2025-01-01',
        },
      ];

      mockLimit.mockResolvedValue({ data: mockSubmissions, error: null });
      
      renderComponent();

      const lobElement = await screen.findByText('Fire & Allied Perils');
      expect(lobElement).toBeInTheDocument();
      expect(lobElement).toHaveClass('text-xs');
    });

    it('hides Line of Business when not available', async () => {
      const mockSubmissions = [
        {
          id: 'sub-1',
          user_id: 'test-user-id',
          line_of_business: 'Casualty',
          lob_class: 'Casualty / Liability',
          lob_line: null,
          status: 'in_progress',
          meta: { client: 'Test Client', year: 2025 },
          created_at: '2025-01-01',
        },
      ];

      mockLimit.mockResolvedValue({ data: mockSubmissions, error: null });
      
      renderComponent();

      const cobElement = await screen.findByText('Casualty / Liability');
      expect(cobElement).toBeInTheDocument();
      
      // LOB should not be rendered when null/empty
      const parentDiv = cobElement.closest('div');
      const lobElements = parentDiv?.querySelectorAll('.text-xs');
      // Should only have client/year text, not a LOB line
      expect(lobElements?.length).toBeLessThanOrEqual(1);
    });

    it('falls back to line_of_business when lob_class is missing', async () => {
      const mockSubmissions = [
        {
          id: 'sub-1',
          user_id: 'test-user-id',
          line_of_business: 'Property',
          lob_class: null,
          lob_line: null,
          status: 'in_progress',
          meta: { client: 'Test Client', year: 2025 },
          created_at: '2025-01-01',
        },
      ];

      mockLimit.mockResolvedValue({ data: mockSubmissions, error: null });
      
      renderComponent();

      const fallbackElement = await screen.findByText('Property');
      expect(fallbackElement).toBeInTheDocument();
    });

    it('displays status badge', async () => {
      const mockSubmissions = [
        {
          id: 'sub-1',
          user_id: 'test-user-id',
          line_of_business: 'Property',
          lob_class: 'Property',
          lob_line: 'Commercial Property',
          status: 'in_progress',
          meta: { client: 'Test Client', year: 2025 },
          created_at: '2025-01-01',
        },
      ];

      mockLimit.mockResolvedValue({ data: mockSubmissions, error: null });
      
      renderComponent();

      const statusBadge = await screen.findByText('in_progress');
      expect(statusBadge).toBeInTheDocument();
    });

    it('displays client and year metadata', async () => {
      const mockSubmissions = [
        {
          id: 'sub-1',
          user_id: 'test-user-id',
          line_of_business: 'Property',
          lob_class: 'Property',
          lob_line: 'Residential / Homeowners',
          status: 'in_progress',
          meta: { client: 'Kenya Re', year: 2024 },
          created_at: '2025-01-01',
        },
      ];

      mockLimit.mockResolvedValue({ data: mockSubmissions, error: null });
      
      renderComponent();

      expect(await screen.findByText(/Kenya Re/)).toBeInTheDocument();
      expect(await screen.findByText(/2024/)).toBeInTheDocument();
    });

    it('renders Resume button for in-progress submissions', async () => {
      const mockSubmissions = [
        {
          id: 'sub-1',
          user_id: 'test-user-id',
          line_of_business: 'Property',
          lob_class: 'Marine & Aviation',
          lob_line: 'Marine Hull',
          status: 'in_progress',
          meta: { client: 'Test Client', year: 2025 },
          created_at: '2025-01-01',
        },
      ];

      mockLimit.mockResolvedValue({ data: mockSubmissions, error: null });
      
      renderComponent();

      const resumeButton = await screen.findByRole('button', { name: /resume/i });
      expect(resumeButton).toBeInTheDocument();
    });

    it('truncates long COB and LOB values with title tooltip', async () => {
      const mockSubmissions = [
        {
          id: 'sub-1',
          user_id: 'test-user-id',
          line_of_business: 'Property',
          lob_class: 'Workers\' Compensation',
          lob_line: 'Employers\' Liability Long Name That Should Truncate',
          status: 'in_progress',
          meta: { client: 'Test Client', year: 2025 },
          created_at: '2025-01-01',
        },
      ];

      mockLimit.mockResolvedValue({ data: mockSubmissions, error: null });
      
      renderComponent();

      const cobElement = await screen.findByText('Workers\' Compensation');
      expect(cobElement).toHaveClass('truncate');
      expect(cobElement).toHaveAttribute('title', 'Workers\' Compensation');
    });
  });

  describe('Submitted Submissions Cards', () => {
    it('displays COB and LOB for submitted items', async () => {
      const inProgressData: any[] = []; // Empty in-progress
      const submittedData = [
        {
          id: 'sub-2',
          user_id: 'test-user-id',
          line_of_business: 'Casualty',
          lob_class: 'Casualty / Liability',
          lob_line: 'Professional Indemnity',
          status: 'submitted',
          meta: { client: 'Another Client', year: 2025 },
          created_at: '2025-01-01',
        },
      ];

      // First call (profiles) returns null
      // Second call (in-progress) returns empty
      // Third call (submitted) returns our data
      mockLimit
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: inProgressData, error: null })
        .mockResolvedValueOnce({ data: submittedData, error: null });
      
      renderComponent();

      expect(await screen.findByText('Casualty / Liability')).toBeInTheDocument();
      expect(await screen.findByText('Professional Indemnity')).toBeInTheDocument();
    });

    it('shows submitted status badge', async () => {
      const inProgressData: any[] = [];
      const submittedData = [
        {
          id: 'sub-2',
          user_id: 'test-user-id',
          line_of_business: 'Life',
          lob_class: 'Life',
          lob_line: 'Term Life',
          status: 'submitted',
          meta: { client: 'Client', year: 2025 },
          created_at: '2025-01-01',
        },
      ];

      mockLimit
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: inProgressData, error: null })
        .mockResolvedValueOnce({ data: submittedData, error: null });
      
      renderComponent();

      const submittedBadges = await screen.findAllByText('submitted');
      expect(submittedBadges.length).toBeGreaterThan(0);
    });

    it('renders View button for submitted submissions', async () => {
      const inProgressData: any[] = [];
      const submittedData = [
        {
          id: 'sub-2',
          user_id: 'test-user-id',
          line_of_business: 'Motor',
          lob_class: 'Motor',
          lob_line: 'Commercial Motor',
          status: 'submitted',
          meta: { client: 'Client', year: 2025 },
          created_at: '2025-01-01',
        },
      ];

      mockLimit
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: inProgressData, error: null })
        .mockResolvedValueOnce({ data: submittedData, error: null });
      
      renderComponent();

      const viewButton = await screen.findByRole('button', { name: /view/i });
      expect(viewButton).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('shows message when no recent submissions', async () => {
      mockLimit.mockResolvedValue({ data: [], error: null });
      
      renderComponent();

      expect(await screen.findByText(/no recent submissions yet/i)).toBeInTheDocument();
    });

    it('shows message when no submitted submissions', async () => {
      mockLimit
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null });
      
      renderComponent();

      expect(await screen.findByText(/no submitted submissions yet/i)).toBeInTheDocument();
    });
  });
});
