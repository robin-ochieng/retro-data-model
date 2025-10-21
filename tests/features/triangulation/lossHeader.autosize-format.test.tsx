import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormTable } from '../../../src/components/FormTable';
import { parseNumericInput, parseDateInput } from '../../../src/lib/formatUtils';
import { formatNumberDisplay } from '../../../src/lib/numberFormat';

describe('Loss Header - Autosize and Formatting', () => {
  describe('Column Sizing and Wrapping', () => {
    it('should allow long Loss Description to wrap (whitespace-normal break-words)', () => {
      const longDescription = 'This is a very long loss description that should wrap to multiple lines without being truncated or hidden by ellipsis because we need to see the full content';
      
      const columns = [
        { key: 'loss_description', label: 'Loss Description', type: 'text' as const },
      ];
      
      const rows = [{ loss_description: longDescription }];
      
      const { container } = render(
        <FormTable
          columns={columns}
          rows={rows}
          onChange={() => {}}
        />
      );
      
      // Find the td containing the text column
      const textCell = container.querySelector('td.whitespace-normal.break-words');
      expect(textCell).toBeTruthy();
      
      // Verify no truncation classes
      expect(textCell?.className).not.toContain('truncate');
      expect(textCell?.className).not.toContain('text-ellipsis');
      expect(textCell?.className).not.toContain('overflow-hidden');
    });

    it('should allow long Claim / Policy No. to wrap', () => {
      const longClaimNo = 'POLICY-2024-CASUALTY-LONGIDENTIFIER-WITHEXTRATEXTFORWRAPPING-12345678';
      
      const columns = [
        { key: 'claim_policy_no', label: 'Claim / Policy No.', type: 'text' as const },
      ];
      
      const rows = [{ claim_policy_no: longClaimNo }];
      
      const { container } = render(
        <FormTable
          columns={columns}
          rows={rows}
          onChange={() => {}}
        />
      );
      
      const textCell = container.querySelector('td.whitespace-normal.break-words');
      expect(textCell).toBeTruthy();
      expect(textCell?.className).not.toContain('truncate');
    });

    it('should display date on single line (whitespace-nowrap)', () => {
      const columns = [
        { key: 'date_of_loss', label: 'Date of Loss', type: 'date' as const, useSpecializedCell: true },
      ];
      
      const rows = [{ date_of_loss: '2024-10-16' }];
      
      const { container } = render(
        <FormTable
          columns={columns}
          rows={rows}
          onChange={() => {}}
        />
      );
      
      // Date cells should have whitespace-nowrap
      const dateCell = container.querySelector('td.whitespace-nowrap');
      expect(dateCell).toBeTruthy();
    });

    it('should right-align threshold column (text-right whitespace-nowrap)', () => {
      const columns = [
        { key: 'threshold', label: 'Threshold', type: 'number' as const, useSpecializedCell: true, decimals: 2 },
      ];
      
      const rows = [{ threshold: 1234567.89 }];
      
      const { container } = render(
        <FormTable
          columns={columns}
          rows={rows}
          onChange={() => {}}
        />
      );
      
      // Number cells should have text-right and whitespace-nowrap
      const numberCell = container.querySelector('td.text-right.whitespace-nowrap');
      expect(numberCell).toBeTruthy();
    });
  });

  describe('Threshold Formatting', () => {
    it('should display threshold with thousands separators in view mode', async () => {
      const columns = [
        { key: 'threshold', label: 'Threshold', type: 'number' as const, useSpecializedCell: true, decimals: 2 },
      ];
      
      const rows = [{ threshold: 1234567.89 }];
      
      render(
        <FormTable
          columns={columns}
          rows={rows}
          onChange={() => {}}
        />
      );
      
      // NumberCell should format the display
      const formatted = formatNumberDisplay(1234567.89, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
      expect(formatted).toBe('1,234,567.89');
      
      // Should see formatted value in the component
      await waitFor(() => {
        expect(screen.getByText(/1,234,567\.89/)).toBeInTheDocument();
      });
    });

    it('should show raw value when editing threshold', async () => {
      const onChange = vi.fn();
      const columns = [
        { key: 'threshold', label: 'Threshold', type: 'number' as const, useSpecializedCell: true, decimals: 2 },
      ];
      
      const rows = [{ threshold: 1234567.89 }];
      
      render(
        <FormTable
          columns={columns}
          rows={rows}
          onChange={onChange}
        />
      );
      
      // Click to enter edit mode
      const displayCell = screen.getByText(/1,234,567\.89/);
      await userEvent.click(displayCell);
      
      // Should see input with raw value (no commas)
      await waitFor(() => {
        const input = screen.getByRole('textbox');
        expect(input).toHaveValue('1234567.89');
      });
    });

    it('should parse comma-grouped numbers from Excel paste', () => {
      // Test the parsing function
      expect(parseNumericInput('1,234,567.89')).toBe(1234567.89);
      expect(parseNumericInput('1,234')).toBe(1234);
      expect(parseNumericInput('-1,234.56')).toBe(-1234.56);
      expect(parseNumericInput('1 234 567.89')).toBe(1234567.89); // Space separators
      expect(parseNumericInput('1234567.89')).toBe(1234567.89); // No separators
    });

    it('should handle empty and invalid threshold values', () => {
      expect(parseNumericInput('')).toBe(null);
      expect(parseNumericInput('   ')).toBe(null);
      expect(parseNumericInput('abc')).toBe(null);
      expect(parseNumericInput('12.34.56')).toBe(null); // Multiple decimals
    });
  });

  describe('Date of Loss Formatting', () => {
    it('should parse various date formats correctly', () => {
      // ISO format
      expect(parseDateInput('2024-10-16')).toBe('2024-10-16');
      
      // DD/MM/YYYY
      expect(parseDateInput('16/10/2024')).toBe('2024-10-16');
      
      // DD-MM-YYYY
      expect(parseDateInput('16-10-2024')).toBe('2024-10-16');
      
      // Excel serial (45200 = 2023-10-02)
      const excelSerial = parseDateInput('45200');
      expect(excelSerial).toMatch(/^\d{4}-\d{2}-\d{2}$/); // Should be ISO format
    });

    it('should handle empty and invalid dates', () => {
      expect(parseDateInput('')).toBe(null);
      expect(parseDateInput('   ')).toBe(null);
      expect(parseDateInput('invalid')).toBe(null);
      expect(parseDateInput('99/99/9999')).toBe(null);
    });

    it('should normalize dates to ISO YYYY-MM-DD format', () => {
      const dates = [
        '2024-10-16',
        '16/10/2024',
        '16-10-2024',
      ];
      
      dates.forEach(date => {
        const normalized = parseDateInput(date);
        expect(normalized).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(normalized).toBe('2024-10-16');
      });
    });
  });

  describe('Table Container Autosize', () => {
    it('should use table-auto layout (not table-fixed)', () => {
      const columns = [
        { key: 'loss_description', label: 'Loss Description', type: 'text' as const },
        { key: 'threshold', label: 'Threshold', type: 'number' as const, useSpecializedCell: true },
      ];
      
      const rows = [{ loss_description: 'Test', threshold: 1000 }];
      
      const { container } = render(
        <FormTable
          columns={columns}
          rows={rows}
          onChange={() => {}}
        />
      );
      
      const table = container.querySelector('table');
      expect(table).toBeTruthy();
      expect(table?.className).toContain('table-auto');
      expect(table?.className).not.toContain('table-fixed');
      
      // Verify inline style
      const style = table?.getAttribute('style');
      expect(style).toContain('table-layout: auto');
    });

    it('should have overflow-x-auto wrapper for horizontal scrolling', () => {
      const columns = [
        { key: 'col1', label: 'Column 1' },
        { key: 'col2', label: 'Column 2' },
      ];
      
      const rows = [{ col1: 'data1', col2: 'data2' }];
      
      const { container } = render(
        <FormTable
          columns={columns}
          rows={rows}
          onChange={() => {}}
        />
      );
      
      const wrapper = container.querySelector('.overflow-x-auto');
      expect(wrapper).toBeTruthy();
    });
  });

  describe('Input Width Constraints', () => {
    it('should apply w-full min-w-0 to all input elements', () => {
      const columns = [
        { key: 'loss_description', label: 'Loss Description', type: 'text' as const },
        { key: 'threshold', label: 'Threshold', type: 'number' as const },
      ];
      
      const rows = [{ loss_description: 'Test', threshold: 1000 }];
      
      const { container } = render(
        <FormTable
          columns={columns}
          rows={rows}
          onChange={() => {}}
        />
      );
      
      const inputs = container.querySelectorAll('input');
      inputs.forEach(input => {
        expect(input.className).toContain('w-full');
        expect(input.className).toContain('min-w-0');
      });
    });
  });

  describe('Excel Paste Integration', () => {
    it('should preserve threshold formatting after paste', () => {
      // Simulate pasted data with comma-grouped numbers
      const pastedValue = '1,234,567.89';
      const parsed = parseNumericInput(pastedValue);
      
      expect(parsed).toBe(1234567.89);
      
      // Format for display
      const formatted = formatNumberDisplay(parsed, { maximumFractionDigits: 2 });
      expect(formatted).toBe('1,234,567.89');
    });

    it('should handle negative thresholds from paste', () => {
      const pastedValue = '-1,234.56';
      const parsed = parseNumericInput(pastedValue);
      
      expect(parsed).toBe(-1234.56);
      expect(parsed).toBeLessThan(0);
    });
  });
});
