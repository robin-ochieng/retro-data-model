import { SheetTab } from '../config/lobConfig';
import { PROP_TREATIES, NONPROP_TREATIES } from '../constants/treaties';

/**
 * Filters tabs based on treaty type to conditionally show/hide Treaty Statistics tabs.
 * 
 * Rules:
 * - Quota Share or Surplus → hide "Treaty Statistics (Non-Prop)"
 * - CAT XOL, XL, or Stop Loss → hide "Treaty Statistics (Prop)"
 * - Facultative Obligatory → shows BOTH stats tabs (no hiding)
 * 
 * @param treatyType - The selected treaty type from Client Details
 * @param allTabs - The full list of tabs for the current LOB
 * @returns Filtered list of visible tabs
 */
export function getVisibleTabs(treatyType: string | undefined, allTabs: SheetTab[]): SheetTab[] {
  if (!treatyType) {
    // No treaty type selected yet, show all tabs
    return allTabs;
  }

  const hiddenTabKeys = new Set<string>();

  // Prop group → hide Non-Prop stats
  if (PROP_TREATIES.includes(treatyType)) {
    hiddenTabKeys.add('treaty-stats-nonprop');
    // For casualty
    hiddenTabKeys.add('treaty-statistics-nonprop');
  }

  // Non-Prop group → hide Prop stats
  if (NONPROP_TREATIES.includes(treatyType)) {
    hiddenTabKeys.add('treaty-stats-prop');
    // For casualty
    hiddenTabKeys.add('treaty-statistics-prop');
  }

  return allTabs.filter(tab => !hiddenTabKeys.has(tab.key));
}

/**
 * Checks if the current tab key is visible in the filtered tabs list.
 * 
 * @param currentTabKey - The current active tab key
 * @param visibleTabs - The filtered list of visible tabs
 * @returns true if the current tab is visible, false otherwise
 */
export function isTabVisible(currentTabKey: string | undefined, visibleTabs: SheetTab[]): boolean {
  if (!currentTabKey) return true;
  return visibleTabs.some(tab => tab.key === currentTabKey);
}

/**
 * Gets the first visible tab key, used for auto-navigation when current tab becomes hidden.
 * 
 * @param visibleTabs - The filtered list of visible tabs
 * @returns The key of the first visible tab, or 'header' as fallback
 */
export function getFirstVisibleTabKey(visibleTabs: SheetTab[]): string {
  return visibleTabs[0]?.key ?? 'header';
}
