export function combineClaimsPeriod(start?: string | null, end?: string | null): string {
  const s = (start ?? '').trim();
  const e = (end ?? '').trim();
  if (s && e) return `${s} to ${e}`;
  if (s) return s;
  if (e) return e;
  return '';
}

// Accepts formats like "YYYY-MM-DD to YYYY-MM-DD" or "DD/MM/YYYY to DD/MM/YYYY"
export function parseClaimsPeriod(value: string): { start: string; end: string } {
  const v = (value ?? '').trim();
  if (!v) return { start: '', end: '' };
  const parts = v.split(/\s*(?:to|–|—)\s*/i).filter(Boolean);
  if (parts.length >= 2) {
    const parsePart = (p: string | undefined) => {
      const iso = (p ?? '').trim();
      if (!iso) return '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
      const m = iso.match(/^(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{4})$/);
      if (m) {
        const dd = String(m[1] ?? '').padStart(2, '0');
        const mm = String(m[2] ?? '').padStart(2, '0');
        const yyyy = String(m[3] ?? '');
        return `${yyyy}-${mm}-${dd}`;
      }
      return iso;
    };
    const p0 = parts[0] ?? '';
    const p1 = parts[1] ?? '';
    return { start: parsePart(p0), end: parsePart(p1) };
  }
  return { start: '', end: '' };
}

export default { combineClaimsPeriod, parseClaimsPeriod };
