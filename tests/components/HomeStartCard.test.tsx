import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { HomeStartCard } from '../../src/components/HomeStartCard';
import * as supabaseModule from '../../src/lib/supabase';

// Mock the auth context
vi.mock('../../src/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
  }),
}));

// Mock the supabase createSubmission function
const mockCreateSubmission = vi.fn();
vi.mock('../../src/lib/supabase', async () => {
  const actual = await vi.importActual('../../src/lib/supabase');
  return {
    ...actual,
    createSubmission: (...args: any[]) => mockCreateSubmission(...args),
  };
});

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('HomeStartCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <HomeStartCard />
      </BrowserRouter>
    );
  };

  it('renders the start card with all required fields', () => {
    renderComponent();
    
  expect(screen.getByRole('heading', { level: 3, name: /start new submission/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/client/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/year/i)).toBeInTheDocument();
    expect(screen.getByText(/preset class/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start new submission/i })).toBeInTheDocument();
  });

  it('displays all preset chips', () => {
    renderComponent();
    
    const expectedPresets = [
      'Property',
      'Casualty / Liability',
      'Marine & Aviation',
      'Life',
      'Health / Medical',
      'Agriculture',
      'Motor',
      'Engineering',
      'Financial Lines',
      'Specialty Risks',
      'Energy / Oil & Gas',
      'Credit & Surety',
      'Travel',
      "Workers' Compensation",
      'Other...',
    ];

    expectedPresets.forEach(preset => {
      expect(screen.getByText(preset)).toBeInTheDocument();
    });
  });

  it('disables Start button when client or year is missing', () => {
    renderComponent();

    const startButton = screen.getByRole('button', { name: /start new submission/i });
    expect(startButton).toBeDisabled();
  });

  it('enables Start button when client and year are provided', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    const clientSelect = screen.getByLabelText(/client/i);
    const yearInput = screen.getByLabelText(/year/i);
    const startButton = screen.getByRole('button', { name: /start new submission/i });

  fireEvent.change(clientSelect, { target: { value: 'ZEP-RE (PTA Reinsurance Company)' } });
  fireEvent.change(yearInput, { target: { value: '2025' } });

    await waitFor(() => {
      expect(startButton).toBeEnabled();
    });
  });

  it('toggles preset chip selection on click', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    const propertyChip = screen.getByText('Property');
    
    // Click to select
    await user.click(propertyChip);
    expect(propertyChip).toHaveClass('border-blue-500');
    
    // Click again to deselect
    await user.click(propertyChip);
    expect(propertyChip).not.toHaveClass('border-blue-500');
  });

  it('creates submission without preset when no chip selected', async () => {
    const user = userEvent.setup();
    mockCreateSubmission.mockResolvedValue('test-submission-id');
    
    renderComponent();
    
    const clientSelect = screen.getByLabelText(/client/i);
    const yearInput = screen.getByLabelText(/year/i);
    const startButton = screen.getByRole('button', { name: /start new submission/i });

  fireEvent.change(clientSelect, { target: { value: 'ZEP-RE (PTA Reinsurance Company)' } });
  fireEvent.change(yearInput, { target: { value: '2025' } });
    await waitFor(() => {
      expect(startButton).toBeEnabled();
    });

    await user.click(startButton);

    await waitFor(() => {
      expect(mockCreateSubmission).toHaveBeenCalledWith({
        client: 'ZEP-RE (PTA Reinsurance Company)',
        year: 2025,
        lob_class: null,
        userId: 'test-user-id',
      });
    });

    expect(mockNavigate).toHaveBeenCalledWith('/wizard/property/test-submission-id/header');
  });

  it('creates submission with preset when chip is selected', async () => {
    const user = userEvent.setup();
    mockCreateSubmission.mockResolvedValue('test-submission-id');
    
    renderComponent();
    
    const clientSelect = screen.getByLabelText(/client/i);
    const yearInput = screen.getByLabelText(/year/i);
    const propertyChip = screen.getByText('Marine & Aviation');
    const startButton = screen.getByRole('button', { name: /start new submission/i });

  fireEvent.change(clientSelect, { target: { value: 'ZEP-RE (PTA Reinsurance Company)' } });
  fireEvent.change(yearInput, { target: { value: '2025' } });
    await user.click(propertyChip);
    await waitFor(() => {
      expect(startButton).toBeEnabled();
    });

    await user.click(startButton);

    await waitFor(() => {
      expect(mockCreateSubmission).toHaveBeenCalledWith({
        client: 'ZEP-RE (PTA Reinsurance Company)',
        year: 2025,
        lob_class: 'Marine & Aviation',
        userId: 'test-user-id',
      });
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      '/wizard/property/test-submission-id/header?presetCob=Marine%20%26%20Aviation'
    );
  });

  it('shows error message when submission creation fails', async () => {
    const user = userEvent.setup();
    mockCreateSubmission.mockRejectedValue(new Error('Network error'));
    
    renderComponent();
    
    const clientSelect = screen.getByLabelText(/client/i);
    const yearInput = screen.getByLabelText(/year/i);
    const startButton = screen.getByRole('button', { name: /start new submission/i });

  fireEvent.change(clientSelect, { target: { value: 'ZEP-RE (PTA Reinsurance Company)' } });
  fireEvent.change(yearInput, { target: { value: '2025' } });
    await waitFor(() => {
      expect(startButton).toBeEnabled();
    });

    await user.click(startButton);

    expect(await screen.findByText(/network error/i)).toBeInTheDocument();
  });

  it('displays loading state during submission creation', async () => {
    const user = userEvent.setup();
    let resolvePromise: (value: string) => void;
    const promise = new Promise<string>((resolve) => {
      resolvePromise = resolve;
    });
    mockCreateSubmission.mockReturnValue(promise);
    
    renderComponent();
    
    const clientSelect = screen.getByLabelText(/client/i);
    const yearInput = screen.getByLabelText(/year/i);
    const startButton = screen.getByRole('button', { name: /start new submission/i });

  fireEvent.change(clientSelect, { target: { value: 'ZEP-RE (PTA Reinsurance Company)' } });
  fireEvent.change(yearInput, { target: { value: '2025' } });
    await waitFor(() => {
      expect(startButton).toBeEnabled();
    });

    await user.click(startButton);

    expect(await screen.findByText(/creating submission/i)).toBeInTheDocument();
    
    resolvePromise!('test-id');
  });
});
