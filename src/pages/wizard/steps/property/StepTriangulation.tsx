import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import PasteModal from '../../../../components/PasteModal';
import { useViewMode } from '../../../../context/ViewMode';
import { useAutosave } from '../../../../hooks/useAutosave';
import { parseCsv } from '../../../../utils/csv';
import { parseNumericInput, parseYearInput } from '../../../../lib/formatUtils';
import {
  getPropertyTriangle,
  replacePropertyTriangle,
  upsertPropertyTriangleCell,
  type TriangleMeasure,
  type TriangleRow,
} from '../../../../lib/triangles';
import WrittenPremiumTable from '../../../../features/triangulation/WrittenPremiumTable';
import NumberOfLossesTable from '../../../../features/triangulation/NumberOfLossesTable';
import PaidLossesTable from '../../../../features/triangulation/PaidLossesTable';
import LossReservesTable from '../../../../features/triangulation/LossReservesTable';
import IncurredLossesTable from '../../../../features/triangulation/IncurredLossesTable';
import WiLrTable from '../../../../features/triangulation/WiLrTable';

const DEV_MONTHS = [12, 24, 36, 48, 60, 72, 84, 96, 108, 120] as const;
type DevMonth = (typeof DEV_MONTHS)[number];

type SectionKey =
  | 'written_premium'
  | 'number_of_losses'
  | 'paid_losses'
  | 'loss_reserves'
  | 'incurred_losses'
  | 'wi_lr_pct';

type SectionGrid = Array<Array<number | null>>;

type SectionErrors = Record<number, { months?: Record<number, string> }>;

type SectionErrorsState = Record<SectionKey, SectionErrors>;

type PendingEdit = {
  measure: TriangleMeasure;
  uw_year: number;
  development_months: DevMonth;
  value: number | null;
};

const SECTION_KEYS: SectionKey[] = [
  'written_premium',
  'number_of_losses',
  'paid_losses',
  'loss_reserves',
  'incurred_losses',
  'wi_lr_pct',
];

const DEV_MONTHS_VALUES: number[] = [...DEV_MONTHS];

const createEmptySectionState = (): Record<SectionKey, SectionGrid> => ({
  written_premium: [],
  number_of_losses: [],
  paid_losses: [],
  loss_reserves: [],
  incurred_losses: [],
  wi_lr_pct: [],
});

const createEmptyErrorState = (): SectionErrorsState => ({
  written_premium: {},
  number_of_losses: {},
  paid_losses: {},
  loss_reserves: {},
  incurred_losses: {},
  wi_lr_pct: {},
});

function cloneGridWithLength(grid: SectionGrid, targetRows: number): SectionGrid {
  return Array.from({ length: targetRows }, (_, rowIndex) => {
    const source = grid[rowIndex] ?? [];
    return DEV_MONTHS_VALUES.map((_, colIndex) => source[colIndex] ?? null);
  });
}

const isFiniteNumber = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value);

function computeIncurredGrid(
  paidLosses: SectionGrid,
  lossReserves: SectionGrid,
  rowCount: number,
): SectionGrid {
  return Array.from({ length: rowCount }, (_, rowIndex) =>
    DEV_MONTHS_VALUES.map((_, colIndex) => {
      const paid = paidLosses[rowIndex]?.[colIndex];
      const reserve = lossReserves[rowIndex]?.[colIndex];
      if (!isFiniteNumber(paid) || !isFiniteNumber(reserve)) {
        return null;
      }
      return paid + reserve;
    }),
  );
}

function computeWiLrGrid(
  incurred: SectionGrid,
  writtenPremium: SectionGrid,
  rowCount: number,
): SectionGrid {
  return Array.from({ length: rowCount }, (_, rowIndex) =>
    DEV_MONTHS_VALUES.map((_, colIndex) => {
      const incurredValue = incurred[rowIndex]?.[colIndex];
      const writtenValue = writtenPremium[rowIndex]?.[colIndex];
      if (!isFiniteNumber(incurredValue) || !isFiniteNumber(writtenValue) || writtenValue === 0) {
        return null;
      }
      const ratio = incurredValue / writtenValue;
      return Number.isFinite(ratio) ? ratio : null;
    }),
  );
}

type GridDiff = {
  changed: boolean;
  cells: Array<{ rowIndex: number; colIndex: number; value: number | null }>;
};

function diffGrids(existing: SectionGrid, computed: SectionGrid): GridDiff {
  let changed = false;
  const cells: GridDiff['cells'] = [];
  for (let rowIndex = 0; rowIndex < computed.length; rowIndex += 1) {
    for (let colIndex = 0; colIndex < DEV_MONTHS_VALUES.length; colIndex += 1) {
      const currentRaw = existing[rowIndex]?.[colIndex];
      const nextRaw = computed[rowIndex]?.[colIndex];
      const current = isFiniteNumber(currentRaw) ? currentRaw : null;
      const next = isFiniteNumber(nextRaw) ? nextRaw : null;
      const valuesEqual = (current === next) || (current === null && next === null);
      if (!valuesEqual) {
        changed = true;
        cells.push({ rowIndex, colIndex, value: next });
      }
    }
  }
  return { changed, cells };
}

export default function StepTriangulation() {
  const { submissionId } = useParams();
  const isViewMode = useViewMode();
  const [years, setYears] = useState<Array<number | null>>([]);
  const [sections, setSections] = useState(createEmptySectionState);
  const [sectionErrors, setSectionErrors] = useState<SectionErrorsState>(createEmptyErrorState);
  const [yearErrors, setYearErrors] = useState<Record<number, string>>({});
  const [pending, setPending] = useState<PendingEdit[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [pasteOpenFor, setPasteOpenFor] = useState<SectionKey | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!submissionId) {
        setYears([]);
        setSections(createEmptySectionState());
        setLoading(false);
        return;
      }

      setLoading(true);
      setSectionErrors(createEmptyErrorState());
      setYearErrors({});

      try {
        const rows = await getPropertyTriangle(submissionId);
        if (cancelled) return;

        const yearsSet = new Set<number>();
        rows.forEach((row) => {
          if (row.uw_year) yearsSet.add(row.uw_year);
        });

        const sortedYears = Array.from(yearsSet).sort((a, b) => a - b);
        const rowCount = sortedYears.length;

        const yearIndex = new Map<number, number>();
        sortedYears.forEach((yr, idx) => yearIndex.set(yr, idx));

        const nextSections = createEmptySectionState();
        SECTION_KEYS.forEach((key) => {
          nextSections[key] = cloneGridWithLength(nextSections[key], rowCount);
        });

        rows.forEach((row) => {
          const measure = row.measure as SectionKey;
          const rowIdx = yearIndex.get(row.uw_year);
          const colIdx = DEV_MONTHS_VALUES.indexOf(row.development_months as DevMonth);
          if (rowIdx === undefined || colIdx === -1) return;
          if (!nextSections[measure]) {
            nextSections[measure] = cloneGridWithLength([], rowCount);
          }
          const targetRow = nextSections[measure][rowIdx] ?? (nextSections[measure][rowIdx] = Array(DEV_MONTHS_VALUES.length).fill(null));
          targetRow[colIdx] = row.value ?? null;
        });

        setYears(sortedYears);
        setSections(nextSections);
      } catch (error) {
        console.error('Failed to load property triangulation', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  useAutosave(
    pending,
    async (items) => {
      if (!submissionId || !items.length) return;

      const latest = new Map<string, PendingEdit>();
      for (const item of items) {
        const key = `${item.measure}|${item.uw_year}|${item.development_months}`;
        latest.set(key, item);
      }

      const todo = Array.from(latest.values());
      for (const entry of todo) {
        await upsertPropertyTriangleCell({
          submissionId,
          measure: entry.measure,
          uwYear: entry.uw_year,
          developmentMonths: entry.development_months,
          value: entry.value,
        });
      }

      setLastSaved(new Date());
      setPending([]);
    },
    900,
    true,
  );

  const isSaving = pending.length > 0 || isReplacing;

    useEffect(() => {
      const rowCount = Math.max(
        years.length,
        sections.paid_losses.length,
        sections.loss_reserves.length,
        sections.written_premium.length,
      );

      const incurredGrid = computeIncurredGrid(sections.paid_losses, sections.loss_reserves, rowCount);
      const wiLrGrid = computeWiLrGrid(incurredGrid, sections.written_premium, rowCount);

      const normalizedIncurred = cloneGridWithLength(sections.incurred_losses ?? [], rowCount);
      const normalizedWiLr = cloneGridWithLength(sections.wi_lr_pct ?? [], rowCount);

      const incurredDiff = diffGrids(normalizedIncurred, incurredGrid);
      const wiLrDiff = diffGrids(normalizedWiLr, wiLrGrid);

      if (!incurredDiff.changed && !wiLrDiff.changed) {
        return;
      }

      setSections((prev) => ({
        ...prev,
        incurred_losses: incurredGrid,
        wi_lr_pct: wiLrGrid,
      }));

      setSectionErrors((prev) => {
        const existingIncurred = prev.incurred_losses ?? {};
        const existingWilr = prev.wi_lr_pct ?? {};
        if (Object.keys(existingIncurred).length === 0 && Object.keys(existingWilr).length === 0) {
          return prev;
        }
        return {
          ...prev,
          incurred_losses: {},
          wi_lr_pct: {},
        };
      });

      if (!submissionId) {
        return;
      }

      const edits: PendingEdit[] = [];

      incurredDiff.cells.forEach(({ rowIndex, colIndex, value }) => {
        const year = years[rowIndex];
        if (typeof year !== 'number') return;
        edits.push({
          measure: 'incurred_losses',
          uw_year: year,
          development_months: DEV_MONTHS_VALUES[colIndex] as DevMonth,
          value,
        });
      });

      wiLrDiff.cells.forEach(({ rowIndex, colIndex, value }) => {
        const year = years[rowIndex];
        if (typeof year !== 'number') return;
        edits.push({
          measure: 'wi_lr_pct',
          uw_year: year,
          development_months: DEV_MONTHS_VALUES[colIndex] as DevMonth,
          value,
        });
      });

      if (edits.length > 0) {
        setPending((prev) => [...prev, ...edits]);
      }
    }, [
      sections.incurred_losses,
      sections.loss_reserves,
      sections.paid_losses,
      sections.wi_lr_pct,
      sections.written_premium,
      years,
      submissionId,
    ]);

  const ensureGridHasRow = (grid: SectionGrid, rowIndex: number): SectionGrid => {
    const targetLength = Math.max(grid.length, rowIndex + 1);
    const next = cloneGridWithLength(grid, targetLength);
    return next;
  };

  const handleYearChange = (rowIndex: number, value: number | null) => {
    setYears((prev) => {
      const next = [...prev];
      while (next.length <= rowIndex) {
        next.push(null);
      }
      next[rowIndex] = value;
      return next;
    });

    setYearErrors((prev) => {
      const next = { ...prev };
      if (value != null) {
        delete next[rowIndex];
      }
      return next;
    });
  };

  const handleValueChange = (sectionKey: SectionKey, rowIndex: number, devMonth: number, value: number | null) => {
    const columnIndex = DEV_MONTHS_VALUES.indexOf(devMonth as DevMonth);
    if (columnIndex === -1) return;

    setSections((prev) => {
      const next = { ...prev } as Record<SectionKey, SectionGrid>;
      const grid = ensureGridHasRow(prev[sectionKey] ?? [], rowIndex);
      const row = grid[rowIndex] ?? (grid[rowIndex] = Array(DEV_MONTHS_VALUES.length).fill(null));
      row[columnIndex] = value;
      next[sectionKey] = grid;
      return next;
    });

    setSectionErrors((prev) => {
      const copy = { ...prev };
      const section = { ...(copy[sectionKey] ?? {}) };
      const existing = { ...(section[rowIndex] ?? {}) };
      if (existing.months) {
        const monthErrors = { ...existing.months };
        delete monthErrors[devMonth];
        if (Object.keys(monthErrors).length > 0) {
          existing.months = monthErrors;
          section[rowIndex] = existing;
        } else {
          delete existing.months;
          if (Object.keys(existing).length > 0) {
            section[rowIndex] = existing;
          } else {
            delete section[rowIndex];
          }
        }
      } else {
        delete section[rowIndex];
      }
      copy[sectionKey] = section;
      return copy;
    });

    const uwYear = years[rowIndex];
    if (submissionId && typeof uwYear === 'number') {
      setPending((prev) => [
        ...prev,
        {
          measure: sectionKey,
          uw_year: uwYear,
          development_months: devMonth as DevMonth,
          value,
        },
      ]);
    }
  };

  const handleAddRow = () => {
    setYears((prev) => [...prev, null]);
    setSections((prev) => {
      const next = { ...prev } as Record<SectionKey, SectionGrid>;
      SECTION_KEYS.forEach((key) => {
        const grid = prev[key] ?? [];
        const cloned = grid.map((row) => [...row]);
        cloned.push(Array(DEV_MONTHS_VALUES.length).fill(null));
        next[key] = cloned;
      });
      return next;
    });
  };

  const handleRemoveRow = (rowIndex: number) => {
    setYears((prev) => prev.filter((_, idx) => idx !== rowIndex));
    setSections((prev) => {
      const next = { ...prev } as Record<SectionKey, SectionGrid>;
      SECTION_KEYS.forEach((key) => {
        next[key] = (prev[key] ?? []).filter((_, idx) => idx !== rowIndex).map((row) => [...row]);
      });
      return next;
    });

    setYearErrors((prev) => {
      const next: Record<number, string> = {};
      Object.entries(prev).forEach(([idxStr, message]) => {
        const idx = Number(idxStr);
        if (idx < rowIndex) {
          next[idx] = message;
        } else if (idx > rowIndex) {
          next[idx - 1] = message;
        }
      });
      return next;
    });

    setSectionErrors((prev) => {
      const next = createEmptyErrorState();
      SECTION_KEYS.forEach((key) => {
        const current = prev[key] ?? {};
        const updated: SectionErrors = {};
        Object.entries(current).forEach(([idxStr, value]) => {
          const idx = Number(idxStr);
          if (idx < rowIndex) {
            updated[idx] = value;
          } else if (idx > rowIndex) {
            updated[idx - 1] = value;
          }
        });
        next[key] = updated;
      });
      return next;
    });
  };

  const handleImportCsv = (key: SectionKey) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,text/csv';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      applyPaste(key, parseCsv(text));
    };
    input.click();
  };

  const applyPaste = (key: SectionKey, rawGrid: string[][]) => {
    if (!rawGrid.length) return;

    const cleanedRows = rawGrid
      .map((row) => row.map((cell) => (cell ?? '').toString()))
      .filter((row) => row.some((cell) => cell.trim() !== ''));

    if (!cleanedRows.length) return;

    const hasHeader = /year/i.test(cleanedRows[0]?.[0] ?? '');
    const dataRows = hasHeader ? cleanedRows.slice(1) : cleanedRows;
    if (!dataRows.length) return;

    const includesYear = parseYearInput((dataRows[0]?.[0] ?? '').trim()) !== null;
    const colOffset = includesYear ? 1 : 0;
    const targetRows = Math.max(years.length, dataRows.length);

    const nextYears = [...years];
    while (nextYears.length < targetRows) {
      nextYears.push(null);
    }

    const currentGrid = sections[key] ?? [];
    const nextGrid = cloneGridWithLength(currentGrid, targetRows);

    const touchedRows = new Set<number>();
    const monthErrors = new Map<number, Record<number, string>>();
    const updatedYearErrors: Record<number, string> = {};
    const upsertRows: TriangleRow[] = [];

    dataRows.forEach((row, idx) => {
      const rowIndex = idx;
      touchedRows.add(rowIndex);
      const targetRow = nextGrid[rowIndex] ?? (nextGrid[rowIndex] = Array(DEV_MONTHS_VALUES.length).fill(null));

      if (colOffset === 1) {
        const rawYear = (row[0] ?? '').trim();
        if (rawYear === '') {
          // Leave existing value as-is
        } else {
          const parsedYear = parseYearInput(rawYear);
          if (parsedYear === null) {
            nextYears[rowIndex] = null;
            updatedYearErrors[rowIndex] = `Invalid year: ${rawYear}`;
          } else {
            nextYears[rowIndex] = parsedYear;
          }
        }
      }

      const rowMonthErrors: Record<number, string> = {};
      DEV_MONTHS_VALUES.forEach((devMonth, colIdx) => {
        const rawValue = row[colOffset + colIdx] ?? '';
        const trimmed = rawValue.trim();

        if (trimmed === '') {
          targetRow[colIdx] = null;
          return;
        }

        const parsedValue = parseNumericInput(trimmed);
        if (parsedValue === null) {
          rowMonthErrors[devMonth] = `Invalid number: ${rawValue}`;
          return;
        }

        targetRow[colIdx] = parsedValue;
        const uwYear = nextYears[rowIndex];
        if (typeof uwYear === 'number') {
          upsertRows.push({
            measure: key,
            uw_year: uwYear,
            development_months: devMonth,
            value: parsedValue,
          });
        }
      });

      if (Object.keys(rowMonthErrors).length > 0) {
        monthErrors.set(rowIndex, rowMonthErrors);
      }
    });

    setYears(nextYears);
    setSections((prev) => ({ ...prev, [key]: nextGrid }));

    setSectionErrors((prev) => {
      const copy = { ...prev };
      const section = { ...(copy[key] ?? {}) };
      touchedRows.forEach((rowIndex) => {
        delete section[rowIndex];
      });
      monthErrors.forEach((value, rowIndex) => {
        section[rowIndex] = { months: value };
      });
      copy[key] = section;
      return copy;
    });

    setYearErrors((prev) => {
      const copy = { ...prev };
      touchedRows.forEach((rowIndex) => {
        const message = updatedYearErrors[rowIndex];
        if (message) {
          copy[rowIndex] = message;
        } else {
          delete copy[rowIndex];
        }
      });
      return copy;
    });

    if (submissionId && upsertRows.length > 0) {
      setIsReplacing(true);
      replacePropertyTriangle({ submissionId, rows: upsertRows, deleteMissing: false })
        .then(() => setLastSaved(new Date()))
        .catch((error) => console.error('Failed to replace property triangulation', error))
        .finally(() => setIsReplacing(false));
    }
  };

  return (
    <div className="space-y-8">
      <WrittenPremiumTable
        years={years}
        devMonths={DEV_MONTHS_VALUES}
        values={sections.written_premium}
        onYearChange={isViewMode ? undefined : handleYearChange}
        onValueChange={isViewMode ? undefined : (rowIdx, devMonth, value) => handleValueChange('written_premium', rowIdx, devMonth, value)}
        onAddRow={isViewMode ? undefined : handleAddRow}
        onRemoveRow={isViewMode ? undefined : handleRemoveRow}
        onPaste={isViewMode ? undefined : () => setPasteOpenFor('written_premium')}
        onImportCsv={isViewMode ? undefined : () => handleImportCsv('written_premium')}
        isSaving={isSaving}
        lastSavedAt={lastSaved}
        yearErrors={yearErrors}
        cellErrors={sectionErrors.written_premium}
        loading={loading}
      />

      <NumberOfLossesTable
        years={years}
        devMonths={DEV_MONTHS_VALUES}
        values={sections.number_of_losses}
        onYearChange={isViewMode ? undefined : handleYearChange}
        onValueChange={isViewMode ? undefined : (rowIdx, devMonth, value) => handleValueChange('number_of_losses', rowIdx, devMonth, value)}
        onAddRow={isViewMode ? undefined : handleAddRow}
        onRemoveRow={isViewMode ? undefined : handleRemoveRow}
        onPaste={isViewMode ? undefined : () => setPasteOpenFor('number_of_losses')}
        onImportCsv={isViewMode ? undefined : () => handleImportCsv('number_of_losses')}
        isSaving={isSaving}
        lastSavedAt={lastSaved}
        yearErrors={yearErrors}
        cellErrors={sectionErrors.number_of_losses}
        loading={loading}
      />

      <PaidLossesTable
        years={years}
        devMonths={DEV_MONTHS_VALUES}
        values={sections.paid_losses}
        onYearChange={isViewMode ? undefined : handleYearChange}
        onValueChange={isViewMode ? undefined : (rowIdx, devMonth, value) => handleValueChange('paid_losses', rowIdx, devMonth, value)}
        onAddRow={isViewMode ? undefined : handleAddRow}
        onRemoveRow={isViewMode ? undefined : handleRemoveRow}
        onPaste={isViewMode ? undefined : () => setPasteOpenFor('paid_losses')}
        onImportCsv={isViewMode ? undefined : () => handleImportCsv('paid_losses')}
        isSaving={isSaving}
        lastSavedAt={lastSaved}
        yearErrors={yearErrors}
        cellErrors={sectionErrors.paid_losses}
        loading={loading}
      />

      <LossReservesTable
        years={years}
        devMonths={DEV_MONTHS_VALUES}
        values={sections.loss_reserves}
        onYearChange={isViewMode ? undefined : handleYearChange}
        onValueChange={isViewMode ? undefined : (rowIdx, devMonth, value) => handleValueChange('loss_reserves', rowIdx, devMonth, value)}
        onAddRow={isViewMode ? undefined : handleAddRow}
        onRemoveRow={isViewMode ? undefined : handleRemoveRow}
        onPaste={isViewMode ? undefined : () => setPasteOpenFor('loss_reserves')}
        onImportCsv={isViewMode ? undefined : () => handleImportCsv('loss_reserves')}
        isSaving={isSaving}
        lastSavedAt={lastSaved}
        yearErrors={yearErrors}
        cellErrors={sectionErrors.loss_reserves}
        loading={loading}
      />

      <IncurredLossesTable
        years={years}
        devMonths={DEV_MONTHS_VALUES}
        values={sections.incurred_losses}
        readOnly
        badge="auto-calculated"
        isSaving={isSaving}
        lastSavedAt={lastSaved}
        decimals={0}
        yearErrors={yearErrors}
        loading={loading}
      />

      <WiLrTable
        years={years}
        devMonths={DEV_MONTHS_VALUES}
        values={sections.wi_lr_pct}
        readOnly
        badge="auto-calculated"
        isSaving={isSaving}
        lastSavedAt={lastSaved}
        yearErrors={yearErrors}
        loading={loading}
      />

      <PasteModal
        open={pasteOpenFor !== null}
        onClose={() => setPasteOpenFor(null)}
        title="Paste rows (Year column optional)"
        onApply={(rows) => {
          if (pasteOpenFor) {
            applyPaste(pasteOpenFor, rows);
          }
          setPasteOpenFor(null);
        }}
      />
    </div>
  );
}
