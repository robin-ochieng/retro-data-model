import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import StepLargeLossList from '../../../src/pages/wizard/steps/StepLargeLossList';
import * as supabaseModule from '../../../src/lib/supabase';

// Mock the supabase module
vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock useParams
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ submissionId: 'TEST-SUBMISSION-123' }),
  };
});

// Mock useAutosave hook
vi.mock('../../../hooks/useAutosave', () => ({
  useAutosave: vi.fn((data, callback) => {
    // Simulate immediate autosave on mount for testing
    setTimeout(() => callback(data), 100);
  }),
}));

describe('StepLargeLossList - Autosizing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock Supabase select query with maybeSingle
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }),
    });
    
    const mockFrom = vi.fn().mockReturnValue({
      select: mockSelect,
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });
    
    (supabaseModule.supabase.from as any) = mockFrom;
  });

  it('should render Name column with whitespace-normal and break-words classes', () => {
    render(
      <BrowserRouter>
        <StepLargeLossList />
      </BrowserRouter>
    );

    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();

    // Find Name input cells
    const nameInputs = screen.getAllByRole('textbox').filter(
      (input) => input.getAttribute('value') === '' || input.getAttribute('value')?.length === 0
    );

    // Check that Name column cells have proper parent td styling
    const nameCells = document.querySelectorAll('td.whitespace-normal.break-words');
    expect(nameCells.length).toBeGreaterThan(0);
  });

  it('should render Type of Loss column with whitespace-normal and break-words classes', () => {
    render(
      <BrowserRouter>
        <StepLargeLossList />
      </BrowserRouter>
    );

    // Check that Type of Loss column cells have proper styling
    const typeOfLossCells = document.querySelectorAll('td.whitespace-normal.break-words');
    expect(typeOfLossCells.length).toBeGreaterThanOrEqual(2); // At least Name and Type of Loss
  });

  it('should render table with table-layout: auto', () => {
    render(
      <BrowserRouter>
        <StepLargeLossList />
      </BrowserRouter>
    );

    const table = screen.getByRole('table');
    const computedStyle = window.getComputedStyle(table);
    
    // Check that table-layout is auto (either from inline style or computed)
    expect(
      table.style.tableLayout === 'auto' || computedStyle.tableLayout === 'auto'
    ).toBe(true);
  });

  it('should render text inputs with w-full and min-w-0 classes', () => {
    render(
      <BrowserRouter>
        <StepLargeLossList />
      </BrowserRouter>
    );

    const textInputs = screen.getAllByRole('textbox');
    
    // Check that Name and Type of Loss text inputs have proper sizing classes
    // (Date inputs are inside DateCell component and may have different classes)
    const nameInput = textInputs[0]; // First row Name field
    const typeInput = textInputs[1]; // First row Type of Loss field
    
    if (nameInput) {
      expect(nameInput.className).toContain('w-full');
      expect(nameInput.className).toContain('min-w-0');
    }
    
    if (typeInput) {
      expect(typeInput.className).toContain('w-full');
      expect(typeInput.className).toContain('min-w-0');
    }
  });

  it('should handle long text in Name field without truncation', async () => {
    const user = userEvent.setup();
    
    render(
      <BrowserRouter>
        <StepLargeLossList />
      </BrowserRouter>
    );

    const longName = 'This is a very long loss name that should wrap to multiple lines and not be truncated by ellipsis or hidden overflow';
    
    const nameInputs = screen.getAllByRole('textbox');
    const nameInput = nameInputs[0]; // First text input should be Name
    
    expect(nameInput).toBeDefined();
    
    await user.clear(nameInput!);
    await user.type(nameInput!, longName);

    expect(nameInput).toHaveValue(longName);

    // Check that the parent cell doesn't have truncate class
    const parentCell = nameInput!.closest('td');
    expect(parentCell?.className).not.toContain('truncate');
    expect(parentCell?.className).not.toContain('text-ellipsis');
    expect(parentCell?.className).toContain('whitespace-normal');
    expect(parentCell?.className).toContain('break-words');
  });

  it('should handle long text in Type of Loss field without truncation', async () => {
    const user = userEvent.setup();
    
    render(
      <BrowserRouter>
        <StepLargeLossList />
      </BrowserRouter>
    );

    const longType = 'Property Damage - Fire - Building Structure - Total Loss - With Secondary Water Damage';
    
    const textInputs = screen.getAllByRole('textbox');
    const typeInput = textInputs[1]; // Second text input should be Type of Loss
    
    expect(typeInput).toBeDefined();
    
    await user.clear(typeInput!);
    await user.type(typeInput!, longType);

    expect(typeInput).toHaveValue(longType);

    // Check that the parent cell doesn't have truncate class
    const parentCell = typeInput!.closest('td');
    expect(parentCell?.className).not.toContain('truncate');
    expect(parentCell?.className).toContain('whitespace-normal');
    expect(parentCell?.className).toContain('break-words');
  });

  it('should render table wrapper with overflow-x-auto', () => {
    render(
      <BrowserRouter>
        <StepLargeLossList />
      </BrowserRouter>
    );

    const table = screen.getByRole('table');
    const wrapper = table.closest('.overflow-x-auto');
    
    expect(wrapper).toBeInTheDocument();
    expect(wrapper?.className).toContain('overflow-x-auto');
  });

  it('should have align-top on all data cells', () => {
    render(
      <BrowserRouter>
        <StepLargeLossList />
      </BrowserRouter>
    );

    // All td elements should have align-top class
    const allCells = document.querySelectorAll('tbody td');
    allCells.forEach((cell) => {
      expect(cell.className).toContain('align-top');
    });
  });

  it('should not have fixed width classes on Name, Date of Loss, or Type of Loss columns', () => {
    render(
      <BrowserRouter>
        <StepLargeLossList />
      </BrowserRouter>
    );

    // Check that no cells have fixed width utilities like w-24, w-32, etc.
    const textCells = document.querySelectorAll('td.whitespace-normal');
    
    textCells.forEach((cell) => {
      const classes = cell.className;
      // Should not have fixed width classes
      expect(classes).not.toMatch(/\bw-\d+\b/);
      expect(classes).not.toMatch(/\bmin-w-\[\d+/);
      expect(classes).not.toMatch(/\bmax-w-\[\d+/);
    });
  });
});
