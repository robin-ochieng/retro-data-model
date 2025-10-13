import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import StepUwLimit from '@/pages/wizard/steps/property/StepUwLimit';
import { SubmissionMetaProvider } from '@/pages/wizard/SubmissionMetaContext';

// In-memory relational tables
interface UwLimitRow { submission_id: string; risk_code: string; limit_value: string; id: number }
interface UwLimitMetaRow { submission_id: string; additional_comments: string }
const uwLimits: UwLimitRow[] = [];
const uwLimitMeta: UwLimitMetaRow[] = [];
let idSeq = 1;
const spies = { rpc: vi.fn() };

vi.mock('@/lib/supabase', () => {
  function buildRelHandler(table: string) {
    return {
      _table: table,
      _filters: [] as any[],
      select() { return this; },
      eq(col: string, val: any) { this._filters.push([col, val]); return this; },
      order() {
        if (table === 'uw_limits') {
          const submission = this._filters.find(f => f[0] === 'submission_id')?.[1];
          const data = uwLimits.filter(r => r.submission_id === submission).sort((a,b)=>a.id-b.id);
          return { data, error: null };
        }
        return { data: [], error: null };
      },
      maybeSingle() {
        if (table === 'uw_limit_meta') {
          const submission = this._filters.find(f => f[0] === 'submission_id')?.[1];
            const row = uwLimitMeta.find(r => r.submission_id === submission) || null;
            return { data: row, error: null };
        }
        return { data: null, error: null };
      }
    };
  }
  const supabase: any = {
    from(table: string) { return buildRelHandler(table); },
    rpc(name: string, args: any) {
      spies.rpc(name, args);
      if (name === 'replace_uw_limits') {
        const { p_submission_id, p_rows, p_additional_comments } = args;
        // Replace limits for submission
        for (let i = uwLimits.length -1; i >=0; i--) {
          const row = uwLimits[i];
          if (row && row.submission_id === p_submission_id) uwLimits.splice(i,1);
        }
        (p_rows || []).forEach((r: any) => {
          uwLimits.push({ submission_id: p_submission_id, risk_code: r.risk_code, limit_value: r.limit, id: idSeq++ });
        });
        // Upsert meta
        const existing = uwLimitMeta.find(m => m.submission_id === p_submission_id);
        if (existing) existing.additional_comments = p_additional_comments;
        else uwLimitMeta.push({ submission_id: p_submission_id, additional_comments: p_additional_comments });
        return Promise.resolve({ data: true, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    }
  };
  return { supabase };
});

function renderStep(id='UWTEST-1') {
  return render(
    <SubmissionMetaProvider submissionId={id}>
      <MemoryRouter initialEntries={[`/wizard/property/${id}/uw-limit`]}> 
        <Routes>
          <Route path="/wizard/:lob/:submissionId/uw-limit" element={<StepUwLimit />} />
        </Routes>
      </MemoryRouter>
    </SubmissionMetaProvider>
  );
}

describe('UW Limit autosave & persistence (relational)', () => {
  beforeEach(() => { uwLimits.length = 0; uwLimitMeta.length = 0; vi.clearAllMocks(); });

  it('autosaves row edit and reloads persisted data', async () => {
    const user = userEvent.setup();
    renderStep('UW-A1');

    // Wait for component to render
    const riskCodeInput = await screen.findByPlaceholderText('Risk Code') as HTMLInputElement;
    
    // Type into risk code
    await user.type(riskCodeInput, 'RC-001');

    // Click the NumberCell to edit the limit
    const limitCell = await screen.findByLabelText(/Edit number.*0/i);
    await user.click(limitCell);
    
    // Find the edit input by aria-label (it's already visible after click)
    const limitInput = screen.getByLabelText('Edit number') as HTMLInputElement;
    await user.clear(limitInput);
    await user.type(limitInput, '1500000');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(spies.rpc).toHaveBeenCalledWith('replace_uw_limits', expect.objectContaining({ p_submission_id: 'UW-A1' }));
      const row = uwLimits.find(r => r.submission_id === 'UW-A1');
      expect(row).toBeTruthy();
      expect(row!.risk_code).toBe('RC-001');
      expect(row!.limit_value).toBe('1500000');
      // Ensure RPC received a row object containing legacy 'limit' key (function extracts r->>'limit')
      const rpcArgs = spies.rpc.mock.calls.find(c => c[0] === 'replace_uw_limits')?.[1];
      expect(rpcArgs.p_rows[0]).toHaveProperty('limit');
      // Future proofing: we also include limit_value mirror
      expect(rpcArgs.p_rows[0]).toHaveProperty('limit_value');
    });

    // Simulate navigating away and back (unmount + remount)
    renderStep('UW-A1');
    // Find all risk code inputs and check the last one (latest render)
    const reRiskCodes = await screen.findAllByPlaceholderText('Risk Code');
    expect((reRiskCodes[reRiskCodes.length - 1] as HTMLInputElement).value).toBe('RC-001');
    // The NumberCell should display the formatted value - check for multiple instances
    const formattedCells = await screen.findAllByText(/1,500,000/);
    expect(formattedCells.length).toBeGreaterThan(0);
  }, 12000);

  it('flushes on rapid navigation before debounce elapses', async () => {
    const user = userEvent.setup();
    renderStep('UW-A2');
    
    // Type risk code
    const riskCodeInput = await screen.findByPlaceholderText('Risk Code') as HTMLInputElement;
    await user.type(riskCodeInput, 'RC-FAST');
    
    // Edit limit via NumberCell
    const limitCell = await screen.findByLabelText(/Edit number.*0/i);
    await user.click(limitCell);
    const limitInput = screen.getByLabelText('Edit number') as HTMLInputElement;
    await user.clear(limitInput);
    await user.type(limitInput, '850000');
    await user.keyboard('{Enter}');
    
    // Immediately remount (simulate fast tab switch) triggers unmount flush
    renderStep('UW-A2');
    await waitFor(() => {
      const row = uwLimits.find(r => r.submission_id === 'UW-A2');
      expect(row).toBeTruthy();
      expect(row!.risk_code).toBe('RC-FAST');
      expect(row!.limit_value).toBe('850000');
      const rpcArgs = spies.rpc.mock.calls.find(c => c[0] === 'replace_uw_limits' && c[1].p_submission_id === 'UW-A2')?.[1];
      expect(rpcArgs.p_rows[0]).toMatchObject({ risk_code: 'RC-FAST', limit: '850000', limit_value: '850000' });
    });
  }, 12000);
});
