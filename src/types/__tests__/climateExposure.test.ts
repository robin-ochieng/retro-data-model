import { describe, it, expect } from 'vitest';
import { emptyClimateExposureRow, autoFillDerived, validateClimateExposureRow, migrateLegacyClimateExposureRow } from '../climateExposure';

describe('Climate Exposure Model', () => {
  it('validates required fields', () => {
    const row = emptyClimateExposureRow();
    const errs = validateClimateExposureRow(row);
    expect(errs.policy_inception_date).toBe('Required');
    expect(errs.policy_expiry_date).toBe('Required');
    expect(errs.insured).toBe('Required');
  });

  it('enforces expiry >= inception', () => {
    const row = emptyClimateExposureRow();
    row.policy_inception_date = '2025-01-10';
    row.policy_expiry_date = '2025-01-09';
    row.insured = 'Test';
    const errs = validateClimateExposureRow(row);
    expect(errs.policy_expiry_date).toBe('Must be >= inception');
  });

  it('auto-calculates net fields when null', () => {
    const row = emptyClimateExposureRow();
    row.gross_premium = 100;
    row.ceded_prop_reinsurance_premium = 30;
    row.gross_exposure_tsi = 500;
    row.ceded_prop_reinsurance_exposure = 125;
    const auto = autoFillDerived(row);
    expect(auto.net_prop_reinsurance_premium).toBe(70);
    expect(auto.net_inuring_prop_reinsurance_exposure).toBe(375);
  });

  it('migrates legacy row keeping _legacy', () => {
    const migrated = migrateLegacyClimateExposureRow({ region_or_zone: 'Cat', peril: 'Flood', tsi: 1000, premium: 50, notes: 'N' });
    expect(migrated._legacy).toBeDefined();
    expect(migrated.policy_category).toBe('Cat');
    expect(migrated.nature_of_risk).toBe('Flood');
    expect(migrated.gross_exposure_tsi).toBe(1000);
    expect(migrated.gross_premium).toBe(50);
  });
});
