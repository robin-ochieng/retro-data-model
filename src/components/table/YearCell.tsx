import React, { useEffect, useRef, useState, KeyboardEvent } from 'react';
import { parseYearInput } from '../../lib/formatUtils';

export interface YearCellProps {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  className?: string;
  placeholder?: string;
  errorMessage?: string;
  disabled?: boolean;
}

/**
 * YearCell - Inline-editable cell for underwriting year entry.
 *
 * - Enforces plain 4-digit years (1900–2100) with no grouping characters.
 * - Shows formatted value in view mode; raw editing with validation on commit.
 * - Emits null when cleared.
 */
export function YearCell({
  value,
  onChange,
  className = '',
  placeholder = 'YYYY',
  errorMessage,
  disabled = false,
}: YearCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const openEditor = () => {
    if (disabled) return;
    setEditValue(value != null ? String(value) : '');
    setLocalError(null);
    setIsEditing(true);
  };

  const closeEditor = () => {
    setIsEditing(false);
    setLocalError(null);
  };

  const commitValue = () => {
    const trimmed = editValue.trim();

    if (trimmed === '') {
      onChange(null);
      closeEditor();
      return;
    }

    const parsed = parseYearInput(trimmed);
    if (parsed === null) {
      setLocalError('Enter a 4-digit year between 1900 and 2100');
      return;
    }

    onChange(parsed);
    closeEditor();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitValue();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeEditor();
    }
  };

  if (!isEditing) {
    const display = value != null ? String(value) : '';
    const message = errorMessage || localError;

    return (
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={openEditor}
        onKeyDown={(event) => {
          if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            openEditor();
          }
        }}
        className={`cursor-pointer rounded px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
          disabled ? 'cursor-not-allowed opacity-50' : ''
        } ${className}`}
        aria-label={display ? `Edit underwriting year ${display}` : 'Set underwriting year'}
      >
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {display || <span className="text-gray-400 dark:text-gray-500">{placeholder}</span>}
        </span>
        {message && (
          <div className="mt-1 text-xs text-red-600" role="alert">
            {message}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="\d{4}"
        maxLength={4}
        className={`w-full min-w-0 rounded border px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 ${
          localError ? 'border-red-500 bg-red-50 dark:bg-red-900/20 focus:ring-red-500' : 'border-blue-500 bg-white dark:bg-gray-800 focus:ring-blue-500'
        }`}
        value={editValue}
        onChange={(event) => {
          setEditValue(event.target.value);
          setLocalError(null);
        }}
        onBlur={commitValue}
        onKeyDown={handleKeyDown}
        aria-invalid={Boolean(localError)}
        aria-describedby={localError ? 'year-cell-error' : undefined}
        placeholder={placeholder}
        disabled={disabled}
      />
      {(localError || errorMessage) && (
        <div
          id="year-cell-error"
          className="absolute left-0 top-full z-10 mt-1 whitespace-nowrap rounded bg-red-600 px-2 py-1 text-xs text-white shadow-lg"
          role="alert"
        >
          {localError || errorMessage}
        </div>
      )}
    </div>
  );
}
