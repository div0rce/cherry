import { redirect } from 'next/navigation';

export default function StatementDetailRedirect(): never {
  redirect('/activity');
}
