import React from 'react';
import TriangulationTable, { TriangulationTableProps } from './TriangulationTable';

type Props = Omit<TriangulationTableProps, 'title' | 'decimals'> & { decimals?: number };

export function WrittenPremiumTable({ decimals, ...rest }: Props) {
  return (
    <TriangulationTable
      title="Written Premium"
      decimals={decimals ?? 2}
      {...rest}
    />
  );
}

export default WrittenPremiumTable;
