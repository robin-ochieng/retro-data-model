import React from 'react';
import TriangulationTable, { TriangulationTableProps } from './TriangulationTable';

type Props = Omit<TriangulationTableProps, 'title' | 'decimals'> & { decimals?: number };

export function NumberOfLossesTable({ decimals, ...rest }: Props) {
  return (
    <TriangulationTable
      title="Number of Losses"
      decimals={decimals ?? 0}
      {...rest}
    />
  );
}

export default NumberOfLossesTable;
