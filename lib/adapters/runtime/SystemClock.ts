import type { Clock } from '../contracts/Clock.js';

export class SystemClock implements Clock {
  private readonly nowFn: () => Date;

  constructor(nowFn: () => Date) {
    this.nowFn = nowFn;
  }

  now(): Date {
    return this.nowFn();
  }
}
