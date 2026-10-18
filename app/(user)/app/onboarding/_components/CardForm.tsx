'use client';

import type { JSX, ReactNode } from 'react';
import type { ActionState } from '../_lib/form-state.js';
import { FieldError, OptionalHidden, errorsFor, useFormAction, FormMessage, SubmitButton, centsToInput, inputClasses } from './form-helpers.js';

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

const RADIO_LABEL =
  'flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-[#0f172a]';

function CardTypeRadios({ isDebit }: { isDebit: boolean }): JSX.Element {
  return (
    <div role="radiogroup" aria-labelledby="group-card-type" className="grid grid-cols-2 gap-2">
      <label className={RADIO_LABEL}>
        <input type="radio" name="cardType" value="credit" defaultChecked={!isDebit} />
        Credit
      </label>
      <label className={RADIO_LABEL}>
        <input type="radio" name="cardType" value="debit" defaultChecked={isDebit} />
        Debit
      </label>
    </div>
  );
}

export function CardForm({ action, defaultValues, submitLabel, footerSlot }: CardFormProps): JSX.Element {
  const [state, formAction, pending] = useFormAction(action);

  const annualFeeDefault = centsToInput(defaultValues?.annualFeeCents, 2);

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <OptionalHidden name="cardId" value={defaultValues?.cardId} />
      <div className="space-y-2">
        <label htmlFor="field-nickname" className="block text-sm font-semibold text-[#0f172a]">Nickname</label>
        <input
          id="field-nickname"
          name="nickname"
          defaultValue={defaultValues?.nickname ?? ''}
          placeholder="Amex Gold"
          required
          className={inputClasses}
        />
        <FieldError errors={errorsFor(state, 'nickname')} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="field-issuer" className="block text-sm font-semibold text-[#0f172a]">Issuer</label>
          <input
            id="field-issuer"
            name="issuer"
            defaultValue={defaultValues?.issuer ?? ''}
            placeholder="AMEX, Chase, Local credit union"
            className={inputClasses}
          />
          <FieldError errors={errorsFor(state, 'issuer')} />
        </div>
        <div className="space-y-2">
          <label htmlFor="field-network" className="block text-sm font-semibold text-[#0f172a]">Network</label>
          <select
            id="field-network"
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
          <FieldError errors={errorsFor(state, 'network')} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <span id="group-card-type" className="block text-sm font-semibold text-[#0f172a]">Card type</span>
          <CardTypeRadios isDebit={defaultValues?.isCredit === false} />
          <FieldError errors={errorsFor(state, 'cardType')} />
        </div>
        <div className="space-y-2">
          <label htmlFor="field-annualFee" className="block text-sm font-semibold text-[#0f172a]">Annual fee (USD)</label>
          <input
            id="field-annualFee"
            type="number"
            name="annualFee"
            min="0"
            step="0.01"
            placeholder="0.00"
            defaultValue={annualFeeDefault}
            className={inputClasses}
          />
          <FieldError errors={errorsFor(state, 'annualFee')} />
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
