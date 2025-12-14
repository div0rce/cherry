'use client';

import type { JSX, ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { cn } from '@/lib/ui/cn';

export const inputClasses =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4d6d]';

export function FieldError({ errors }: { errors?: string[] }): JSX.Element | null {
  if (!errors || errors.length === 0) return null;
  return <p className="text-sm text-rose-600">{errors[0]}</p>;
}

export function FormMessage({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'error' | 'success';
  children?: ReactNode;
}): JSX.Element | null {
  if (!children) return null;
  const toneClass =
    tone === 'error' ? 'text-rose-600' : tone === 'success' ? 'text-emerald-600' : 'text-slate-600';
  return <p className={cn('text-sm', toneClass)}>{children}</p>;
}

export function SubmitButton({
  label,
  pendingLabel = 'Saving…',
  variant = 'primary',
}: {
  label: string;
  pendingLabel?: string;
  variant?: 'primary' | 'ghost';
}): JSX.Element {
  const { pending } = useFormStatus();
  const baseClasses =
    'inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold transition';
  const variantClass =
    variant === 'primary'
      ? 'bg-[#0f172a] text-white hover:bg-[#111827]'
      : 'border border-slate-200 text-[#0f172a] hover:bg-white';
  return (
    <button
      type="submit"
      className={cn(baseClasses, variantClass, pending && 'opacity-70')}
      aria-disabled={pending}
      disabled={pending}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
