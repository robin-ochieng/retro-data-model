import { describe, expect, it } from 'vitest';
import { propertyTabs, getTabIndex, getTabsForLob } from '@/config/lobConfig';

const EXPECTED_PROPERTY_KEYS = [
  'header',
  'epi-summary',
  'uw-limit',
  'risk-profile',
  'triangulation',
  'treaty-stats-prop',
  'treaty-stats-nonprop',
  'top-20-risks',
  'large-loss-list',
  'large-loss-triangulation',
  'cat-loss-list',
  'cresta-zone-control',
  'climate-exposure',
  'submit',
] as const;

describe('property tab ordering', () => {
  it('matches the required 13-step sequence with submit preserved last', () => {
    expect(propertyTabs.map((tab) => tab.key)).toEqual(EXPECTED_PROPERTY_KEYS);
  });

  it('exposes the same ordering via getTabsForLob', () => {
    const keysFromGetter = getTabsForLob('property').map((tab) => tab.key);
    expect(keysFromGetter).toEqual(EXPECTED_PROPERTY_KEYS);
  });

  it('positions Triangulation immediately after Risk Profile', () => {
    const triIndex = getTabIndex(propertyTabs, 'triangulation');
    expect(triIndex).toBe(4);
    expect(propertyTabs[triIndex - 1]?.key).toBe('risk-profile');
  });
});
