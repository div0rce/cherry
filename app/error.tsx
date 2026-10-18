'use client';

import type { JSX } from 'react';
import Link from 'next/link';

// Shown for unexpected server or render errors. The message stays generic (no internals); the
// digest lets support match the server log.
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#F8FAFC] px-6 text-center text-[#0F172A]">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-sm text-slate-600">
        Cherry couldn&apos;t load this page. Nothing about your cards or money changed.
      </p>
      {error.digest !== undefined ? <p className="text-xs text-slate-500">Reference: {error.digest}</p> : null}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-[#0F172A] px-4 py-2 text-sm font-medium text-white"
        >
          Try again
        </button>
        <Link href="/app" className="px-2 py-2 text-sm font-medium text-[#A01029]">
          Back to home
        </Link>
      </div>
    </main>
  );
}
