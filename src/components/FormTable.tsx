import React from 'react';
import { NumberCell } from './table/NumberCell';
import { DateCell } from './table/DateCell';

type Column = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date';
  step?: string;
  min?: number;
  className?: string;
  /** Use specialized cell component (NumberCell or DateCell) instead of plain input */
  useSpecializedCell?: boolean;
  /** Number of decimal places for NumberCell (default: 2) */
  decimals?: number;
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
  readOnly?: boolean;
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
  readOnly = false,
}: FormTableProps<T>) {
  const scrollerRef = React.useRef<HTMLDivElement | null>(null);
  const scrollLeftRef = React.useRef(0);
  const isRestoringRef = React.useRef(false);

  // Capture horizontal scroll position
  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      if (isRestoringRef.current) return;
      scrollLeftRef.current = el.scrollLeft;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Restore scroll on mount and when table shape changes
  const rowCount = rows?.length ?? 0;
  const colCount = columns?.length ?? 0;
  React.useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    isRestoringRef.current = true;
    // Clamp to new max scrollWidth
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    const target = Math.min(max, scrollLeftRef.current);
    el.scrollLeft = target;
    // End restore on next frame
    const id = requestAnimationFrame(() => { isRestoringRef.current = false; });
    return () => cancelAnimationFrame(id);
  }, [rowCount, colCount]);

  return (
    <div ref={scrollerRef} className="overflow-x-auto overscroll-contain" style={{ scrollbarGutter: 'stable both-edges' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-2">
          {!readOnly && onPaste && (
            <button type="button" className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700" onClick={onPaste}>
              Paste from Excel
            </button>
          )}
          {!readOnly && onImportCsv && (
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
      <table className="min-w-full table-auto border rounded" style={{ tableLayout: 'auto' }}>
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
              {columns.map(col => {
                // Determine cell alignment and wrapping
                const isNumeric = col.type === 'number';
                const isDate = col.type === 'date';
                const isText = col.type === 'text' || !col.type;
                
                const cellClassName = `px-2 py-1 ${
                  isText ? 'whitespace-normal break-words' : 
                  isDate ? 'whitespace-nowrap' :
                  isNumeric ? 'whitespace-nowrap text-right' : ''
                }`;

                // Use specialized cell components if requested
                if (col.useSpecializedCell && isNumeric) {
                  return (
                    <td key={col.key} className={cellClassName}>
                      <NumberCell
                        value={row[col.key] === '' ? null : Number(row[col.key])}
                        onChange={(value) => onChange(idx, col.key as keyof T, value === null ? '' : value)}
                        decimals={col.decimals ?? 2}
                        ariaLabel={col.label}
                        readOnly={readOnly}
                      />
                      {errors?.[idx]?.[col.key as keyof T] && (
                        <div className="text-xs text-red-600 mt-1">{String(errors[idx]![col.key as keyof T])}</div>
                      )}
                    </td>
                  );
                }

                if (col.useSpecializedCell && isDate) {
                  return (
                    <td key={col.key} className={cellClassName}>
                      <DateCell
                        value={row[col.key]}
                        onChange={(value) => onChange(idx, col.key as keyof T, value)}
                        onCommit={() => {/* autosave will handle */}}
                        readOnly={readOnly}
                      />
                      {errors?.[idx]?.[col.key as keyof T] && (
                        <div className="text-xs text-red-600 mt-1">{String(errors[idx]![col.key as keyof T])}</div>
                      )}
                    </td>
                  );
                }

                // Default input rendering
                return (
                  <td key={col.key} className={cellClassName}>
                    <input
                      type={col.type ?? 'text'}
                      step={col.step}
                      min={col.min}
                      aria-label={col.label}
                      value={row[col.key] ?? ''}
                      disabled={readOnly}
                      onChange={e => {
                        const value = col.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value;
                        onChange(idx, col.key as keyof T, value);
                      }}
                      className={`px-2 py-1 border rounded w-full min-w-0 ${col.className ?? ''}`}
                    />
                    {errors?.[idx]?.[col.key as keyof T] && (
                      <div className="text-xs text-red-600 mt-1">{String(errors[idx]![col.key as keyof T])}</div>
                    )}
                  </td>
                );
              })}
              {(onAddRow || onRemoveRow || actions) && (
                <td className="px-2 py-1 whitespace-nowrap">
                  <div className="flex gap-2">
                    {onRemoveRow && !readOnly && (
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
      {onAddRow && !readOnly && (
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
