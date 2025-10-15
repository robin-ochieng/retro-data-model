import React from 'react';
import { formatNumberDisplay, parseNumericInput } from '../lib/formatUtils';

type Column = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date';
  step?: string;
  min?: number;
  readonly?: boolean;
};

type TriangulationTableProps = {
  title: string;
  columns: Column[];
  rows: Record<string, any>[];
  onChange: (idx: number, key: string, value: any) => void;
  onRemoveRow?: (idx: number) => void;
  onPaste?: () => void;
  readonly?: boolean;
  totals?: number[];
};

/**
 * Specialized table component for Large Loss Triangulation grids
 * Features:
 * - Displays formatted numbers with commas in static view
 * - Editable raw numbers on focus
 * - Auto-sizing columns with proper wrapping
 * - Excel paste support
 */
export function TriangulationTable({
  title,
  columns,
  rows,
  onChange,
  onRemoveRow,
  onPaste,
  readonly = false,
  totals,
}: TriangulationTableProps) {
  const [editingCell, setEditingCell] = React.useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = React.useState<string>('');

  const handleFocus = (rowIdx: number, colKey: string, currentValue: any) => {
    setEditingCell({ row: rowIdx, col: colKey });
    // Show raw numeric value for editing
    setEditValue(currentValue === '' || currentValue == null ? '' : String(currentValue));
  };

  const handleBlur = (rowIdx: number, colKey: string) => {
    if (!editingCell) return;
    
    const col = columns.find(c => c.key === colKey);
    if (col?.type === 'number') {
      const parsed = parseNumericInput(editValue);
      onChange(rowIdx, colKey, parsed ?? '');
    } else {
      onChange(rowIdx, colKey, editValue);
    }
    
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowIdx: number, colKey: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur(rowIdx, colKey);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        {totals && (
          <div className="text-xs text-gray-500">
            Totals: {totals.map(t => formatNumberDisplay(t)).join(' | ')}
          </div>
        )}
      </div>

      {onPaste && !readonly && (
        <button
          type="button"
          className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
          onClick={onPaste}
        >
          Paste from Excel
        </button>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full table-auto border rounded" style={{ tableLayout: 'auto' }}>
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              {columns.map(col => (
                <th key={col.key} className="px-3 py-2 text-left whitespace-nowrap font-semibold text-sm">
                  {col.label}
                </th>
              ))}
              {onRemoveRow && !readonly && (
                <th className="px-3 py-2 text-center whitespace-nowrap font-semibold text-sm">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="align-top hover:bg-gray-50 dark:hover:bg-gray-800">
                {columns.map(col => {
                  const isEditing = editingCell?.row === rowIdx && editingCell?.col === col.key;
                  const cellValue = row[col.key];
                  const displayValue = col.type === 'number' && !isEditing
                    ? formatNumberDisplay(cellValue)
                    : cellValue ?? '';

                  if (readonly || col.readonly) {
                    return (
                      <td
                        key={col.key}
                        className={`px-3 py-2 ${col.type === 'number' ? 'text-right whitespace-nowrap' : 'whitespace-normal break-words'}`}
                      >
                        <div className="min-h-[2rem] flex items-center">
                          {displayValue}
                        </div>
                      </td>
                    );
                  }

                  return (
                    <td
                      key={col.key}
                      className={`px-3 py-2 ${col.type === 'number' ? 'whitespace-nowrap' : 'whitespace-normal break-words'}`}
                    >
                      <input
                        type={col.type === 'number' ? 'text' : col.type ?? 'text'}
                        value={isEditing ? editValue : displayValue}
                        onChange={(e) => {
                          if (isEditing) {
                            setEditValue(e.target.value);
                          }
                        }}
                        onFocus={() => handleFocus(rowIdx, col.key, cellValue)}
                        onBlur={() => handleBlur(rowIdx, col.key)}
                        onKeyDown={(e) => handleKeyDown(e, rowIdx, col.key)}
                        className={`w-full min-w-0 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 ${
                          col.type === 'number' ? 'text-right' : ''
                        }`}
                        aria-label={col.label}
                      />
                    </td>
                  );
                })}
                {onRemoveRow && !readonly && (
                  <td className="px-3 py-2 text-center whitespace-nowrap">
                    <button
                      type="button"
                      className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                      onClick={() => onRemoveRow(rowIdx)}
                      disabled={rows.length <= 1}
                    >
                      Remove
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
