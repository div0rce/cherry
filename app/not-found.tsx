import type { JSX } from 'react';
import Link from 'next/link';

export default function NotFound(): JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#F8FAFC] px-6 text-center text-[#0F172A]">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">404</p>
      <h1 className="text-2xl font-semibold">This page doesn&apos;t exist</h1>
      <p className="text-sm text-slate-600">The link may be old or mistyped.</p>
      <Link href="/" className="rounded-full bg-[#0F172A] px-4 py-2 text-sm font-medium text-white">
        Go to Cherry
      </Link>
    </main>
  );
}
