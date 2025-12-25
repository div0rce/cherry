import type { Clock } from '../clock';

export const SystemClock: Clock = {
  nowMs: () => Date.now(),
};
