import { redirect } from 'next/navigation';
import { ROUTES } from '../lib/routes.js';

// ponytail: no marketing page yet; the root sends people into the app (which sends signed-out
// visitors to /signin). Replace with app/(marketing)/page.tsx when one exists.
export default function RootPage(): never {
  redirect(ROUTES.user.app);
}
