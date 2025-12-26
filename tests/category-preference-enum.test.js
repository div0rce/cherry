/* eslint-disable @typescript-eslint/no-require-imports */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const assert = require('node:assert/strict');
const { normalizeCategoryPreference } = require('../lib/category-preferences');
const { RewardCategory } = require('@prisma/client');

function run() {
  assert.equal(normalizeCategoryPreference(' dining '), RewardCategory.DINING);
  assert.equal(normalizeCategoryPreference('gRoCeRiEs'), RewardCategory.GROCERIES);
  assert.equal(normalizeCategoryPreference('air-travel'), RewardCategory.AIR_TRAVEL);
  assert.equal(normalizeCategoryPreference('unknown-value'), RewardCategory.OTHER);
  console.warn('category preference enum normalization: ok');
}

run();

