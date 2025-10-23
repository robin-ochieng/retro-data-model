import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import StepTriangulation from '../../../pages/wizard/steps/property/StepTriangulation';

const mocks = vi.hoisted(() => ({
  getPropertyTriangleMock: vi.fn(),
  replacePropertyTriangleMock: vi.fn(),
  upsertPropertyTriangleCellMock: vi.fn(),
}));

vi.mock('../../../lib/triangles', () => ({
  getPropertyTriangle: mocks.getPropertyTriangleMock,
  replacePropertyTriangle: mocks.replacePropertyTriangleMock,
  upsertPropertyTriangleCell: mocks.upsertPropertyTriangleCellMock,
}));

vi.mock('../../../hooks/useAutosave', () => ({
  useAutosave: (value: unknown, onSave: (pending: unknown) => void, _delay: number, enabled = true) => {
    React.useEffect(() => {
      if (!enabled) return;
      if (Array.isArray(value) && value.length === 0) return;
      void onSave(value);
    }, [value, onSave, enabled]);
  },
}));

describe('Triangulation auto-calculated tables', () => {
  beforeEach(() => {
    mocks.getPropertyTriangleMock.mockResolvedValue([
      {
        submission_id: '123',
        measure: 'written_premium',
        uw_year: 2024,
        development_months: 12,
        value: 1000,
      },
      {
        submission_id: '123',
        measure: 'paid_losses',
        uw_year: 2024,
        development_months: 12,
        value: 400,
      },
      {
        submission_id: '123',
        measure: 'loss_reserves',
        uw_year: 2024,
        development_months: 12,
        value: 600,
      },
    ]);
    mocks.replacePropertyTriangleMock.mockResolvedValue(undefined);
    mocks.upsertPropertyTriangleCellMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    Object.values(mocks).forEach((mockFn) => (mockFn as Mock).mockReset());
  });

  it('renders auto-calculated tables as read-only and persists derived values', async () => {
    render(
      <MemoryRouter initialEntries={['/wizard/property/123/triangulation']}>
        <Routes>
          <Route path="/wizard/property/:submissionId/triangulation" element={<StepTriangulation />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(mocks.getPropertyTriangleMock).toHaveBeenCalled());

    const incurredHeading = await screen.findByRole('heading', { name: 'Incurred Losses' });
    const incurredSection = incurredHeading.closest('section');
    expect(incurredSection).not.toBeNull();

    const ratioHeading = await screen.findByRole('heading', { name: 'W/I L/R (0–1)' });
    const ratioSection = ratioHeading.closest('section');
    expect(ratioSection).not.toBeNull();

    // Badge present
    expect(screen.getAllByText(/auto-calculated/i).length).toBeGreaterThanOrEqual(2);

    // Read-only: no paste button or edit controls in derived sections
    expect(within(incurredSection as HTMLElement).queryByRole('button', { name: /paste from excel/i })).toBeNull();
    expect(within(incurredSection as HTMLElement).queryByRole('button', { name: /edit number/i })).toBeNull();

    expect(within(ratioSection as HTMLElement).queryByRole('button', { name: /paste from excel/i })).toBeNull();
    expect(within(ratioSection as HTMLElement).queryByRole('button', { name: /edit number/i })).toBeNull();

    // Derived values shown
    const numberFormatter = new Intl.NumberFormat('en-KE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    const percentFormatter = new Intl.NumberFormat('en-KE', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    expect(within(incurredSection as HTMLElement).getByText(numberFormatter.format(1000))).toBeInTheDocument();
    expect(within(ratioSection as HTMLElement).getByText(percentFormatter.format(1))).toBeInTheDocument();

    const paidHeading = await screen.findByRole('heading', { name: 'Paid Losses' });
    const paidSection = paidHeading.closest('section');
    expect(paidSection).not.toBeNull();

    const paidCellTrigger = within(paidSection as HTMLElement).getByRole('button', { name: /400/ });
    fireEvent.click(paidCellTrigger);

    const input = within(paidSection as HTMLElement).getByDisplayValue('400') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '500' } });
    fireEvent.blur(input);

    await waitFor(() => expect(within(incurredSection as HTMLElement).getByText(numberFormatter.format(1100))).toBeInTheDocument());
    await waitFor(() => expect(within(ratioSection as HTMLElement).getByText(percentFormatter.format(1.1))).toBeInTheDocument());

    await waitFor(() => expect(mocks.upsertPropertyTriangleCellMock).toHaveBeenCalled());

    const upsertCalls = mocks.upsertPropertyTriangleCellMock.mock.calls.map((call) => call[0]);
    expect(upsertCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ measure: 'paid_losses', value: 500 }),
        expect.objectContaining({ measure: 'incurred_losses', value: 1100 }),
        expect.objectContaining({ measure: 'wi_lr_pct', value: 1.1 }),
      ]),
    );
  });
});
