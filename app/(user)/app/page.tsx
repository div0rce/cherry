import { redirect } from 'next/navigation';

export default function AppHome(): void {
  redirect('/app/onboarding');
}
