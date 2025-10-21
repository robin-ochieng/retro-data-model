import React from 'react';
import TriangulationTable, { TriangulationTableProps } from './TriangulationTable';

type Props = Omit<TriangulationTableProps, 'title' | 'decimals'> & { decimals?: number };

export function PaidLossesTable({ decimals, ...rest }: Props) {
  return (
    <TriangulationTable
      title="Paid Losses"
      decimals={decimals ?? 2}
      {...rest}
    />
  );
}

export default PaidLossesTable;
