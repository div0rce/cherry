'use client'

import * as React from 'react';
import type { JSX } from 'react';
import type { ActionState } from '../_lib/form-state';
import { initialActionState } from '../_lib/form-state';
import { FormMessage, SubmitButton } from './form-helpers';

type DemoDatasetButtonProps = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState | void>;
};

export function DemoDatasetButton({ action }: DemoDatasetButtonProps): JSX.Element {
  const [state, formAction, pending] = React.useActionState<ActionState, FormData>(
    async (prevState, formData) => (await action(prevState, formData)) ?? initialActionState,
    initialActionState
  );

  return (
    <form action={formAction} className="space-y-2">
      <SubmitButton variant="ghost" label="Load demo dataset" pendingLabel="Loading…" pending={pending} />
      <FormMessage tone={state.status === 'error' ? 'error' : 'success'}>
        {state.message}
      </FormMessage>
    </form>
  );
}
