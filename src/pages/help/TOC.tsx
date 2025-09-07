import React from 'react';

export type TocItem = { id: string; text: string; level: 2 | 3 };

export default function TOC({ items, activeId }: { items: TocItem[]; activeId?: string }) {
  return (
    <nav aria-label="Table of contents" className="text-sm text-muted-foreground md:sticky md:top-20">
      <div className="font-medium text-foreground mb-2">On this page</div>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id} className={item.level === 3 ? 'pl-3' : ''}>
            <a
              href={`#${item.id}`}
              className={`block border-l-2 pl-2 rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${activeId === item.id ? 'text-foreground border-primary' : 'border-transparent'}`}
              aria-current={activeId === item.id ? 'true' : undefined}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
