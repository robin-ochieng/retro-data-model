/**
 * List of preset client options for submission details.
 * These represent reinsurers and insurance companies across Africa.
 */
export const CLIENT_OPTIONS = [
  // Reinsurers
  "ZEP-RE (PTA Reinsurance Company)",
  "Kenya Reinsurance Corporation",
  "East Africa Reinsurance Company Limited",
  "Continental Reinsurance (Kenya) Limited",
  "WAICA Reinsurance (Kenya) Ltd",
  
  // Insurance Companies (Kenya)
  "AAR Insurance Company Limited",
  "Africa Merchant Assurance Company Limited",
  "AIG Kenya Insurance Company Limited",
  "APA Insurance Kenya Limited",
  "Best Doctors Insurance",
  "Britam General Insurance Company Limited",
  "CIC General Insurance Company Limited",
  "Corporate Insurance Company Limited",
  "Equity Life Assurance (Kenya)",
  "Fidelity Shield Insurance Company Limited",
  "First Assurance Company Limited",
  "GA Insurance Limited",
  "Geminia Insurance Company Limited",
  "Heritage Insurance Company Limited",
  "ICEA Lion General Insurance Company Limited",
  "Intra Africa Assurance Company Limited",
  "Invesco Assurance Company Limited",
  "Jubilee Allianz General Insurance Limited",
  "Kenindia Assurance Company Limited",
  "Kenya Orient Insurance Limited",
  "Madison General Insurance Kenya Limited",
  "Mayfair Insurance Company Limited",
  "MUA Insurance (Kenya) Limited",
  "Occidental Insurance Company Limited",
  "Old Mutual General Insurance Kenya Limited",
  "Pacis Insurance Company Limited",
  "Pioneer General Insurance Limited",
  "Resolution Insurance (Kenya) Limited",
  "Sanlam General Insurance Company Limited",
  "Star Discover Insurance Limited",
  "Takaful Insurance of Africa Limited",
  "Tausi Assurance Company Limited",
  "The Kenyan Alliance Insurance Company Limited",
  "The Monarch Insurance Company Limited",
  "Trident Insurance Company Limited",
] as const;

export type ClientOption = typeof CLIENT_OPTIONS[number];
