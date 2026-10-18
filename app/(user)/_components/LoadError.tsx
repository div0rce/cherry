import type { JSX } from 'react';
import Link from 'next/link';

// Shown when a page's data request fails, so a broken load never looks like an empty account.
export function LoadError({ what, retryHref }: { what: string; retryHref: string }): JSX.Element {
  return (
    <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
      <p className="font-semibold">We couldn&apos;t load your {what}.</p>
      <p className="mt-1">This is on our side, not a problem with your account.</p>
      <Link href={retryHref} className="mt-3 inline-flex font-semibold text-[#A01029] underline">
        Try again
      </Link>
    </div>
  );
}
