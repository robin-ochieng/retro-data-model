import React from 'react';
import TriangulationTable, { TriangulationTableProps } from './TriangulationTable';

type Props = Omit<TriangulationTableProps, 'title' | 'decimals' | 'valueFormatter'> & {
  decimals?: number;
};

const percentFormatter = new Intl.NumberFormat('en-KE', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatRatio = (value: number | null): string => {
  if (value == null) return '';
  if (!Number.isFinite(value)) return '';
  return percentFormatter.format(value);
};

export function WiLrTable({ decimals, ...rest }: Props) {
  return (
    <TriangulationTable
      title="W/I L/R (0–1)"
      decimals={decimals ?? 4}
      valueFormatter={formatRatio}
      {...rest}
    />
  );
}

export default WiLrTable;
