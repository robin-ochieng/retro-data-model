export function toCsv<T extends Record<string, any>>(rows: T[], headers: string[]): string {
  const esc = (v: any) => {
    const s = v ?? '';
    const str = String(s);
    return /[,"\n]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
  };
  const head = headers.join(',');
  const body = rows.map(r => headers.map(h => esc(r[h])).join(',')).join('\n');
  return [head, body].join('\n');
}

export function parseCsv(text: string): string[][] {
  // Simple CSV split (no advanced quoting across lines)
  return text
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => line.split(','));
}
