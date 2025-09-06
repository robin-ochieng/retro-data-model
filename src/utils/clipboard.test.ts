import { describe, it, expect } from 'vitest';
import { parseClipboardGrid, toNumberStrict } from './clipboard';

describe('parseClipboardGrid', () => {
  it('parses TSV without splitting thousands', () => {
    const tsv = '2019\t1,200.00\t300\n2020\t2,500.50\t400';
    const res = parseClipboardGrid(tsv, { expectedColumns: 3 });
    expect(res.error).toBeUndefined();
    expect(res.rows.length).toBe(2);
    expect(res.rows[0]).toEqual(['2019', '1,200.00', '300']);
  expect(toNumberStrict(res.rows[0]![1]!)).toBe(1200);
  expect(toNumberStrict(res.rows[1]![1]!)).toBe(2500.5);
  });

  it('parses quoted CSV with commas', () => {
    const csv = 'Year,Amount,Count\n"2018","1,000.25",10';
    const res = parseClipboardGrid(csv, { expectedColumns: 3 });
    expect(res.error).toBeUndefined();
    expect(res.rows[1]).toEqual(['2018', '1,000.25', '10']);
  });

  it('returns error on column mismatch when expectedColumns set', () => {
    const csv = 'A,B\n1,2,3';
    const res = parseClipboardGrid(csv, { expectedColumns: 2 });
    expect(res.error).toBeTruthy();
  });
});
