import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('StepRiskProfile lazy migration', () => {
  let metaRow: { retention: string; additional_comments: string } | null = null;
  let blobPayload: any = { retention: '5%', additional_comments: 'Legacy comment' };
  let rpcCalls: Array<{ fn: string; args: any }> = [];

  beforeEach(() => {
    vi.resetModules();
    metaRow = null;
    blobPayload = { retention: '5%', additional_comments: 'Legacy comment' };
    rpcCalls = [];
  });

  async function setup() {
    vi.doMock('react-router-dom', async () => {
      const actual = await vi.importActual<any>('react-router-dom');
      return { ...actual, useParams: () => ({ submissionId: 'sub123' }) };
    });
    vi.doMock('../../../../lib/supabase', () => {
      const supabaseMock: any = {
        from(table: string) {
          const ctx: any = {
            _table: table,
            _filters: [] as any[],
            _rows: [] as any[],
            select() { return this; },
            delete() { this._rows = []; return this; },
            insert(rows: any[]) { this._rows.push(...rows); return Promise.resolve({ data: rows, error: null }); },
            upsert(rows: any[]) { this._rows = rows; return Promise.resolve({ data: rows, error: null }); },
            eq(col: string, val: any) { this._filters.push([col, val]); return this; },
            order() { return Promise.resolve({ data: this._rows, error: null }); },
            maybeSingle() {
              if (this._table === 'risk_profile_meta') {
                if (metaRow) return Promise.resolve({ data: metaRow, error: null });
                return Promise.resolve({ data: null, error: { message: 'not found' } });
              }
              if (this._table === 'sheet_blobs') {
                return Promise.resolve({ data: { payload: blobPayload }, error: null });
              }
              return Promise.resolve({ data: null, error: null });
            },
            then(resolve: any) { return resolve({ data: this._rows, error: null }); }
          };
          return ctx;
        },
        rpc(fn: string, args: any) {
          rpcCalls.push({ fn, args });
          if (fn === 'migrate_risk_profile_meta_from_blob') {
            metaRow = { retention: blobPayload.retention, additional_comments: blobPayload.additional_comments };
          }
          return Promise.resolve({ data: true, error: null });
        }
      };
      return { supabase: supabaseMock };
    });
    const { default: StepRiskProfile } = await import('./StepRiskProfile');
    const rtl = await import('@testing-library/react');
    return { StepRiskProfile, ...rtl };
  }

  it('migrates from legacy blob when relational meta missing', async () => {
    const { StepRiskProfile, render, screen } = await setup();
    render(<StepRiskProfile />);
    const input = await screen.findByDisplayValue('5%');
    expect(input).toBeTruthy();
    expect(rpcCalls.length).toBe(1);
    expect(rpcCalls[0]!.fn).toBe('migrate_risk_profile_meta_from_blob');
    expect(rpcCalls[0]!.args).toEqual({ p_submission_id: 'sub123' });
  });

  it('does not migrate when relational meta already exists', async () => {
    metaRow = { retention: '10%', additional_comments: 'Existing relational' };
    const { StepRiskProfile, render, screen } = await setup();
    render(<StepRiskProfile />);
    const input = await screen.findByDisplayValue('10%');
    expect(input).toBeTruthy();
    expect(rpcCalls.length).toBe(0);
  });
});
