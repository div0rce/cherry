'use client';

import * as React from 'react';
import type { JSX, ReactNode } from 'react';
import type { ActionState } from '../_lib/form-state';
import { initialActionState } from '../_lib/form-state.js';
import { FieldError, FormMessage, SubmitButton, hasNumber, inputClasses } from './form-helpers.js';

const CATEGORY_OPTIONS = [
  { value: 'DINING', label: 'Dining' },
  { value: 'GROCERIES', label: 'Groceries' },
  { value: 'GAS', label: 'Gas' },
  { value: 'TRAVEL', label: 'Travel' },
  { value: 'OTHER', label: 'Other / Base' },
] as const;

type RewardRuleFormProps = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState | void>;
  cardId: string;
  defaultValues?: {
    ruleId?: string;
    category?: string;
    multiplier?: number | null;
    cashbackPercent?: number | null;
  };
  submitLabel: string;
  footerSlot?: ReactNode;
};

export function RewardRuleForm({
  action,
  cardId,
  defaultValues,
  submitLabel,
  footerSlot,
}: RewardRuleFormProps): JSX.Element {
  const [state, formAction, pending] = React.useActionState<ActionState, FormData>(
    async (prevState, formData) => (await action(prevState, formData)) ?? initialActionState,
    initialActionState
  );

  const hasCashback = hasNumber(defaultValues?.cashbackPercent);
  const hasMultiplier = hasNumber(defaultValues?.multiplier);
  const defaultRateKind = hasCashback ? 'cashback' : 'points';
  const defaultRateValue = hasCashback
    ? String(defaultValues?.cashbackPercent ?? '')
    : hasMultiplier
      ? String(defaultValues?.multiplier ?? '')
      : '';
  const defaultScope = (defaultValues?.category ?? 'OTHER') === 'OTHER' ? 'BASE' : 'CATEGORY';
  const ruleIdValue = typeof defaultValues?.ruleId === 'string' ? defaultValues.ruleId : null;

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <input type="hidden" name="cardId" value={cardId} />
      {ruleIdValue !== null ? <input type="hidden" name="ruleId" value={ruleIdValue} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-[#0f172a]">Scope</label>
          <select name="scope" defaultValue={defaultScope} className={inputClasses}>
            <option value="BASE">Base (catch-all)</option>
            <option value="CATEGORY">Specific category</option>
          </select>
          <FieldError errors={state.fieldErrors?.['scope'] ?? []} />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-[#0f172a]">Category</label>
          <select
            name="category"
            defaultValue={defaultValues?.category ?? 'OTHER'}
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

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-[#0f172a]">Reward type</label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-[#0f172a]">
              <input type="radio" name="rateKind" value="points" defaultChecked={defaultRateKind === 'points'} />
              Points (x)
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-[#0f172a]">
              <input type="radio" name="rateKind" value="cashback" defaultChecked={defaultRateKind === 'cashback'} />
              Cash back (%)
            </label>
          </div>
          <FieldError errors={state.fieldErrors?.['rateKind'] ?? []} />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-[#0f172a]">Rate</label>
          <input
            type="number"
            name="rateValue"
            min="0"
            step="0.01"
            placeholder="4 for 4x or 2.5 for 2.5% back"
            defaultValue={defaultRateValue}
            className={inputClasses}
          />
          <FieldError errors={state.fieldErrors?.['rateValue'] ?? []} />
        </div>
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
