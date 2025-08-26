import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import Logo from '../components/Logo';
import { getFirstTabKey, type LobKey } from '../config/lobConfig';

export default function Home() {
  return (
    <ProtectedRoute>
      <HomeContent />
    </ProtectedRoute>
  );
}

type Submission = {
  id: string;
  user_id: string;
  line_of_business: 'Property' | 'Casualty';
  status: 'in_progress' | 'submitted' | string;
  created_at?: string;
  meta?: { client?: string; year?: string };
};

function HomeContent() {
  const { user, signOut } = useAuth();
  const [client, setClient] = useState('');
  const [year, setYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<Submission[]>([]);
  const [displayName, setDisplayName] = useState<string | null>(
    (user?.user_metadata as any)?.full_name ?? null
  );
  const navigate = useNavigate();

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

  // Load recent submissions
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('submissions')
        .select('id,user_id,line_of_business,status,created_at,meta')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (!mounted) return;
      if (!error && Array.isArray(data)) setRecent(data as Submission[]);
    })();
    return () => { mounted = false; };
  }, [user?.id]);

  const handleStart = async (lineOfBusiness: 'Property' | 'Casualty') => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('submissions')
        .insert([
          {
            user_id: user?.id,
            line_of_business: lineOfBusiness,
            status: 'in_progress',
            meta: { client, year },
          },
        ])
        .select('id')
        .single();
      if (error) throw error;
      const lobKey = lineOfBusiness.toLowerCase() as LobKey;
      const firstTab = getFirstTabKey(lobKey);
      navigate(`/wizard/${lobKey}/${data.id}/${firstTab}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create submission');
    } finally {
      setLoading(false);
    }
  };

  // Explicit Tailwind color classes to avoid purge of dynamic strings
  const lobStyles: Record<'Property' | 'Casualty', { tile: string; button: string; buttonHover: string; accentDot: string }>= {
    Property: {
      tile: 'bg-white dark:bg-gray-800',
      button: 'bg-blue-600',
      buttonHover: 'hover:bg-blue-700',
      accentDot: 'bg-blue-600'
    },
    Casualty: {
      tile: 'bg-white dark:bg-gray-800',
      button: 'bg-emerald-600',
      buttonHover: 'hover:bg-emerald-700',
      accentDot: 'bg-emerald-600'
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 flex flex-col">
      <header className="w-full sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-gray-900/60 bg-white dark:bg-gray-900 border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Logo />
        <span className="font-medium text-sm text-gray-700 dark:text-gray-300">
          {`Welcome, ${displayName ?? user?.email ?? ''}`}
        </span>
        <button
          className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
          onClick={signOut}
        >
          Sign out
        </button>
        </div>
      </header>
      <main className="max-w-6xl mx-auto w-full px-4 py-8 flex-1">
        {/* Hero / Intro */}
        <section className="mb-10 overflow-hidden rounded-2xl border shadow-sm bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800">
          <div className="p-6 sm:p-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Retrocession Data Hub
          </h1>
          <p className="mt-3 max-w-3xl text-gray-700 dark:text-gray-300">
            A focused workspace for capturing and validating treaty data for retro programmes. Build submissions,
            autosave progress, and hand off structured datasets for downstream analysis and template generation.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="inline-flex items-center px-4 py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              disabled={!client || !year || loading}
              onClick={() => handleStart('Property')}
            >
              Start Property
            </button>
            <button
              className="inline-flex items-center px-4 py-2 rounded-md text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
              disabled={!client || !year || loading}
              onClick={() => handleStart('Casualty')}
            >
              Start Casualty
            </button>
          </div>
          </div>
        </section>

        <h2 className="text-xl font-bold mb-4">Start a New Submission</h2>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-6">
          {/* Left: LoB cards */}
          <section className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(['Property','Casualty'] as const).map((lob) => (
                <div
                  key={lob}
                  className="group border rounded-xl p-5 transition cursor-pointer hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600"
                  onClick={() => { if (client && year) handleStart(lob); }}
                >
                  <div className={`h-10 w-10 rounded-full ${lobStyles[lob].accentDot} mb-3`} />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{lob}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Start a {lob} data submission.</p>
                  <button
                    className={`mt-4 inline-flex items-center px-3 py-1.5 rounded text-white ${lobStyles[lob].button} ${lobStyles[lob].buttonHover} disabled:opacity-50`}
                    onClick={(e) => { e.stopPropagation(); handleStart(lob); }}
                    disabled={loading || !client || !year}
                  >
                    Start {lob}
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Right: brief form for meta */}
          <section className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Submission Details</h2>
            <label className="block mb-2 font-medium" htmlFor="client">Client</label>
            <input
              id="client"
              type="text"
              className="w-full px-3 py-2 border rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
              value={client}
              onChange={e => setClient(e.target.value)}
              disabled={loading}
              placeholder="Munich Re"
            />
            <label className="block mb-2 font-medium" htmlFor="year">Year</label>
            <input
              id="year"
              type="text"
              className="w-full px-3 py-2 border rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
              value={year}
              onChange={e => setYear(e.target.value)}
              disabled={loading}
              placeholder={String(new Date().getFullYear())}
            />
            {error && <div className="text-red-600 mb-2">{error}</div>}
            <div className="text-xs text-gray-500">Pick a line of business to begin.</div>
          </section>
        </div>

        {/* Resume section */}
        <section className="mt-10 bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Resume recent submissions</h2>
            <span className="text-xs text-gray-500">showing last 10</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recent.map((s) => (
              <div key={s.id} className="border rounded-lg p-4 hover:shadow-md transition">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{s.line_of_business}</div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${s.status === 'submitted' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'}`}>
                    {s.status}
                  </span>
                </div>
                <div className="font-mono text-xs break-all mb-2 text-gray-600 dark:text-gray-300">{s.id}</div>
                <div className="text-xs text-gray-500 mb-3">{s.meta?.client ?? '-'} • {s.meta?.year ?? '-'}</div>
                <button
                  className="px-3 py-1.5 rounded bg-gray-900 text-white hover:bg-black"
                  onClick={() => {
                    const lobKey = s.line_of_business.toLowerCase() as LobKey;
                    const firstTab = getFirstTabKey(lobKey);
                    navigate(`/wizard/${lobKey}/${s.id}/${firstTab}`);
                  }}
                >
                  Resume
                </button>
              </div>
            ))}
            {recent.length === 0 && (
              <div className="text-gray-500">No recent submissions yet.</div>
            )}
          </div>
        </section>
      </main>
      {/* Footer */}
      <footer className="w-full mt-auto border-t bg-white/70 dark:bg-gray-900/60 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
          <span>© {new Date().getFullYear()} Kenbright Re</span>
          <span className="inline-flex items-center gap-1">
            <span className="opacity-80">Powered by</span>
            <strong className="font-semibold">Kenbright AI</strong>
          </span>
        </div>
      </footer>
    </div>
  );
}
