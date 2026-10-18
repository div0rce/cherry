'use client'

import * as React from 'react';
import type { JSX, ReactNode } from 'react';
import type { ActionState } from '../_lib/form-state.js';
import { initialActionState } from '../_lib/form-state.js';
import { FieldError, FormMessage, SubmitButton, hasNumber, inputClasses } from './form-helpers.js';

const CATEGORY_OPTIONS = [
  { value: 'DINING', label: 'Dining' },
  { value: 'GROCERIES', label: 'Groceries' },
  { value: 'GAS', label: 'Gas' },
  { value: 'TRAVEL', label: 'Travel' },
  { value: 'OTHER', label: 'Other' },
] as const;

type BucketFormProps = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState | void>;
  defaultValues?: {
    bucketId?: string;
    name?: string;
    budgetAmountCents?: number;
    category?: string;
    period?: string;
  };
  submitLabel: string;
  footerSlot?: ReactNode;
};

export function BucketForm({
  action,
  defaultValues,
  submitLabel,
  footerSlot,
}: BucketFormProps): JSX.Element {
  const [state, formAction, pending] = React.useActionState<ActionState, FormData>(
    async (prevState, formData) => {
      // Server actions take an explicit `now`; this wrapper runs on the client, the time boundary.
      formData.set('now', String(Math.round(performance.timeOrigin + performance.now())));
      return (await action(prevState, formData)) ?? initialActionState;
    },
    initialActionState
  );

  const hasBudget = hasNumber(defaultValues?.budgetAmountCents);
  const defaultBudget = hasBudget ? ((defaultValues?.budgetAmountCents ?? 0) / 100).toFixed(0) : '';
  const bucketIdValue = typeof defaultValues?.bucketId === 'string' ? defaultValues.bucketId : null;

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {bucketIdValue !== null ? <input type="hidden" name="bucketId" value={bucketIdValue} /> : null}

      <div className="space-y-2">
        <label htmlFor="field-name" className="block text-sm font-semibold text-[#0f172a]">Bucket name</label>
        <input
          id="field-name"
          name="name"
          defaultValue={defaultValues?.name ?? ''}
          placeholder="Dining monthly"
          required
          className={inputClasses}
        />
        <FieldError errors={state.fieldErrors?.['name'] ?? []} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="field-budgetAmount" className="block text-sm font-semibold text-[#0f172a]">Budget limit (USD)</label>
          <input
            id="field-budgetAmount"
            type="number"
            name="budgetAmount"
            min="1"
            step="1"
            placeholder="400"
            defaultValue={defaultBudget}
            className={inputClasses}
          />
          <FieldError errors={state.fieldErrors?.['budgetAmount'] ?? []} />
        </div>
        <div className="space-y-2">
          <label htmlFor="field-category" className="block text-sm font-semibold text-[#0f172a]">Category</label>
          <select
            id="field-category"
            name="category"
            defaultValue={defaultValues?.category ?? 'DINING'}
            className={inputClasses}
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <FieldError errors={state.fieldErrors?.['category'] ?? []} />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="field-period" className="block text-sm font-semibold text-[#0f172a]">Period</label>
        <select
          id="field-period"
          name="period"
          defaultValue={defaultValues?.period ?? 'MONTHLY'}
          className={inputClasses}
        >
          <option value="MONTHLY">Monthly</option>
          <option value="WEEKLY">Weekly</option>
        </select>
        <FieldError errors={state.fieldErrors?.['period'] ?? []} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <FormMessage tone={state.status === 'error' ? 'error' : 'neutral'}>
            {state.status === 'error' ? state.message ?? 'Fix the highlighted fields.' : state.message}
          </FormMessage>
        </div>
        <div className="flex items-center gap-2">
          {footerSlot}
          <SubmitButton label={submitLabel} pendingLabel="Saving…" pending={pending} />
        </div>
      </div>
    </form>
  );
}
