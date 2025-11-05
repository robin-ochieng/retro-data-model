import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import FormTable from '../../../../components/FormTable';
import PasteModal from '../../../../components/PasteModal';
import { supabase } from '../../../../lib/supabase';
import { useAutosave } from '../../../../hooks/useAutosave';
import { useViewMode } from '../../../../context/ViewMode';
import { toCsv } from '../../../../utils/csv';
import { NumberCell } from '../../../../components/table/NumberCell';
import { useAutoColumnSize, autoColumnClasses } from '../../../../components/table/useAutoColumnSize';
import { parseNumericInput } from '../../../../lib/numberFormat';
import {
  ClimateChangeExposureRow,
  CLIMATE_EXPOSURE_FIELDS,
  emptyClimateExposureRow,
  validateClimateExposureRow,
  autoFillDerived,
  migrateLegacyClimateExposureRow,
  normalizeDateString,
  parseNumeric,
  isRowEmpty,
} from '../../../../types/climateExposure';

type Row = ClimateChangeExposureRow;

interface PayloadShape { rows: Row[]; migrated?: boolean; }

export default function StepClimateExposure() {
  const { submissionId } = useParams();
  const isViewMode = useViewMode();
  const [rows, setRows] = useState<Row[]>([emptyClimateExposureRow()]);
  const [errors, setErrors] = useState<Record<number, Partial<Record<keyof Row, string>>>>({});
  const [pasteOpen, setPasteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [migrated, setMigrated] = useState(false);
  const tableRef = useAutoColumnSize();

  // Load existing rows from dedicated table; lazy migrate from blob if needed
  useEffect(() => {
    (async () => {
      if (!submissionId) return;
      // First try direct table
  // Cast to any because generated Supabase types do not yet include climate_exposure until codegen rerun
  const tableRes = await (supabase as any).from('climate_exposure').select('*').eq('submission_id', submissionId);
      if (!tableRes.error && (tableRes.data?.length ?? 0) > 0) {
  const mapped = tableRes.data!.map((rec: any) => ({
          policy_inception_date: rec.policy_inception_date,
          policy_expiry_date: rec.policy_expiry_date,
          insured: rec.insured || '',
          policy_category: rec.policy_category,
          policy_description: rec.policy_description,
          nature_of_risk: rec.nature_of_risk,
          gross_exposure_tsi: rec.gross_exposure_tsi,
          cedants_exposure_tsi: rec.cedants_exposure_tsi,
          eml_mpl_limit_applied: rec.eml_mpl_limit_applied,
          eml_mpl_limit: rec.eml_mpl_limit,
          ceded_prop_reinsurance_exposure: rec.ceded_prop_reinsurance_exposure,
          net_inuring_prop_reinsurance_exposure: rec.net_inuring_prop_reinsurance_exposure,
          gross_premium: rec.gross_premium,
          cedants_premium: rec.cedants_premium,
          ceded_prop_reinsurance_premium: rec.ceded_prop_reinsurance_premium,
          net_prop_reinsurance_premium: rec.net_prop_reinsurance_premium,
        }) as Row);
        setRows(mapped.length ? mapped : [emptyClimateExposureRow()]);
        return;
      }
      // Attempt lazy migration via RPC (if supported) then reload
  const migrate = await (supabase as any).rpc('migrate_climate_exposure_from_blob', { p_submission_id: submissionId });
      if (!migrate.error) {
  const reload = await (supabase as any).from('climate_exposure').select('*').eq('submission_id', submissionId);
        if (!reload.error && (reload.data?.length ?? 0) > 0) {
          const mapped = reload.data!.map((rec: any) => ({
            policy_inception_date: rec.policy_inception_date,
            policy_expiry_date: rec.policy_expiry_date,
            insured: rec.insured || '',
            policy_category: rec.policy_category,
            policy_description: rec.policy_description,
            nature_of_risk: rec.nature_of_risk,
            gross_exposure_tsi: rec.gross_exposure_tsi,
            cedants_exposure_tsi: rec.cedants_exposure_tsi,
            eml_mpl_limit_applied: rec.eml_mpl_limit_applied,
            eml_mpl_limit: rec.eml_mpl_limit,
            ceded_prop_reinsurance_exposure: rec.ceded_prop_reinsurance_exposure,
            net_inuring_prop_reinsurance_exposure: rec.net_inuring_prop_reinsurance_exposure,
            gross_premium: rec.gross_premium,
            cedants_premium: rec.cedants_premium,
            ceded_prop_reinsurance_premium: rec.ceded_prop_reinsurance_premium,
            net_prop_reinsurance_premium: rec.net_prop_reinsurance_premium,
          }) as Row);
          setRows(mapped.length ? mapped : [emptyClimateExposureRow()]);
          return;
        }
      }
      // Fallback single empty row
      setRows([emptyClimateExposureRow()]);
    })();
  }, [submissionId]);

  // Autosave to table: simplest approach delete existing then bulk insert current rows (like Top 20 Risks pattern)
  useAutosave(rows, async (currentRows) => {
    if (!submissionId) return;
    setSaving(true);
    // delete existing
  await (supabase as any).from('climate_exposure').delete().eq('submission_id', submissionId);
    // prepare inserts
    const inserts = currentRows.filter(r => !isRowEmpty(r)).map(r => ({
      submission_id: submissionId,
      policy_inception_date: r.policy_inception_date || null,
      policy_expiry_date: r.policy_expiry_date || null,
      insured: r.insured || null,
      policy_category: r.policy_category || null,
      policy_description: r.policy_description || null,
      nature_of_risk: r.nature_of_risk || null,
      gross_exposure_tsi: r.gross_exposure_tsi,
      cedants_exposure_tsi: r.cedants_exposure_tsi,
      eml_mpl_limit_applied: r.eml_mpl_limit_applied,
      eml_mpl_limit: r.eml_mpl_limit,
      ceded_prop_reinsurance_exposure: r.ceded_prop_reinsurance_exposure,
      net_inuring_prop_reinsurance_exposure: r.net_inuring_prop_reinsurance_exposure,
      gross_premium: r.gross_premium,
      cedants_premium: r.cedants_premium,
      ceded_prop_reinsurance_premium: r.ceded_prop_reinsurance_premium,
      net_prop_reinsurance_premium: r.net_prop_reinsurance_premium,
    }));
    if (inserts.length) {
  await (supabase as any).from('climate_exposure').insert(inserts);
    }
    setSaving(false);
    setLastSaved(new Date());
  });

  // Columns mapping for FormTable
  const columns = useMemo(() => CLIMATE_EXPOSURE_FIELDS.map(f => ({
    key: f.key,
    label: f.label,
    type: f.type === 'number' ? 'number' : 'text',
    placeholder: f.placeholder,
  })), []);

  const onChange = (idx: number, key: keyof Row, value: any) => {
    setRows(prev => {
      const copy = [...prev];
      const row: Row = { ...copy[idx] } as Row;
      if (key === 'policy_inception_date' || key === 'policy_expiry_date') {
        const raw = value === '' ? null : value;
        if (raw) {
          const norm = normalizeDateString(raw);
          (row as any)[key] = norm || raw; // store normalized if valid else raw for user correction
        } else {
          (row as any)[key] = null;
        }
      } else if (columns.find(c => c.key === key)?.type === 'number') {
        const num = value === '' ? null : parseNumeric(value);
        (row as any)[key] = num;
        if (key === 'eml_mpl_limit_applied' && (num == null || num <= 0)) {
          // If not applied, allow eml_mpl_limit to be null but don't force clear if user has value and re-applies later
          if (row.eml_mpl_limit_applied == null || row.eml_mpl_limit_applied <= 0) {
            // no action; leave existing eml_mpl_limit untouched, validation will ignore
          }
        }
      } else {
        (row as any)[key] = value === '' ? null : value;
      }
      const auto = autoFillDerived(row);
      copy[idx] = auto;
      // Validate row
      const errs = validateClimateExposureRow(auto);
      setErrors(prevErr => ({ ...prevErr, [idx]: errs }));
      return copy;
    });
  };

  const totals = useMemo(() => {
    const sums: Record<string, number> = {};
    for (const meta of CLIMATE_EXPOSURE_FIELDS) if (meta.sum) sums[meta.key] = 0;
    rows.forEach(r => {
      for (const meta of CLIMATE_EXPOSURE_FIELDS) if (meta.sum) {
        const val = (r as any)[meta.key];
  if (typeof val === 'number' && sums[meta.key] != null) sums[meta.key]! += val;
      }
    });
    return sums;
  }, [rows]);

  const totalsDisplay = useMemo(() => {
    const parts: string[] = [];
    for (const meta of CLIMATE_EXPOSURE_FIELDS) if (meta.sum) {
  const v = totals[meta.key];
  parts.push(`${meta.label}: ${(v ?? 0).toLocaleString()}`);
    }
    return parts.join(' • ');
  }, [totals]);

  const csvHeaders = useMemo(() => CLIMATE_EXPOSURE_FIELDS.map(f => f.key), []);

  // Define which columns are numeric (for NumberCell rendering)
  const numericColumns = useMemo(() => new Set([
    'gross_exposure_tsi',
    'cedants_exposure_tsi',
    'eml_mpl_limit_applied',
    'eml_mpl_limit',
    'ceded_prop_reinsurance_exposure',
    'net_inuring_prop_reinsurance_exposure',
    'gross_premium',
    'cedants_premium',
    'ceded_prop_reinsurance_premium',
    'net_prop_reinsurance_premium',
  ]), []);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Climate change exposure</h3>
        <div className="flex gap-2 items-center">
          {!isViewMode && (
            <button type="button" className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => setPasteOpen(true)}>
              Paste from Excel
            </button>
          )}
          <button type="button" className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700" onClick={() => {
            const exportRows = rows.map(r => {
              const out: Record<string, any> = {};
              for (const k of csvHeaders) (out as any)[k] = (r as any)[k] ?? '';
              return out;
            });
            const csv = toCsv(exportRows as any, csvHeaders);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'climate_change_exposure.csv'; a.click(); URL.revokeObjectURL(url);
          }}>
            Export CSV
          </button>
          <div className="text-xs text-gray-500">{saving ? 'Saving…' : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Autosave ready'}</div>
        </div>
      </div>

      <div className={autoColumnClasses.container}>
        <table ref={tableRef} className={`${autoColumnClasses.table} min-w-full border rounded`}>
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              {columns.map(col => (
                <th key={col.key} className="px-2 py-1 text-left whitespace-nowrap">{col.label}</th>
              ))}
              <th className="px-2 py-1 text-left whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="align-top">
                {columns.map(col => {
                  const colKey = col.key as keyof Row;
                  const value = row[colKey];
                  const error = errors[idx]?.[colKey];

                  return (
                    <td key={col.key} className="px-2 py-1">
                      {numericColumns.has(col.key) ? (
                        <div>
                          <NumberCell
                            value={value as number}
                            onChange={(newValue) => onChange(idx, colKey, newValue)}
                            decimals={2}
                            className="w-full"
                            readOnly={isViewMode}
                          />
                          {error && (
                            <div className="text-xs text-red-600 mt-1">{error}</div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <input
                            type="text"
                            value={value ?? ''}
                            disabled={isViewMode}
                            onChange={(e) => onChange(idx, colKey, e.target.value)}
                            placeholder={col.placeholder}
                            className="px-2 py-1 border rounded w-full"
                          />
                          {error && (
                            <div className="text-xs text-red-600 mt-1">{error}</div>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className="px-2 py-1">
                  {!isViewMode && (
                    <button
                      type="button"
                      className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      onClick={() => setRows(prev => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)))}
                      disabled={rows.length <= 1}
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={columns.length + 1} className="px-2 py-2 bg-gray-50 dark:bg-gray-900">
                <div className="text-sm">Totals — {totalsDisplay}</div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {!isViewMode && (
        <div className="flex justify-between items-center mt-3">
          <button
            type="button"
            className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => setRows(prev => [...prev, emptyClimateExposureRow()])}
          >
            Add Row
          </button>
        </div>
      )}
      <PasteModal open={pasteOpen} expectedColumns={csvHeaders.length} onClose={() => setPasteOpen(false)} onApply={(data) => {
        // Replacement-aware paste: fill existing leading empty placeholder rows before appending.
        setRows(prev => {
          let working = [...prev];
          // Normalize incoming rows (trim trailing blanks, skip rows that are entirely empty)
          const cleaned: string[][] = data.filter(r => Array.isArray(r) && r.some(c => c != null && String(c).trim() !== '')) as string[][];

          // Optional: detect and skip a header row if it matches keys exactly
          if (cleaned.length > 0) {
            const first = cleaned[0];
            if (first) {
              const headerCandidate = first.map(c => String(c).trim().toLowerCase());
              const keySet = new Set(csvHeaders.map(k => k.toLowerCase()));
              const headerMatches = headerCandidate.every(c => keySet.has(c));
              if (headerMatches) cleaned.shift();
            }
          }

          let pasteIdx = 0;
          // Replace leading empty rows
          for (let i = 0; i < working.length && pasteIdx < cleaned.length; i++) {
            const existing = working[i];
            if (existing && isRowEmpty(existing)) {
              const incoming = cleaned[pasteIdx];
              if (incoming) {
                working[i] = buildRowFromPaste(incoming);
                pasteIdx++;
              }
            } else {
              break; // stop once encounter a non-empty row
            }
          }
          // Append remaining rows
          for (; pasteIdx < cleaned.length; pasteIdx++) {
            const incoming = cleaned[pasteIdx];
            if (incoming) working.push(buildRowFromPaste(incoming));
          }

          // Auto fill + validate in one pass to minimize re-renders
          const nextErrors: typeof errors = {};
          working = working.map((r, i) => {
            const auto = autoFillDerived(r);
            const errs = validateClimateExposureRow(auto);
            nextErrors[i] = errs;
            return auto;
          });
          setErrors(nextErrors);
          return working;
        });
      }} />
    </div>
  );
}

// Build a row object from pasted string[] respecting column ordering and normalization.
function buildRowFromPaste(cols: string[]): Row {
  const row = emptyClimateExposureRow();
  CLIMATE_EXPOSURE_FIELDS.forEach((meta, i) => {
    const raw = cols[i];
    if (raw == null) return;
    const trimmed = String(raw).trim();
    if (trimmed === '') return;
    if (meta.type === 'number') {
      // Use parseNumericInput for Excel paste compatibility (handles commas, negatives, etc.)
      const parsed = parseNumericInput(trimmed);
      (row as any)[meta.key] = parsed;
    } else if (meta.key === 'policy_inception_date' || meta.key === 'policy_expiry_date') {
      const norm = normalizeDateString(trimmed);
      (row as any)[meta.key] = norm || trimmed;
    } else {
      (row as any)[meta.key] = trimmed;
    }
  });
  return row;
}
