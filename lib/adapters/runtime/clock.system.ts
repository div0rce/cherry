import type { Clock } from '../clock.js';

export const SystemClock: Clock = {
  nowMs: () => Date.now(),
};
