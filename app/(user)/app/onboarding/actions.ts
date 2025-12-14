'use server';

import { revalidatePath } from 'next/cache';
import { seedCardsAndBucketsForUser } from '@/lib/demo-seeder';
import { resolveUserContext } from '@/lib/user-context';
import type { ActionState } from './_lib/form-state';
import { getAutopilotPrereqs } from './_lib/prereqs';

export async function loadDemoDataset(
  _prevState: ActionState,
  _formData: FormData
): Promise<ActionState> {
  const { userId, mode } = await resolveUserContext({ requireAuth: true, allowLabDemo: true });

  if (mode !== 'LAB_DEMO') {
    return { status: 'error', message: 'Demo dataset is only available in lab demo mode.' };
  }

  const prereqs = await getAutopilotPrereqs(userId);
  if (prereqs.state === 'READY') {
    return { status: 'error', message: 'Autopilot is already ready; no demo data loaded.' };
  }

  await seedCardsAndBucketsForUser(userId, { includeCategoryPreference: true });
  revalidatePath('/app/onboarding');

  return {
    status: 'idle',
    message: 'Loaded demo cards, reward rules, and buckets for this lab session.',
  };
}
