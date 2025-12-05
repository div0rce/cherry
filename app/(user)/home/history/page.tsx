import type { JSX } from 'react';
import Link from 'next/link';
import Card from '@/components/user/ui/Card';

const primaryLinkClasses =
  'inline-flex items-center justify-center gap-2 rounded-md bg-[#ef4444] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#dc2626] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b91c1c]';

export default function UserHistoryPage(): JSX.Element {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#b91c1c]">History</p>
        <h1 className="text-2xl font-semibold text-[#0f172a]">See what happened recently</h1>
        <p className="text-sm text-[#6b7280]">
          A clean, user-facing timeline is landing here. You&apos;ll see which card Cherry suggested,
          why, and how it affected your buckets.
        </p>
      </div>

      <Card className="p-5 shadow-sm shadow-[#f3f4f6]">
        <div className="space-y-3">
          <p className="text-sm text-[#111827]">
            For now, Autopilot gives you the next best move. We&apos;ll bring past recommendations and
            bucket movements into this view so you can audit your own spend without digging into dev
            tools.
          </p>
          <Link href="/app" className={primaryLinkClasses}>
            Get a new recommendation
          </Link>
        </div>
      </Card>
    </div>
  );
}
