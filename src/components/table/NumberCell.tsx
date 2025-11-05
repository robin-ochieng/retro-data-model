import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { formatNumberDisplay, parseNumericInput, formatNumberForEdit } from '../../lib/numberFormat';

interface NumberCellProps {
  /** Current numeric value */
  value: number | null;
  /** Callback when value changes */
  onChange: (value: number | null) => void;
  /** Number of decimal places to display (default: 2) */
  decimals?: number;
  /** Additional CSS classes */
  className?: string;
  /** Auto-focus when component mounts (for new rows) */
  autoFocusOnAdd?: boolean;
  /** Placeholder text for empty cells */
  placeholder?: string;
  /** Disable editing */
  disabled?: boolean;
  /** Read-only mode (prevents editing) */
  readOnly?: boolean;
  /** Additional aria-label for accessibility */
  ariaLabel?: string;
}

/**
 * NumberCell - Editable table cell for numeric values
 * 
 * Features:
 * - Display mode: shows formatted number with thousands separators
 * - Edit mode: raw number input without formatting
 * - Paste support: handles Excel formats with commas/decimals
 * - Keyboard navigation: Enter to commit, Escape to cancel, Tab to navigate
 */
export function NumberCell({
  value,
  onChange,
  decimals = 2,
  className = '',
  autoFocusOnAdd = false,
  placeholder = '0',
  disabled = false,
  readOnly = false,
  ariaLabel,
}: NumberCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus when enabled
  useEffect(() => {
    if (autoFocusOnAdd && inputRef.current) {
      setIsEditing(true);
      inputRef.current.focus();
    }
  }, [autoFocusOnAdd]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Enter edit mode
  const handleClick = () => {
    if (disabled || readOnly) return;
    setEditValue(formatNumberForEdit(value));
    setValidationError(null);
    setIsEditing(true);
  };

  // Commit the edited value
  const handleCommit = () => {
    const parsed = parseNumericInput(editValue);
    
    if (editValue.trim() !== '' && parsed === null) {
      // Invalid input
      setValidationError('Invalid number format');
      return;
    }

    onChange(parsed);
    setIsEditing(false);
    setValidationError(null);
  };

  // Cancel editing
  const handleCancel = () => {
    setIsEditing(false);
    setEditValue('');
    setValidationError(null);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
    // Tab naturally moves focus
  };

  // Handle paste events (Excel compatibility)
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const parsed = parseNumericInput(pastedText);
    
    if (parsed !== null) {
      setEditValue(String(parsed));
      setValidationError(null);
    } else if (pastedText.trim() !== '') {
      // Keep the pasted text for user to correct
      setEditValue(pastedText);
      setValidationError('Invalid number format');
    }
  };

  // Display mode
  if (!isEditing) {
    const displayValue = formatNumberDisplay(value, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });

    return (
      <div
        onClick={handleClick}
        className={`
          cursor-pointer rounded px-3 py-2 text-right transition-colors
          hover:bg-gray-50 dark:hover:bg-gray-700/50
          ${disabled ? 'cursor-not-allowed opacity-50' : ''}
          ${className}
        `}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            handleClick();
          }
        }}
        aria-label={ariaLabel || `Edit number: ${displayValue || placeholder}`}
      >
        <span className="whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
          {displayValue || <span className="text-gray-400 dark:text-gray-500">{placeholder}</span>}
        </span>
      </div>
    );
  }

  // Edit mode
  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={editValue}
        onChange={(e) => {
          setEditValue(e.target.value);
          setValidationError(null);
        }}
        onBlur={handleCommit}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={placeholder}
        disabled={disabled}
        className={`
          w-full min-w-0 rounded border px-3 py-2 text-right text-sm
          focus:outline-none focus:ring-2
          ${
            validationError
              ? 'border-red-500 bg-red-50 dark:bg-red-900/20 focus:ring-red-500'
              : 'border-blue-500 bg-white dark:bg-gray-800 focus:ring-blue-500'
          }
          text-gray-900 dark:text-gray-100
          disabled:cursor-not-allowed disabled:opacity-50
        `}
        aria-label={ariaLabel || 'Edit number'}
        aria-invalid={!!validationError}
        aria-describedby={validationError ? 'number-cell-error' : undefined}
      />
      {validationError && (
        <div
          id="number-cell-error"
          className="absolute left-0 top-full z-10 mt-1 whitespace-nowrap rounded bg-red-600 px-2 py-1 text-xs text-white shadow-lg"
          role="alert"
          aria-live="polite"
        >
          {validationError}
        </div>
      )}
    </div>
  );
}
