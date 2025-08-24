import React, { useEffect, useMemo, useState } from 'react';
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
  const firstTab = lineOfBusiness.toLowerCase() === 'property' ? 'header' : 'data-requirements';
      navigate(`/wizard/${lineOfBusiness.toLowerCase()}/${data.id}/${firstTab}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create submission');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <header className="w-full flex justify-between items-center p-4 bg-white dark:bg-gray-800 shadow">
        <Logo />
        <span className="font-medium">
          {`Welcome, ${displayName ?? user?.email ?? ''}`}
        </span>
        <button
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          onClick={signOut}
        >
          Sign out
        </button>
      </header>
      <main className="max-w-6xl mx-auto w-full px-4 py-8 flex-1">
        {/* Hero / Intro */}
        <section className="mb-8 rounded-lg border bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 p-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Retrocession Data Hub
          </h1>
          <p className="mt-3 max-w-3xl text-gray-700 dark:text-gray-300">
            A focused workspace for capturing and validating treaty data for retro programmes. Build submissions
            across Property and Casualty, autosave your progress, and seamlessly hand off structured data for
            downstream analysis and template generation.
          </p>
          <ul className="mt-4 grid gap-2 text-sm text-gray-700 dark:text-gray-300 list-disc pl-5">
            <li>Capture headers, EPI summaries, treaty statistics (Prop/Non‑Prop), and loss lists.</li>
            <li>Debounced autosave, resume where you left off, and submit when ready.</li>
            <li>Secure access and storage powered by Supabase authentication.</li>
          </ul>
        </section>

        <h2 className="text-xl font-bold mb-4">Start a New Submission</h2>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-6">
          {/* Left: LoB cards */}
          <section className="bg-white dark:bg-gray-800 rounded shadow p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[{lob:'Property', color:'blue'}, {lob:'Casualty', color:'green'}].map(({lob, color}) => (
                <div key={lob} className="border rounded-lg p-5 hover:shadow-md transition cursor-pointer" onClick={() => { if(client && year) handleStart(lob as any); }}>
                  <div className={`h-10 w-10 rounded bg-${color}-600 mb-3`} />
                  <h3 className="text-lg font-semibold">{lob}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Start a {lob} data submission.</p>
                  <button
                    className={`mt-4 inline-flex items-center px-3 py-1.5 rounded text-white bg-${color}-600 hover:bg-${color}-700 disabled:opacity-50`}
                    onClick={(e) => { e.stopPropagation(); handleStart(lob as any); }}
                    disabled={loading || !client || !year}
                  >
                    Start {lob}
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Right: brief form for meta */}
          <section className="bg-white dark:bg-gray-800 rounded shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Submission Details</h2>
            <label className="block mb-2 font-medium" htmlFor="client">Client</label>
            <input
              id="client"
              type="text"
              className="w-full px-3 py-2 border rounded mb-4 focus:outline-none focus:ring focus:border-blue-500"
              value={client}
              onChange={e => setClient(e.target.value)}
              disabled={loading}
              placeholder="Acme Insurance Co."
            />
            <label className="block mb-2 font-medium" htmlFor="year">Year</label>
            <input
              id="year"
              type="text"
              className="w-full px-3 py-2 border rounded mb-4 focus:outline-none focus:ring focus:border-blue-500"
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
        <section className="mt-10 bg-white dark:bg-gray-800 rounded shadow p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Resume recent submissions</h2>
            <span className="text-xs text-gray-500">showing last 10</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recent.map((s) => (
              <div key={s.id} className="border rounded p-4">
                <div className="text-sm text-gray-600 mb-2">{s.line_of_business}</div>
                <div className="font-mono text-xs break-all mb-2">{s.id}</div>
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
    </div>
  );
}
