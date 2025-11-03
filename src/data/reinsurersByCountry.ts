/**
 * Mapping of African countries to their reinsurance companies.
 * Each country includes its local reinsurers plus Africa Re and ZEP-RE as pan-African options.
 */
export const REINSURERS_BY_COUNTRY: Record<string, string[]> = {
  "Algeria": ["Société Centrale de Réassurance (CCR, Algeria)", "African Reinsurance Corporation (Africa Re)", "ZEP-RE (PTA Reinsurance Company)"],
  "Sierra Leone": ["WAICA Reinsurance Corporation PLC", "African Reinsurance Corporation (Africa Re)", "ZEP-RE (PTA Reinsurance Company)"],
  "Togo": ["CICA-RE", "African Reinsurance Corporation (Africa Re)", "ZEP-RE (PTA Reinsurance Company)"],
  "Uganda": ["Uganda Reinsurance Company Limited", "African Reinsurance Corporation (Africa Re)", "ZEP-RE (PTA Reinsurance Company)"],
  "Tanzania": ["Tanzania Reinsurance PLC (Tan-Re)", "Grand Re", "PanAfrique Re", "African Reinsurance Corporation (Africa Re)", "ZEP-RE (PTA Reinsurance Company)"],
  "Ghana": ["Ghana Reinsurance PLC", "Mainstream Reinsurance Company Limited", "African Reinsurance Corporation (Africa Re)", "ZEP-RE (PTA Reinsurance Company)"],
  "Kenya": ["Kenya Reinsurance Corporation", "East Africa Reinsurance Company Ltd (EA Re)", "WAICA Reinsurance (Kenya) Ltd", "Ghana Reinsurance Company (Kenya) Ltd", "African Reinsurance Corporation (Africa Re)", "ZEP-RE (PTA Reinsurance Company)"],
  "Nigeria": ["Continental Reinsurance PLC", "Nigerian Reinsurance Corporation", "African Reinsurance Corporation (Africa Re)", "ZEP-RE (PTA Reinsurance Company)"],
  "Gabon": ["SCG-Ré", "African Reinsurance Corporation (Africa Re)", "ZEP-RE (PTA Reinsurance Company)"],
  "Zimbabwe": ["ZB Reinsurance", "Zimbabwe Reinsurance Corporation (ZIM Re)", "African Reinsurance Corporation (Africa Re)", "ZEP-RE (PTA Reinsurance Company)"],
  "Côte d'Ivoire": ["Aveni Re", "A.R.O Ivory Coast", "African Reinsurance Corporation (Africa Re)", "ZEP-RE (PTA Reinsurance Company)"],
  "Angola": ["ENSA Re SA", "African Reinsurance Corporation (Africa Re)", "ZEP-RE (PTA Reinsurance Company)"],
  "South Africa": ["Gen Re (Africa operations)", "GIC Re South Africa Ltd", "Munich Re (Co. of Africa)", "Swiss Re Africa", "General Re Africa", "African Reinsurance Corporation (Africa Re)", "ZEP-RE (PTA Reinsurance Company)"],
  "Egypt": ["Nile Reinsurance", "Africa Retakaful Company", "Egypt Reinsurance Company", "African Reinsurance Corporation (Africa Re)", "ZEP-RE (PTA Reinsurance Company)"],
  "Madagascar": ["Assurances Réassurances Omnibranches (A.R.O.)", "African Reinsurance Corporation (Africa Re)", "ZEP-RE (PTA Reinsurance Company)"],
  "Morocco": ["SCR Maroc", "African Reinsurance Corporation (Africa Re)", "ZEP-RE (PTA Reinsurance Company)"],
  "Libya": ["Libya Insurance & Reinsurance Corporation", "Libya Reinsurance", "African Reinsurance Corporation (Africa Re)", "ZEP-RE (PTA Reinsurance Company)"],
  "Sudan": ["Sudan Reinsurance Company", "Sheikan Insurance & Reinsurance Company Ltd", "African Reinsurance Corporation (Africa Re)", "ZEP-RE (PTA Reinsurance Company)"],
  "Mauritius": ["Mauritius Reinsurance", "African Reinsurance Corporation (Africa Re)", "ZEP-RE (PTA Reinsurance Company)"],
  "Botswana": ["Botswana Reinsurance", "African Reinsurance Corporation (Africa Re)", "ZEP-RE (PTA Reinsurance Company)"],
  "Namibia": ["Namibia Reinsurance", "African Reinsurance Corporation (Africa Re)", "ZEP-RE (PTA Reinsurance Company)"],
  "Zambia": ["Zambia Reinsurance", "African Reinsurance Corporation (Africa Re)", "ZEP-RE (PTA Reinsurance Company)"],
  "Cameroon": ["Cameroon Reinsurance", "African Reinsurance Corporation (Africa Re)", "ZEP-RE (PTA Reinsurance Company)"],
  "Senegal": ["Société Sénégalaise de Réassurance (SEN-RE)", "African Reinsurance Corporation (Africa Re)", "ZEP-RE (PTA Reinsurance Company)"],
  "Malawi": ["Malawi Reinsurance", "African Reinsurance Corporation (Africa Re)", "ZEP-RE (PTA Reinsurance Company)"],
  "Mozambique": ["Mozambique Reinsurance", "African Reinsurance Corporation (Africa Re)", "ZEP-RE (PTA Reinsurance Company)"],
  "Rwanda": ["Rwanda Reinsurance", "African Reinsurance Corporation (Africa Re)", "ZEP-RE (PTA Reinsurance Company)"],
  "Burundi": ["Burundi Reinsurance", "African Reinsurance Corporation (Africa Re)", "ZEP-RE (PTA Reinsurance Company)"],
  "Ethiopia": ["Ethiopia Reinsurance", "African Reinsurance Corporation (Africa Re)", "ZEP-RE (PTA Reinsurance Company)"],
  "Congo": ["Congo Reinsurance", "African Reinsurance Corporation (Africa Re)", "ZEP-RE (PTA Reinsurance Company)"]
};

export const DEFAULT_CLIENT = "ZEP-RE (PTA Reinsurance Company)";

/**
 * Get sorted list of countries (A-Z, accent-aware)
 */
export function getCountries(): string[] {
  return Object.keys(REINSURERS_BY_COUNTRY)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

/**
 * Get reinsurers for a given country, or empty array if country not found
 */
export function getReinsurersForCountry(country: string): string[] {
  return REINSURERS_BY_COUNTRY[country] ?? [];
}
