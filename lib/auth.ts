import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '../app/api/auth/[...nextauth]/route';

export async function getUserIdFromSession(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string } | undefined;
  return user?.id ?? null;
}

// Convenience alias used by server components.
export async function getCurrentUserId(): Promise<string> {
  const userId = await getUserIdFromSession();
  if (userId === null || userId === '') {
    throw new Error('User not authenticated');
  }
  return userId;
}

export async function getCurrentUserIdOrRedirect(callbackUrl = '/'): Promise<string> {
  try {
    return await getCurrentUserId();
  } catch (error: unknown) {
    void error;
    return redirect(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
}
