import * as assert from 'node:assert/strict';
import { buildCherryPassDefinition } from '../../lib/wallet/cherryPass.js';

const definition = buildCherryPassDefinition(
  { userId: 'user_123', userName: 'Ada', cherryPoints: 42 },
  { passTypeId: 'pass.com.cherry.pass', teamId: 'TEAMID', orgName: 'Cherry', passDescription: 'Cherry Pass' }
);

// No pass-update web service exists, so the pass must not advertise one (and must not carry a token
// derived from the user id).
assert.equal('webServiceURL' in definition, false);
assert.equal('authenticationToken' in definition, false);

// Advisory store card only, showing the supplied points balance.
assert.equal('storeCard' in definition, true);
assert.equal('boardingPass' in definition || 'coupon' in definition || 'eventTicket' in definition, false);
const storeCard = definition['storeCard'] as { primaryFields: Array<{ key: string; value: unknown }> };
assert.deepEqual(storeCard.primaryFields[0], { key: 'balance', label: 'Cherry Points', value: 42 });

// The serial is stable across balance changes, so a re-download replaces the existing card.
const later = buildCherryPassDefinition(
  { userId: 'user_123', userName: 'Ada', cherryPoints: 99 },
  { passTypeId: 'pass.com.cherry.pass', teamId: 'TEAMID', orgName: 'Cherry', passDescription: 'Cherry Pass' }
);
assert.equal(later['serialNumber'], definition['serialNumber']);

process.stdout.write('wallet-pass-definition: ok\n');
