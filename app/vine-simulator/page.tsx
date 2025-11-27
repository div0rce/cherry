import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { VineSimulatorClient } from './client';

export default async function VineSimulatorPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect(`/signin?callbackUrl=${encodeURIComponent('/vine-simulator')}`);
  }

  return <VineSimulatorClient />;
}
