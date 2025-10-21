import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { TriangulationTable } from '../../../src/components/TriangulationTable';
import { formatNumberDisplay } from '../../../src/lib/numberFormat';
import { parseNumericInput } from '../../../src/lib/formatUtils';

describe('Development Grids - Autosize and Formatting', () => {
  const devMonths = [12, 24, 36, 48, 60, 72, 84, 96, 108, 120];
  
  const createColumns = () => devMonths.map(m => ({
    key: String(m),
    label: `${m} months`,
    type: 'number' as const,
  }));

  const createRows = (count: number) => Array.from({ length: count }, (_, i) => 
    devMonths.reduce((acc, m) => {
      acc[String(m)] = (i + 1) * m * 1000; // Generate test data
      return acc;
    }, {} as Record<string, number>)
  );

  describe('Table Layout', () => {
    it('should use table-auto layout (not table-fixed) for Paid grid', () => {
      const columns = createColumns();
      const rows = createRows(3);
      
      const { container } = render(
        <TriangulationTable
          title="Development Grid — Paid"
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

    it('should use table-auto layout (not table-fixed) for Reserved grid', () => {
      const columns = createColumns();
      const rows = createRows(3);
      
      const { container } = render(
        <TriangulationTable
          title="Development Grid — Reserved"
          columns={columns}
          rows={rows}
          onChange={() => {}}
        />
      );
      
      const table = container.querySelector('table');
      expect(table).toBeTruthy();
      expect(table?.className).toContain('table-auto');
      expect(table?.className).not.toContain('table-fixed');
    });

    it('should use table-auto layout (not table-fixed) for Incurred grid', () => {
      const columns = createColumns();
      const rows = createRows(3);
      
      const { container } = render(
        <TriangulationTable
          title="Development Grid — Incurred (auto-calculated)"
          columns={columns}
          rows={rows}
          onChange={() => {}}
          readonly={true}
        />
      );
      
      const table = container.querySelector('table');
      expect(table).toBeTruthy();
      expect(table?.className).toContain('table-auto');
      expect(table?.className).not.toContain('table-fixed');
    });

    it('should have overflow-x-auto wrapper for horizontal scrolling', () => {
      const columns = createColumns();
      const rows = createRows(1);
      
      const { container } = render(
        <TriangulationTable
          title="Development Grid — Paid"
          columns={columns}
          rows={rows}
          onChange={() => {}}
        />
      );
      
      const wrapper = container.querySelector('.overflow-x-auto');
      expect(wrapper).toBeTruthy();
    });
  });

  describe('Cell Styling', () => {
    it('should apply whitespace-nowrap to numeric cells', () => {
      const columns = createColumns();
      const rows = createRows(1);
      
      const { container } = render(
        <TriangulationTable
          title="Development Grid — Paid"
          columns={columns}
          rows={rows}
          onChange={() => {}}
        />
      );
      
      // All numeric cells should have whitespace-nowrap
      const numericCells = container.querySelectorAll('td.whitespace-nowrap');
      expect(numericCells.length).toBeGreaterThan(0);
      
      // Verify no cells have whitespace-normal (which would allow wrapping)
      const normalCells = container.querySelectorAll('td.whitespace-normal');
      expect(normalCells.length).toBe(0);
    });

    it('should not apply text-ellipsis or overflow-hidden to numeric cells', () => {
      const columns = createColumns();
      const rows = [{ '12': 8881140009, '24': 9999999999 }]; // Large numbers
      
      const { container } = render(
        <TriangulationTable
          title="Development Grid — Paid"
          columns={columns}
          rows={rows}
          onChange={() => {}}
        />
      );
      
      const numericCells = container.querySelectorAll('td');
      numericCells.forEach(cell => {
        expect(cell.className).not.toContain('truncate');
        expect(cell.className).not.toContain('text-ellipsis');
        expect(cell.className).not.toContain('overflow-hidden');
      });
    });

    it('should apply text-right to numeric cells', () => {
      const columns = createColumns();
      const rows = createRows(1);
      
      const { container } = render(
        <TriangulationTable
          title="Development Grid — Paid"
          columns={columns}
          rows={rows}
          onChange={() => {}}
          readonly={true}
        />
      );
      
      // Readonly numeric cells should be right-aligned
      const rightAlignedCells = container.querySelectorAll('td.text-right');
      expect(rightAlignedCells.length).toBeGreaterThan(0);
    });
  });

  describe('Number Formatting in View Mode', () => {
    it('should display large numbers with thousands separators', () => {
      const largeNumber = 8881140009;
      const formatted = formatNumberDisplay(largeNumber);
      
      expect(formatted).toBe('8,881,140,009');
      expect(formatted).toContain(',');
    });

    it('should display decimals with proper separators', () => {
      const decimalNumber = 1234567.89;
      const formatted = formatNumberDisplay(decimalNumber, { maximumFractionDigits: 2 });
      
      expect(formatted).toBe('1,234,567.89');
      expect(formatted).toMatch(/\d{1,3}(,\d{3})*\.\d{2}/);
    });

    it('should handle negative numbers with separators', () => {
      const negativeNumber = -1234567.89;
      const formatted = formatNumberDisplay(negativeNumber, { maximumFractionDigits: 2 });
      
      expect(formatted).toContain('-');
      expect(formatted).toContain(',');
      expect(formatted).toMatch(/-\d{1,3}(,\d{3})*(\.\d+)?/);
    });

    it('should handle zero and small numbers', () => {
      expect(formatNumberDisplay(0)).toBe('0');
      expect(formatNumberDisplay(1)).toBe('1');
      expect(formatNumberDisplay(12)).toBe('12');
      expect(formatNumberDisplay(123)).toBe('123');
      expect(formatNumberDisplay(1234)).toBe('1,234');
    });
  });

  describe('Number Parsing from Excel', () => {
    it('should parse comma-separated numbers correctly', () => {
      expect(parseNumericInput('1,234')).toBe(1234);
      expect(parseNumericInput('1,234,567')).toBe(1234567);
      expect(parseNumericInput('8,881,140,009')).toBe(8881140009);
    });

    it('should parse decimal numbers with commas', () => {
      expect(parseNumericInput('1,234.56')).toBe(1234.56);
      expect(parseNumericInput('1,234,567.89')).toBe(1234567.89);
    });

    it('should parse negative numbers', () => {
      expect(parseNumericInput('-1,234')).toBe(-1234);
      expect(parseNumericInput('-1,234.56')).toBe(-1234.56);
    });

    it('should parse numbers with space separators', () => {
      expect(parseNumericInput('1 234')).toBe(1234);
      expect(parseNumericInput('1 234 567')).toBe(1234567);
      expect(parseNumericInput('1 234.56')).toBe(1234.56);
    });

    it('should parse plain numbers without separators', () => {
      expect(parseNumericInput('1234')).toBe(1234);
      expect(parseNumericInput('1234567')).toBe(1234567);
      expect(parseNumericInput('1234.56')).toBe(1234.56);
    });

    it('should handle empty and invalid values', () => {
      expect(parseNumericInput('')).toBe(null);
      expect(parseNumericInput('   ')).toBe(null);
      expect(parseNumericInput('abc')).toBe(null);
      expect(parseNumericInput('12.34.56')).toBe(null);
    });
  });

  describe('Input Width Constraints', () => {
    it('should apply w-full min-w-0 to all inputs', () => {
      const columns = createColumns();
      const rows = createRows(1);
      
      const { container } = render(
        <TriangulationTable
          title="Development Grid — Paid"
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

  describe('Consistency Across Grids', () => {
    it('should apply same styling to Paid, Reserved, and Incurred grids', () => {
      const columns = createColumns();
      const rows = createRows(1);
      
      const paidRender = render(
        <TriangulationTable
          title="Development Grid — Paid"
          columns={columns}
          rows={rows}
          onChange={() => {}}
        />
      );
      
      const reservedRender = render(
        <TriangulationTable
          title="Development Grid — Reserved"
          columns={columns}
          rows={rows}
          onChange={() => {}}
        />
      );
      
      const incurredRender = render(
        <TriangulationTable
          title="Development Grid — Incurred (auto-calculated)"
          columns={columns}
          rows={rows}
          onChange={() => {}}
          readonly={true}
        />
      );
      
      // All should have table-auto
      expect(paidRender.container.querySelector('table.table-auto')).toBeTruthy();
      expect(reservedRender.container.querySelector('table.table-auto')).toBeTruthy();
      expect(incurredRender.container.querySelector('table.table-auto')).toBeTruthy();
      
      // All should have overflow-x-auto wrapper
      expect(paidRender.container.querySelector('.overflow-x-auto')).toBeTruthy();
      expect(reservedRender.container.querySelector('.overflow-x-auto')).toBeTruthy();
      expect(incurredRender.container.querySelector('.overflow-x-auto')).toBeTruthy();
      
      // All should have whitespace-nowrap cells
      expect(paidRender.container.querySelectorAll('td.whitespace-nowrap').length).toBeGreaterThan(0);
      expect(reservedRender.container.querySelectorAll('td.whitespace-nowrap').length).toBeGreaterThan(0);
      expect(incurredRender.container.querySelectorAll('td.whitespace-nowrap').length).toBeGreaterThan(0);
    });
  });

  describe('No Fixed Width Constraints', () => {
    it('should not have w-xx or max-w-* classes on cells', () => {
      const columns = createColumns();
      const rows = createRows(1);
      
      const { container } = render(
        <TriangulationTable
          title="Development Grid — Paid"
          columns={columns}
          rows={rows}
          onChange={() => {}}
        />
      );
      
      const cells = container.querySelectorAll('td');
      cells.forEach(cell => {
        const className = cell.className;
        // Should not have fixed width classes like w-32, max-w-xs, etc.
        expect(className).not.toMatch(/\bw-\d+\b/);
        expect(className).not.toMatch(/\bmax-w-\w+\b/);
        expect(className).not.toMatch(/\bmin-w-\[\d+px\]\b/);
      });
    });

    it('should not have colgroup with fixed widths', () => {
      const columns = createColumns();
      const rows = createRows(1);
      
      const { container } = render(
        <TriangulationTable
          title="Development Grid — Paid"
          columns={columns}
          rows={rows}
          onChange={() => {}}
        />
      );
      
      const colgroup = container.querySelector('colgroup');
      expect(colgroup).toBeFalsy();
    });
  });

  describe('Totals Row Formatting', () => {
    it('should format totals with thousands separators', () => {
      const columns = createColumns();
      const rows = createRows(3);
      
      // Calculate totals (sum of each column)
      const totals = devMonths.map((m, idx) => {
        return rows.reduce((sum, row) => sum + (row[String(m)] || 0), 0);
      });
      
      render(
        <TriangulationTable
          title="Development Grid — Paid"
          columns={columns}
          rows={rows}
          onChange={() => {}}
          totals={totals}
        />
      );
      
      // Verify totals are formatted with commas
      totals.forEach(total => {
        const formatted = formatNumberDisplay(total);
        if (total >= 1000) {
          expect(formatted).toContain(',');
        }
      });
    });
  });
});
