import { fetchFromApi } from '../(user)/_lib/actions';
import type { ReactElement } from 'react';

export default async function LegacyPage(): Promise<ReactElement> {
  await fetchFromApi('/api/health');
  return <div>Legacy</div>;
}
