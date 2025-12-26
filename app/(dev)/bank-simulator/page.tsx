import type { JSX } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../api/auth/[...nextauth]/route.js';
import BankSimulatorClient from './client.js';

export default async function BankSimulatorPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect(`/signin?callbackUrl=${encodeURIComponent('/bank-simulator')}`);
  }

  return <BankSimulatorClient />;
}
