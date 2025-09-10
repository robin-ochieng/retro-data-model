import { describe, it, expect } from 'vitest';
import { emptyClimateExposureRow, isRowEmpty, CLIMATE_EXPOSURE_FIELDS, normalizeDateString, parseNumeric } from '../climateExposure';

// Reproduce buildRowFromPaste logic (kept local to avoid circular dependency on component file)
function buildRowFromPasteLocal(cols: string[]) {
  const row = emptyClimateExposureRow();
  CLIMATE_EXPOSURE_FIELDS.forEach((meta, i) => {
    const raw = cols[i];
    if (raw == null) return;
    const trimmed = String(raw).trim();
    if (trimmed === '') return;
    if (meta.type === 'number') {
      (row as any)[meta.key] = parseNumeric(trimmed);
    } else if (meta.key === 'policy_inception_date' || meta.key === 'policy_expiry_date') {
      const norm = normalizeDateString(trimmed);
      (row as any)[meta.key] = norm || trimmed;
    } else {
      (row as any)[meta.key] = trimmed;
    }
  });
  return row;
}

describe('Climate Exposure paste replacement logic', () => {
  it('replaces initial empty placeholder row with first pasted row', () => {
    const initial = [emptyClimateExposureRow()];
  expect(isRowEmpty(initial[0]!)).toBe(true);

    const sample = [
      '2025-01-01','2025-12-31','Acme Corp','Cat Excess','Layer 1','Windstorm',
      '1000000','800000','1','500000','200000','800000','25000','20000','5000','20000'
    ];
    const pasted = [sample];

    // Simulate replacement algorithm core
    let working = [...initial];
    let pasteIdx = 0;
    for (let i = 0; i < working.length && pasteIdx < pasted.length; i++) {
      const existing = working[i];
      if (existing && isRowEmpty(existing)) {
        const inc = pasted[pasteIdx];
        if (inc) working[i] = buildRowFromPasteLocal(inc);
        pasteIdx++;
      } else { break; }
    }
    for (; pasteIdx < pasted.length; pasteIdx++) {
      const inc = pasted[pasteIdx];
      if (inc) working.push(buildRowFromPasteLocal(inc));
    }

    expect(working.length).toBe(1); // no extra blank row retained
    const first = working[0] as any;
    expect(first.policy_inception_date).toBe('2025-01-01');
    expect(first.policy_expiry_date).toBe('2025-12-31');
    expect(first.insured).toBe('Acme Corp');
  });

  it('does not overwrite a non-empty first row (append instead)', () => {
    const first = emptyClimateExposureRow();
    first.insured = 'Existing';
    const initial = [first];
  expect(isRowEmpty(initial[0]!)).toBe(false);
    const sample = [
      '2025-01-01','2025-12-31','Acme Corp','Cat Excess','Layer 1','Windstorm',
      '1000000','800000','1','500000','200000','800000','25000','20000','5000','20000'
    ];
    const pasted = [sample];
    let working = [...initial];
    let pasteIdx = 0;
    for (let i = 0; i < working.length && pasteIdx < pasted.length; i++) {
      const existing = working[i];
      if (existing && isRowEmpty(existing)) {
        const inc = pasted[pasteIdx];
        if (inc) working[i] = buildRowFromPasteLocal(inc);
        pasteIdx++;
      } else { break; }
    }
    for (; pasteIdx < pasted.length; pasteIdx++) {
      const inc = pasted[pasteIdx];
      if (inc) working.push(buildRowFromPasteLocal(inc));
    }
    expect(working.length).toBe(2); // appended
  expect(working[0]!.insured).toBe('Existing');
  expect(working[1]!.insured).toBe('Acme Corp');
  });
});
