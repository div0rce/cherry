'use client';

import { useEffect, useRef, useState } from 'react';
import { signOut } from 'next-auth/react';

export function UserMenu({ email }: { email?: string | null }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current) return;
      if (containerRef.current.contains(event.target as Node)) return;
      setOpen(false);
    }

    if (open) {
      document.addEventListener('click', handleClickOutside);
    } else {
      document.removeEventListener('click', handleClickOutside);
    }

    return () => document.removeEventListener('click', handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-md border border-white/5 bg-white/5 px-3 py-1.5 text-left text-sm text-slate-100 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="truncate max-w-48">{email ?? 'Account'}</span>
        <svg
          className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 12 8"
          aria-hidden="true"
        >
          <path
            d="M1.41.59 6 5.17 10.59.59 12 2l-6 6-6-6z"
            fill="currentColor"
            className="text-slate-300"
          />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 rounded-md border border-white/10 bg-slate-900/90 p-1 text-sm shadow-lg">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              void signOut({ callbackUrl: '/' });
            }}
            className="w-full rounded-md px-3 py-2 text-left text-slate-100 hover:bg-white/10"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
