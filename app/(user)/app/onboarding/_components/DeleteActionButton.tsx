'use client';

import type { JSX } from 'react';
import { useFormState } from 'react-dom';
import type { ActionState } from '../_lib/form-state';
import { initialActionState } from '../_lib/form-state';
import { FormMessage } from './form-helpers';

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
  const [state, formAction] = useFormState<ActionState, FormData>(
    async (prevState, formData) => (await action(prevState, formData)) ?? initialActionState,
    initialActionState
  );

  return (
    <form action={formAction} className="space-y-1">
      {Object.entries(hiddenFields).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <button
        type="submit"
        className="inline-flex items-center rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
      >
        {label}
      </button>
      {state.status === 'error' ? (
        <FormMessage tone="error">{state.message ?? 'Unable to delete right now.'}</FormMessage>
      ) : null}
    </form>
  );
}
