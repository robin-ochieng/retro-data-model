import React, { useMemo } from 'react';
import { useParams, NavLink, Outlet, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ProtectedRoute } from '../../auth/ProtectedRoute';
import StepIntro from './steps/StepIntro';
import StepEpiSummary from './steps/StepEpiSummary';
import { WizardHeader } from '../../components/layout/WizardHeader';
import { useAuth } from '../../auth/AuthContext';
import { casualtyTabs, getFirstTabKey, getTabIndex, getTabsForLob, LobKey, propertyTabs, SheetTab } from '../../config/lobConfig';
import StepTreatyStatsProp from './steps/StepTreatyStatsProp';
import StepLargeLossList from './steps/StepLargeLossList';
import CasualtyLargeLossList from './steps/casualty/StepLargeLossList';
import StepSubmit from './steps/StepSubmit';
import { supabase } from '../../lib/supabase';
import { generateExcel } from '../../lib/generateExcel';
import StepHeader from './steps/property/StepHeader';
import CasualtyStepHeader from './steps/casualty/StepHeader';
import CasualtyTreatyStatsProp from './steps/casualty/StepTreatyStatsProp';
import CasualtyTreatyStatsPropCC from './steps/casualty/StepTreatyStatsPropCC';
import CasualtyTreatyStatsNonProp from './steps/casualty/StepTreatyStatsNonProp';
import StepRateDevelopment from './steps/casualty/StepRateDevelopment';
import StepRateDevelopmentMotor from './steps/casualty/StepRateDevelopmentMotor';
import StepMaxUwLimitDevelopment from './steps/casualty/StepMaxUwLimitDevelopment';
import StepNumberOfRisksDevelopment from './steps/casualty/StepNumberOfRisksDevelopment';
import StepTreatyStatsNonProp from './steps/property/StepTreatyStatsNonProp';
import StepUwLimit from './steps/property/StepUwLimit';
import StepRiskProfile from './steps/property/StepRiskProfile';
import CasualtyRiskProfile from './steps/casualty/StepRiskProfile';
import StepCatLossList from './steps/property/StepCatLossList';
import StepLargeLossTriangulation from './steps/property/StepLargeLossTriangulation';
import StepTriangulation from './steps/property/StepTriangulation';
import StepCrestaZoneControl from './steps/property/StepCrestaZoneControl';
import StepTop20Risks from './steps/property/StepTop20Risks';
import StepClimateExposure from './steps/property/StepClimateExposure';
import CasualtyLargeLossTriangulation from './steps/casualty/StepLargeLossTriangulation';
import CasualtyAggregateTriangulation from './steps/casualty/StepAggregateTriangulation';
import CasualtyCatLossTriangulation from './steps/casualty/StepCatLossTriangulation';
import CasualtyMotorFleetList from './steps/casualty/StepMotorFleetList';
import { SubmissionMetaProvider, useSubmissionMeta } from './SubmissionMetaContext';
import { TAB_ICONS } from '../../components/icons/TabIcons';

export default function Wizard() {
  return (
    <ProtectedRoute>
      <WizardShell />
    </ProtectedRoute>
  );
}

function WizardShell() {
  const { lob, submissionId, '*': rest } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  if (!submissionId) return null;

  const normalizedLob = (lob?.toLowerCase() as LobKey) ?? 'property';
  const tabs = useMemo<SheetTab[]>(() => getTabsForLob(normalizedLob), [normalizedLob]);
  const basePath = `/wizard/${normalizedLob}/${submissionId}`;

  // Determine tabKey from the trailing path segment
  const pathSegments = (rest ?? '').split('/').filter(Boolean);
  const tabKey = pathSegments[0];
  const currentIndex = useMemo(() => getTabIndex(tabs, tabKey), [tabs, tabKey]);

  // If no tabKey, redirect to first tab
  if (!tabKey) {
    const first = getFirstTabKey(normalizedLob);
    return <Navigate to={`${basePath}/${first}`} replace />;
  }

  const onNext = () => {
    const next = currentIndex + 1;
    if (next < tabs.length) {
  const t = tabs[next];
  if (t) navigate(`${basePath}/${t.key}`, { replace: false });
    }
  };
  const onPrev = () => {
    const prev = currentIndex - 1;
    if (prev >= 0) {
  const t = tabs[prev];
  if (t) navigate(`${basePath}/${t.key}`, { replace: false });
    }
  };

  const progressPct = Math.round(((currentIndex + 1) / tabs.length) * 100);

  async function onSubmitFinal() {
    if (!submissionId) return;
    const upd = await supabase.from('submissions').update({ status: 'submitted' }).eq('id', submissionId);
    if (upd.error) {
      alert(`Error: ${upd.error.message}`);
      return;
    }
    const res = await generateExcel(submissionId);
    alert(res.ok ? 'Generation triggered (stub).' : 'Generation failed (stub).');
  }

  return (
    <SubmissionMetaProvider submissionId={submissionId}>
      <WizardContent 
        normalizedLob={normalizedLob}
        submissionId={submissionId}
        tabs={tabs}
        basePath={basePath}
        currentIndex={currentIndex}
        progressPct={progressPct}
        onNext={onNext}
        onPrev={onPrev}
        onSubmitFinal={onSubmitFinal}
        user={user}
        signOut={signOut}
      />
    </SubmissionMetaProvider>
  );
}

function WizardContent({ 
  normalizedLob, 
  submissionId, 
  tabs, 
  basePath, 
  currentIndex, 
  progressPct,
  onNext,
  onPrev,
  onSubmitFinal,
  user,
  signOut
}: {
  normalizedLob: LobKey;
  submissionId: string;
  tabs: SheetTab[];
  basePath: string;
  currentIndex: number;
  progressPct: number;
  onNext: () => void;
  onPrev: () => void;
  onSubmitFinal: () => Promise<void>;
  user: any;
  signOut: () => void;
}) {
  const { classOfBusiness, lineOfBusiness, isReadOnly } = useSubmissionMeta();
  
  // Fetch submission status from context or default to 'in_progress'
  const [submissionStatus, setSubmissionStatus] = React.useState<string>('in_progress');
  
  React.useEffect(() => {
    async function fetchStatus() {
      if (!submissionId) return;
      const { data } = await supabase
        .from('submissions')
        .select('status')
        .eq('id', submissionId)
        .maybeSingle();
      if (data?.status) {
        setSubmissionStatus(data.status);
      }
    }
    fetchStatus();
  }, [submissionId]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <WizardHeader
        submissionId={submissionId}
        status={submissionStatus}
        classOfBusiness={classOfBusiness}
        lineOfBusiness={lineOfBusiness}
        lobDisplayName={normalizedLob === 'property' ? 'Property' : 'Casualty'}
        userEmail={user?.email}
        userFullName={(user?.user_metadata as any)?.full_name}
        onSignOut={signOut}
      />

      {/* Read-only banner */}
      {isReadOnly && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Viewing Submitted Submission (Read-Only Mode)
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  This submission has been submitted and cannot be edited. All inputs are disabled.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)] gap-6">
        {/* Left tabs */}
        <aside className="md:sticky md:top-20 self-start">
          <nav className="flex md:block gap-2 overflow-x-auto pb-2 md:pb-0">
      {tabs.map((t) => (
              <NavLink
                key={t.key}
        to={`${basePath}/${t.key}`}
                className={({ isActive }) =>
                  `group px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap mr-1 md:mr-0 block ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                  }`
                }
              >
                {({ isActive }) => {
                  const Icon = TAB_ICONS[t.key];
                  return (
                    <span className="inline-flex items-center gap-2">
                      {Icon ? (
                        <Icon
                          className={`h-4 w-4 text-muted-foreground group-hover:text-foreground ${isActive ? 'text-primary' : ''}`}
                          aria-hidden="true"
                          focusable="false"
                        />
                      ) : null}
                      <span>{t.label}</span>
                    </span>
                  );
                }}
              </NavLink>
            ))}
          </nav>
          <div className="mt-4 text-xs text-gray-500">Progress: {progressPct}%</div>
          <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded mt-1">
            <div className="h-1 bg-blue-600 rounded" style={{ width: `${progressPct}%` }} />
          </div>
        </aside>

        {/* Content */}
        <section className="bg-white dark:bg-gray-800 rounded shadow p-4 sm:p-6">
          <Routes>
            {/* Keep an Intro route for now */}
            <Route path="intro" element={<StepIntro />} />
            {tabs.map((t) => (
              <Route
                key={t.key}
                path={t.key}
                element={
                  t.component === 'PropertyHeader' ? (
                    <StepHeader />
                  ) : t.component === 'EpiSummary' ? (
                    <StepEpiSummary />
                  ) : t.component === 'TreatyStatsProp' ? (
                    <StepTreatyStatsProp />
                  ) : t.component === 'TreatyStatsNonProp' ? (
                    <StepTreatyStatsNonProp />
                  ) : t.component === 'UwLimit' ? (
                    <StepUwLimit />
                  ) : t.component === 'RiskProfile' ? (
                    <StepRiskProfile />
                  ) : t.component === 'CasualtyRiskProfile' ? (
                    <CasualtyRiskProfile />
                  ) : t.component === 'LargeLossList' ? (
                    <StepLargeLossList />
                  ) : t.component === 'CasualtyLargeLossList' ? (
                    <CasualtyLargeLossList />
                  ) : t.component === 'CasualtyLargeLossTriangulation' ? (
                    <CasualtyLargeLossTriangulation />
                  ) : t.component === 'CasualtyAggregateTriangulation' ? (
                    <CasualtyAggregateTriangulation />
                  ) : t.component === 'CasualtyCatLossTriangulation' ? (
                    <CasualtyCatLossTriangulation />
                  ) : t.component === 'CasualtyMotorFleetList' ? (
                    <CasualtyMotorFleetList />
                  ) : t.component === 'CatLossList' ? (
                    <StepCatLossList />
                  ) : t.component === 'LargeLossTriangulation' ? (
                    <StepLargeLossTriangulation />
                  ) : t.component === 'Triangulation' ? (
                    <StepTriangulation />
                  ) : t.component === 'CrestaZoneControl' ? (
                    <StepCrestaZoneControl />
                  ) : t.component === 'Top20Risks' ? (
                    <StepTop20Risks />
                  ) : t.component === 'ClimateExposure' ? (
                    <StepClimateExposure />
                  ) : t.component === 'CasualtyTreatyStatsProp' ? (
                    <CasualtyTreatyStatsProp />
                  ) : t.component === 'CasualtyTreatyStatsPropCC' ? (
                    <CasualtyTreatyStatsPropCC />
                  ) : t.component === 'CasualtyTreatyStatsNonProp' ? (
                    <CasualtyTreatyStatsNonProp />
                  ) : t.component === 'CasualtyRateDevelopment' ? (
                    <StepRateDevelopment />
                  ) : t.component === 'CasualtyRateDevelopmentMotor' ? (
                    <StepRateDevelopmentMotor />
                  ) : t.component === 'CasualtyMaxUwLimitDev' ? (
                    <StepMaxUwLimitDevelopment />
                  ) : t.component === 'CasualtyNumberOfRisksDev' ? (
                    <StepNumberOfRisksDevelopment />
                  ) : t.component === 'Submit' ? (
                    <StepSubmit />
                  ) : (
                    <div className="text-gray-600 dark:text-gray-300">
                      Coming soon, will mirror Excel sheet screenshot.
                    </div>
                  )
                }
              />
            ))}
          </Routes>
          <Outlet />

          {/* Footer nav */}
          {!isReadOnly && (
            <div className="mt-6 pt-4 border-t flex items-center justify-between sticky bottom-0 bg-white dark:bg-gray-800">
              <button
                type="button"
                disabled={currentIndex <= 0}
                onClick={onPrev}
                className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 disabled:opacity-50"
              >
                Previous
              </button>
              <div className="text-xs text-gray-500">All changes are autosaved</div>
              {currentIndex >= tabs.length - 1 ? (
                <button
                  type="button"
                  onClick={onSubmitFinal}
                  className="px-4 py-2 rounded bg-green-600 text-white"
                >
                  Submit
                </button>
              ) : (
                <button
                  type="button"
                  disabled={currentIndex >= tabs.length - 1}
                  onClick={onNext}
                  className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
                >
                  Next
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
