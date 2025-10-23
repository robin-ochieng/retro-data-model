import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Wizard from '@/pages/wizard/Wizard';

function createStubComponent(name: string) {
  return () => <div data-testid={`${name}-step`}>{`${name} Step`}</div>;
}

vi.mock('@/auth/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com', user_metadata: { full_name: 'Tester' } },
    loading: false,
    signOut: vi.fn(),
  }),
}));

vi.mock('@/components/layout/WizardHeader', () => ({
  WizardHeader: ({ lobDisplayName }: { lobDisplayName: string }) => (
    <div data-testid="wizard-header">{lobDisplayName}</div>
  ),
}));

vi.mock('@/pages/wizard/SubmissionMetaContext', () => ({
  SubmissionMetaProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSubmissionMeta: () => ({
    classOfBusiness: '',
    lineOfBusiness: '',
    isReadOnly: false,
    meta: null,
    updateMeta: vi.fn(),
    refresh: vi.fn(),
    setClassOfBusiness: vi.fn(),
    setLineOfBusiness: vi.fn(),
  }),
}));

const makeFrom = vi.fn((table: string) => ({
  select: vi.fn(() => ({
    eq: vi.fn(() => ({
      maybeSingle: vi.fn(async () => ({ data: { status: 'in_progress' }, error: null })),
    })),
  })),
  update: vi.fn(() => ({
    eq: vi.fn(() => ({ error: null })),
  })),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: makeFrom,
  },
}));

vi.mock('@/lib/generateExcel', () => ({
  generateExcel: vi.fn(async () => ({ ok: true })),
}));

// Property step mocks
vi.mock('@/pages/wizard/steps/StepIntro', () => ({ default: createStubComponent('intro') }));
vi.mock('@/pages/wizard/steps/StepEpiSummary', () => ({ default: createStubComponent('epi-summary') }));
vi.mock('@/pages/wizard/steps/StepTreatyStatsProp', () => ({ default: createStubComponent('treaty-stats-prop') }));
vi.mock('@/pages/wizard/steps/StepLargeLossList', () => ({ default: createStubComponent('large-loss-list') }));
vi.mock('@/pages/wizard/steps/StepSubmit', () => ({ default: createStubComponent('submit') }));
vi.mock('@/pages/wizard/steps/property/StepHeader', () => ({ default: createStubComponent('header') }));
vi.mock('@/pages/wizard/steps/property/StepTreatyStatsNonProp', () => ({ default: createStubComponent('treaty-stats-nonprop') }));
vi.mock('@/pages/wizard/steps/property/StepUwLimit', () => ({ default: createStubComponent('uw-limit') }));
vi.mock('@/pages/wizard/steps/property/StepRiskProfile', () => ({ default: createStubComponent('risk-profile') }));
vi.mock('@/pages/wizard/steps/property/StepCatLossList', () => ({ default: createStubComponent('cat-loss-list') }));
vi.mock('@/pages/wizard/steps/property/StepLargeLossTriangulation', () => ({ default: createStubComponent('large-loss-triangulation') }));
vi.mock('@/pages/wizard/steps/property/StepTriangulation', () => ({ default: createStubComponent('triangulation') }));
vi.mock('@/pages/wizard/steps/property/StepCrestaZoneControl', () => ({ default: createStubComponent('cresta-zone-control') }));
vi.mock('@/pages/wizard/steps/property/StepTop20Risks', () => ({ default: createStubComponent('top-20-risks') }));
vi.mock('@/pages/wizard/steps/property/StepClimateExposure', () => ({ default: createStubComponent('climate-exposure') }));

// Casualty stubs to satisfy imports
vi.mock('@/pages/wizard/steps/casualty/StepHeader', () => ({ default: createStubComponent('cas-header') }));
vi.mock('@/pages/wizard/steps/casualty/StepTreatyStatsProp', () => ({ default: createStubComponent('cas-treaty-prop') }));
vi.mock('@/pages/wizard/steps/casualty/StepTreatyStatsPropCC', () => ({ default: createStubComponent('cas-treaty-propcc') }));
vi.mock('@/pages/wizard/steps/casualty/StepTreatyStatsNonProp', () => ({ default: createStubComponent('cas-treaty-nonprop') }));
vi.mock('@/pages/wizard/steps/casualty/StepRateDevelopment', () => ({ default: createStubComponent('cas-rate-dev') }));
vi.mock('@/pages/wizard/steps/casualty/StepRateDevelopmentMotor', () => ({ default: createStubComponent('cas-rate-dev-motor') }));
vi.mock('@/pages/wizard/steps/casualty/StepMaxUwLimitDevelopment', () => ({ default: createStubComponent('cas-max-uw') }));
vi.mock('@/pages/wizard/steps/casualty/StepNumberOfRisksDevelopment', () => ({ default: createStubComponent('cas-number-risks') }));
vi.mock('@/pages/wizard/steps/casualty/StepRiskProfile', () => ({ default: createStubComponent('cas-risk-profile') }));
vi.mock('@/pages/wizard/steps/casualty/StepLargeLossList', () => ({ default: createStubComponent('cas-large-loss-list') }));
vi.mock('@/pages/wizard/steps/casualty/StepLargeLossTriangulation', () => ({ default: createStubComponent('cas-large-loss-triangulation') }));
vi.mock('@/pages/wizard/steps/casualty/StepAggregateTriangulation', () => ({ default: createStubComponent('cas-aggregate-triangulation') }));
vi.mock('@/pages/wizard/steps/casualty/StepCatLossTriangulation', () => ({ default: createStubComponent('cas-cat-loss-triangulation') }));
vi.mock('@/pages/wizard/steps/casualty/StepMotorFleetList', () => ({ default: createStubComponent('cas-motor-fleet') }));

function supabaseFrom(table: string) {
  return {
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data: { status: 'in_progress' }, error: null }),
      }),
    }),
    update: () => ({
      eq: () => ({ error: null }),
    }),
  };
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: supabaseFrom,
  },
}));

const renderWizardAt = (initialPath: string) =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/wizard/:lob/:submissionId/*" element={<Wizard />} />
      </Routes>
    </MemoryRouter>
  );

describe('Wizard property routing', () => {

  it('redirects legacy triangles slug to the Triangulation step and updates progress', async () => {
    renderWizardAt('/wizard/property/123/triangles-aggregate');

    await waitFor(() => expect(screen.getByTestId('triangulation-step')).toBeInTheDocument());

    const activeLink = screen.getByRole('link', { current: 'page' });
    expect(activeLink).toHaveAttribute('href', '/wizard/property/123/triangulation');
    expect(screen.getByText('Progress: 36%')).toBeInTheDocument();

    const navLabels = screen
      .getAllByRole('link')
      .map((link) => link.textContent?.trim())
      .filter(Boolean);

    expect(navLabels.slice(0, 13)).toEqual([
      'Client Details',
      'EPI Summary',
      'UW Limit',
      'Risk Profile',
      'Triangulation',
      'Treaty Statistics (Prop)',
      'Treaty Statistics (Non-Prop)',
      'Top 20 Risks',
      'Large Loss List',
      'Large Loss Triangulation',
      'Cat Loss List',
      'Cresta Zone Control',
      'Climate change exposure',
    ]);
  });

  it('advances from Risk Profile to Triangulation via the Next button', async () => {
    const user = userEvent.setup();
    renderWizardAt('/wizard/property/123/risk-profile');

    await waitFor(() => expect(screen.getByTestId('risk-profile-step')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => expect(screen.getByTestId('triangulation-step')).toBeInTheDocument());
    const activeLink = screen.getByRole('link', { current: 'page' });
    expect(activeLink).toHaveAttribute('href', '/wizard/property/123/triangulation');
  });
});
