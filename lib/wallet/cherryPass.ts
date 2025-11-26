import fs from 'fs';
import path from 'path';
import { PKPass } from 'passkit-generator';

const {
  APPLE_WALLET_TEAM_ID,
  APPLE_WALLET_PASS_TYPE_ID,
  APPLE_WALLET_ORG_NAME,
  APPLE_WALLET_PASS_DESCRIPTION,
  APPLE_WALLET_CERT_PASSWORD,
  APPLE_WALLET_CERT_PATH,
  APPLE_WALLET_WWDR_CERT_PATH,
} = process.env;

function assertWalletEnv() {
  const missing = [
    ['APPLE_WALLET_TEAM_ID', APPLE_WALLET_TEAM_ID],
    ['APPLE_WALLET_PASS_TYPE_ID', APPLE_WALLET_PASS_TYPE_ID],
    ['APPLE_WALLET_ORG_NAME', APPLE_WALLET_ORG_NAME],
    ['APPLE_WALLET_PASS_DESCRIPTION', APPLE_WALLET_PASS_DESCRIPTION],
    ['APPLE_WALLET_CERT_PASSWORD', APPLE_WALLET_CERT_PASSWORD],
    ['APPLE_WALLET_CERT_PATH', APPLE_WALLET_CERT_PATH],
    ['APPLE_WALLET_WWDR_CERT_PATH', APPLE_WALLET_WWDR_CERT_PATH],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    throw new Error(
      `[Cherry Wallet] Missing Apple Wallet env vars: ${missing.join(
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

export async function generateCherryPass(payload: CherryPassPayload): Promise<Buffer> {
  if (
    !APPLE_WALLET_TEAM_ID ||
    !APPLE_WALLET_PASS_TYPE_ID ||
    !APPLE_WALLET_ORG_NAME ||
    !APPLE_WALLET_PASS_DESCRIPTION ||
    !APPLE_WALLET_CERT_PASSWORD ||
    !APPLE_WALLET_CERT_PATH ||
    !APPLE_WALLET_WWDR_CERT_PATH
  ) {
    throw new Error(
      '[Cherry Wallet] Apple Wallet is not configured. Missing certs/ENV. This feature is disabled until Apple Developer setup is complete.'
    );
  }

  assertWalletEnv();

  const cert = fs.readFileSync(path.resolve(APPLE_WALLET_CERT_PATH!));
  const wwdr = fs.readFileSync(path.resolve(APPLE_WALLET_WWDR_CERT_PATH!));

  const passDefinition = {
    formatVersion: 1,
    passTypeIdentifier: APPLE_WALLET_PASS_TYPE_ID,
    serialNumber: `${payload.userId}-${Date.now()}`,
    teamIdentifier: APPLE_WALLET_TEAM_ID,
    organizationName: APPLE_WALLET_ORG_NAME,
    description: APPLE_WALLET_PASS_DESCRIPTION,
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
    authenticationToken: payload.userId.slice(0, 32) || 'cherry-token',
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
    signerKeyPassphrase: APPLE_WALLET_CERT_PASSWORD,
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
