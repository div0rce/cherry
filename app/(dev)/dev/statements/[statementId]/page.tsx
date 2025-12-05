import { redirect } from 'next/navigation';
import { ROUTES } from '@/lib/routes';

export default function StatementDetailRedirect(): never {
  redirect(ROUTES.dev.statements);
}
