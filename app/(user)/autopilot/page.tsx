import { redirect } from 'next/navigation';
import { ROUTES } from '@/lib/routes';

export default function AutopilotRedirect(): void {
  redirect(ROUTES.user.app);
}
