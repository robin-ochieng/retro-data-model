import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSubmission } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import { CLIENT_OPTIONS, type ClientOption } from '../data/clients';
import { getFirstTabKey, type LobKey } from '../config/lobConfig';

const PRESETS = [
  'Property',
  'Casualty / Liability',
  'Marine & Aviation',
  'Life',
  'Health / Medical',
  'Agriculture',
  'Motor',
  'Engineering',
  'Financial Lines',
  'Specialty Risks',
  'Energy / Oil & Gas',
  'Credit & Surety',
  'Travel',
  "Workers' Compensation",
  'Other...',
] as const;

type Preset = typeof PRESETS[number];

export function HomeStartCard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [client, setClient] = useState<ClientOption | ''>('');
  const [year, setYear] = useState<number | ''>(new Date().getFullYear());
  const [presetCob, setPresetCob] = useState<Preset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onStart() {
    if (!client || !year) return;
    setLoading(true);
    setError(null);
    
    try {
      const newId = await createSubmission({
        client,
        year: typeof year === 'number' ? year : Number(year),
        lob_class: presetCob ?? null,
        userId: user?.id ?? null,
      });
      
      // Determine which LOB route to use
      // For now, default to 'property' route structure
      const lobKey: LobKey = 'property';
      const firstTab = getFirstTabKey(lobKey);
      const qp = presetCob ? `?presetCob=${encodeURIComponent(presetCob)}` : '';
      navigate(`/wizard/${lobKey}/${newId}/${firstTab}${qp}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create submission');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="
        relative rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/[0.03]
        shadow-[0_1px_0_rgba(255,255,255,0.04),0_8px_24px_-12px_rgba(0,0,0,0.55)]
        transition-colors
        hover:border-gray-300 dark:hover:border-gray-600 hover:bg-white/[0.05]
        focus-within:border-indigo-300/40 focus-within:ring-2 focus-within:ring-indigo-400/25
      "
    >
      {/* subtle inner ring for crisp edge */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5" />
      <div className="relative p-4 md:p-5">
        <h3 className="mb-4 text-[1.0625rem] font-semibold text-gray-900 dark:text-white">
          Start New Submission
        </h3>

      {/* Client */}
      <label htmlFor="client-select" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        Client
      </label>
      <select
        id="client-select"
        value={client}
        onChange={(e) => setClient(e.target.value as ClientOption | '')}
        className={`mb-3 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          client === '' 
            ? 'text-gray-400 dark:text-gray-500' 
            : 'text-gray-900 dark:text-gray-100'
        }`}
        required
        disabled={loading}
      >
        <option value="" disabled className="text-gray-400 dark:text-gray-500">
          ZEP-RE (PTA Reinsurance Company)
        </option>
        {CLIENT_OPTIONS.map((opt) => (
          <option key={opt} value={opt} className="text-gray-900 dark:text-gray-100">
            {opt}
          </option>
        ))}
      </select>

      {/* Year */}
      <label htmlFor="year-input" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        Year
      </label>
      <input
        id="year-input"
        type="number"
        inputMode="numeric"
        value={year}
        onChange={(e) => setYear(e.target.value ? Number(e.target.value) : '')}
        className="mb-4 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder={String(new Date().getFullYear())}
        required
        disabled={loading}
      />

      {/* Optional presets */}
      <div className="mb-4">
        <div className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Preset Class <span className="font-normal text-gray-500">(optional)</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPresetCob((prev) => (prev === p ? null : p))}
              disabled={loading}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                presetCob === p
                  ? 'border-blue-500 bg-blue-500/15 text-blue-600 dark:border-blue-400 dark:bg-blue-400/15 dark:text-blue-300'
                  : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={onStart}
        disabled={loading || !client || !year}
        className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-blue-500/30 hover:from-blue-700 hover:to-blue-800 hover:shadow-xl hover:shadow-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-200 dark:shadow-blue-500/20 dark:hover:shadow-blue-500/30"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Creating Submission...
          </span>
        ) : (
          'Start New Submission'
        )}
      </button>
      </div>
    </div>
  );
}
