import { useState, useRef, useEffect } from 'react';
import { parseDateInput, formatDateDisplay } from '../../lib/numberFormat';

interface DateCellProps {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  onCommit: () => void;
  className?: string;
  readOnly?: boolean;
}

/**
 * DateCell - A specialized cell for date input/display
 * 
 * Features:
 * - Accepts multiple date formats: ISO, DD/MM/YYYY, DD-MM-YYYY, YYYY/MM/DD, Excel serials
 * - Stores as ISO YYYY-MM-DD
 * - Displays in localized format (e.g., "1 Oct 2024")
 * - Uses native date picker for easier input
 * - Shows inline error for invalid dates
 */
export function DateCell({ value, onChange, onCommit, className = '', readOnly = false }: DateCellProps) {
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
    if (readOnly) return;
    // Convert ISO to YYYY-MM-DD for date input
    const parsed = parseDateInput(value);
    setEditValue(parsed || '');
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
    const parsed = parseDateInput(trimmed);
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
          type="date"
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
          <div className="absolute top-full left-0 mt-1 text-xs text-red-600 dark:text-red-400 whitespace-nowrap z-10">
            Enter valid date (DD/MM/YYYY or use picker)
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
      {value ? formatDateDisplay(value) : ''}
    </div>
  );
}
