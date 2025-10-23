import React from 'react';
import { NumberCell } from '../../components/table/NumberCell';
import { YearCell } from '../../components/table/YearCell';
import { formatNumberDisplay } from '../../lib/formatUtils';

export interface TriangulationTableProps {
  title: string;
  years: Array<number | null>;
  devMonths: number[];
  values: Array<Array<number | null>>;
  onYearChange?: (rowIndex: number, value: number | null) => void;
  onValueChange?: (rowIndex: number, devMonth: number, value: number | null) => void;
  onAddRow?: () => void;
  onRemoveRow?: (rowIndex: number) => void;
  onPaste?: () => void;
  onImportCsv?: () => void;
  isSaving?: boolean;
  lastSavedAt?: Date | null;
  decimals?: number;
  yearErrors?: Record<number, string>;
  cellErrors?: Record<number, { months?: Record<number, string> }>;
  loading?: boolean;
  readOnly?: boolean;
  badge?: string;
  valueFormatter?: (value: number | null) => string;
}

const MONTH_LABEL = (months: number) => `${months} months`;

const baseCellClasses = 'px-3 py-2 align-top';

export function TriangulationTable({
  title,
  years,
  devMonths,
  values,
  onYearChange,
  onValueChange,
  onAddRow,
  onRemoveRow,
  onPaste,
  onImportCsv,
  isSaving,
  lastSavedAt,
  decimals = 2,
  yearErrors,
  cellErrors,
  loading,
  readOnly = false,
  badge,
  valueFormatter,
}: TriangulationTableProps) {
  const rowCount = Math.max(years.length, values.length);
  const hasActions = !readOnly && Boolean(onRemoveRow);
  const disableRemove = rowCount <= 1;
  const canEditYears = !readOnly && typeof onYearChange === 'function';
  const canEditValues = !readOnly && typeof onValueChange === 'function';

  const formatValue = (value: number | null) => {
    if (valueFormatter) return valueFormatter(value);
    return formatNumberDisplay(value, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
            {badge && (
              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                {badge}
              </span>
            )}
          </div>
          {loading && <p className="text-xs text-gray-500">Loading…</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          {!readOnly && onPaste && (
            <button
              type="button"
              onClick={onPaste}
              className="rounded bg-indigo-600 px-3 py-1 font-medium text-white shadow-sm transition hover:bg-indigo-700"
            >
              Paste from Excel
            </button>
          )}
          {!readOnly && onImportCsv && (
            <button
              type="button"
              onClick={onImportCsv}
              className="rounded bg-gray-200 px-3 py-1 font-medium text-gray-900 shadow-sm transition hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
            >
              Import CSV
            </button>
          )}
          <span>
            {isSaving ? 'Saving…' : lastSavedAt ? `Saved ${lastSavedAt.toLocaleTimeString()}` : 'Autosave ready'}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto overscroll-contain rounded border border-gray-200 dark:border-gray-700">
        <table className="w-full table-auto">
          <thead className="bg-gray-100 text-sm font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            <tr>
              <th className={`${baseCellClasses} text-left whitespace-normal break-words`}>Year</th>
              {devMonths.map((m) => (
                <th key={m} className={`${baseCellClasses} text-right whitespace-nowrap`}>{MONTH_LABEL(m)}</th>
              ))}
              {hasActions && <th className={`${baseCellClasses}`}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }).map((_, rowIndex) => {
              const monthRow = values[rowIndex] ?? [];
              return (
                <tr key={rowIndex} className="border-t border-gray-200 dark:border-gray-700">
                  <td className={`${baseCellClasses} whitespace-normal break-words`}>
                    {canEditYears ? (
                      <YearCell
                        value={years[rowIndex] ?? null}
                        onChange={(val) => onYearChange?.(rowIndex, val)}
                        errorMessage={yearErrors?.[rowIndex]}
                      />
                    ) : (
                      <div className="space-y-1">
                        <div className="rounded px-3 py-2 text-left text-sm text-gray-900 dark:text-gray-100">
                          {years[rowIndex] ?? (
                            <span className="text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </div>
                        {yearErrors?.[rowIndex] && (
                          <div className="text-xs text-red-600" role="alert">
                            {yearErrors[rowIndex]}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  {devMonths.map((devMonth, colIndex) => {
                    const errorMessage = cellErrors?.[rowIndex]?.months?.[devMonth];
                    return (
                      <td
                        key={devMonth}
                        className={`${baseCellClasses} whitespace-nowrap text-right`}
                      >
                        {canEditValues ? (
                          <NumberCell
                            value={monthRow[colIndex] ?? null}
                            onChange={(val) => onValueChange?.(rowIndex, devMonth, val)}
                            decimals={decimals}
                            className="w-full"
                          />
                        ) : (
                          <div className="rounded px-3 py-2 text-right text-sm text-gray-900 dark:text-gray-100">
                            {(() => {
                              const formatted = formatValue(monthRow[colIndex] ?? null);
                              return formatted || <span className="text-gray-400 dark:text-gray-500">—</span>;
                            })()}
                          </div>
                        )}
                        {errorMessage && canEditValues && (
                          <div className="mt-1 text-xs text-red-600" role="alert">
                            {errorMessage}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  {hasActions && (
                    <td className={`${baseCellClasses} whitespace-nowrap`}>
                      <button
                        type="button"
                        disabled={disableRemove}
                        onClick={() => onRemoveRow?.(rowIndex)}
                        className={`rounded px-3 py-1 text-xs font-medium shadow transition ${
                          disableRemove
                            ? 'cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                            : 'bg-red-500 text-white hover:bg-red-600'
                        }`}
                      >
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
            {rowCount === 0 && (
              <tr>
                <td
                  colSpan={devMonths.length + 1 + (hasActions ? 1 : 0)}
                  className="px-4 py-6 text-center text-sm text-gray-500"
                >
                  No rows yet. Use “Add Row” to begin.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {onAddRow && !readOnly && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onAddRow}
            className="rounded bg-blue-600 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            Add Row
          </button>
          <span className="text-sm text-gray-500">All changes auto-save after a short delay.</span>
        </div>
      )}
    </section>
  );
}

export default TriangulationTable;
