'use client';

import type { JSX } from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

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

    try {
      const res = await fetch(href, {
        method,
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });

      if (!res.ok) {
        const errorText = await res.text();
        const message = hasText(errorText) ? errorText : 'Request failed';
        throw new Error(message);
      }

      setStatus('success');
      const parsed = (await res.json().catch(() => null)) as unknown;
      let nextMessage = 'Completed';
      if (
        parsed !== null &&
        typeof parsed === 'object' &&
        'message' in parsed &&
        typeof (parsed as { message: unknown }).message === 'string'
      ) {
        nextMessage = (parsed as { message: string }).message;
      }
      setMessage(nextMessage);
      router.refresh();
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Request failed');
    }
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
