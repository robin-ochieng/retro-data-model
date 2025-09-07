import React from 'react';

export default function Callout({ variant = 'info', children }: { variant?: 'info' | 'warning' | 'tip'; children: React.ReactNode }) {
  const styles = {
    info: 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200/60 dark:border-blue-900/40',
    warning: 'bg-yellow-50/40 dark:bg-yellow-950/20 border-yellow-200/60 dark:border-yellow-900/40',
    tip: 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40',
  } as const;
  return (
    <div className={`border rounded-md px-3 py-2 text-sm ${styles[variant]}`}>
      {children}
    </div>
  );
}
