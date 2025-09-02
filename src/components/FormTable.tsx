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
  footerRender?: React.ReactNode;
  onPaste?: () => void;
  onImportCsv?: () => void;
  onExportCsv?: () => void;
  isSaving?: boolean;
  lastSavedAt?: Date | null;
};

export function FormTable<T extends Record<string, any>>({
  columns,
  rows,
  onChange,
  onAddRow,
  onRemoveRow,
  errors,
  actions,
  footerRender,
  onPaste,
  onImportCsv,
  onExportCsv,
  isSaving,
  lastSavedAt,
}: FormTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <div className="flex items-center justify-between 3xl:justify-start 3xl:gap-4 mb-2">
        <div className="flex gap-2">
          {onPaste && (
            <button type="button" className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700" onClick={onPaste}>
              Paste from Excel
            </button>
          )}
          {onImportCsv && (
            <button type="button" className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700" onClick={onImportCsv}>
              Import CSV
            </button>
          )}
          {onExportCsv && (
            <button type="button" className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700" onClick={onExportCsv}>
              Export CSV
            </button>
          )}
        </div>
        <div className="text-xs text-gray-500">
          {isSaving ? 'Saving…' : lastSavedAt ? `Saved ${lastSavedAt.toLocaleTimeString()}` : 'Autosave ready'}
        </div>
      </div>
  <table className="min-w-full table-auto border rounded 3xl:max-w-[1760px] 4xl:max-w-[1960px]">
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
        {footerRender && (
          <tfoot>
            <tr>
              <td colSpan={(columns?.length ?? 0) + ((onAddRow || onRemoveRow || actions) ? 1 : 0)} className="px-2 py-2 bg-gray-50 dark:bg-gray-900">
                {footerRender}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
      {onAddRow && (
  <div className="flex justify-between 3xl:justify-start 3xl:gap-4 items-center mt-4">
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
