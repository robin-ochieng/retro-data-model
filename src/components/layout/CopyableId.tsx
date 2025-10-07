import React, { useState } from 'react';
import { Hash, Copy, Check } from 'lucide-react';

interface CopyableIdProps {
  id: string;
  shortLength?: number;
}

export function CopyableId({ id, shortLength = 8 }: CopyableIdProps) {
  const [copied, setCopied] = useState(false);
  const short = id.slice(0, shortLength);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      onClick={handleCopy}
      aria-label={copied ? 'Submission ID copied' : 'Copy submission ID'}
      title={`${id}${copied ? ' (Copied!)' : ' (Click to copy)'}`}
      type="button"
    >
      <Hash className="w-3 h-3" aria-hidden="true" />
      <span className="font-mono">{short}</span>
      {copied ? (
        <Check className="w-3 h-3 text-green-600 dark:text-green-400" aria-hidden="true" />
      ) : (
        <Copy className="w-3 h-3" aria-hidden="true" />
      )}
    </button>
  );
}
