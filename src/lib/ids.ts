import { v4 as uuid } from 'uuid';

/**
 * Ensures a loss header row has a stable loss_identifier.
 * 
 * Used to satisfy the unique constraint on large_loss_triangle_header_prop:
 *   unique(submission_id, loss_identifier)
 * 
 * @param row - A loss header row that may or may not have a loss_identifier
 * @returns The same row with a guaranteed loss_identifier (existing or newly generated UUID)
 * 
 * @example
 * // New row without identifier
 * const newRow = { year: 2024, loss_description: 'Fire damage' };
 * const withId = ensureLossIdentifier(newRow);
 * // withId.loss_identifier === 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
 * 
 * @example
 * // Existing row keeps its identifier
 * const existingRow = { loss_identifier: 'abc-123', year: 2024 };
 * const preserved = ensureLossIdentifier(existingRow);
 * // preserved.loss_identifier === 'abc-123' (unchanged)
 */
export function ensureLossIdentifier<T extends { loss_identifier?: string }>(
  row: T
): T & { loss_identifier: string } {
  // If row already has a non-empty loss_identifier, preserve it
  if (row.loss_identifier && row.loss_identifier.trim()) {
    return row as T & { loss_identifier: string };
  }
  
  // Otherwise, generate a new UUID
  return {
    ...row,
    loss_identifier: uuid(),
  };
}

/**
 * Ensures all rows in an array have stable loss_identifier values.
 * 
 * @param rows - Array of loss header rows
 * @returns Array with all rows guaranteed to have loss_identifier
 * 
 * @example
 * const rows = [
 *   { year: 2024, loss_description: 'Fire' },
 *   { loss_identifier: 'keep-me', year: 2023 },
 *   { year: 2022, loss_description: 'Flood' }
 * ];
 * const withIds = ensureAllLossIdentifiers(rows);
 * // All rows now have loss_identifier, second row kept 'keep-me'
 */
export function ensureAllLossIdentifiers<T extends { loss_identifier?: string }>(
  rows: T[]
): (T & { loss_identifier: string })[] {
  return rows.map(ensureLossIdentifier);
}

/**
 * Merges pasted rows with existing rows by loss_identifier.
 * Used during Excel paste to update existing rows while preserving their identifiers.
 * 
 * @param existingRows - Current rows in state
 * @param pastedRows - Newly pasted rows (may have identifiers)
 * @returns Merged array with identifiers preserved where possible
 * 
 * @example
 * const existing = [
 *   { loss_identifier: 'A', year: 2023, threshold: 100000 },
 *   { loss_identifier: 'B', year: 2024, threshold: 200000 }
 * ];
 * const pasted = [
 *   { year: 2023, threshold: 150000 }, // matches first by index
 *   { year: 2024, threshold: 250000 }  // matches second by index
 * ];
 * const merged = mergeLossHeadersByIdentifier(existing, pasted);
 * // Result: identifiers 'A' and 'B' preserved, thresholds updated
 */
export function mergeLossHeadersByIdentifier<T extends { loss_identifier?: string }>(
  existingRows: T[],
  pastedRows: T[]
): (T & { loss_identifier: string })[] {
  return pastedRows.map((pastedRow, index) => {
    // If pasted row has identifier, use it
    if (pastedRow.loss_identifier && pastedRow.loss_identifier.trim()) {
      return ensureLossIdentifier(pastedRow);
    }
    
    // Otherwise, try to preserve identifier from matching index in existing rows
    const existingAtIndex = existingRows[index];
    if (existingAtIndex?.loss_identifier) {
      return {
        ...pastedRow,
        loss_identifier: existingAtIndex.loss_identifier,
      };
    }
    
    // No match found, generate new identifier
    return ensureLossIdentifier(pastedRow);
  });
}
