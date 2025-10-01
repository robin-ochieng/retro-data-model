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
      let currentRow = 1; // Track current row position for proper spacing
      
      // Create new workbook worksheet
      const worksheet: any = {};
      
      // Get metadata for spacing configuration
      const tabMeta = tab._meta;
      const spacing = tabMeta?.spacing || { between_tables: 2, before_comments: 2 };
      
      // Get table keys and identify which is the comments table
      const tableKeys = Object.keys(colSpec).filter(key => key.startsWith('table:'));
      const commentsTableKey = tableKeys.find(key => 
        key.includes('meta') || colSpec[key].includes('Additional Comments')
      );
      
      // Process tables first with proper spacing
      for (let tableIndex = 0; tableIndex < tableKeys.length; tableIndex++) {
        const key = tableKeys[tableIndex];
        if (!key) continue;
        
        const isCommentsTable = key === commentsTableKey;
        const tableRows = await fetchTable(submissionId, key);
        const columns = colSpec[key];
        
        if (Array.isArray(columns) && (tableRows.length > 0 || isCommentsTable)) {
          // Add extra spacing before comments table if configured
          if (isCommentsTable && spacing.before_comments && tableIndex > 0) {
            currentRow += spacing.before_comments;
          }
          
          // Add table headers
          columns.forEach((header, colIndex) => {
            const cellRef = XLSX.utils.encode_cell({ r: currentRow - 1, c: colIndex });
            worksheet[cellRef] = { v: header, t: 's' };
          });
          currentRow++;
          
          // Add table data rows
          tableRows.forEach((rowData: any) => {
            columns.forEach((column: string, colIndex: number) => {
              const snake = column.toLowerCase().replace(/[^a-z0-9]+/g, '_');
              const value = rowData[column] ?? rowData[snake] ?? rowData[column.replace(/ /g, '_').toLowerCase()] ?? '';
              const cellRef = XLSX.utils.encode_cell({ r: currentRow - 1, c: colIndex });
              worksheet[cellRef] = { v: value, t: typeof value === 'number' ? 'n' : 's' };
            });
            currentRow++;
          });
          
          // Add spacing after table (except after last table)
          if (!isCommentsTable && tableIndex < tableKeys.length - 1) {
            currentRow += spacing.between_tables;
          }
        }
      }
      
      // Process sheet_blobs fields after tables (with proper spacing)
      for (const key of Object.keys(colSpec)) {
        if (key === 'sheet_blobs') {
          const spec = colSpec[key];
          if (spec.fields) {
            Object.entries(spec.fields).forEach(([payloadKey, headerLabel]) => {
              const value = sheetBlobPayload[payloadKey] ?? '';
              
              // Add field label in column A
              const labelCellRef = XLSX.utils.encode_cell({ r: currentRow - 1, c: 0 });
              worksheet[labelCellRef] = { v: headerLabel, t: 's' };
              
              // Add field value in column B  
              const valueCellRef = XLSX.utils.encode_cell({ r: currentRow - 1, c: 1 });
              worksheet[valueCellRef] = { v: value, t: 's' };
              
              currentRow++;
            });
          }
          
          // Handle array sections using metadata sections if available
          const tabMeta = tab._meta;
          const sections = tabMeta?.sections || [];
          const spacing = tabMeta?.spacing || { between_sections: 2, after_tables: 2 };
          
          if (sections.length > 0) {
            // Use metadata-defined sections for proper titles and spacing
            sections.forEach((section: any, sectionIndex: number) => {
              const arrKey = `array:${section.array}`;
              const headerArr = spec[arrKey];
              const payloadArr = sheetBlobPayload[section.array] || [];
              
              if (headerArr && Array.isArray(payloadArr)) {
                // Add section title
                if (section.title) {
                  const titleCellRef = XLSX.utils.encode_cell({ r: currentRow - 1, c: 0 });
                  worksheet[titleCellRef] = { v: section.title, t: 's' };
                  currentRow++;
                }
                
                // Add array headers
                headerArr.forEach((header: string, colIndex: number) => {
                  const cellRef = XLSX.utils.encode_cell({ r: currentRow - 1, c: colIndex });
                  worksheet[cellRef] = { v: header, t: 's' };
                });
                currentRow++;
                
                // Add array data (or empty row if no data)
                if (payloadArr.length > 0) {
                  payloadArr.forEach((item: any) => {
                    headerArr.forEach((h: string, colIndex: number) => {
                      const snake = h.toLowerCase().replace(/[^a-z0-9]+/g, '_');
                      const value = item[snake] ?? item[h] ?? '';
                      const cellRef = XLSX.utils.encode_cell({ r: currentRow - 1, c: colIndex });
                      worksheet[cellRef] = { v: value, t: typeof value === 'number' ? 'n' : 's' };
                    });
                    currentRow++;
                  });
                } else {
                  // Add empty row for visual consistency
                  currentRow++;
                }
                
                // Add spacing between sections (except after last section)
                if (sectionIndex < sections.length - 1) {
                  currentRow += spacing.between_sections;
                }
              }
            });
            
            // Add spacing after all tables before fields
            currentRow += spacing.after_tables;
          } else {
            // Fallback to original array handling for backwards compatibility
            Object.keys(spec)
              .filter((k) => k.startsWith('array:'))
              .forEach((arrKey) => {
                const headerArr = spec[arrKey];
                const payloadArr = sheetBlobPayload[arrKey.replace('array:', '')] || [];
                if (Array.isArray(payloadArr) && payloadArr.length > 0) {
                  // Add spacing before array section
                  currentRow++;
                  
                  // Add array headers
                  headerArr.forEach((header: string, colIndex: number) => {
                    const cellRef = XLSX.utils.encode_cell({ r: currentRow - 1, c: colIndex });
                    worksheet[cellRef] = { v: header, t: 's' };
                  });
                  currentRow++;
                  
                  // Add array data
                  payloadArr.forEach((item: any) => {
                    headerArr.forEach((h: string, colIndex: number) => {
                      const snake = h.toLowerCase().replace(/[^a-z0-9]+/g, '_');
                      const value = item[snake] ?? item[h] ?? '';
                      const cellRef = XLSX.utils.encode_cell({ r: currentRow - 1, c: colIndex });
                      worksheet[cellRef] = { v: value, t: typeof value === 'number' ? 'n' : 's' };
                    });
                    currentRow++;
                  });
                }
              });
          }
        }
      }

      // Set worksheet range and handle empty case
      if (currentRow > 1) {
        const maxCol = Math.max(...Object.keys(worksheet).map(ref => {
          const decoded = XLSX.utils.decode_cell(ref);
          return decoded.c;
        }));
        worksheet['!ref'] = XLSX.utils.encode_range({
          s: { r: 0, c: 0 },
          e: { r: currentRow - 2, c: maxCol }
        });
      } else {
        // Handle empty worksheet case
        worksheet['A1'] = { v: 'No Data', t: 's' };
        worksheet['!ref'] = 'A1:A1';
      }

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
