import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mirrorCobLobToSubmission } from '../../src/lib/mirrorCobLob';
import * as supabaseModule from '../../src/lib/supabase';

// Mock supabase
const mockUpdate = vi.fn();
const mockEq1 = vi.fn(); // First .eq() call
const mockEq2 = vi.fn(); // Second .eq() call
const mockFrom = vi.fn();

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

describe('mirrorCobLobToSubmission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock chain for .update().eq().eq()
    mockEq2.mockReturnValue({ error: null });
    mockEq1.mockReturnValue({ eq: mockEq2 });
    mockUpdate.mockReturnValue({ eq: mockEq1 });
    mockFrom.mockReturnValue({ update: mockUpdate });
  });

  it('returns false for empty submission ID', async () => {
    const result = await mirrorCobLobToSubmission('', 'Property', 'Fire & Allied Perils');
    
    expect(result).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('updates submissions table with class and line', async () => {
    await mirrorCobLobToSubmission(
      'test-submission-id',
      'Property',
      'Fire & Allied Perils'
    );

    expect(mockFrom).toHaveBeenCalledWith('submissions');
    expect(mockUpdate).toHaveBeenCalledWith({
      lob_class: 'Property',
      lob_line: 'Fire & Allied Perils',
    });
    expect(mockEq1).toHaveBeenCalledWith('id', 'test-submission-id');
    expect(mockEq2).toHaveBeenCalledWith('status', 'in_progress');
  });

  it('handles null class and line values', async () => {
    await mirrorCobLobToSubmission('test-submission-id', null, null);

    expect(mockUpdate).toHaveBeenCalledWith({
      lob_class: null,
      lob_line: null,
    });
  });

  it('only updates in_progress submissions', async () => {
    await mirrorCobLobToSubmission(
      'test-submission-id',
      'Casualty / Liability',
      'General Liability'
    );

    // Verify the second eq call filters by status
    expect(mockEq2).toHaveBeenCalledWith('status', 'in_progress');
  });

  it('returns true on successful update', async () => {
    mockEq2.mockReturnValue({ error: null });

    const result = await mirrorCobLobToSubmission(
      'test-submission-id',
      'Marine & Aviation',
      'Marine Cargo'
    );

    expect(result).toBe(true);
  });

  it('returns false and logs warning on error', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const testError = new Error('Database error');
    mockEq2.mockReturnValue({ error: testError });

    const result = await mirrorCobLobToSubmission(
      'test-submission-id',
      'Life',
      'Term Life'
    );

    expect(result).toBe(false);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[mirrorCobLob] Failed to mirror COB/LOB to submissions:',
      testError
    );
    
    consoleWarnSpy.mockRestore();
  });

  it('handles exceptions gracefully', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockFrom.mockImplementation(() => {
      throw new Error('Network failure');
    });

    const result = await mirrorCobLobToSubmission(
      'test-submission-id',
      'Motor',
      'Private Motor'
    );

    expect(result).toBe(false);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[mirrorCobLob] Exception mirroring COB/LOB:',
      expect.any(Error)
    );
    
    consoleWarnSpy.mockRestore();
  });

  it('works with long class and line names', async () => {
    const longClass = 'Energy / Oil & Gas';
    const longLine = 'Upstream Energy';

    await mirrorCobLobToSubmission('test-submission-id', longClass, longLine);

    expect(mockUpdate).toHaveBeenCalledWith({
      lob_class: longClass,
      lob_line: longLine,
    });
  });

  it('handles special characters in values', async () => {
    const classWithAmpersand = 'Credit & Surety';
    const lineWithSlash = 'Trade Credit / Export';

    await mirrorCobLobToSubmission(
      'test-submission-id',
      classWithAmpersand,
      lineWithSlash
    );

    expect(mockUpdate).toHaveBeenCalledWith({
      lob_class: classWithAmpersand,
      lob_line: lineWithSlash,
    });
  });
});
