import React from 'react';
import TriangulationTable, { TriangulationTableProps } from './TriangulationTable';

type Props = Omit<TriangulationTableProps, 'title' | 'decimals'> & { decimals?: number };

export function WiLrTable({ decimals, ...rest }: Props) {
  return (
    <TriangulationTable
      title="W/I L/R (0–1)"
      decimals={decimals ?? 4}
      {...rest}
    />
  );
}

export default WiLrTable;
