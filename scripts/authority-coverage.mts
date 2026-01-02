import { prisma } from '../lib/prisma.js';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { asMessage } from './guardrails/lib/error.mjs';
import { fail } from './guardrails/lib/fail.mjs';

ensureTsEsm();

const PREFIX = 'authority-coverage';
const FIX = 'Ensure the database is reachable and decision events exist.';


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

main().catch((err: unknown) => {
  const message = asMessage(err);
  fail(PREFIX, `Authority coverage failed: ${message}`, { fix: FIX });
});
