import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getPropertyTriangleMock: vi.fn().mockResolvedValue([]),
  replacePropertyTriangleMock: vi.fn().mockResolvedValue(undefined),
  upsertPropertyTriangleCellMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../lib/triangles', () => ({
  getPropertyTriangle: mocks.getPropertyTriangleMock,
  replacePropertyTriangle: mocks.replacePropertyTriangleMock,
  upsertPropertyTriangleCell: mocks.upsertPropertyTriangleCellMock,
}));

import StepTriangulation from '../../../pages/wizard/steps/property/StepTriangulation';

afterEach(() => {
  mocks.getPropertyTriangleMock.mockClear();
  mocks.replacePropertyTriangleMock.mockClear();
  mocks.upsertPropertyTriangleCellMock.mockClear();
});

describe('StepTriangulation Excel paste', () => {
  it('sanitizes pasted TSV values and upserts to Supabase', async () => {
    render(
      <MemoryRouter initialEntries={['/wizard/property/123/triangulation']}>
        <Routes>
          <Route path="/wizard/property/:submissionId/triangulation" element={<StepTriangulation />} />
        </Routes>
      </MemoryRouter>
    );

  await waitFor(() => expect(mocks.getPropertyTriangleMock).toHaveBeenCalled());

    const pasteButtons = await screen.findAllByRole('button', { name: /paste from excel/i });
    fireEvent.click(pasteButtons[0]!);

    const textarea = await screen.findByPlaceholderText('Paste cells from Excel or CSV here');
    fireEvent.change(textarea, {
      target: {
        value: 'Year\t12 months\n2024\t1,234\n2025\t-1,000.50',
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

  await waitFor(() => expect(mocks.replacePropertyTriangleMock).toHaveBeenCalled());

  const payload = mocks.replacePropertyTriangleMock.mock.calls[0]![0];
    expect(payload.rows).toEqual([
      {
        measure: 'written_premium',
        uw_year: 2024,
        development_months: 12,
        value: 1234,
      },
      {
        measure: 'written_premium',
        uw_year: 2025,
        development_months: 12,
        value: -1000.5,
      },
    ]);

    expect(await screen.findByText('1,234')).toBeInTheDocument();
    expect(await screen.findByText('-1,000.5')).toBeInTheDocument();
  });
});
