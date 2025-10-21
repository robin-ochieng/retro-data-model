import React from 'react';
import TriangulationTable, { TriangulationTableProps } from './TriangulationTable';

type Props = Omit<TriangulationTableProps, 'title' | 'decimals'> & { decimals?: number };

export function LossReservesTable({ decimals, ...rest }: Props) {
  return (
    <TriangulationTable
      title="Loss Reserves"
      decimals={decimals ?? 2}
      {...rest}
    />
  );
}

export default LossReservesTable;
