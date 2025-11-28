'use client';

import type { JSX } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
    label: 'Real data',
    items: [
      { href: '/', label: 'Dashboard' },
      { href: '/activity', label: 'Activity' },
      { href: '/statements', label: 'Statements' },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { href: '/cards', label: 'Cards' },
      { href: '/buckets', label: 'Buckets' },
    ],
  },
  {
    label: 'Lab & simulated',
    items: [
      { href: '/simulate', label: 'Simulate swipe' },
      { href: '/simulations', label: 'Simulations' },
      { href: '/scan', label: 'Manual lookup & rewards' },
      { href: '/sessions', label: 'Sessions' },
      { href: '/dev/activity', label: 'Activity inspector' },
      { href: '/vine-simulator', label: 'Vine terminal simulator' },
      { href: '/bank-simulator', label: 'Bank / Plaid simulator' },
    ],
  },
  {
    label: 'System',
    items: [{ href: '/admin', label: 'Admin & tools' }],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav(): JSX.Element {
  const pathname = usePathname() ?? '/';

  return (
    <aside className="hidden md:sticky md:top-0 md:h-screen md:overflow-y-auto w-64 shrink-0 border-r border-white/5 bg-slate-950/60 px-4 py-6 text-slate-100 md:block">
      <div className="mb-8 px-2">
        <div className="text-xs uppercase tracking-label text-pink-200">Cherry</div>
        <div className="text-lg font-semibold text-white">Dev Console</div>
      </div>

      <nav className="space-y-6">
        {SECTIONS.map((section) => (
          <div key={section.label} className="space-y-2">
            <p className="px-2 text-xs uppercase tracking-label text-slate-500">
              {section.label}
            </p>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = isActive(pathname, item.href);
                const baseClasses =
                  'flex items-center gap-2 rounded-md px-2 py-2 text-sm transition border';
                const activeClasses = 'bg-pink-600/20 text-white border-pink-500/40';
                const inactiveClasses = 'text-slate-200 border-transparent hover:bg-white/5';

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
