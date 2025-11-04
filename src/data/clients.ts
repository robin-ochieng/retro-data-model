/**
 * List of preset client options for submission details.
 * These represent African reinsurers only.
 */
export const CLIENT_OPTIONS = [
  // --- Default stays first ---
  "ZEP-RE (PTA Reinsurance Company)",

  // A
  "African Reinsurance Corporation (Africa Re)",
  "Africa Retakaful Company",
  "Allianz Re",
  "A.R.O Ivory Coast",
  "A.R.O. Madagascar",
  "Aveni Re",

  // B
  "Botswana Reinsurance Company",
  "Burundi Reinsurance",

  // C
  "Cameroon Reinsurance",
  "CICA-RE",
  "Congo Reinsurance",
  "Congo Reinsurance Company (Congo Re)",
  "Continental Reinsurance PLC",
  "Custodian Reinsurance",

  // D
  "DRC – Société Congolaise de Réassurance (SOCOR)",

  // E
  "East Africa Reinsurance Company (EA Re)",
  "Egypt Re",
  "Egypt Reinsurance Company",
  "Egyptian Saudi Reinsurance Co. (ESR)",
  "Empresa Moçambicana de Resseguros (EMOSE Re)",
  "ENSA Re SA",
  "Eswatini – African Re (Market Presence)",
  "Ethiopian Reinsurance S.C. (Ethiopian Re)",

  // G
  "Gabon – Société de Réassurance du Gabon (SCG-Ré)",
  "Gambia – WAICA Re (Market Presence)",
  "Gen Re (Africa Operations)",
  "General Re Africa",
  "Ghana Reinsurance PLC",
  "Ghana Reinsurance Company (Kenya) Ltd",
  "GIC Re South Africa Ltd",
  "Grand Re",

  // H
  "Hannover Reinsurance Africa Ltd",

  // K
  "Kenya Reinsurance Corporation",

  // L
  "Leadway Reinsurance",
  "Lesotho – African Re (Market Presence)",
  "Libya Insurance Company",
  "Libya Insurance & Reinsurance Corporation",
  "Libya Reinsurance",

  // M
  "Madagascar – Assurances Réassurances Omnibranches (A.R.O.)",
  "Malawi Reinsurance Company Ltd (Malawi Re)",
  "Mainstream Reinsurance Company Limited",
  "Mauritius Reinsurance Company Ltd (Mauritius Re)",
  "Misr Reinsurance Company",
  "Mozambique Reinsurance",
  "Munich Re (Co. of Africa)",
  "Muca Re",

  // N
  "Namibia National Reinsurance Corporation (Namibia Re)",
  "Namibia Reinsurance",
  "Nigerian Reinsurance Corporation",
  "Nile Reinsurance",

  // P
  "PanAfrique Re",
  "PartnerRe",
  "Phoenix Reinsurance Zambia Ltd",

  // R
  "Rwanda Reinsurance Company (Rwanda Re)",

  // S
  "SCG-Ré",
  "SCOR Africa",
  "SCR Maroc",
  "Seychelles – African Re (Market Presence)",
  "Sheikan Insurance & Reinsurance Company Ltd",
  "Société Béninoise de Réassurance (SBR) – Benin",
  "Société Burkinabé de Réassurance (SBR) – Burkina Faso",
  "Société Camerounaise de Réassurance (SOCAR)",
  "Société Centrale de Réassurance (CCR, Algeria)",
  "Société Centrale de Réassurance (SCR) – Morocco",
  "Société Guinéenne de Réassurance (SOGUIR) – Guinea",
  "Société Nigérienne de Réassurance (SNR) – Niger",
  "Société Sénégalaise de Réassurance (SEN-RE)",
  "Société Tchadienne de Réassurance (STAR)",
  "South Sudan – African Re (Market Presence)",
  "Sudan Reinsurance Company",
  "Sudanese Reinsurance Company (SRC)",
  "Swiss Re Africa",

  // T
  "Tanzania Reinsurance PLC (Tan-Re)",
  "Tanzania Reinsurance Company (TAN-RE)",
  "Trans Axis Re",
  "Tunis Re",

  // U
  "Uganda Reinsurance Company Ltd (Uganda Re)",

  // W
  "WAICA Reinsurance (Kenya) Ltd",
  "WAICA Reinsurance Corporation PLC",

  // Z
  "Zambia Reinsurance",
  "Zambia Reinsurance Corporation Ltd (Zambia Re)",
  "ZB Reinsurance",
  "Zimbabwe Reinsurance Corporation (ZIM Re)",

] as const;


export type ClientOption = typeof CLIENT_OPTIONS[number];

export const DEFAULT_CLIENT: ClientOption = "ZEP-RE (PTA Reinsurance Company)";
