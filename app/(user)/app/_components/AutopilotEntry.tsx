import type { JSX } from 'react';
import { AutopilotShell } from '@/components/autopilot/AutopilotShell';
import type { AutopilotUiSpec } from '@/lib/autopilot/uiSpec';

type AutopilotEntryProps = {
  uiSpec: AutopilotUiSpec;
};

export function AutopilotEntry({ uiSpec }: AutopilotEntryProps): JSX.Element {
  return <AutopilotShell uiSpec={uiSpec} />;
}
