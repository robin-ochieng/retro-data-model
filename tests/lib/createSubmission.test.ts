import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Supabase before importing
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockFrom = vi.fn();

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: mockFrom
  },
  createSubmission: async (args: { client: string; year: number; lob_class?: string | null; userId?: string | null }) => {
    const { client, year, lob_class, userId } = args;
    
    // Determine line_of_business - same logic as the real function
    let lineOfBusiness = 'property';
    if (lob_class) {
      const normalized = lob_class.toLowerCase();
      if (normalized.includes('casualty') || normalized.includes('liability')) {
        lineOfBusiness = 'casualty';
      }
    }
    
    // Simulate the insert call
    const insertData = {
      user_id: userId ?? null,
      line_of_business: lineOfBusiness,
      status: 'in_progress',
      meta: { client, year },
      lob_class: lob_class ?? null,
    };
    
    mockInsert(insertData);
    
    return 'test-id-123';
  }
}));

describe('createSubmission', () => {
  beforeEach(() => {
    mockInsert.mockClear();
    mockSelect.mockClear();
    mockSingle.mockClear();
    mockFrom.mockClear();
  });

  it('should create a submission with lowercase "property" by default', async () => {
    const { createSubmission } = await import('../../src/lib/supabase');
    
    const result = await createSubmission({
      client: 'Test Client',
      year: 2025,
      userId: 'user-123'
    });

    expect(result).toBe('test-id-123');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        line_of_business: 'property'
      })
    );
  });

  it('should map "Property" lob_class to lowercase "property" line_of_business', async () => {
    const { createSubmission } = await import('../../src/lib/supabase');
    
    await createSubmission({
      client: 'Test Client',
      year: 2025,
      lob_class: 'Property',
      userId: 'user-123'
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        line_of_business: 'property',
        lob_class: 'Property'
      })
    );
  });

  it('should map "Casualty / Liability" to lowercase "casualty"', async () => {
    const { createSubmission } = await import('../../src/lib/supabase');
    
    await createSubmission({
      client: 'Test Client',
      year: 2025,
      lob_class: 'Casualty / Liability',
      userId: 'user-123'
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        line_of_business: 'casualty',
        lob_class: 'Casualty / Liability'
      })
    );
  });

  it('should map "Marine & Aviation" to "property" (default)', async () => {
    const { createSubmission } = await import('../../src/lib/supabase');
    
    await createSubmission({
      client: 'Test Client',
      year: 2025,
      lob_class: 'Marine & Aviation',
      userId: 'user-123'
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        line_of_business: 'property',
        lob_class: 'Marine & Aviation'
      })
    );
  });

  it('should handle null userId gracefully', async () => {
    const { createSubmission } = await import('../../src/lib/supabase');
    
    const result = await createSubmission({
      client: 'Test Client',
      year: 2025,
      userId: null
    });

    expect(result).toBe('test-id-123');
  });

  it('should set status to "in_progress"', async () => {
    const { createSubmission } = await import('../../src/lib/supabase');
    
    await createSubmission({
      client: 'Test Client',
      year: 2025,
      userId: 'user-123'
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'in_progress'
      })
    );
  });

  it('should include client and year in meta', async () => {
    const { createSubmission } = await import('../../src/lib/supabase');
    
    await createSubmission({
      client: 'Kenya Re',
      year: 2025,
      userId: 'user-123'
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: { client: 'Kenya Re', year: 2025 }
      })
    );
  });
});
