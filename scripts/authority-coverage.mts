import { createRequire } from 'node:module';

const requireFn = createRequire(import.meta.url);
requireFn('ts-node/register/transpile-only');

const { prisma } = requireFn('../lib/prisma.ts') as typeof import('../lib/prisma.ts');

async function main(): Promise<void> {
  const events = await prisma.decisionEvent.findMany({
    select: {
      verdict: true,
      reasonCode: true,
      surface: true,
      severity: true,
    },
  });

  const total = events.length > 0 ? events.length : 1;
  const verdicts: Record<string, number> = {};
  const reasons: Record<string, number> = {};
  const surfaces: Record<string, number> = {};
  const severity: Record<string, number> = {};

  for (const event of events) {
    const nextVerdictCount = verdicts[event.verdict] ?? 0;
    verdicts[event.verdict] = nextVerdictCount + 1;
    const nextReasonCount = reasons[event.reasonCode] ?? 0;
    reasons[event.reasonCode] = nextReasonCount + 1;
    const nextSurfaceCount = surfaces[event.surface] ?? 0;
    surfaces[event.surface] = nextSurfaceCount + 1;
    const nextSeverityCount = severity[String(event.severity)] ?? 0;
    severity[String(event.severity)] = nextSeverityCount + 1;
  }

  const pct = (count: number): string => `${((count / total) * 100).toFixed(1)}%`;

  console.warn('Authority coverage snapshot');
  console.warn(
    JSON.stringify(
      Object.entries(verdicts).map(([verdict, count]) => ({
        verdict,
        count,
        pct: pct(count),
      })),
      null,
      2
    )
  );
  console.warn(
    JSON.stringify(
      Object.entries(reasons).map(([reason, count]) => ({
        reason,
        count,
        pct: pct(count),
      })),
      null,
      2
    )
  );
  console.warn(
    JSON.stringify(
      Object.entries(severity).map(([level, count]) => ({
        severity: level,
        count,
        pct: pct(count),
      })),
      null,
      2
    )
  );
  console.warn(
    JSON.stringify(
      Object.entries(surfaces).map(([surface, count]) => ({
        surface,
        count,
        pct: pct(count),
      })),
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
