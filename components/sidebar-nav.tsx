'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = { name: string; href: string };
type NavSection = { label: string; items: NavItem[] };

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav() {
  const pathname = usePathname();
  const navSections: NavSection[] = [
    {
      label: 'Spend',
      items: [
        { name: 'Dashboard', href: '/' },
        { name: 'Scan Before Pay', href: '/scan' },
        { name: 'Sessions', href: '/sessions' },
      ],
    },
    {
      label: 'Setup',
      items: [
        { name: 'Cards', href: '/cards' },
        { name: 'Buckets', href: '/buckets' },
      ],
    },
    {
      label: 'Simulation',
      items: [
        { name: 'Simulate', href: '/simulate' },
        { name: 'Simulations', href: '/simulations' },
      ],
    },
    {
      label: 'History',
      items: [
        { name: 'Purchase History', href: '/history' },
        { name: 'Statements', href: '/statements' },
      ],
    },
    {
      label: 'Admin',
      items: [{ name: 'Admin & Tools', href: '/admin' }],
    },
    ...(process.env.NODE_ENV === 'development'
      ? [{ label: 'Dev', items: [{ name: 'Vine Simulator (dev)', href: '/vine-simulator' }] }]
      : []),
  ];

  return (
    <aside className="hidden w-64 shrink-0 border-r border-white/5 bg-slate-950/60 px-4 py-6 text-slate-100 md:block">
      <div className="mb-8 px-2">
        <div className="text-xs uppercase tracking-[0.2em] text-pink-200">Cherry</div>
        <div className="text-lg font-semibold text-white">Dev Console</div>
      </div>

      <nav className="space-y-6">
        {navSections.map((section) => (
          <div key={section.label} className="space-y-2">
            <p className="px-2 text-xs uppercase tracking-[0.2em] text-slate-500">
              {section.label}
            </p>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm transition ${
                        active
                          ? 'bg-pink-600/20 text-white border border-pink-500/40'
                          : 'text-slate-200 hover:bg-white/5'
                      }`}
                    >
                      <span className="leading-none">{item.name}</span>
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
