import type { JSX } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { resolveUserContext } from '@/lib/user-context';
import { BucketForm } from '../../../_components/BucketForm';
import { DeleteActionButton } from '../../../_components/DeleteActionButton';
import { deleteBucket, updateBucket } from './actions';

type PageParams = { bucketId: string };

export default async function EditBucketPage({
  params,
}: {
  params: Promise<PageParams> | PageParams;
}): Promise<JSX.Element> {
  const resolvedParams = params instanceof Promise ? await params : params;
  const { bucketId } = resolvedParams;
  const { userId } = await resolveUserContext({ requireAuth: true, allowLabDemo: true });

  const bucket = await prisma.bucket.findFirst({
    where: { id: bucketId, userId },
    select: { id: true, name: true, budgetAmount: true, category: true, period: true },
  });

  if (!bucket) {
    redirect('/app/onboarding?missing=buckets');
  }

  const currentBucket = bucket;

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f8fafc] to-[#e2e8f0]">
      <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#ff4d6d]">Buckets</p>
            <h1 className="text-2xl font-semibold text-[#0f172a]">Edit bucket</h1>
            <p className="text-sm text-slate-600">
              Adjust the limit or category. Deleting the last bucket will block Autopilot until you add a new one.
            </p>
          </div>
          <Link href="/app/onboarding" className="text-sm font-semibold text-[#ff4d6d]">
            ← Back to onboarding
          </Link>
        </div>

        <BucketForm
          action={updateBucket}
          defaultValues={{
            bucketId: currentBucket.id,
            name: currentBucket.name,
            budgetAmountCents: currentBucket.budgetAmount,
            category: currentBucket.category,
            period: currentBucket.period,
          }}
          submitLabel="Save changes"
          footerSlot={
            <DeleteActionButton
              action={deleteBucket}
              hiddenFields={{ bucketId: currentBucket.id }}
              label="Delete bucket"
            />
          }
        />
      </div>
    </main>
  );
}
