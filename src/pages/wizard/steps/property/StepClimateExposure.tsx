import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import FormTable from '../../../../components/FormTable';
import PasteModal from '../../../../components/PasteModal';
import { supabase } from '../../../../lib/supabase';
import { useAutosave } from '../../../../hooks/useAutosave';
import { toCsv } from '../../../../utils/csv';
import {
  ClimateChangeExposureRow,
  CLIMATE_EXPOSURE_FIELDS,
  emptyClimateExposureRow,
  validateClimateExposureRow,
  autoFillDerived,
  migrateLegacyClimateExposureRow,
} from '../../../../types/climateExposure';

type Row = ClimateChangeExposureRow;

interface PayloadShape { rows: Row[]; migrated?: boolean; }

export default function StepClimateExposure() {
  const { submissionId } = useParams();
  const [rows, setRows] = useState<Row[]>([emptyClimateExposureRow()]);
  const [errors, setErrors] = useState<Record<number, Partial<Record<keyof Row, string>>>>({});
  const [pasteOpen, setPasteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [migrated, setMigrated] = useState(false);

  // Load existing payload
  useEffect(() => {
    (async () => {
      if (!submissionId) return;
      const res = await supabase.from('sheet_blobs').select('payload').eq('submission_id', submissionId).eq('sheet_name', 'Climate change exposure').maybeSingle();
      const payload = res.data?.payload as PayloadShape | any;
      if (payload?.rows) {
        // Detect legacy structure (old key region_or_zone inside first row or exposures key)
        if (!payload.migrated) {
          let newRows: Row[] = [];
            if (payload.rows.some((r: any) => 'region_or_zone' in r)) {
              newRows = payload.rows.map((r: any) => migrateLegacyClimateExposureRow(r));
            } else if ((payload as any).exposures) { // very legacy name
              newRows = (payload as any).exposures.map((r: any) => migrateLegacyClimateExposureRow(r));
            }
          if (newRows.length) {
            setRows(newRows.length ? newRows : [emptyClimateExposureRow()]);
            setMigrated(true);
            return;
          }
        }
        setRows(payload.rows.length ? payload.rows : [emptyClimateExposureRow()]);
        setMigrated(!!payload.migrated);
      } else if ((payload as any)?.exposures) {
        // Original shape { exposures: [...] }
        const legacyRows = (payload as any).exposures.map((r: any) => migrateLegacyClimateExposureRow(r));
        setRows(legacyRows.length ? legacyRows : [emptyClimateExposureRow()]);
        setMigrated(true);
      }
    })();
  }, [submissionId]);

  // Autosave
  useAutosave({ rows, migrated: migrated || undefined }, async (val) => {
    if (!submissionId) return;
    setSaving(true);
    await supabase.from('sheet_blobs').upsert([
      { submission_id: submissionId, sheet_name: 'Climate change exposure', payload: val as any }
    ], { onConflict: 'submission_id,sheet_name' });
    setSaving(false);
    setLastSaved(new Date());
  });

  // Columns mapping for FormTable
  const columns = useMemo(() => CLIMATE_EXPOSURE_FIELDS.map(f => ({
    key: f.key,
    label: f.label,
    type: f.type === 'checkbox' ? 'text' : (f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'),
  })), []);

  const onChange = (idx: number, key: keyof Row, value: any) => {
    setRows(prev => {
      const copy = [...prev];
      const row: Row = { ...copy[idx] } as Row;
      if (key === 'eml_mpl_limit_applied') {
        row.eml_mpl_limit_applied = value === true || value === 'true' || value === 'on';
        if (!row.eml_mpl_limit_applied) row.eml_mpl_limit = null; // clear if not applied
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

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Climate change exposure</h3>
        <div className="text-xs text-gray-500">{saving ? 'Saving…' : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Autosave ready'}</div>
      </div>
      <FormTable<Row>
        columns={columns as any}
        rows={rows}
        onChange={onChange as any}
        onAddRow={() => setRows(prev => [...prev, emptyClimateExposureRow()])}
        onRemoveRow={(i) => setRows(prev => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)))}
        onPaste={() => setPasteOpen(true)}
        onExportCsv={() => {
          const exportRows = rows.map(r => {
            const out: Record<string, any> = {};
            for (const k of csvHeaders) (out as any)[k] = (r as any)[k] ?? '';
            return out;
          });
            const csv = toCsv(exportRows as any, csvHeaders);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'climate_change_exposure.csv'; a.click(); URL.revokeObjectURL(url);
        }}
        isSaving={saving}
        lastSavedAt={lastSaved}
        footerRender={<div className="text-sm">Totals — {totalsDisplay}</div>}
        errors={errors as any}
      />
      <PasteModal open={pasteOpen} onClose={() => setPasteOpen(false)} onApply={(data) => {
        setRows(prev => {
          const copy = [...prev];
          data.forEach(cols => {
            // Map first N columns to the new schema order (unsafe paste). Expect ordering per csvHeaders.
            const row = emptyClimateExposureRow();
            csvHeaders.forEach((k, i) => {
              const raw = cols[i];
              if (raw == null || raw === '') return; // leave null
              const meta = CLIMATE_EXPOSURE_FIELDS.find(f => f.key === k)!;
              if (meta.type === 'number') (row as any)[k] = Number(raw);
              else if (meta.type === 'checkbox') (row as any)[k] = /^(true|1|yes)$/i.test(String(raw));
              else (row as any)[k] = raw;
            });
            copy.push(autoFillDerived(row));
          });
          return copy;
        });
      }} />
    </div>
  );
}
