"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { JSX } from 'react';
import { cn } from '../../lib/ui/cn';

type NavItem = {
  href: string;
  label: string;
};

const navItems: NavItem[] = [
  { href: '/app', label: 'Home' },
  { href: '/app/autopilot', label: 'Autopilot' },
  { href: '/buckets', label: 'Buckets' },
  { href: '/history', label: 'History' },
];

function isActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

export function UserBottomNav(): JSX.Element {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 shadow-[0_-6px_30px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 text-xs font-semibold transition-colors',
                active ? 'text-[#C21733]' : 'text-[#475569]'
              )}
            >
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full border transition-colors',
                  active
                    ? 'border-[#C21733] bg-[#C21733]/10 text-[#C21733]'
                    : 'border-slate-200 bg-white text-[#475569]'
                )}
                aria-hidden
              >
                ●
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
