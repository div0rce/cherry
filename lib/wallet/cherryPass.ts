import fs from 'fs';
import path from 'path';
import { PKPass } from 'passkit-generator';
import type { WalletCertificateConfig } from '../config/server.js';
import { getServerConfig } from '../config/store.js';

function hasNonEmptyString(value?: string | null): value is string {
  return value !== undefined && value !== null && value !== '';
}

function assertWalletConfig(config: WalletCertificateConfig): void {
  const missing = [
    ['APPLE_WALLET_TEAM_ID', config.teamId],
    ['APPLE_WALLET_PASS_TYPE_ID', config.passTypeId],
    ['APPLE_WALLET_ORG_NAME', config.orgName],
    ['APPLE_WALLET_PASS_DESCRIPTION', config.passDescription],
    ['APPLE_WALLET_CERT_PASSWORD', config.certPassword],
    ['APPLE_WALLET_CERT_PATH', config.certPath],
    ['APPLE_WALLET_WWDR_CERT_PATH', config.wwdrCertPath],
  ]
    .filter(([, value]) => !hasNonEmptyString(value))
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `[Cherry Wallet] Missing Apple Wallet config: ${missing.join(
        ', '
      )}. Pass generation cannot proceed.`
    );
  }
}

type CherryPassPayload = {
  userId: string;
  userName: string;
  cherryPoints: number;
};

// Tiny 1x1 red PNG, used as placeholder icon/logo to satisfy pass requirements.
const TINY_RED_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9YxKqW0AAAAASUVORK5CYII=';

export async function generateCherryPass(
  payload: CherryPassPayload,
  walletConfig?: WalletCertificateConfig
): Promise<Buffer> {
  const config = walletConfig ?? getServerConfig().wallet;

  if (config.enabled !== true) {
    throw new Error(
      '[Cherry Wallet] Apple Wallet is not configured. Missing certs/ENV. This feature is disabled until Apple Developer setup is complete.'
    );
  }

  assertWalletConfig(config);

  const cert = fs.readFileSync(path.resolve(config.certPath as string));
  const wwdr = fs.readFileSync(path.resolve(config.wwdrCertPath as string));
  const authToken = payload.userId.slice(0, 32);
  const authenticationToken = authToken !== '' ? authToken : 'cherry-token';

  const passDefinition = {
    formatVersion: 1,
    passTypeIdentifier: config.passTypeId,
    serialNumber: `${payload.userId}-${payload.cherryPoints}`,
    teamIdentifier: config.teamId,
    organizationName: config.orgName,
    description: config.passDescription,
    logoText: 'Cherry',
    foregroundColor: 'rgb(255,255,255)',
    backgroundColor: 'rgb(210, 0, 80)',
    labelColor: 'rgb(255,255,255)',
    storeCard: {
      primaryFields: [
        {
          key: 'balance',
          label: 'Cherry Points',
          value: payload.cherryPoints,
        },
      ],
      secondaryFields: [
        {
          key: 'user',
          label: 'Member',
          value: payload.userName,
        },
      ],
      auxiliaryFields: [
        {
          key: 'tagline',
          label: 'How to use',
          value: 'Scan Cherry before you pay.',
        },
      ],
    },
    webServiceURL: 'https://your-cherry-domain.com/api/pass-updates',
    authenticationToken,
    barcode: {
      format: 'PKBarcodeFormatQR',
      message: `cherry://user/${payload.userId}`,
      messageEncoding: 'iso-8859-1',
    },
  };

  const options = {
    wwdr,
    signerCert: cert,
    signerKey: cert,
    signerKeyPassphrase: config.certPassword ?? '',
  };

  const pass = new PKPass(
    {
      'pass.json': Buffer.from(JSON.stringify(passDefinition), 'utf-8'),
    },
    options
  );

  pass.type = 'storeCard';

  const iconBuffer = Buffer.from(TINY_RED_PNG_BASE64, 'base64');
  pass.addBuffer('icon.png', iconBuffer);
  pass.addBuffer('icon@2x.png', iconBuffer);
  pass.addBuffer('logo.png', iconBuffer);
  pass.addBuffer('logo@2x.png', iconBuffer);

  // passkit-generator types do not expose asBuffer; cast to an extended type to access runtime method.
  return (pass as PKPass & { asBuffer: () => Promise<Buffer> }).asBuffer();
}
