'use client';

import type { JSX } from 'react';
import { useState } from 'react';
import { signOut } from 'next-auth/react';

export function SignOutButton(): JSX.Element {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void signOut({ callbackUrl: '/signin' });
      }}
      className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400 disabled:opacity-60"
    >
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
