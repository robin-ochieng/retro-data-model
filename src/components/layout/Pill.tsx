import React from 'react';
import { Layers, Briefcase, LucideIcon } from 'lucide-react';

interface PillProps {
  children: React.ReactNode;
  icon?: 'layers' | 'briefcase' | LucideIcon;
  title?: string;
  className?: string;
}

export function Pill({ children, icon, title, className = '' }: PillProps) {
  const IconComponent = 
    icon === 'layers' ? Layers :
    icon === 'briefcase' ? Briefcase :
    typeof icon === 'function' ? icon :
    null;

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 px-3 py-1 text-xs text-gray-700 dark:text-gray-200 ${className}`}
      title={title}
    >
      {IconComponent && <IconComponent className="w-3 h-3" aria-hidden="true" />}
      <span className="truncate max-w-[200px]">{children}</span>
    </div>
  );
}
