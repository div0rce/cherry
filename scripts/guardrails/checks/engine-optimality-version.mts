import { ensureTsEsm } from '../../lib/ensure-ts-esm.mjs';
import { fail } from '../lib/fail.mjs';
import { candidateSpaceVersion } from '../../../lib/engine/optimality/candidates.js';
import { objectiveVersion } from '../../../lib/engine/optimality/objective.js';
import { traceVersion } from '../../../lib/engine/optimality/types.js';

ensureTsEsm();

const PREFIX = 'check:engine-optimality-version';
const EXPECTED_OBJECTIVE_VERSION = 'objective_v1';
const EXPECTED_CANDIDATE_SPACE_VERSION = 'candidates_v1';
const EXPECTED_TRACE_VERSION = 'trace_v1';

const details: string[] = [];

if (objectiveVersion !== EXPECTED_OBJECTIVE_VERSION) {
  details.push(`objectiveVersion=${objectiveVersion} (expected ${EXPECTED_OBJECTIVE_VERSION})`);
}
if (candidateSpaceVersion !== EXPECTED_CANDIDATE_SPACE_VERSION) {
  details.push(
    `candidateSpaceVersion=${candidateSpaceVersion} (expected ${EXPECTED_CANDIDATE_SPACE_VERSION})`
  );
}
if (traceVersion !== EXPECTED_TRACE_VERSION) {
  details.push(`traceVersion=${traceVersion} (expected ${EXPECTED_TRACE_VERSION})`);
}

if (details.length > 0) {
  fail(PREFIX, 'Engine optimality versions changed', {
    details,
    fix: 'Update docs/engine-optimality/*, tests/engine/optimality/*, and this guardrail.',
  });
}

process.stdout.write('engine-optimality-version: ok\n');
