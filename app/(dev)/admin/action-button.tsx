'use client';

import type { JSX } from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { callApi } from '../../../lib/client/api.js';

const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value !== '';

export function AdminActionButton({
  href,
  method,
  cta,
}: {
  href: string;
  method: 'POST' | 'GET';
  cta: string;
}): JSX.Element {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setStatus('loading');
    setMessage(null);

    const res = await callApi<{ message?: string }>(href, {
      method,
      cache: 'no-store',
    });

    if (res.ok !== true) {
      setStatus('error');
      setMessage(res.message);
      return;
    }

    setStatus('success');
    const nextMessage = hasText(res.data.message) ? res.data.message : 'Completed';
    setMessage(nextMessage);
    router.refresh();
  }

  const isLoading = status === 'loading';
  const feedbackClass = status === 'error' ? 'text-red-300' : 'text-green-300';
  const hasMessage = hasText(message);

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="rounded-md bg-pink-600 px-3 py-2 text-sm font-semibold text-white hover:bg-pink-700 transition disabled:opacity-70"
      >
        {isLoading ? 'Working…' : cta}
      </button>
      {hasMessage ? <p className={`text-xs ${feedbackClass}`}>{message}</p> : null}
    </div>
  );
}
