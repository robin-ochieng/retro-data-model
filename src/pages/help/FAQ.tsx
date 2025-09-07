import React, { useState } from 'react';

export type QA = { q: string; a: React.ReactNode };

export default function FAQ({ items }: { items: QA[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="divide-y divide-border rounded-md border border-border/50">
      {items.map((item, idx) => {
        const expanded = open === idx;
        const id = `faq-${idx}`;
        return (
          <div key={idx} className="bg-card">
            <h3>
              <button
                className="w-full text-left px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-expanded={expanded}
                aria-controls={`${id}-panel`}
                onClick={() => setOpen(expanded ? null : idx)}
              >
                <span className="font-medium">{item.q}</span>
              </button>
            </h3>
            <div
              id={`${id}-panel`}
              role="region"
              aria-live="polite"
              hidden={!expanded}
              className="px-3 pb-3 text-sm text-muted-foreground"
            >
              {item.a}
            </div>
          </div>
        );
      })}
    </div>
  );
}
