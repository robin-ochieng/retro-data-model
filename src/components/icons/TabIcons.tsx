import React from 'react';
import {
  IdCard,
  User,
  BarChart2,
  TrendingUp,
  SlidersHorizontal,
  AlertTriangle,
  CloudLightning,
  ActivitySquare,
  Trophy,
  Paperclip,
  Layers3,
  Table,
  SquareStack,
  ListChecks,
  CircleDollarSign,
} from 'lucide-react';

// Map wizard tab keys to Lucide icons.
// Keys are kept stable and shared where possible across LoBs.
export const TAB_ICONS: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  // Shared
  header: IdCard,
  'epi-summary': BarChart2,
  'treaty-stats-prop': TrendingUp,
  'treaty-stats-nonprop': TrendingUp,
  'treaty-statistics-prop': TrendingUp,
  'treaty-statistics-propcc': TrendingUp,
  'treaty-statistics-nonprop': TrendingUp,
  'risk-profile': SlidersHorizontal,
  'top-20-risks': Trophy,
  'large-loss-list': AlertTriangle,
  'large-loss-triangulation': ActivitySquare,
  'cat-loss-list': CloudLightning,
  'cat-loss-triangulation': CloudLightning,
  triangulation: Layers3,
  'cresta-zone-control': Table,
  submit: Paperclip,
  'climate-exposure': SunIcon,
  'uw-limit': SquareStack,
  'aggregate-triangulation': Layers3,
  'motor-fleet-list': ListChecks,
  'rate-development': TrendingUp,
  'motor-rate-development': TrendingUp,
  'max-uw-limit-dev': SquareStack,
  'number-of-risks-dev': ListChecks,
};

// Minimal inline Sun icon to avoid pulling another package
function SunIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

export function renderTabIcon(key: string) {
  const Icon = TAB_ICONS[key];
  if (!Icon) return null;
  return (
    <Icon
      className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-aria-[selected=true]:text-primary"
      aria-hidden="true"
      focusable="false"
    />
  );
}
