import { resolveUserContext } from '../../../../../../../../lib/user-context';
import type { ReactElement } from 'react';

export default async function FixturePage(): Promise<ReactElement> {
  await resolveUserContext({ requireAuth: true, allowLabDemo: false });
  return <div>Fixture</div>;
}
