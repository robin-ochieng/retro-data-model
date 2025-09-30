import { supabase } from './supabase';

/**
 * Placeholder integration for Excel generation.
 * Later this will call a Supabase Edge Function that triggers an n8n webhook,
 * fills the appropriate template from the `templates/` bucket, and returns a signed URL
 * to the generated file in the private `generated/` bucket.
 */
export async function generateExcel(submissionId: string): Promise<{ ok: boolean; url?: string; blob?: Blob }> {
  try {
    const map = await loadFieldMap();
    const XLSX = await import('xlsx');

    const wb = XLSX.utils.book_new();
    const sheetBlobPayload = await fetchSheetBlob(submissionId);

    for (const tab of map.tabs) {
      const sheetName = tab.sheetName;
      const colSpec = tab.excelColumns;
      let rows: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any

      for (const key of Object.keys(colSpec)) {
        if (key.startsWith('table:')) {
          const tableRows = await fetchTable(submissionId, key);
          const columns = colSpec[key];
          // If columns is an array of strings treat as explicit column ordering; else dynamic
          if (Array.isArray(columns)) {
            tableRows.forEach((r: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
              const row: Record<string, any> = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
              columns.forEach((c: string) => {
                // Attempt loose matching: map header to snake key variants
                const snake = c.toLowerCase().replace(/[^a-z0-9]+/g, '_');
                const direct = r[c] ?? r[snake] ?? r[c.replace(/ /g, '_').toLowerCase()] ?? '';
                row[c] = direct;
              });
              rows.push(row);
            });
          } else {
            // Unsupported structure fallback: push raw
            rows = rows.concat(tableRows);
          }
        } else if (key === 'sheet_blobs') {
          const spec = colSpec[key];
          if (spec.fields) {
            const row: Record<string, any> = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
            Object.entries(spec.fields).forEach(([payloadKey, headerLabel]) => {
              row[headerLabel as string] = sheetBlobPayload[payloadKey] ?? '';
            });
            rows.push(row);
          }
          // Array sections e.g. array:gwp_split
          Object.keys(spec)
            .filter((k) => k.startsWith('array:'))
            .forEach((arrKey) => {
              const headerArr = spec[arrKey];
              const payloadArr = sheetBlobPayload[arrKey.replace('array:', '')] || [];
              if (Array.isArray(payloadArr)) {
                payloadArr.forEach((item: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                  const row: Record<string, any> = {};
                  headerArr.forEach((h: string) => {
                    const snake = h.toLowerCase().replace(/[^a-z0-9]+/g, '_');
                    row[h] = item[snake] ?? item[h] ?? '';
                  });
                  rows.push(row);
                });
              }
            });
        }
      }

      if (rows.length === 0) {
        rows.push({ Info: 'No Data' });
      }

      const worksheet = XLSX.utils.json_to_sheet(rows, { skipHeader: false });
      XLSX.utils.book_append_sheet(wb, worksheet, sheetName.substring(0, 30));
    }

    const wbOut = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    // Provide object URL for immediate download
    const url = URL.createObjectURL(blob);
    return { ok: true, url, blob };
  } catch (e) {
    console.warn('generateExcel failed', e);
    return { ok: false };
  }
}

// Lightweight dynamic import of xlsx only when needed

interface FieldMapSlim {
  lob: string;
  tabs: Array<{
    tabKey: string;
    sheetName: string;
    excelColumns: any;
    _meta?: Record<string, any>;
  }>;
}

// Fetch mapping JSON (served from /docs in dev via Vite static or adjust path)
async function loadFieldMap(): Promise<FieldMapSlim> {
  const res = await fetch('/docs/field-map-slim.json');
  if (!res.ok) throw new Error('Failed to load field map');
  return res.json();
}

// Helper: convert snake_case or internal keys to header labels
function labelize(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

// Fetch rows for a table mapping. Supports optional section filter suffix table:property_cresta_zone_values:section=personal
async function fetchTable(submissionId: string, spec: string) {
  // spec format: table:TABLE_NAME or table:TABLE_NAME:section=value or other key=value
  const parts = spec.split('table:');
  if (parts.length < 2) return [];
  const tableAndMaybeFilter = parts[1] ?? '';
  if (!tableAndMaybeFilter) return [];
  const [tableName, ...filters] = tableAndMaybeFilter.split(':');
  let query = supabase.from(tableName as any).select('*').eq('submission_id', submissionId);
  filters.forEach((f) => {
    const [k, v] = f.split('=');
    if (k && v) query = query.eq(k, v);
  });
  const { data, error } = await query; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (error) throw error;
  return data || [];
}

// Extract array from sheet_blobs payload arrays e.g. array:gwp_split
async function fetchSheetBlob(submissionId: string) {
  const { data, error } = await supabase
    .from('sheet_blobs')
    .select('payload')
    .eq('submission_id', submissionId)
    .eq('sheet_name', 'Header')
    .single();
  if (error) return {} as any;
  return data?.payload || {};
}
