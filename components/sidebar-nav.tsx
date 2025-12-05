'use client';

import type { JSX } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ROUTES } from '@/lib/routes';

type NavItem = {
  href: string;
  label: string;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const SECTIONS: NavSection[] = [
  {
    label: 'Money (Real)',
    items: [
      { href: ROUTES.dev.root, label: 'Dashboard' },
      { href: ROUTES.dev.buckets, label: 'Buckets' },
      { href: ROUTES.dev.history, label: 'Spend history' },
      { href: ROUTES.dev.statements, label: 'Statements' },
      { href: ROUTES.dev.cards, label: 'Cards' },
    ],
  },
  {
    label: 'Engine / Lab',
    items: [
      { href: '/activity', label: 'Engine activity' },
      { href: '/scan', label: 'Scan' },
      { href: '/simulate', label: 'Simulate swipe' },
      { href: ROUTES.dev.engine.inspector, label: 'Engine inspector' },
      { href: ROUTES.dev.engine.guardrails, label: 'Guardrails' },
      { href: '/simulations', label: 'Simulations' },
      { href: '/sessions', label: 'Sessions' },
      { href: ROUTES.dev.evaluator, label: 'Dev evaluator' },
      { href: ROUTES.dev.activity, label: 'Activity inspector' },
      { href: '/vine-simulator', label: 'Vine simulator' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { href: '/admin', label: 'Admin & tools' },
      { href: ROUTES.dev.ingest, label: 'Ingest dashboard' },
      { href: ROUTES.dev.bank, label: 'Bank ingest' },
      { href: '/bank-simulator', label: 'Bank / Plaid simulator' },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav(): JSX.Element {
  const pathname = usePathname() ?? '/';

  return (
    <aside className="hidden w-64 shrink-0 border-r border-ink-800/70 bg-ink-950/80 px-4 py-6 text-cloud-100 shadow-faint md:sticky md:top-0 md:block md:h-screen md:overflow-y-auto">
      <div className="mb-8 px-2">
        <div className="text-[11px] uppercase tracking-label text-cherry-100">Cherry</div>
        <div className="text-lg font-semibold text-cloud-50">Dev Console</div>
      </div>

      <nav className="space-y-6">
        {SECTIONS.map((section) => (
          <div key={section.label} className="space-y-2">
            <p className="px-2 text-xs uppercase tracking-label text-cloud-400">
              {section.label}
            </p>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = isActive(pathname, item.href);
                const baseClasses =
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition border';
                const activeClasses =
                  'bg-ink-800/80 text-cloud-50 border-cherry-500/50 shadow-soft';
                const inactiveClasses =
                  'text-cloud-200 border-transparent hover:border-ink-700/60 hover:bg-ink-800/50';

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`${baseClasses} ${active ? activeClasses : inactiveClasses}`}
                    >
                      <span className="leading-none">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
