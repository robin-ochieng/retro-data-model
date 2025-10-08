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
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow">
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
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
        className="mb-3 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        required
        disabled={loading}
      >
        <option value="" disabled>
          ZEP-RE (PTA Reinsurance Company)
        </option>
        {CLIENT_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
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

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onStart}
          disabled={loading || !client || !year}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Starting...' : 'Start'}
        </button>

        <span className="text-xs text-gray-500 dark:text-gray-400">or</span>

        <button
          type="button"
          onClick={() => {
            // TODO: Implement "Start from copy" modal
            alert('Start from copy feature coming soon');
          }}
          disabled={loading}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Start from a copy
        </button>
      </div>
    </div>
  );
}
