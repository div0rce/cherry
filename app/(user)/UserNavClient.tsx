"use client";

import type { JSX } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { buttonClasses } from '@/components/ui/button-classes';
import { ROUTES } from '@/lib/routes';
import { cn } from '@/lib/ui/cn';

const NAV_ITEMS = [
  { href: ROUTES.user.app, label: 'Autopilot' },
  { href: '/buckets', label: 'Buckets' },
  { href: '/cards', label: 'Cards' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === ROUTES.user.app) return pathname === ROUTES.user.app;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function UserNavClient(): JSX.Element {
  const pathname = usePathname() ?? '/';

  return (
    <nav className="flex flex-wrap items-center gap-2">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              buttonClasses(active ? 'primary' : 'secondary', 'sm'),
              active
                ? 'border-cherry-400/70 bg-cherry-500 text-ink-950'
                : 'border-ink-800/70 bg-ink-900/70 text-cloud-100 hover:border-cherry-400/60 hover:text-cloud-50'
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
