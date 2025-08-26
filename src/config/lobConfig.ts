export type LobKey = 'property' | 'casualty';

export type SheetComponentKey =
  | 'EpiSummary'
  | 'TreatyStatsProp'
  | 'LargeLossList'
  | 'Placeholder'
  | 'Submit'
  | 'PropertyHeader'
  | 'TreatyStatsNonProp'
  | 'UwLimit'
  | 'RiskProfile'
  | 'CatLossList'
  | 'LargeLossTriangulation'
  | 'Triangulation'
  | 'CrestaZoneControl'
  | 'Top20Risks'
  | 'ClimateExposure'
  // Casualty-specific components
  | 'CasualtyTreatyStatsProp'
  | 'CasualtyTreatyStatsPropCC'
  | 'CasualtyTreatyStatsNonProp'
  | 'CasualtyRateDevelopment'
  | 'CasualtyRateDevelopmentMotor'
  | 'CasualtyMaxUwLimitDev'
  | 'CasualtyNumberOfRisksDev'
  | 'CasualtyRiskProfile'
  | 'CasualtyLargeLossList'
  | 'CasualtyLargeLossTriangulation'
  | 'CasualtyAggregateTriangulation'
  | 'CasualtyCatLossTriangulation'
  | 'CasualtyMotorFleetList';

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
  { key: 'uw-limit', label: 'UW Limit', component: 'UwLimit' },
  { key: 'risk-profile', label: 'Risk Profile', component: 'RiskProfile' },
  { key: 'large-loss-list', label: 'Large Loss List', table: 'large_loss_list', component: 'LargeLossList' },
  { key: 'cat-loss-list', label: 'Cat Loss List', component: 'CatLossList' },
  // Newly added Property tabs (order for left nav)
  { key: 'large-loss-triangulation', label: 'Large Loss Triangulation', component: 'LargeLossTriangulation' },
  { key: 'triangulation', label: 'Triangulation', component: 'Triangulation' },
  { key: 'cresta-zone-control', label: 'Cresta Zone Control', component: 'CrestaZoneControl' },
  { key: 'top-20-risks', label: 'Top 20 Risks', component: 'Top20Risks' },
  { key: 'climate-exposure', label: 'Climate change exposure', component: 'ClimateExposure' },
  { key: 'submit', label: 'Submit', component: 'Submit' },
];

export const casualtyTabs: SheetTab[] = [
  { key: 'header', label: 'Header', component: 'PropertyHeader' },
  { key: 'epi-summary', label: 'EPI Summary', table: 'epi_summary', component: 'EpiSummary' },
  { key: 'treaty-statistics-prop', label: 'Treaty Statistics (Prop)', component: 'CasualtyTreatyStatsProp' },
  { key: 'treaty-statistics-propcc', label: 'Treaty Statistics (PropCC)', component: 'CasualtyTreatyStatsPropCC' },
  { key: 'treaty-statistics-nonprop', label: 'Treaty Statistics (Non-Prop)', component: 'CasualtyTreatyStatsNonProp' },
  { key: 'rate-development', label: 'Rate Development', component: 'CasualtyRateDevelopment' },
  { key: 'motor-rate-development', label: 'Rate Development (Motor Specific)', component: 'CasualtyRateDevelopmentMotor' },
  { key: 'max-uw-limit-dev', label: 'Max UW Limit Development', component: 'CasualtyMaxUwLimitDev' },
  { key: 'number-of-risks-dev', label: 'Number of Risks Development', component: 'CasualtyNumberOfRisksDev' },
  { key: 'risk-profile', label: 'Risk Profile', component: 'CasualtyRiskProfile' },
  { key: 'large-loss-list', label: 'Large Loss List', table: 'large_loss_list', component: 'CasualtyLargeLossList' },
  { key: 'large-loss-triangulation', label: 'Large Loss Triangulation', component: 'CasualtyLargeLossTriangulation' },
  { key: 'aggregate-triangulation', label: 'Aggregate Triangulation', component: 'CasualtyAggregateTriangulation' },
  { key: 'cat-loss-triangulation', label: 'CAT Loss Triangulation', component: 'CasualtyCatLossTriangulation' },
  // Newly requested tabs in this order: Cresta Zone Control, Top 20 Risks, Motor Fleet List
  { key: 'cresta-zone-control', label: 'Cresta Zone Control', component: 'CrestaZoneControl' },
  { key: 'top-20-risks', label: 'Top 20 Risks', component: 'Top20Risks' },
  { key: 'motor-fleet-list', label: 'Motor Fleet List', component: 'CasualtyMotorFleetList' },
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
