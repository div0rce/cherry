"use client";

import * as React from 'react';
import type { JSX } from 'react';
import type { ActionState } from '../_lib/form-state';
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
  const [state, formAction] = React.useActionState<ActionState, FormData>(
    async (prevState, formData) =>
      (await action(prevState, formData)) ?? initialActionState,
    initialActionState
  );

  return (
    <>
      {Object.entries(hiddenFields).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <button
        type="submit"
        formAction={formAction}
        className="inline-flex items-center rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
      >
        {label}
      </button>
      {state.status === 'error' ? (
        <FormMessage tone="error">{state.message ?? 'Unable to delete right now.'}</FormMessage>
      ) : null}
    </>
  );
}
