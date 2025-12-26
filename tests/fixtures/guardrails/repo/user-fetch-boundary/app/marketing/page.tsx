import { fetchFromApi } from '@/app/(user)/_lib/api';
import type { ReactElement } from 'react';

export default async function MarketingPage(): Promise<ReactElement> {
  await fetchFromApi('/api/health');
  return <div>Marketing</div>;
}
