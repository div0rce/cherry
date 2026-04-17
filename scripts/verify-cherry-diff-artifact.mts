import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { GENERIC_ARTIFACT_PREFIX, verifyCherryDiffArtifact } from './lib/cherry-diff-artifact.mjs';

ensureTsEsm();

verifyCherryDiffArtifact(GENERIC_ARTIFACT_PREFIX);
process.stdout.write('verify:cherry-diff-artifact: ok\n');
