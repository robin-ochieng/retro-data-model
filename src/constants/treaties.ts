/**
 * Treaty type constants for conditional tab visibility
 */
export const TREATY = {
  QUOTA_SHARE: 'Quota Share Treaty',
  SURPLUS: 'Surplus Treaty',
  FAC_OBLIG: 'Facultative Obligatory',
  XL: 'Excess of Loss (XL) Treaty',
  CAT_XOL: 'CAT XOL (Catastrophe XL)',
  STOP_LOSS: 'Stop Loss Treaty',
} as const;

export type TreatyType = typeof TREATY[keyof typeof TREATY];

/**
 * Treaty types that should show Prop stats (hide Non-Prop)
 */
export const PROP_TREATIES: readonly string[] = [
  TREATY.QUOTA_SHARE,
  TREATY.SURPLUS,
] as const;

/**
 * Treaty types that should show Non-Prop stats (hide Prop)
 */
export const NONPROP_TREATIES: readonly string[] = [
  TREATY.CAT_XOL,
  TREATY.XL,
  TREATY.STOP_LOSS,
] as const;
