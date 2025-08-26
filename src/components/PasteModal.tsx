import React, { useMemo, useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  onApply: (rows: string[][]) => void;
  title?: string;
};

export default function PasteModal({ open, onClose, onApply, title }: Props) {
  const [text, setText] = useState('');

  const rows = useMemo(() => {
    return text
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => line.split(/\t|,/) // TSV or CSV
      );
  }, [text]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded shadow max-w-3xl w-full p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">{title ?? 'Paste from Excel'}</h3>
          <button className="px-2 py-1" onClick={onClose}>✕</button>
        </div>
        <textarea
          className="w-full h-40 border rounded p-2 mb-3"
          placeholder="Paste cells from Excel or CSV here"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="overflow-auto max-h-64 border rounded">
          <table className="min-w-full table-auto">
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j} className="px-2 py-1 border">{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700" onClick={onClose}>Cancel</button>
          <button className="px-3 py-1 rounded bg-blue-600 text-white" onClick={() => { onApply(rows); onClose(); }}>Apply</button>
        </div>
      </div>
    </div>
  );
}
