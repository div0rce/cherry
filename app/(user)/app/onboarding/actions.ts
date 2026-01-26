'use server';

import { revalidatePath } from 'next/cache';
import { fetchFromApi, requireUserContext } from '../../_lib/api.js';
import { resolveExplicitNow } from '../../_lib/clock.js';
import type { ActionState } from './_lib/form-state';

export async function loadDemoDataset(
  _prevState: ActionState,
  _formData: FormData
): Promise<ActionState> {
  const { mode } = await requireUserContext();

  if (mode !== 'LAB_DEMO') {
    return { status: 'error', message: 'Demo dataset is only available in lab demo mode.' };
  }

  const now = resolveExplicitNow(_formData.get('now'));
  const prereqResponse = await fetchFromApi<{ prereqs?: { state?: string } }>(
    '/api/autopilot/prereqs'
  );
  if (prereqResponse.ok !== true) {
    return { status: 'error', message: 'Unable to verify onboarding prerequisites.' };
  }
  const prereqPayload = prereqResponse.data;
  if (prereqPayload.prereqs?.state === 'READY') {
    return { status: 'error', message: 'Autopilot is already ready; no demo data loaded.' };
  }

  const response = await fetchFromApi<unknown>('/api/seed-demo/cards-buckets', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ nowMs: now.getTime() }),
  });
  if (response.ok !== true) {
    return { status: 'error', message: 'Failed to load demo dataset.' };
  }
  revalidatePath('/app/onboarding');

  return {
    status: 'idle',
    message: 'Loaded demo cards, reward rules, and buckets for this lab session.',
  };
}
