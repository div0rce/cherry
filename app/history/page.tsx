import { redirect } from 'next/navigation';

export default function HistoryRedirect(): never {
  redirect('/activity');
}
