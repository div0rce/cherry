import type { JSX } from 'react';
import { requireUserContext } from '../_lib/api.js';
import { HomeScreen } from './_components/HomeScreen.js';
export const dynamic = 'force-dynamic';


export default async function AppHome(): Promise<JSX.Element> {
  await requireUserContext();
  return <HomeScreen />;
}
