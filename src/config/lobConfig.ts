export type LobKey = 'property' | 'casualty';

export type SheetComponentKey =
  | 'EpiSummary'
  | 'TreatyStatsProp'
  | 'LargeLossList'
  | 'Placeholder'
  | 'Submit'
  | 'PropertyHeader'
  | 'TreatyStatsNonProp';

export type SheetTab = {
  key: string; // url-friendly key
  label: string; // display label (matches Excel sheet where possible)
  table?: string; // supabase table name if persisted
  component: SheetComponentKey; // which React component to render
};

export const propertyTabs: SheetTab[] = [
  { key: 'header', label: 'Header', component: 'PropertyHeader' },
  { key: 'epi-summary', label: 'EPI Summary', table: 'epi_summary', component: 'EpiSummary' },
  { key: 'treaty-stats-prop', label: 'Treaty Statistics (Prop)', table: 'treaty_stats_prop', component: 'TreatyStatsProp' },
  { key: 'treaty-stats-nonprop', label: 'Treaty Statistics (Non-Prop)', component: 'TreatyStatsNonProp' },
  { key: 'risk-profile', label: 'Risk Profile', component: 'Placeholder' },
  { key: 'large-loss-list', label: 'Large Loss List', table: 'large_loss_list', component: 'LargeLossList' },
  { key: 'cat-loss-list', label: 'Cat Loss List', component: 'Placeholder' },
  { key: 'triangulation', label: 'Triangulation', component: 'Placeholder' },
  { key: 'submit', label: 'Submit', component: 'Submit' },
];

export const casualtyTabs: SheetTab[] = [
  { key: 'data-requirements', label: 'Data Requirements', component: 'Placeholder' },
  { key: 'epi-summary', label: 'EPI Summary', table: 'epi_summary', component: 'EpiSummary' },
  { key: 'treaty-statistics-prop', label: 'Treaty Statistics (Prop)', table: 'treaty_stats_prop', component: 'TreatyStatsProp' },
  { key: 'treaty-statistics-propcc', label: 'Treaty Statistics (PropCC)', component: 'Placeholder' },
  { key: 'rate-development', label: 'Rate Development', component: 'Placeholder' },
  { key: 'motor-rate-development', label: 'Motor Rate Development', component: 'Placeholder' },
  { key: 'max-uw-limit-dev', label: 'Max UW Limit Dev', component: 'Placeholder' },
  { key: 'number-of-risks-dev', label: 'Number of Risks Dev', component: 'Placeholder' },
  { key: 'risk-profile', label: 'Risk Profile', component: 'Placeholder' },
  { key: 'large-loss-list', label: 'Large Loss List', table: 'large_loss_list', component: 'LargeLossList' },
  { key: 'aggregate-triangulation', label: 'Aggregate Triangulation', component: 'Placeholder' },
  { key: 'cat-loss-triangulation', label: 'CAT Loss Triangulation', component: 'Placeholder' },
  { key: 'motor-fleet-list', label: 'Motor Fleet List', component: 'Placeholder' },
  { key: 'submit', label: 'Submit', component: 'Submit' },
];

export function getTabsForLob(lob: LobKey): SheetTab[] {
  return lob === 'property' ? propertyTabs : casualtyTabs;
}

export function getFirstTabKey(lob: LobKey): string {
  const tabs = getTabsForLob(lob);
  return tabs[0]?.key ?? 'epi-summary';
}

export function getTabIndex(tabs: SheetTab[], key?: string): number {
  if (!key) return 0;
  return Math.max(0, tabs.findIndex(t => t.key === key));
}
