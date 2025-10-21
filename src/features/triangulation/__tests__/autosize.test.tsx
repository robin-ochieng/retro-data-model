import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TriangulationTable from '../TriangulationTable';

describe('TriangulationTable layout classes', () => {
  it('applies autosize-friendly whitespace utilities', () => {
    const { container } = render(
      <TriangulationTable
        title="Incurred Losses"
        years={[2024, 2025]}
        devMonths={[12, 24]}
        values={[[1000, 2000], [null, -3456.78]]}
        onYearChange={() => {}}
        onValueChange={() => {}}
        isSaving={false}
        lastSavedAt={null}
      />
    );

    const scrollContainer = container.querySelector('.overflow-x-auto');
    expect(scrollContainer).not.toBeNull();

    const firstRowCells = container.querySelectorAll('tbody tr')[0]!.querySelectorAll('td');
    expect(firstRowCells[0]!.className).toContain('whitespace-normal');
    expect(firstRowCells[0]!.className).toContain('break-words');

    expect(firstRowCells[1]!.className).toContain('whitespace-nowrap');
    expect(firstRowCells[1]!.className).toContain('text-right');

    expect(container.querySelector('[class*="ellipsis"]')).toBeNull();
  });
});
