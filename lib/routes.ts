export const ROUTES = {
  marketing: {
    home: '/',
  },
  user: {
    app: '/app',
  },
  dev: {
    root: '/dev',
    buckets: '/dev/buckets',
    history: '/dev/history',
    statements: '/dev/statements',
    cards: '/dev/cards',
    activity: '/dev/activity',
    ingest: '/dev/ingest',
    bank: '/dev/bank',
    evaluator: '/dev/evaluator',
    engine: {
      inspector: '/dev/engine/inspector',
      guardrails: '/dev/engine/guardrails',
    },
  },
} as const;
