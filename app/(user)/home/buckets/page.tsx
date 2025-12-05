import type { JSX } from 'react';
import Link from 'next/link';
import { ROUTES } from '@/lib/routes';
import Card from '@/components/user/ui/Card';

const primaryLinkClasses =
  'inline-flex items-center justify-center gap-2 rounded-md bg-[#ef4444] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#dc2626] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b91c1c]';

const secondaryLinkClasses =
  'inline-flex items-center justify-center gap-2 rounded-md border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-semibold text-[#b91c1c] transition hover:bg-[#fef2f2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b91c1c]';

export default function UserBucketsOverview(): JSX.Element {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#b91c1c]">Buckets</p>
        <h1 className="text-2xl font-semibold text-[#0f172a]">Keep your spend in bounds</h1>
        <p className="text-sm text-[#6b7280]">
          Cherry watches your budgets and nudges you before a swipe tips a bucket over its limit.
          A simpler bucket editor lives here soon.
        </p>
      </div>

      <Card className="p-5 shadow-sm shadow-[#f3f4f6]">
        <div className="space-y-3">
          <p className="text-sm text-[#111827]">
            Buckets you set up in Cherry already guide Autopilot recommendations. We&apos;re building
            a dedicated setup flow for this app; until then, Autopilot keeps you aligned and will call
            out risky swipes.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href={ROUTES.user.app} className={primaryLinkClasses}>
              Open Autopilot
            </Link>
            <Link href="/home/history" className={secondaryLinkClasses}>
              Review recent activity
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
