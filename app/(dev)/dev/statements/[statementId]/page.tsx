import { redirect } from 'next/navigation';
import { ROUTES } from '../../../../../lib/routes.js';

export default function StatementDetailRedirect(): never {
  return redirect(ROUTES.dev.statements);
}
