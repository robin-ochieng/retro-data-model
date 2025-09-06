import React from 'react';
import { useTheme, ThemeMode } from '../theme/ThemeProvider';

const OPTIONS: { label: string; value: ThemeMode }[] = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System', value: 'system' },
];

export default function ThemeToggle({ className = '' }: { className?: string }) {
  // Implemented as a dropdown; keep default export name for backwards compatibility
  const { mode, setMode } = useTheme();
  const [open, setOpen] = React.useState(false);
  const btnRef = React.useRef<HTMLButtonElement | null>(null);
  const itemRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  const selectedIndex = OPTIONS.findIndex((o) => o.value === mode);
  const openMenu = React.useCallback(() => {
    setOpen(true);
    // Focus the selected item after open
    setTimeout(() => {
      const target = itemRefs.current[selectedIndex] || itemRefs.current[0];
      target?.focus();
    }, 0);
  }, [selectedIndex]);

  const closeMenu = React.useCallback(() => {
    setOpen(false);
    btnRef.current?.focus();
  }, []);

  React.useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(t) && btnRef.current && !btnRef.current.contains(t)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMenu();
      }
    }
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, closeMenu]);

  const onButtonKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openMenu();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      openMenu();
    }
  };

  const onItemKeyDown = (idx: number) => (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (idx + 1) % OPTIONS.length;
      itemRefs.current[next]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = (idx - 1 + OPTIONS.length) % OPTIONS.length;
      itemRefs.current[prev]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      itemRefs.current[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      itemRefs.current[OPTIONS.length - 1]?.focus();
    }
  };

  const buttonClasses = `inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`;
  const menuClasses = `absolute right-0 mt-2 w-40 rounded-md border bg-background shadow-lg p-1 z-50`;
  const itemBase = `w-full text-left px-2 py-1.5 rounded text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring`;

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        className={buttonClasses}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={onButtonKeyDown}
        aria-label="Theme"
      >
        Theme
        <span aria-hidden className="text-xs opacity-70">▾</span>
      </button>
      {open && (
        <div ref={menuRef} className={menuClasses} role="menu" aria-label="Theme">
          {OPTIONS.map((opt, idx) => {
            const selected = mode === opt.value;
            return (
              <button
                key={opt.value}
                ref={(el) => {
                  itemRefs.current[idx] = el;
                }}
                role="menuitemradio"
                aria-checked={selected}
                className={`${itemBase} ${selected ? 'bg-primary/10 text-foreground' : 'hover:bg-muted'}`}
                onKeyDown={onItemKeyDown(idx)}
                onClick={() => {
                  setMode(opt.value);
                  closeMenu();
                }}
              >
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 inline-block" aria-hidden>{selected ? '✓' : ''}</span>
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
