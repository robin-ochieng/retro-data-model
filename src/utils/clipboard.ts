/**
 * Robust parser for Excel clipboard text.
 * - Prefers TSV (\t between cells, \n rows) which is how Excel copies ranges.
 * - Supports CSV with quotes and embedded commas. Does NOT split thousands like 1,200.00.
 * - Trims surrounding quotes and whitespace per cell.
 * - Optionally validates fixed column count and returns an error message.
 */
export type ParseOptions = {
  expectedColumns?: number; // if provided, enforce a fixed number of columns per row
  allowVariableRows?: boolean; // if true, ignore short/long rows instead of erroring
};

export type ParseResult = { rows: string[][]; error?: string };

export function parseClipboardGrid(text: string, options: ParseOptions = {}): ParseResult {
  const t = (text ?? '').replace(/\u00A0/g, ' ').trim();
  if (!t) return { rows: [] };

  const lines = t.split(/\r?\n/).filter((l) => l.length > 0);
  if (!lines.length) return { rows: [] };

  // Heuristic: use TSV if any tab exists; else treat as CSV.
  const isTSV = lines.some((l) => l.includes('\t'));

  const parseCsvLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;
      if (inQuotes) {
        if (ch === '"') {
          const next = line[i + 1];
          if (next === '"') { cur += '"'; i++; continue; }
          inQuotes = false; continue;
        }
        cur += ch; continue;
      } else {
        if (ch === '"') { inQuotes = true; continue; }
        if (ch === ',') { out.push(cur); cur = ''; continue; }
        cur += ch; continue;
      }
    }
    out.push(cur);
    return out;
  };

  const rawRows: string[][] = lines.map((line) => {
    const cells = isTSV ? line.split('\t') : parseCsvLine(line);
    return cells.map((c) => stripCell(c));
  });

  // Validate columns when requested
  const expected = options.expectedColumns;
  if (expected != null) {
    const invalid = rawRows.find((r) => r.length !== expected);
    if (invalid && !options.allowVariableRows) {
      return {
        rows: rawRows,
        error: `The pasted data does not match the expected number of columns (${expected}). Please check your Excel selection.`,
      };
    }
    // If allowVariableRows, normalize to expected columns by trimming/padding
    if (invalid && options.allowVariableRows) {
      for (const r of rawRows) {
        if (r.length > expected) r.length = expected;
        while (r.length < expected) r.push('');
      }
    }
  }

  return { rows: rawRows };
}

function stripCell(s: string): string {
  if (s == null) return '';
  let v = String(s).trim();
  // Remove surrounding quotes once, e.g., "1,200.00" => 1,200.00
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  // Normalize CR left-overs
  v = v.replace(/\r/g, '');
  return v;
}

/** Convert common numeric strings to numbers, preserving decimals; strips thousands commas. */
export function toNumberStrict(s: string | undefined | null): number {
  if (s == null) return 0;
  const cleaned = String(s).replace(/[\s,]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}
