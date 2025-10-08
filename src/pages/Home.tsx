import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import Logo from '../components/Logo';
import ThemeToggle from '../components/ThemeToggle';
import { HomeStartCard } from '../components/HomeStartCard';
import { GettingStarted } from '../components/home/GettingStarted';
import { getFirstTabKey, type LobKey } from '../config/lobConfig';
import type { Tables } from '../types/supabase';

export default function Home() {
  return (
    <ProtectedRoute>
      <HomeContent />
    </ProtectedRoute>
  );
}

type Submission = Tables<'submissions'>;

function HomeContent() {
  const { user, signOut } = useAuth();
  const [recent, setRecent] = useState<Submission[]>([]);
  const [submitted, setSubmitted] = useState<Submission[]>([]);
  const [displayName, setDisplayName] = useState<string | null>(
    (user?.user_metadata as any)?.full_name ?? null
  );
  const navigate = useNavigate();

  const fullName = displayName ?? user?.email ?? '';
  const firstName = React.useMemo(() => {
    if (!fullName) return '';
    const namePart = fullName.includes('@') ? (fullName.split('@')[0] ?? '') : fullName;
    return (namePart || '').split(/\s+/)[0] ?? '';
  }, [fullName]);

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      if (!user) return;
      // Prefer full_name from profile if available
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
      if (!cancelled) {
        if (!error && data?.full_name) {
          setDisplayName(data.full_name);
        } else if (!displayName) {
          setDisplayName(((user.user_metadata as any)?.full_name as string) ?? null);
        }
      }
    }
    loadProfile();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Load recent submissions (in-progress)
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) return;
      console.log('[HOME] Loading recent submissions for user:', user.id);
      const { data, error } = await supabase
        .from('submissions')
        .select('id,user_id,line_of_business,status,created_at,meta,lob_class,lob_line')
        .eq('user_id', user.id)
        .neq('status', 'submitted')
        .order('created_at', { ascending: false })
        .limit(10);
      console.log('[HOME] Recent submissions error:', error);
      console.log('[HOME] Recent submissions rows:', data?.length, data);
      if (!mounted) return;
      if (!error && Array.isArray(data)) setRecent(data as Submission[]);
    })();
    return () => { mounted = false; };
  }, [user?.id]);

  // Load submitted submissions
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) return;
      console.log('[HOME] Loading submitted submissions for user:', user.id);
      const { data, error } = await supabase
        .from('submissions')
        .select('id,user_id,line_of_business,status,created_at,meta,lob_class,lob_line')
        .eq('user_id', user.id)
        .eq('status', 'submitted')
        .order('created_at', { ascending: false })
        .limit(10);
      console.log('[HOME] Submitted submissions error:', error);
      console.log('[HOME] Submitted submissions rows:', data?.length, data);
      if (!mounted) return;
      if (!error && Array.isArray(data)) setSubmitted(data as Submission[]);
    })();
    return () => { mounted = false; };
  }, [user?.id]);



  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 flex flex-col">
      <header className="w-full sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-gray-900/60 bg-white dark:bg-gray-900 border-b">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14 md:h-16">
          <Logo />
          <div className="flex items-center gap-4">
            <a
              href="/help"
              className="text-sm text-blue-700 dark:text-blue-400 hover:underline"
              title="Help & User Guide"
            >
              Help
            </a>
            <ThemeToggle />
            <span className="font-medium text-sm text-gray-700 dark:text-gray-300" title={fullName}>
              <span className="sm:hidden">{firstName}</span>
              <span className="hidden sm:inline">{`Welcome, ${fullName}`}</span>
            </span>
            <button
              className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
              onClick={signOut}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto w-full px-4 py-8 flex-1">
        {/* Hero / Intro */}
        <section className="relative mb-10 overflow-hidden rounded-2xl border border-indigo-200 dark:border-indigo-900/50 shadow-lg bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800">
          {/* Enhanced gradient border effect */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-gradient-to-br from-indigo-500/20 via-purple-500/10 to-blue-500/20 dark:from-indigo-400/10 dark:via-purple-400/5 dark:to-blue-400/10" />
          
          {/* Top edge glow */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent dark:via-indigo-400/20" />
          
          <div className="relative p-6 sm:p-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              Retrocession Data Hub
            </h1>
            <p className="mt-3 max-w-3xl text-gray-700 dark:text-gray-300">
              A focused workspace for capturing and validating treaty data for retro programmes. Build submissions,
              autosave progress, and hand off structured datasets for downstream analysis and template generation.
            </p>
          </div>
        </section>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-6">
          {/* Left: Start submission card */}
          <HomeStartCard />

          {/* Right: Premium Getting Started panel */}
          <GettingStarted />
        </div>

        {/* Resume section */}
        <section className="relative mt-10 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg p-6">
          {/* Enhanced gradient border effect */}
          <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-gradient-to-br from-indigo-500/30 via-purple-500/20 to-blue-500/30 dark:from-indigo-400/20 dark:via-purple-400/10 dark:to-blue-400/20" />
          
          {/* Top edge glow */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent dark:via-indigo-400/30" />
          
          <div className="relative flex items-center justify-between mb-3">
            <h2 className="text-[1.125rem] font-semibold text-gray-900 dark:text-white">Resume recent submissions</h2>
            <span className="text-xs text-gray-500">showing last 10</span>
          </div>
          <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recent.map((s) => {
              const cob = s.lob_class || s.line_of_business || '—';
              const lob = s.lob_line || '';
              const meta = (s.meta && typeof s.meta === 'object' && !Array.isArray(s.meta)) ? (s.meta as Record<string, any>) : null;
              
              return (
                <div key={s.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition bg-white dark:bg-gray-800">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100" title={cob}>
                        {cob}
                      </div>
                      {lob && (
                        <div className="truncate text-xs text-gray-500 dark:text-gray-400 mt-0.5" title={lob}>
                          {lob}
                        </div>
                      )}
                    </div>
                    <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${s.status === 'submitted' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}>
                      {s.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 truncate" title={`${meta?.client ?? '—'} · ${meta?.year ?? '—'}`}>
                    {meta?.client ?? '—'} · {meta?.year ?? '—'}
                  </div>
                  <button
                    className="px-3 py-1.5 rounded bg-gray-900 dark:bg-gray-700 text-white hover:bg-black dark:hover:bg-gray-600 text-sm"
                    onClick={() => {
                      const lobKey = s.line_of_business.toLowerCase() as LobKey;
                      const firstTab = getFirstTabKey(lobKey);
                      navigate(`/wizard/${lobKey}/${s.id}/${firstTab}`);
                    }}
                  >
                    Resume
                  </button>
                </div>
              );
            })}
            {recent.length === 0 && (
              <div className="text-gray-500 dark:text-gray-400">No recent submissions yet.</div>
            )}
          </div>
        </section>

        {/* Submitted submissions section */}
        <section className="relative mt-10 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg p-6">
          {/* Enhanced gradient border effect */}
          <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-gradient-to-br from-indigo-500/30 via-purple-500/20 to-blue-500/30 dark:from-indigo-400/20 dark:via-purple-400/10 dark:to-blue-400/20" />
          
          {/* Top edge glow */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent dark:via-indigo-400/30" />
          
          <div className="relative flex items-center justify-between mb-3">
            <h2 className="text-[1.125rem] font-semibold text-gray-900 dark:text-white">Submitted Submissions</h2>
            <span className="text-xs text-gray-500">showing last 10</span>
          </div>
          <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {submitted.map((s) => {
              const cob = s.lob_class || s.line_of_business || '—';
              const lob = s.lob_line || '';
              const meta = (s.meta && typeof s.meta === 'object' && !Array.isArray(s.meta)) ? (s.meta as Record<string, any>) : null;
              
              return (
                <div key={s.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition opacity-90 bg-white dark:bg-gray-800">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100" title={cob}>
                        {cob}
                      </div>
                      {lob && (
                        <div className="truncate text-xs text-gray-500 dark:text-gray-400 mt-0.5" title={lob}>
                          {lob}
                        </div>
                      )}
                    </div>
                    <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200 whitespace-nowrap">
                      submitted
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 truncate" title={`${meta?.client ?? '—'} · ${meta?.year ?? '—'}`}>
                    {meta?.client ?? '—'} · {meta?.year ?? '—'}
                  </div>
                  <button
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 text-sm"
                    onClick={() => {
                      const lobKey = s.line_of_business.toLowerCase() as LobKey;
                      const firstTab = getFirstTabKey(lobKey);
                      navigate(`/wizard/${lobKey}/${s.id}/${firstTab}`);
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View
                  </button>
                </div>
              );
            })}
            {submitted.length === 0 && (
              <div className="text-gray-500 dark:text-gray-400">No submitted submissions yet.</div>
            )}
          </div>
        </section>
      </main>
      {/* Footer */}
      <footer className="w-full mt-auto border-t bg-white/70 dark:bg-gray-900/60 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
          <span>© {new Date().getFullYear()} Retrocession Hub</span>
          <span className="inline-flex items-center gap-1">
            <span className="opacity-80">Powered by</span>
            <strong className="font-semibold">kenbright.ai</strong>
          </span>
        </div>
      </footer>
    </div>
  );
}
