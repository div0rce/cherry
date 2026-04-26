import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

const repoRoot = process.cwd();

function readDoc(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function run(): void {
  const semantics = readDoc('docs/engine-time-semantics.md');
  const api = readDoc('docs/api.md');
  const trace = readDoc('docs/engine-optimality/trace.md');
  const backlog = readDoc('docs/brutal-remediation-backlog.md');

  assert.match(semantics, /`decisionTimeMs` is the only engine "now"/);
  assert.match(semantics, /`SCHEDULED` means effective at `effectiveAtMs`/);
  assert.match(semantics, /authorization-effective present-state semantics/);
  assert.match(semantics, /Pending and posted fields are not a posting, reversal, cancellation, settlement, or statement-cycle lifecycle simulator/);
  assert.match(semantics, /A scheduled paydown with `effectiveAtMs <= decisionTimeMs` is normalized into the present-effective path exactly once/);
  assert.match(semantics, /Future-only scheduled paydowns may not affect:/);
  assert.match(semantics, /present score/);
  assert.match(semantics, /present degradation/);
  assert.match(semantics, /present winner selection/);
  assert.match(semantics, /`paydownScheduledDateMs` remains a legacy-boundary-only input field/);

  assert.match(api, /temporalContext/);
  assert.match(api, /futureRiskContext/);
  assert.match(api, /`scheduledPaydownSourceStatus` meanings:/);
  assert.match(api, /`includesScheduledPaydowns = true` if and only if `scheduledPaydownSourceStatus = AVAILABLE_ACTIVE`/);
  assert.match(api, /`modelMode = PRESENT_ONLY` requires `horizonEndMs = null`/);
  assert.match(api, /`contingency = NONE` requires both contingent fields to be null/);
  assert.match(api, /`?projectedLiquidCents`? remains a present-only projection/);

  assert.match(trace, /`?paydownScheduledDateMs`? remains a legacy input axis only/);
  assert.match(trace, /Only already-effective scheduled paydowns with `effectiveAtMs <= decisionTimeMs` can affect present traces/);
  assert.match(trace, /Trace consumers must not infer posting, reversal, cancellation, settlement, or lifecycle replay from trace fields/);
  assert.match(backlog, /scheduled paydowns are retained with explicit `effectiveAtMs` \/ `decisionTimeMs` semantics/);

  console.warn('node docs-engine-time-semantics: ok');
}

run();
