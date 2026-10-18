"use client";

import * as React from 'react';
import type { JSX } from 'react';
import type { ActionState } from '../_lib/form-state.js';
import { initialActionState } from '../_lib/form-state.js';
import { FormMessage } from './form-helpers.js';

type DeleteActionButtonProps = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState | void>;
  hiddenFields: Record<string, string>;
  label: string;
};

export function DeleteActionButton({
  action,
  hiddenFields,
  label,
}: DeleteActionButtonProps): JSX.Element {
  const [confirming, setConfirming] = React.useState(false);
  const [state, formAction, pending] = React.useActionState<ActionState, FormData>(
    async (prevState, formData) =>
      (await action(prevState, formData)) ?? initialActionState,
    initialActionState
  );

  return (
    <>
      {Object.entries(hiddenFields).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      {/* Two steps, so one stray click cannot delete; no browser dialog needed. */}
      {confirming ? (
        <span className="inline-flex items-center gap-2">
          <button
            type="submit"
            formAction={formAction}
            disabled={pending}
            className="inline-flex items-center rounded-lg border border-rose-300 bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
          >
            {pending ? 'Deleting…' : 'Yes, delete'}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirming(false)}
            className="px-2 py-2 text-sm font-medium text-slate-600"
          >
            Cancel
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex items-center rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
        >
          {label}
        </button>
      )}
      {state.status === 'error' ? (
        <FormMessage tone="error">{state.message ?? 'Unable to delete right now.'}</FormMessage>
      ) : null}
    </>
  );
}
