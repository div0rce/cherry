import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function getUserIdFromSession(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

// Convenience alias used by server components.
export async function getCurrentUserId(): Promise<string> {
  const userId = await getUserIdFromSession();
  if (!userId) {
    throw new Error('User not authenticated');
  }
  return userId;
}
