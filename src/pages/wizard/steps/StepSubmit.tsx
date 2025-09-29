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
    // Update status only (submitted_at column not present yet). Add it via migration if needed.
    const upd = await supabase
      .from('submissions')
      .update({ status: 'submitted' })
      .eq('id', submissionId);
    if (upd.error) {
      setMessage(`Error: ${upd.error.message}`);
      setLoading(false);
      return;
    }
    // Fire n8n webhook (non-blocking). Failures are logged but not shown as hard errors.
    const webhookUrl = import.meta.env.VITE_N8N_SUBMISSION_WEBHOOK_URL as string | undefined;
    const secret = import.meta.env.VITE_N8N_WEBHOOK_SECRET as string | undefined;
    if (webhookUrl && secret) {
      fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': secret,
        },
        body: JSON.stringify({ submissionId }),
      }).catch((err) => console.warn('n8n webhook failed', err));
    }
    // Optional local stub generation (can remove later)
    try {
      const res = await generateExcel(submissionId);
      if (res.ok) {
        setMessage('Submission locked. Export pipeline triggered.');
      } else {
        setMessage('Submitted. Remote export queued; local stub failed.');
      }
    } catch (e) {
      setMessage('Submitted. Remote export queued.');
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
