import type { JSX } from 'react';
import { AutopilotEntry } from './_components/AutopilotEntry';

export default async function AppHome(): Promise<JSX.Element> {
  return AutopilotEntry();
}
