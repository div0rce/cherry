'use client';

import type { JSX, ReactNode } from 'react';
import { cn } from '../../../../../lib/ui/cn';

export const inputClasses =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4d6d]';

export function FieldError({ errors }: { errors?: string[] }): JSX.Element | null {
  const hasErrors = Array.isArray(errors) && errors.length > 0;
  if (!hasErrors) return null;
  return <p className="text-sm text-rose-600">{errors[0]}</p>;
}

export function FormMessage({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'error' | 'success';
  children?: ReactNode;
}): JSX.Element | null {
  const hasContent =
    typeof children === 'string' ? children.trim().length > 0 : Boolean(children);
  if (!hasContent) return null;
  const toneClass =
    tone === 'error' ? 'text-rose-600' : tone === 'success' ? 'text-emerald-600' : 'text-slate-600';
  return <p className={cn('text-sm', toneClass)}>{children}</p>;
}

export function SubmitButton({
  label,
  pendingLabel = 'Saving…',
  variant = 'primary',
  pending,
}: {
  label: string;
  pendingLabel?: string;
  variant?: 'primary' | 'ghost';
  pending: boolean;
}): JSX.Element {
  const isPending = pending;
  const baseClasses =
    'inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold transition';
  const variantClass =
    variant === 'primary'
      ? 'bg-[#0f172a] text-white hover:bg-[#111827]'
      : 'border border-slate-200 text-[#0f172a] hover:bg-white';
  return (
    <button
      type="submit"
      className={cn(baseClasses, variantClass, isPending && 'opacity-70')}
      aria-disabled={isPending}
      disabled={isPending}
    >
      {isPending ? pendingLabel : label}
    </button>
  );
}

export const hasText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export const hasNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const asText = (value: FormDataEntryValue | null): string =>
  typeof value === 'string' ? value : '';

export const asOptionalText = (value: FormDataEntryValue | null): string | null => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text.length > 0 ? text : null;
};
