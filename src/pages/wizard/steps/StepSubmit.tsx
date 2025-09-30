import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { generateExcel } from '../../../lib/generateExcel';
import { Loader } from '../../../components/loaders';

export default function StepSubmit() {
  const { submissionId } = useParams();
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const pollTimer = useRef<number | null>(null);

  const clearTimer = () => {
    if (pollTimer.current) {
      window.clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
  };

  // Poll submissions.export_status if these columns get added later.
  const pollExport = useCallback(async () => {
    if (!submissionId) return;
    const { data } = await supabase
      .from('submissions')
      .select('export_status, export_path, export_signed_url')
      .eq('id', submissionId)
      .maybeSingle();
  // Type may not know columns yet (migration optional until applied)
  const status: any = (data as any)?.export_status;
  if (status === 'generated') {
      clearTimer();
  const exportPath = (data as any)?.export_path;
  const signed = (data as any)?.export_signed_url;
  const url = signed || (exportPath ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${exportPath}` : null);
      if (url) {
        setDownloadUrl(url);
        setMessage('Export ready. Click the button below to download.');
      }
    } else {
      pollTimer.current = window.setTimeout(pollExport, 4000);
    }
  }, [submissionId]);

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
    // Local immediate client-side build for quick download
    setMessage('Building workbook locally...');
    setDownloading(true);
    try {
      const res = await generateExcel(submissionId);
      if (res.ok && res.url) {
        setDownloadUrl(res.url);
        setMessage('Workbook ready. Download will start shortly...');
        // Auto trigger download once
        setTimeout(() => {
          const a = document.createElement('a');
            a.href = res.url!;
            a.download = `${submissionId}.xlsx`;
            a.click();
        }, 300);
      } else {
        setMessage('Local build failed; waiting for remote export.');
        pollExport();
      }
    } catch (e) {
      setMessage('Local build error; waiting for remote export.');
      pollExport();
    }
    setDownloading(false);
    setLoading(false);
  };

  useEffect(() => () => clearTimer(), []);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Submit</h2>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">When you submit, we lock the submission and start generating the Excel from your data.</p>
      <div className="flex items-center gap-4">
        <button
          className="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50 flex items-center gap-2"
          onClick={onSubmit}
          disabled={loading}
        >
          {loading ? <Loader variant="spinner" label="Submitting" /> : 'Submit'}
        </button>
  {downloading && <Loader variant="dots" label="Generating" />}
      </div>
      {message && (
        <div className="mt-4 text-sm space-y-2">
          <p>{message}</p>
          {downloadUrl && (
            <a
              href={downloadUrl}
              download
              className="inline-block text-xs px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-500"
            >
              Download Workbook
            </a>
          )}
        </div>
      )}
    </div>
  );
}
