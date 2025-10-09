import { useEffect, useRef } from 'react';

/**
 * Hook to enable auto-sizing columns based on content
 * Ensures table uses auto layout and removes width restrictions
 * 
 * Usage:
 * const tableRef = useAutoColumnSize();
 * <table ref={tableRef} className="...">
 */
export function useAutoColumnSize<T extends HTMLElement = HTMLTableElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Ensure table-layout is auto for content-based widths
    if (element instanceof HTMLTableElement) {
      element.style.tableLayout = 'auto';
    }

    // Ensure parent container allows horizontal scroll
    const container = element.closest('.overflow-x-auto, .overflow-auto');
    if (container) {
      container.classList.add('overflow-x-auto');
    }

    // Optional: Use ResizeObserver to dynamically adjust if needed
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Table has resized - browser automatically handles column widths
        // This just ensures we're aware of changes
        if (entry.target === element) {
          // Could add custom logic here if needed
        }
      }
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return ref;
}

/**
 * CSS classes to apply to tables for auto-sizing columns
 * Use with className prop on table elements
 */
export const autoColumnClasses = {
  /** Table element classes */
  table: 'w-full min-w-max',
  /** Header cell classes */
  th: 'whitespace-nowrap px-3 py-2',
  /** Text cell classes (can wrap) */
  tdText: 'whitespace-normal break-words px-3 py-2',
  /** Numeric cell classes (no wrap for numbers) */
  tdNumeric: 'whitespace-nowrap px-3 py-2 text-right',
  /** Container wrapper classes */
  container: 'overflow-x-auto w-full',
} as const;
