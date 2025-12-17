import assert from 'assert';
import { evaluateDailyStateTransition } from '../lib/alerts/alertPolicy';

function ds({ status, date }) {
  return {
    status,
    date: new Date(date),
  };
}

assert.deepStrictEqual(
  evaluateDailyStateTransition({ prev: ds({ status: 'SAFE', date: '2025-12-01' }), curr: ds({ status: 'TIGHT', date: '2025-12-02' }) }),
  { shouldAlert: true, reason: 'SAFE_TO_TIGHT' }
);

assert.deepStrictEqual(
  evaluateDailyStateTransition({ prev: ds({ status: 'TIGHT', date: '2025-12-02' }), curr: ds({ status: 'RISKY', date: '2025-12-03' }) }),
  { shouldAlert: true, reason: 'TIGHT_TO_RISKY' }
);

assert.deepStrictEqual(
  evaluateDailyStateTransition({ prev: ds({ status: 'RISKY', date: '2025-12-02' }), curr: ds({ status: 'TIGHT', date: '2025-12-03' }) }),
  { shouldAlert: false }
);

assert.deepStrictEqual(
  evaluateDailyStateTransition({ prev: ds({ status: 'SAFE', date: '2025-12-02' }), curr: ds({ status: 'SAFE', date: '2025-12-03' }) }),
  { shouldAlert: false }
);

assert.deepStrictEqual(
  evaluateDailyStateTransition({ prev: null, curr: ds({ status: 'TIGHT', date: '2025-12-03' }) }),
  { shouldAlert: false }
);

assert.deepStrictEqual(
  evaluateDailyStateTransition({ prev: ds({ status: 'SAFE', date: '2025-12-03' }), curr: ds({ status: 'TIGHT', date: '2025-12-03' }) }),
  { shouldAlert: false }
);

console.warn('alertPolicy: ok');
