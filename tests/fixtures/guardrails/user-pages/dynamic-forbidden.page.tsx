import { getServerConfig } from '../../../../lib/config/store.js';

export const dynamic = 'force-dynamic';

export default function DynamicForbiddenPage(): null {
  void getServerConfig;
  return null;
}
