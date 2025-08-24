import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { generateExcel } from '../../../lib/generateExcel';

export default function StepSubmit() {
  const { submissionId } = useParams();
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!submissionId) return;
    setLoading(true);
    setMessage('');
    const upd = await supabase.from('submissions').update({ status: 'submitted' }).eq('id', submissionId);
    if (upd.error) {
      setMessage(`Error: ${upd.error.message}`);
      setLoading(false);
      return;
    }
    const res = await generateExcel(submissionId);
    if (res.ok) {
      setMessage('Generation triggered (stub).');
    } else {
      setMessage('Generation failed (stub).');
    }
    setLoading(false);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Submit</h2>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">When you submit, we lock the submission and start generating the Excel from your data.</p>
      <button
        className="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50"
        onClick={onSubmit}
        disabled={loading}
      >
        {loading ? 'Submitting...' : 'Submit'}
      </button>
      {message && <div className="mt-3 text-sm">{message}</div>}
    </div>
  );
}
