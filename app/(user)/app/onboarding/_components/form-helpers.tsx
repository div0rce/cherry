'use client';

import * as React from 'react';

import type { JSX, ReactNode } from 'react';
import { cn } from '../../../../../lib/ui/cn.js';
import type { ActionState } from '../_lib/form-state.js';
import { initialActionState } from '../_lib/form-state.js';

// Field errors for one input, or none.
export function errorsFor(state: { fieldErrors?: Record<string, string[] | undefined> | undefined }, key: string): string[] {
  return state.fieldErrors?.[key] ?? [];
}

// Hidden id field, rendered only when editing an existing record.
export function OptionalHidden({ name, value }: { name: string; value: unknown }): JSX.Element | null {
  return typeof value === 'string' ? <input type="hidden" name={name} value={value} /> : null;
}

type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState | void>;

// Shared action wiring for onboarding forms. With stampNow, the submit time is added as `now`: server
// actions need an explicit time and this wrapper runs on the client, the time boundary.
export function useFormAction(
  action: FormAction,
  stampNow = false
): [ActionState, (formData: FormData) => void, boolean] {
  return React.useActionState<ActionState, FormData>(async (prevState, formData) => {
    if (stampNow) formData.set('now', String(Math.round(performance.timeOrigin + performance.now())));
    return (await action(prevState, formData)) ?? initialActionState;
  }, initialActionState);
}

// Integer cents as an input's default text ("" when absent), e.g. 12345 -> "123.45".
export function centsToInput(cents: number | null | undefined, digits: number): string {
  return hasNumber(cents) ? (cents / 100).toFixed(digits) : '';
}

export const inputClasses =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4d6d]';

export function FieldError({ errors }: { errors?: string[] }): JSX.Element | null {
  const hasErrors = Array.isArray(errors) && errors.length > 0;
  if (!hasErrors) return null;
  return <p role="alert" className="text-sm text-rose-600">{errors[0]}</p>;
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
