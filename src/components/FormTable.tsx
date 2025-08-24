import React from 'react';

type Column = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date';
  step?: string;
  min?: number;
  className?: string;
};

type FormTableProps<T> = {
  columns: Column[];
  rows: T[];
  onChange: (idx: number, key: keyof T, value: any) => void;
  onAddRow?: () => void;
  onRemoveRow?: (idx: number) => void;
  errors?: Record<number, Partial<Record<keyof T, string>>>;
  actions?: React.ReactNode;
};

export function FormTable<T extends Record<string, any>>({
  columns,
  rows,
  onChange,
  onAddRow,
  onRemoveRow,
  errors,
  actions,
}: FormTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full table-auto border rounded">
        <thead className="bg-gray-100 dark:bg-gray-700">
          <tr>
            {columns.map(col => (
              <th key={col.key} className="px-2 py-1 text-left whitespace-nowrap">{col.label}</th>
            ))}
            {(onAddRow || onRemoveRow || actions) && (
              <th className="px-2 py-1">Actions</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="align-top">
              {columns.map(col => (
                <td key={col.key} className="px-2 py-1 min-w-[8rem]">
                  <input
                    type={col.type ?? 'text'}
                    step={col.step}
                    min={col.min}
                    value={row[col.key] ?? ''}
                    onChange={e => {
                      const value = col.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value;
                      onChange(idx, col.key as keyof T, value);
                    }}
                    className={`px-2 py-1 border rounded w-full ${col.className ?? ''}`}
                  />
                  {errors?.[idx]?.[col.key as keyof T] && (
                    <div className="text-xs text-red-600 mt-1">{String(errors[idx]![col.key as keyof T])}</div>
                  )}
                </td>
              ))}
              {(onAddRow || onRemoveRow || actions) && (
                <td className="px-2 py-1">
                  <div className="flex gap-2">
                    {onRemoveRow && (
                      <button
                        type="button"
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                        onClick={() => onRemoveRow(idx)}
                        disabled={rows.length <= 1}
                      >
                        Remove
                      </button>
                    )}
                    {actions}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {onAddRow && (
        <div className="flex justify-between items-center mt-4">
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={onAddRow}
          >
            Add Row
          </button>
          <span className="text-gray-500 text-sm">All changes are autosaved</span>
        </div>
      )}
    </div>
  );
}

export default FormTable;
