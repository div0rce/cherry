import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger';
import { AdminActionButton } from './action-button';

async function getHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { db: 'ok' };
  } catch (err) {
    logError('Health check failed', err);
    return { db: 'error' };
  }
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/signin?callbackUrl=${encodeURIComponent('/admin')}`);
  }

  const health = await getHealth();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.2em] text-pink-200">Admin</p>
        <h1 className="text-3xl font-semibold text-white">Admin & Tools</h1>
        <p className="text-slate-300">
          Dev utilities live here. Seed/nuke demo data and check basic health.
        </p>
      </header>

      <div className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-lg space-y-3">
        <h2 className="text-lg font-semibold text-white">Data Management</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <AdminActionCard
            title="Seed demo data"
            description="Populate cards, buckets, and sample simulations for this user."
            href="/api/seed-demo"
            method="POST"
            cta="Seed demo data"
          />
          <AdminActionCard
            title="Clear user data"
            description="Delete cards, buckets, and simulations for the current user."
            href="/api/admin/clear-user"
            method="POST"
            cta="Clear user data"
          />
          <AdminActionCard
            title="Health check"
            description={`Database: ${health.db === 'ok' ? 'OK' : 'Error'}`}
            href="/api/health"
            method="GET"
            cta="View health"
          />
        </div>
        <div className="flex items-center gap-3 text-sm text-pink-200">
          <Link href="/simulate" className="hover:text-white">
            Run simulation →
          </Link>
          <Link href="/cards" className="hover:text-white">
            Manage cards →
          </Link>
          <Link href="/buckets" className="hover:text-white">
            Manage buckets →
          </Link>
        </div>
      </div>
    </div>
  );
}

function AdminActionCard({
  title,
  description,
  href,
  cta,
  method,
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
  method: 'GET' | 'POST';
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-slate-900/40 p-3 space-y-2">
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
      {method === 'POST' ? (
        <AdminActionButton href={href} method="POST" cta={cta} />
      ) : (
        <Link
          href={href}
          className="inline-flex rounded-md bg-pink-600 px-3 py-2 text-sm font-semibold text-white hover:bg-pink-700 transition"
        >
          {cta}
        </Link>
      )}
    </div>
  );
}
