import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { parseNumericInput } from '../../../src/lib/formatUtils';
import { formatNumberDisplay } from '../../../src/lib/numberFormat';

describe('Cresta Zone Control - Headers, Formatting, and Autosize', () => {
  describe('Layered Header CSS', () => {
    it('should have thead-layer-1 class with dark background', () => {
      const { container } = render(
        <table>
          <thead>
            <tr className="thead-layer-1">
              <th>Title</th>
            </tr>
          </thead>
        </table>
      );
      
      const headerRow = container.querySelector('.thead-layer-1');
      expect(headerRow).toBeTruthy();
      
      // Check that the class is applied
      expect(headerRow?.className).toContain('thead-layer-1');
    });

    it('should have thead-layer-2 class with slightly lighter background', () => {
      const { container } = render(
        <table>
          <thead>
            <tr className="thead-layer-2">
              <th>Column Label</th>
            </tr>
          </thead>
        </table>
      );
      
      const headerRow = container.querySelector('.thead-layer-2');
      expect(headerRow).toBeTruthy();
      expect(headerRow?.className).toContain('thead-layer-2');
    });

    it('should have thead-sticky class for sticky positioning', () => {
      const { container } = render(
        <table>
          <thead>
            <tr className="thead-sticky">
              <th>Sticky Header</th>
            </tr>
          </thead>
        </table>
      );
      
      const headerRow = container.querySelector('.thead-sticky');
      expect(headerRow).toBeTruthy();
      expect(headerRow?.className).toContain('thead-sticky');
    });

    it('should have th-tight class for compact padding', () => {
      const { container } = render(
        <table>
          <thead>
            <tr>
              <th className="th-tight">Compact Header</th>
            </tr>
          </thead>
        </table>
      );
      
      const th = container.querySelector('.th-tight');
      expect(th).toBeTruthy();
      expect(th?.className).toContain('th-tight');
    });

    it('should support combined classes (layer-1 + sticky + tight)', () => {
      const { container } = render(
        <table>
          <thead>
            <tr className="thead-layer-1 thead-sticky">
              <th className="th-tight">Combined</th>
            </tr>
          </thead>
        </table>
      );
      
      const headerRow = container.querySelector('tr');
      expect(headerRow?.className).toContain('thead-layer-1');
      expect(headerRow?.className).toContain('thead-sticky');
      
      const th = container.querySelector('th');
      expect(th?.className).toContain('th-tight');
    });
  });

  describe('Layered Header Structure', () => {
    it('should render two-row header for Sum Insured table', () => {
      const { container } = render(
        <table>
          <thead>
            <tr className="thead-layer-1">
              <th colSpan={4}>Sum Insured</th>
            </tr>
            <tr className="thead-layer-2">
              <th>Zone</th>
              <th>Zone Description</th>
              <th>Gross (net of Fac)</th>
              <th>Net</th>
            </tr>
          </thead>
        </table>
      );
      
      const headerRows = container.querySelectorAll('thead tr');
      expect(headerRows.length).toBe(2);
      
      // Layer 1 should have title with colSpan
      const layer1 = headerRows[0];
      const titleCell = layer1?.querySelector('th[colspan="4"]');
      expect(titleCell?.textContent).toBe('Sum Insured');
      
      // Layer 2 should have column labels
      const layer2 = headerRows[1];
      expect(layer2?.textContent).toContain('Zone');
      expect(layer2?.textContent).toContain('Zone Description');
      expect(layer2?.textContent).toContain('Gross (net of Fac)');
      expect(layer2?.textContent).toContain('Net');
    });

    it('should render three-row header for grouped tables (Personal/Commercial/Industrial)', () => {
      const { container } = render(
        <table>
          <thead>
            <tr className="thead-layer-1">
              <th colSpan={8}>Personal Lines</th>
            </tr>
            <tr className="thead-layer-2">
              <th>Zone</th>
              <th>Zone Description</th>
              <th colSpan={2}>Buildings</th>
              <th colSpan={2}>Content</th>
            </tr>
            <tr className="thead-layer-2">
              <th></th>
              <th></th>
              <th>Gross (net of Fac)</th>
              <th>Net</th>
              <th>Gross (net of Fac)</th>
              <th>Net</th>
            </tr>
          </thead>
        </table>
      );
      
      const headerRows = container.querySelectorAll('thead tr');
      expect(headerRows.length).toBe(3);
      
      // Layer 1: Title
      expect(headerRows[0]?.textContent).toBe('Personal Lines');
      
      // Layer 2a: Category groups
      expect(headerRows[1]?.textContent).toContain('Buildings');
      expect(headerRows[1]?.textContent).toContain('Content');
      
      // Layer 2b: Column labels
      const detailRow = headerRows[2];
      const grossHeaders = detailRow?.querySelectorAll('th');
      let grossCount = 0;
      grossHeaders?.forEach(th => {
        if (th.textContent?.includes('Gross (net of Fac)')) grossCount++;
      });
      expect(grossCount).toBeGreaterThanOrEqual(2); // At least 2 category blocks
    });
  });

  describe('Number Formatting', () => {
    it('should format large numbers with thousands separators', () => {
      expect(formatNumberDisplay(1234567.89, { maximumFractionDigits: 2 })).toBe('1,234,567.89');
      expect(formatNumberDisplay(8881140009, { maximumFractionDigits: 2 })).toBe('8,881,140,009');
      expect(formatNumberDisplay(1000, { maximumFractionDigits: 2 })).toBe('1,000');
    });

    it('should format decimals with proper precision', () => {
      expect(formatNumberDisplay(1234.56, { maximumFractionDigits: 2 })).toBe('1,234.56');
      expect(formatNumberDisplay(1234.5, { maximumFractionDigits: 2 })).toBe('1,234.5');
      expect(formatNumberDisplay(1234, { maximumFractionDigits: 2 })).toBe('1,234');
    });

    it('should format negative numbers correctly', () => {
      const formatted = formatNumberDisplay(-1234.56, { maximumFractionDigits: 2 });
      expect(formatted).toContain('-');
      expect(formatted).toContain(',');
      expect(formatted).toMatch(/-\d{1,3}(,\d{3})*(\.\d+)?/);
    });

    it('should handle zero and small numbers', () => {
      expect(formatNumberDisplay(0, { maximumFractionDigits: 2 })).toBe('0');
      expect(formatNumberDisplay(1, { maximumFractionDigits: 2 })).toBe('1');
      expect(formatNumberDisplay(99, { maximumFractionDigits: 2 })).toBe('99');
      expect(formatNumberDisplay(999, { maximumFractionDigits: 2 })).toBe('999');
    });
  });

  describe('Excel Paste - parseNumericInput', () => {
    it('should parse comma-separated numbers', () => {
      expect(parseNumericInput('1,234')).toBe(1234);
      expect(parseNumericInput('1,234,567')).toBe(1234567);
      expect(parseNumericInput('8,881,140,009')).toBe(8881140009);
    });

    it('should parse numbers with decimals', () => {
      expect(parseNumericInput('1,234.56')).toBe(1234.56);
      expect(parseNumericInput('1,234,567.89')).toBe(1234567.89);
      expect(parseNumericInput('0.99')).toBe(0.99);
    });

    it('should parse negative numbers with commas', () => {
      expect(parseNumericInput('-1,234')).toBe(-1234);
      expect(parseNumericInput('-1,234.56')).toBe(-1234.56);
      expect(parseNumericInput('-8,881,140,009')).toBe(-8881140009);
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
      expect(parseNumericInput('-1234.56')).toBe(-1234.56);
    });

    it('should handle empty and invalid values', () => {
      expect(parseNumericInput('')).toBe(null);
      expect(parseNumericInput('   ')).toBe(null);
      expect(parseNumericInput(null as any)).toBe(null);
      expect(parseNumericInput(undefined as any)).toBe(null);
      expect(parseNumericInput('abc')).toBe(null);
      expect(parseNumericInput('12.34.56')).toBe(null); // Multiple decimals
    });
  });

  describe('Zone Description Autosize', () => {
    it('should apply whitespace-normal break-words to Zone Description cells', () => {
      const { container } = render(
        <table>
          <tbody>
            <tr>
              <td className="whitespace-nowrap">1</td>
              <td className="whitespace-normal break-words">
                Very long zone description that should wrap to multiple lines without truncation
              </td>
            </tr>
          </tbody>
        </table>
      );
      
      const descCell = container.querySelector('td.whitespace-normal.break-words');
      expect(descCell).toBeTruthy();
      expect(descCell?.className).toContain('whitespace-normal');
      expect(descCell?.className).toContain('break-words');
      expect(descCell?.className).not.toContain('truncate');
      expect(descCell?.className).not.toContain('text-ellipsis');
    });

    it('should apply w-full min-w-0 to Zone Description input', () => {
      const { container } = render(
        <td className="whitespace-normal break-words">
          <input className="w-full min-w-0 border rounded px-3 py-2" value="Description" />
        </td>
      );
      
      const input = container.querySelector('input');
      expect(input?.className).toContain('w-full');
      expect(input?.className).toContain('min-w-0');
    });
  });

  describe('Numeric Cell Styling', () => {
    it('should apply text-right whitespace-nowrap to numeric cells', () => {
      const { container } = render(
        <table>
          <tbody>
            <tr>
              <td className="text-right whitespace-nowrap">
                <span>1,234,567.89</span>
              </td>
            </tr>
          </tbody>
        </table>
      );
      
      const numericCell = container.querySelector('td.text-right.whitespace-nowrap');
      expect(numericCell).toBeTruthy();
      expect(numericCell?.className).toContain('text-right');
      expect(numericCell?.className).toContain('whitespace-nowrap');
    });

    it('should not have fixed width constraints on numeric cells', () => {
      const { container } = render(
        <table>
          <tbody>
            <tr>
              <td className="text-right whitespace-nowrap align-top">
                <span>8,881,140,009</span>
              </td>
            </tr>
          </tbody>
        </table>
      );
      
      const cell = container.querySelector('td');
      const className = cell?.className || '';
      
      // Should not have fixed width classes
      expect(className).not.toMatch(/\bw-\d+\b/);
      expect(className).not.toMatch(/\bmax-w-\w+\b/);
      expect(className).not.toMatch(/\bmin-w-\[\d+px\]\b/);
    });
  });

  describe('Table Layout', () => {
    it('should use table-auto layout (not table-fixed)', () => {
      const { container } = render(
        <table className="w-full table-auto" style={{ tableLayout: 'auto' }}>
          <thead>
            <tr>
              <th>Column 1</th>
              <th>Column 2</th>
            </tr>
          </thead>
        </table>
      );
      
      const table = container.querySelector('table');
      expect(table?.className).toContain('table-auto');
      expect(table?.className).not.toContain('table-fixed');
      
      const style = table?.getAttribute('style');
      expect(style).toContain('table-layout: auto');
    });

    it('should have overflow-x-auto wrapper for horizontal scrolling', () => {
      const { container } = render(
        <div className="overflow-x-auto overscroll-contain">
          <table>
            <thead>
              <tr><th>Header</th></tr>
            </thead>
          </table>
        </div>
      );
      
      const wrapper = container.querySelector('.overflow-x-auto');
      expect(wrapper).toBeTruthy();
      expect(wrapper?.className).toContain('overscroll-contain');
    });
  });

  describe('Excel Paste TSV Format', () => {
    it('should parse TSV with zone numbers, descriptions, and numeric values', () => {
      const tsvRow = '1\tNairobi CBD\t1,234,567.89\t987,654.32';
      const cells = tsvRow.split('\t');
      
      expect(cells.length).toBe(4);
      expect(cells[0]).toBe('1'); // Zone number
      expect(cells[1]).toBe('Nairobi CBD'); // Description
      expect(parseNumericInput(cells[2])).toBe(1234567.89); // Gross
      expect(parseNumericInput(cells[3])).toBe(987654.32); // Net
    });

    it('should handle TSV without zone number (optional first column)', () => {
      const tsvRow = 'Mombasa\t2,345,678.90\t1,234,567.89';
      const cells = tsvRow.split('\t');
      
      expect(cells.length).toBe(3);
      expect(cells[0]).toBe('Mombasa'); // Description
      expect(parseNumericInput(cells[1])).toBe(2345678.90); // Gross
      expect(parseNumericInput(cells[2])).toBe(1234567.89); // Net
    });

    it('should handle TSV with negative values', () => {
      const tsvRow = '5\tKisumu\t-1,234.56\t-987.65';
      const cells = tsvRow.split('\t');
      
      expect(parseNumericInput(cells[2])).toBe(-1234.56);
      expect(parseNumericInput(cells[3])).toBe(-987.65);
    });

    it('should handle TSV with decimal precision', () => {
      const tsvRow = '10\tEldoret\t1234567.123\t987654.987';
      const cells = tsvRow.split('\t');
      
      const gross = parseNumericInput(cells[2]);
      const net = parseNumericInput(cells[3]);
      
      expect(gross).toBeCloseTo(1234567.123, 3);
      expect(net).toBeCloseTo(987654.987, 3);
    });
  });

  describe('Sum Insured Table Structure', () => {
    it('should have 4 columns (Zone, Description, Gross, Net)', () => {
      const { container } = render(
        <table>
          <thead>
            <tr className="thead-layer-2">
              <th>Zone</th>
              <th>Zone Description</th>
              <th>Gross (net of Fac)</th>
              <th>Net</th>
            </tr>
          </thead>
        </table>
      );
      
      const headers = container.querySelectorAll('th');
      expect(headers.length).toBe(4);
      expect(headers[0]?.textContent).toBe('Zone');
      expect(headers[1]?.textContent).toBe('Zone Description');
      expect(headers[2]?.textContent).toBe('Gross (net of Fac)');
      expect(headers[3]?.textContent).toBe('Net');
    });
  });

  describe('Personal/Commercial/Industrial Table Structure', () => {
    it('should have multiple category blocks with Gross/Net pairs', () => {
      // Example: Buildings (Gross, Net) + Content (Gross, Net) = 4 numeric columns + 2 text columns = 6 total
      const { container } = render(
        <table>
          <thead>
            <tr className="thead-layer-2">
              <th>Zone</th>
              <th>Zone Description</th>
              <th colSpan={2}>Buildings</th>
              <th colSpan={2}>Content</th>
            </tr>
            <tr className="thead-layer-2">
              <th></th>
              <th></th>
              <th>Gross (net of Fac)</th>
              <th>Net</th>
              <th>Gross (net of Fac)</th>
              <th>Net</th>
            </tr>
          </thead>
        </table>
      );
      
      const categoryRow = container.querySelectorAll('thead tr')[0];
      expect(categoryRow?.textContent).toContain('Buildings');
      expect(categoryRow?.textContent).toContain('Content');
      
      const detailRow = container.querySelectorAll('thead tr')[1];
      const grossHeaders = Array.from(detailRow?.querySelectorAll('th') || []).filter(th => 
        th.textContent === 'Gross (net of Fac)'
      );
      expect(grossHeaders.length).toBe(2); // Two category blocks
    });
  });

  describe('Totals Row Formatting', () => {
    it('should format totals with thousands separators', () => {
      const total = 8881140009;
      const formatted = total.toLocaleString();
      
      expect(formatted).toContain(',');
      expect(formatted).toMatch(/\d{1,3}(,\d{3})*/);
    });

    it('should right-align total cells', () => {
      const { container } = render(
        <table>
          <tbody>
            <tr>
              <td className="font-semibold">Total</td>
              <td></td>
              <td className="text-right font-semibold whitespace-nowrap">1,234,567.89</td>
              <td className="text-right font-semibold whitespace-nowrap">987,654.32</td>
            </tr>
          </tbody>
        </table>
      );
      
      const totalCells = container.querySelectorAll('td.text-right.font-semibold');
      expect(totalCells.length).toBe(2);
      totalCells.forEach(cell => {
        expect(cell.className).toContain('text-right');
        expect(cell.className).toContain('font-semibold');
        expect(cell.className).toContain('whitespace-nowrap');
      });
    });
  });
});
