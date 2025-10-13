import { useState, useRef, useEffect } from 'react';
import { parseYearInput } from '../../lib/numberFormat';

interface YearCellProps {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  onCommit: () => void;
  className?: string;
}

/**
 * YearCell - A specialized cell for 4-digit year input/display
 * 
 * Features:
 * - Validates 4-digit years (1900-2100)
 * - Rejects years with commas
 * - Shows inline error for invalid input
 * - View mode shows plain year (no formatting)
 * - Edit mode allows numeric input only
 */
export function YearCell({ value, onChange, onCommit, className = '' }: YearCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [showError, setShowError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    setEditValue(value?.toString() || '');
    setShowError(false);
    setIsEditing(true);
  };

  const handleBlur = () => {
    commit();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setShowError(false);
    } else if (e.key === 'Tab') {
      commit();
    }
  };

  const commit = () => {
    const trimmed = editValue.trim();
    
    // Allow empty
    if (trimmed === '') {
      onChange(null);
      setIsEditing(false);
      setShowError(false);
      onCommit();
      return;
    }

    // Parse and validate
    const parsed = parseYearInput(trimmed);
    if (parsed !== null) {
      onChange(parsed);
      setIsEditing(false);
      setShowError(false);
      onCommit();
    } else {
      // Show error but stay in edit mode
      setShowError(true);
    }
  };

  if (isEditing) {
    return (
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="\d{4}"
          value={editValue}
          onChange={(e) => {
            setEditValue(e.target.value);
            setShowError(false);
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`w-full px-2 py-1 border rounded 
            ${showError ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'}
            bg-white dark:bg-gray-800 
            text-gray-900 dark:text-gray-100
            focus:outline-none focus:ring-2 focus:ring-blue-500
            ${className}`}
        />
        {showError && (
          <div className="absolute top-full left-0 mt-1 text-xs text-red-600 dark:text-red-400 whitespace-nowrap">
            Enter 4-digit year (1900-2100)
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className={`px-2 py-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${className}`}
    >
      {value ?? ''}
    </div>
  );
}
