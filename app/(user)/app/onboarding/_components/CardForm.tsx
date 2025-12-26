'use client';

import * as React from 'react';
import type { JSX, ReactNode } from 'react';
import type { ActionState } from '../_lib/form-state.js';
import { initialActionState } from '../_lib/form-state.js';
import { FieldError, FormMessage, SubmitButton, hasNumber, inputClasses } from './form-helpers.js';

type CardFormProps = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState | void>;
  defaultValues?: {
    cardId?: string;
    nickname?: string;
    issuer?: string;
    network?: string;
    isCredit?: boolean;
    annualFeeCents?: number | null;
  };
  submitLabel: string;
  footerSlot?: ReactNode;
};

export function CardForm({ action, defaultValues, submitLabel, footerSlot }: CardFormProps): JSX.Element {
  const [state, formAction, pending] = React.useActionState<ActionState, FormData>(
    async (prevState, formData) => (await action(prevState, formData)) ?? initialActionState,
    initialActionState
  );

  const hasAnnualFee = hasNumber(defaultValues?.annualFeeCents);
  const annualFeeDefault = hasAnnualFee ? ((defaultValues?.annualFeeCents ?? 0) / 100).toFixed(2) : '';
  const cardIdValue = typeof defaultValues?.cardId === 'string' ? defaultValues.cardId : null;

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {cardIdValue !== null ? <input type="hidden" name="cardId" value={cardIdValue} /> : null}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-[#0f172a]">Nickname</label>
        <input
          name="nickname"
          defaultValue={defaultValues?.nickname ?? ''}
          placeholder="Amex Gold"
          required
          className={inputClasses}
        />
        <FieldError errors={state.fieldErrors?.['nickname'] ?? []} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-[#0f172a]">Issuer</label>
          <input
            name="issuer"
            defaultValue={defaultValues?.issuer ?? ''}
            placeholder="AMEX, Chase, Local credit union"
            className={inputClasses}
          />
          <FieldError errors={state.fieldErrors?.['issuer'] ?? []} />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-[#0f172a]">Network</label>
          <select
            name="network"
            defaultValue={defaultValues?.network ?? 'VISA'}
            className={inputClasses}
          >
            <option value="VISA">Visa</option>
            <option value="MASTERCARD">Mastercard</option>
            <option value="AMEX">American Express</option>
            <option value="DISCOVER">Discover</option>
            <option value="OTHER">Other</option>
          </select>
          <FieldError errors={state.fieldErrors?.['network'] ?? []} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-[#0f172a]">Card type</label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-[#0f172a]">
              <input
                type="radio"
                name="cardType"
                value="credit"
                defaultChecked={defaultValues?.isCredit !== false}
              />
              Credit
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-[#0f172a]">
              <input
                type="radio"
                name="cardType"
                value="debit"
                defaultChecked={defaultValues?.isCredit === false}
              />
              Debit
            </label>
          </div>
          <FieldError errors={state.fieldErrors?.['cardType'] ?? []} />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-[#0f172a]">Annual fee (USD)</label>
          <input
            type="number"
            name="annualFee"
            min="0"
            step="0.01"
            placeholder="0.00"
            defaultValue={annualFeeDefault}
            className={inputClasses}
          />
          <FieldError errors={state.fieldErrors?.['annualFee'] ?? []} />
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
