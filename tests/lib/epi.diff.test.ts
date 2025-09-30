import { describe, it, expect } from 'vitest';
import { diffGwpRows, EpiGwpSplitRow } from '../../src/lib/epi';

describe('diffGwpRows', () => {
  it('identifies deletions by id', () => {
    const existing: EpiGwpSplitRow[] = [
      { id: 'a', submission_id: 's1', section: 'Motor', premium: 10, position: 0 },
      { id: 'b', submission_id: 's1', section: 'Motor', premium: 20, position: 1 },
    ];
    const incoming: EpiGwpSplitRow[] = [
      { id: 'b', submission_id: 's1', section: 'Motor', premium: 25, position: 0 },
    ];
    const { toDelete } = diffGwpRows(existing, incoming);
    expect(toDelete.map(r => r.id)).toEqual(['a']);
  });

  it('ignores new rows without id for deletion', () => {
    const existing: EpiGwpSplitRow[] = [];
    const incoming: EpiGwpSplitRow[] = [
      { submission_id: 's1', section: 'Motor', premium: 100 },
      { submission_id: 's1', section: 'Motor', premium: 200 },
    ];
    const { toDelete } = diffGwpRows(existing, incoming);
    expect(toDelete).toHaveLength(0);
  });
});
