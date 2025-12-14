'use client';

import type { JSX } from 'react';
import { useFormState } from 'react-dom';
import type { ActionState } from '../_lib/form-state';
import { initialActionState } from '../_lib/form-state';
import { FormMessage, SubmitButton } from './form-helpers';

type DemoDatasetButtonProps = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState | void>;
};

export function DemoDatasetButton({ action }: DemoDatasetButtonProps): JSX.Element {
  const [state, formAction] = useFormState<ActionState, FormData>(action, initialActionState);

  return (
    <form action={formAction} className="space-y-2">
      <SubmitButton variant="ghost" label="Load demo dataset" pendingLabel="Loading…" />
      <FormMessage tone={state.status === 'error' ? 'error' : 'success'}>
        {state.message}
      </FormMessage>
    </form>
  );
}
