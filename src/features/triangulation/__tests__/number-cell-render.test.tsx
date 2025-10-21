import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TriangulationTable from '../TriangulationTable';

describe('TriangulationTable number cell formatting', () => {
  it('shows formatted value in view mode and raw value when editing', () => {
    render(
      <TriangulationTable
        title="Written Premium"
        years={[2024]}
        devMonths={[12]}
        values={[[8881140009]]}
        onYearChange={() => {}}
        onValueChange={() => {}}
        isSaving={false}
        lastSavedAt={null}
      />
    );

    expect(screen.getByText('8,881,140,009')).toBeInTheDocument();

    const cellButton = screen.getByRole('button', { name: /8,881,140,009/ });
    fireEvent.click(cellButton);

    const input = screen.getByDisplayValue('8881140009') as HTMLInputElement;
    expect(input).toBeInTheDocument();
  });
});
