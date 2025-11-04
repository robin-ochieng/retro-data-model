import { describe, it, expect } from 'vitest';
import { getVisibleTabs, isTabVisible, getFirstVisibleTabKey } from '../tabs';
import { TREATY } from '../../constants/treaties';
import type { SheetTab } from '../../config/lobConfig';

// Mock tabs matching the property tabs structure
const MOCK_PROPERTY_TABS: SheetTab[] = [
  { key: 'header', label: 'Client Details', component: 'PropertyHeader' },
  { key: 'epi-summary', label: 'EPI Summary', component: 'EpiSummary' },
  { key: 'uw-limit', label: 'UW Limit', component: 'UwLimit' },
  { key: 'risk-profile', label: 'Risk Profile', component: 'RiskProfile' },
  { key: 'triangulation', label: 'Triangulation', component: 'Triangulation' },
  { key: 'treaty-stats-prop', label: 'Treaty Statistics (Prop)', component: 'TreatyStatsProp' },
  { key: 'treaty-stats-nonprop', label: 'Treaty Statistics (Non-Prop)', component: 'TreatyStatsNonProp' },
  { key: 'top-20-risks', label: 'Top 20 Risks', component: 'Top20Risks' },
  { key: 'large-loss-list', label: 'Large Loss List', component: 'LargeLossList' },
  { key: 'large-loss-triangulation', label: 'Large Loss Triangulation', component: 'LargeLossTriangulation' },
  { key: 'cat-loss-list', label: 'Cat Loss List', component: 'CatLossList' },
  { key: 'cresta-zone-control', label: 'Cresta Zone Control', component: 'CrestaZoneControl' },
  { key: 'climate-exposure', label: 'Climate change exposure', component: 'ClimateExposure' },
  { key: 'submit', label: 'Submit', component: 'Submit' },
];

describe('getVisibleTabs', () => {
  it('shows all tabs when no treaty type is selected', () => {
    const visible = getVisibleTabs(undefined, MOCK_PROPERTY_TABS);
    expect(visible).toHaveLength(MOCK_PROPERTY_TABS.length);
    expect(visible).toEqual(MOCK_PROPERTY_TABS);
  });

  it('Quota Share hides Non-Prop stats only', () => {
    const visible = getVisibleTabs(TREATY.QUOTA_SHARE, MOCK_PROPERTY_TABS);
    expect(visible.find(t => t.key === 'treaty-stats-nonprop')).toBeUndefined();
    expect(visible.find(t => t.key === 'treaty-stats-prop')).toBeDefined();
    expect(visible).toHaveLength(MOCK_PROPERTY_TABS.length - 1);
  });

  it('Surplus hides Non-Prop stats only', () => {
    const visible = getVisibleTabs(TREATY.SURPLUS, MOCK_PROPERTY_TABS);
    expect(visible.find(t => t.key === 'treaty-stats-nonprop')).toBeUndefined();
    expect(visible.find(t => t.key === 'treaty-stats-prop')).toBeDefined();
    expect(visible).toHaveLength(MOCK_PROPERTY_TABS.length - 1);
  });

  it('Facultative Obligatory hides BOTH stats tabs', () => {
    const visible = getVisibleTabs(TREATY.FAC_OBLIG, MOCK_PROPERTY_TABS);
    expect(visible.find(t => t.key === 'treaty-stats-nonprop')).toBeUndefined();
    expect(visible.find(t => t.key === 'treaty-stats-prop')).toBeUndefined();
    expect(visible).toHaveLength(MOCK_PROPERTY_TABS.length - 2);
  });

  it('XL hides Prop stats only', () => {
    const visible = getVisibleTabs(TREATY.XL, MOCK_PROPERTY_TABS);
    expect(visible.find(t => t.key === 'treaty-stats-prop')).toBeUndefined();
    expect(visible.find(t => t.key === 'treaty-stats-nonprop')).toBeDefined();
    expect(visible).toHaveLength(MOCK_PROPERTY_TABS.length - 1);
  });

  it('CAT XOL hides Prop stats only', () => {
    const visible = getVisibleTabs(TREATY.CAT_XOL, MOCK_PROPERTY_TABS);
    expect(visible.find(t => t.key === 'treaty-stats-prop')).toBeUndefined();
    expect(visible.find(t => t.key === 'treaty-stats-nonprop')).toBeDefined();
    expect(visible).toHaveLength(MOCK_PROPERTY_TABS.length - 1);
  });

  it('Stop Loss Treaty hides Prop stats only', () => {
    const visible = getVisibleTabs(TREATY.STOP_LOSS, MOCK_PROPERTY_TABS);
    expect(visible.find(t => t.key === 'treaty-stats-prop')).toBeUndefined();
    expect(visible.find(t => t.key === 'treaty-stats-nonprop')).toBeDefined();
    expect(visible).toHaveLength(MOCK_PROPERTY_TABS.length - 1);
  });

  it('preserves all other tabs regardless of treaty type', () => {
    const visible = getVisibleTabs(TREATY.QUOTA_SHARE, MOCK_PROPERTY_TABS);
    expect(visible.find(t => t.key === 'header')).toBeDefined();
    expect(visible.find(t => t.key === 'epi-summary')).toBeDefined();
    expect(visible.find(t => t.key === 'uw-limit')).toBeDefined();
    expect(visible.find(t => t.key === 'risk-profile')).toBeDefined();
    expect(visible.find(t => t.key === 'triangulation')).toBeDefined();
    expect(visible.find(t => t.key === 'top-20-risks')).toBeDefined();
    expect(visible.find(t => t.key === 'submit')).toBeDefined();
  });
});

describe('isTabVisible', () => {
  it('returns true when current tab is in visible tabs', () => {
    const visible = getVisibleTabs(TREATY.QUOTA_SHARE, MOCK_PROPERTY_TABS);
    expect(isTabVisible('header', visible)).toBe(true);
    expect(isTabVisible('treaty-stats-prop', visible)).toBe(true);
  });

  it('returns false when current tab is hidden', () => {
    const visible = getVisibleTabs(TREATY.QUOTA_SHARE, MOCK_PROPERTY_TABS);
    expect(isTabVisible('treaty-stats-nonprop', visible)).toBe(false);
  });

  it('returns true for undefined tab key', () => {
    const visible = getVisibleTabs(TREATY.QUOTA_SHARE, MOCK_PROPERTY_TABS);
    expect(isTabVisible(undefined, visible)).toBe(true);
  });
});

describe('getFirstVisibleTabKey', () => {
  it('returns the first visible tab key', () => {
    const visible = getVisibleTabs(TREATY.QUOTA_SHARE, MOCK_PROPERTY_TABS);
    expect(getFirstVisibleTabKey(visible)).toBe('header');
  });

  it('returns header as fallback for empty tabs', () => {
    expect(getFirstVisibleTabKey([])).toBe('header');
  });
});
