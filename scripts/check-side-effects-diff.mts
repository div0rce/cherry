import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { z } from 'zod';
import { ensureTsEsm } from './lib/ensure-ts-esm.mts';

ensureTsEsm();


type AllowlistSource = 'legacy' | 'adapter' | 'boundary';

type AllowlistEntry = {
  effects: string[];
  source: AllowlistSource;
};

const ROOT = process.cwd();
const ALLOWLIST_PATH = path.join(ROOT, 'scripts', 'side-effects.allowlist.json');

const AllowlistEntrySchema = z
  .object({
    effects: z.array(z.string()),
    source: z.enum(['legacy', 'adapter', 'boundary']),
  })
  .strict();
const AllowlistSchema = z.record(z.string(), AllowlistEntrySchema);
const LegacyAllowlistSchema = z.record(z.string(), z.array(z.string()));

function fail(message: string): never {
  process.stderr.write(`[side-effects] ${message}\n`);
  process.exit(1);
}

function parseAllowlist(
  raw: string,
  label: string,
  options?: { allowLegacy?: boolean }
): Record<string, AllowlistEntry> {
  try {
    const parsedJson: unknown = globalThis.JSON.parse(raw);
    let parsed: Record<string, AllowlistEntry>;
    if (options?.allowLegacy) {
      try {
        parsed = AllowlistSchema.parse(parsedJson);
      } catch (_error: unknown) {
        const legacy = LegacyAllowlistSchema.parse(parsedJson);
        const converted: Record<string, AllowlistEntry> = {};
        const legacyEntries = Object.entries(legacy) as Array<[string, string[]]>;
        for (const [key, effects] of legacyEntries) {
          converted[key] = { effects, source: 'legacy' };
        }
        parsed = converted;
      }
    } else {
      parsed = AllowlistSchema.parse(parsedJson);
    }
    const normalized: Record<string, AllowlistEntry> = {};
    const entries = Object.entries(parsed) as Array<[string, AllowlistEntry]>;
    for (const [key, entry] of entries) {
      normalized[path.normalize(key)] = {
        effects: entry.effects.slice().sort(),
        source: entry.source,
      };
    }
    return normalized;
  } catch (err: unknown) {
    fail(`Failed to parse ${label}: ${(err as Error).message}`);
  }
}

function loadCurrentAllowlist(): Record<string, AllowlistEntry> {
  if (!fs.existsSync(ALLOWLIST_PATH)) {
    fail(`Missing allowlist at ${path.relative(ROOT, ALLOWLIST_PATH)}`);
  }
  const raw = fs.readFileSync(ALLOWLIST_PATH, 'utf8');
  return parseAllowlist(raw, 'current allowlist');
}

function loadPreviousAllowlist(): Record<string, AllowlistEntry> | null {
  try {
    const raw = execSync(
      'git show HEAD~1:scripts/side-effects.allowlist.json',
      { encoding: 'utf8' }
    );
    return parseAllowlist(raw, 'previous allowlist', { allowLegacy: true });
  } catch (_error: unknown) {
    return null;
  }
}

function countLegacy(allowlist: Record<string, AllowlistEntry>): number {
  return Object.values(allowlist).filter((entry) => entry.source === 'legacy').length;
}

function main(): void {
  const current = loadCurrentAllowlist();
  const previous = loadPreviousAllowlist();

  if (!previous) {
    fail('Allowlist baseline missing; commit the allowlist before running diff checks.');
  }

  const previousLegacyCount = countLegacy(previous);
  const currentLegacyCount = countLegacy(current);
  if (currentLegacyCount > previousLegacyCount) {
    fail(`Legacy allowlist entries increased (${previousLegacyCount} -> ${currentLegacyCount})`);
  }

  const previousFiles = new Set(Object.keys(previous));
  const currentFiles = new Set(Object.keys(current));

  const addedFiles = [...currentFiles].filter((file) => !previousFiles.has(file));
  if (addedFiles.length > 0) {
    fail(`Allowlist growth detected (new files: ${addedFiles.join(', ')})`);
  }

  let addedEffectsCount = 0;
  let removedEffectsCount = 0;
  let sourceChanges = 0;
  for (const file of currentFiles) {
    const prevEntry = previous[file];
    const currEntry = current[file];
    if (!prevEntry || !currEntry) continue;

    const prevEffects = new Set(prevEntry.effects);
    const currEffects = new Set(currEntry.effects);
    for (const effect of currEffects) {
      if (!prevEffects.has(effect)) {
        addedEffectsCount += 1;
      }
    }
    for (const effect of prevEffects) {
      if (!currEffects.has(effect)) {
        removedEffectsCount += 1;
      }
    }
    if (prevEntry.source !== currEntry.source) {
      sourceChanges += 1;
    }
  }

  if (addedEffectsCount > 0) {
    fail(`Allowlist growth detected (${addedEffectsCount} new effects)`);
  }

  const removedFiles = [...previousFiles].filter((file) => !currentFiles.has(file));
  const hasDiff =
    addedFiles.length > 0 ||
    removedFiles.length > 0 ||
    addedEffectsCount > 0 ||
    removedEffectsCount > 0 ||
    sourceChanges > 0;

  if (hasDiff && currentLegacyCount >= previousLegacyCount) {
    fail('Allowlist changes must reduce legacy entries.');
  }
}

main();
