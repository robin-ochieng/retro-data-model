import React from 'react';
import TriangulationTable, { TriangulationTableProps } from './TriangulationTable';

type Props = Omit<TriangulationTableProps, 'title' | 'decimals'> & { decimals?: number };

export function IncurredLossesTable({ decimals, ...rest }: Props) {
  return (
    <TriangulationTable
      title="Incurred Losses"
      decimals={decimals ?? 0}
      {...rest}
    />
  );
}

export default IncurredLossesTable;
