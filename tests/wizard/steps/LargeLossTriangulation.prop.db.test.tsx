import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import StepLargeLossTriangulation from '@/pages/wizard/steps/property/StepLargeLossTriangulation';

function Wrapper({ children, id }: any) {
  return (
    <MemoryRouter initialEntries={[`/wizard/property/${id}/large-loss-triangulation`]}>
      <Routes>
        <Route path="/wizard/property/:submissionId/large-loss-triangulation" element={children} />
      </Routes>
    </MemoryRouter>
  );
}

// In-memory stores
let headerRows: any[] = [];
let paidRows: any[] = [];
let reservedRows: any[] = [];
let incurredRows: any[] = [];

vi.mock('@/lib/supabase', () => {
  const from = (table: string) => {
    if (table === 'large_loss_triangle_header_prop') {
      return {
        select: () => ({
          eq: () => ({
            data: headerRows.slice(),
            error: null,
            limit: (_n?: number) => ({ data: headerRows.slice(), error: null }),
          }),
        }),
        delete: () => ({
          eq: (_col?: string, _val?: any) => ({
            not: (_col2?: string, _op?: string, _list?: string) => ({ data: [], error: null }),
            data: [],
            error: null,
          }),
        }),
        insert: vi.fn(async (rows: any[]) => { headerRows = rows.slice(); return { data: rows, error: null }; }),
        upsert: vi.fn(async (rows: any[], _opts?: any) => {
          // Merge rows by composite key (submission_id + loss_identifier)
          const key = (r: any) => `${r.submission_id}__${r.loss_identifier}`;
          const map = new Map<string, any>(headerRows.map(r => [key(r), r]));
          for (const r of rows) map.set(key(r), { ...map.get(key(r)), ...r });
          headerRows = Array.from(map.values());
          return { data: headerRows.slice(), error: null } as any;
        }),
      } as any;
    }
    const gridMap: Record<string, { data: any[] } & any> = {
      large_loss_triangle_paid_prop: {
        select: () => ({ eq: () => ({ data: paidRows.slice(), error: null }) }),
        delete: () => ({ eq: () => ({ not: () => ({ data: [], error: null }), data: [], error: null }) }),
        insert: vi.fn(async (rows: any[]) => { paidRows = rows.slice(); return { data: rows, error: null }; }),
        upsert: vi.fn(async (rows: any[]) => { paidRows = rows.slice(); return { data: rows, error: null }; }),
      },
      large_loss_triangle_reserved_prop: {
        select: () => ({ eq: () => ({ data: reservedRows.slice(), error: null }) }),
        delete: () => ({ eq: () => ({ not: () => ({ data: [], error: null }), data: [], error: null }) }),
        insert: vi.fn(async (rows: any[]) => { reservedRows = rows.slice(); return { data: rows, error: null }; }),
        upsert: vi.fn(async (rows: any[]) => { reservedRows = rows.slice(); return { data: rows, error: null }; }),
      },
      large_loss_triangle_incurred_prop: {
        select: () => ({ eq: () => ({ data: incurredRows.slice(), error: null }) }),
        delete: () => ({ eq: () => ({ not: () => ({ data: [], error: null }), data: [], error: null }) }),
        insert: vi.fn(async (rows: any[]) => { incurredRows = rows.slice(); return { data: rows, error: null }; }),
        upsert: vi.fn(async (rows: any[]) => { incurredRows = rows.slice(); return { data: rows, error: null }; }),
      },
    };
    if (gridMap[table]) return gridMap[table];
    return {} as any;
  };
  return { supabase: { from } };
});

describe('Property Large Loss Triangulation — header + grids', () => {
  beforeEach(() => { headerRows = []; paidRows = []; reservedRows = []; incurredRows = []; vi.clearAllMocks(); });

  it('persists header fields (date_of_loss, claim_policy_no) and saves paid/reserved with incurred auto-calc', async () => {
    const user = userEvent.setup();
    render(<Wrapper id="S1"><StepLargeLossTriangulation /></Wrapper>);

  // Fill header first row using aria-labels
  const lossDesc = await screen.findByLabelText('Loss Description');
  await user.type(lossDesc as HTMLInputElement, 'Fire at Plant');

  const dateInput = screen.getByLabelText('Date of Loss', { selector: 'input' }) as HTMLInputElement | null;
  if (dateInput) await user.type(dateInput, '2025-03-10');

  const claimPolicy = screen.getByLabelText('Claim / Policy No.', { selector: 'input' }) as HTMLInputElement | null;
  if (claimPolicy) await user.type(claimPolicy, 'CLM-123');

    // Enter Paid grid values (first row)
    const paidTotalsBefore = screen.getByText(/Development Grid — Paid/i);
    expect(paidTotalsBefore).toBeTruthy();

    // Enter Paid grid values (first row, first dev column: 12 months)
    const tables = await screen.findAllByRole('table');
    // 0: Loss Header, 1: Paid, 2: Reserved, 3: Incurred
    expect(tables.length).toBeGreaterThanOrEqual(4);
    const paidTable = tables[1] as HTMLElement;
    const paidInputs = paidTable.querySelectorAll('tbody input');
    expect(paidInputs.length).toBeGreaterThan(0);
    const paidCell = paidInputs[0] as HTMLInputElement;
    await user.clear(paidCell);
    await user.type(paidCell, '100');

    // Reserved: first row, first dev column
    const reservedTable = tables[2] as HTMLElement;
    const reservedInputs = reservedTable.querySelectorAll('tbody input');
    expect(reservedInputs.length).toBeGreaterThan(0);
    const reservedCell = reservedInputs[0] as HTMLInputElement;
    await user.clear(reservedCell);
    await user.type(reservedCell, '50');

    // Wait for autosave to fire
    await waitFor(() => {
      expect(headerRows.length).toBeGreaterThan(0);
      expect(paidRows.length).toBeGreaterThan(0);
      expect(reservedRows.length).toBeGreaterThan(0);
      expect(incurredRows.length).toBeGreaterThan(0);
    });

    // Reload component to ensure values come back
    render(<Wrapper id="S1"><StepLargeLossTriangulation /></Wrapper>);
    await waitFor(() => {
      // Header values persisted
      expect(headerRows[0].loss_description).toContain('Fire at Plant');
      expect(headerRows[0].claim_policy_no).toContain('CLM-123');
      // Incurred equals sum
      const match = (r: any) => r.development_months === (paidRows[0]?.development_months || 12);
      const paid = paidRows.find(match)?.amount || 0;
      const res = reservedRows.find(match)?.amount || 0;
      const inc = incurredRows.find(match)?.amount || 0;
      expect(inc).toEqual(paid + res);
    });
  }, 15000);
});
