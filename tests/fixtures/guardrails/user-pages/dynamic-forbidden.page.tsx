import { getServerConfig } from '../../../../lib/config/store';

export const dynamic = 'force-dynamic';

export default function DynamicForbiddenPage(): null {
  void getServerConfig;
  return null;
}
