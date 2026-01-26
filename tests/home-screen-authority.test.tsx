import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getHomeUiBundle } from '../lib/home/ui-bundle.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run(): Promise<void> {
  const bundle = await getHomeUiBundle('test-user');
  const homeScreenPath = path.resolve(__dirname, '../app/(user)/app/_components/HomeScreen.tsx');
  const componentSource = fs.readFileSync(homeScreenPath, 'utf8').toLowerCase();

  const forbidden = [
    'approve',
    'decline',
    'authorize',
    'terminal',
    'fronting',
    'best card',
    'tap to pay',
    'proxy',
    'route',
    'process',
    'settle',
    'use this card',
    'payment rail',
    'payment card',
    'proxy bin',
    'cherry terminal',
    'tap to pay with cherry',
  ];

  const textsToScan: string[] = [componentSource];
  const collectStrings = (value: unknown): void => {
    if (typeof value === 'string') {
      textsToScan.push(value.toLowerCase());
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry) => collectStrings(entry));
      return;
    }
    if (value !== null && typeof value === 'object') {
      Object.values(value).forEach((entry) => collectStrings(entry));
    }
  };

  collectStrings(bundle);

  forbidden.forEach((word) => {
    const found = textsToScan.some((text) => text.includes(word));
    assert.ok(!found, `Forbidden language detected on Home: ${word}`);
  });

  assert.ok(
    componentSource.includes('plan a purchase'),
    'Primary CTA must surface plan-a-purchase entry for Autopilot intent declaration'
  );

  process.stdout.write('home-screen-authority: ok\n');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
