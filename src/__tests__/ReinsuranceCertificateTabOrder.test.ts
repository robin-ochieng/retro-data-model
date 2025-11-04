import { describe, it, expect } from 'vitest';
import { propertyTabs, casualtyTabs } from '../config/lobConfig';

describe('Reinsurance Certificate Tab Position', () => {
  it('should appear directly before Submit tab in property tabs', () => {
    const reinsuranceCertIndex = propertyTabs.findIndex(t => t.key === 'reinsurance-certificate');
    const submitIndex = propertyTabs.findIndex(t => t.key === 'submit');

    expect(reinsuranceCertIndex).toBeGreaterThan(-1);
    expect(submitIndex).toBeGreaterThan(-1);
    expect(reinsuranceCertIndex).toBe(submitIndex - 1);
  });

  it('should appear directly before Submit tab in casualty tabs', () => {
    const reinsuranceCertIndex = casualtyTabs.findIndex(t => t.key === 'reinsurance-certificate');
    const submitIndex = casualtyTabs.findIndex(t => t.key === 'submit');

    expect(reinsuranceCertIndex).toBeGreaterThan(-1);
    expect(submitIndex).toBeGreaterThan(-1);
    expect(reinsuranceCertIndex).toBe(submitIndex - 1);
  });

  it('should have correct label', () => {
    const propertyTab = propertyTabs.find(t => t.key === 'reinsurance-certificate');
    const casualtyTab = casualtyTabs.find(t => t.key === 'reinsurance-certificate');

    expect(propertyTab?.label).toBe('Reinsurance Certificate');
    expect(casualtyTab?.label).toBe('Reinsurance Certificate');
  });

  it('should have correct component mapping', () => {
    const propertyTab = propertyTabs.find(t => t.key === 'reinsurance-certificate');
    const casualtyTab = casualtyTabs.find(t => t.key === 'reinsurance-certificate');

    expect(propertyTab?.component).toBe('ReinsuranceCertificate');
    expect(casualtyTab?.component).toBe('ReinsuranceCertificate');
  });
});
