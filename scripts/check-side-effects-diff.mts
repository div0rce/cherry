import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { z } from 'zod';
import { ensureTsEsm } from './lib/ensure-ts-esm.mts';
import { asIsoDate, type IsoDateString } from '../lib/util/iso-date';

ensureTsEsm();


type AllowlistSource = 'legacy' | 'adapter' | 'boundary';

type AllowlistTier = 'boundary-time' | 'persistence-only' | 'legacy-combo';

type AllowlistEntry = {
  effects: string[];
  source: AllowlistSource;
  tier: AllowlistTier;
  expiresBy?: IsoDateString | undefined;
};

type AllowlistEntryRaw = {
  effects: string[];
  source: AllowlistSource;
  tier: AllowlistTier;
  expiresBy?: string | undefined;
};

const ROOT = process.cwd();
const ALLOWLIST_PATH = path.join(ROOT, 'scripts', 'side-effects.allowlist.json');

const AllowlistEntrySchema = z
  .object({
    effects: z.array(z.string()),
    source: z.enum(['legacy', 'adapter', 'boundary']),
    tier: z.enum(['boundary-time', 'persistence-only', 'legacy-combo']),
    expiresBy: z.string().optional(),
  })
  .strict();
const AllowlistEntryLegacySchema = z
  .object({
    effects: z.array(z.string()),
    source: z.enum(['legacy', 'adapter', 'boundary']),
    tier: z.enum(['boundary-time', 'persistence-only', 'legacy-combo']).optional(),
    expiresBy: z.string().optional(),
  })
  .strict();
const AllowlistSchema = z.record(z.string(), AllowlistEntrySchema);
const AllowlistLegacySchema = z.record(z.string(), AllowlistEntryLegacySchema);
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
    let parsed: Record<string, AllowlistEntryRaw>;
    if (options?.allowLegacy === true) {
      try {
        parsed = AllowlistSchema.parse(parsedJson);
      } catch (error: unknown) {
        void error;
        try {
          const legacyEntries = AllowlistLegacySchema.parse(parsedJson);
          const converted: Record<string, AllowlistEntry> = {};
          const entries = Object.entries(legacyEntries) as Array<
            [string, z.infer<typeof AllowlistEntryLegacySchema>]
          >;
          for (const [key, entry] of entries) {
            const convertedEntry: AllowlistEntry = {
              effects: entry.effects,
              source: entry.source,
              tier: entry.tier ?? inferTier(entry.effects),
            };
            if (entry.expiresBy !== undefined) {
              convertedEntry.expiresBy = asIsoDate(entry.expiresBy);
            }
            converted[key] = convertedEntry;
          }
          parsed = converted;
        } catch (legacyError: unknown) {
          void legacyError;
          const legacy = LegacyAllowlistSchema.parse(parsedJson);
          const converted: Record<string, AllowlistEntry> = {};
          const legacyEntries = Object.entries(legacy) as Array<[string, string[]]>;
          for (const [key, effects] of legacyEntries) {
            converted[key] = { effects, source: 'legacy', tier: inferTier(effects) };
          }
          parsed = converted;
        }
      }
    } else {
      parsed = AllowlistSchema.parse(parsedJson);
    }
    const normalized: Record<string, AllowlistEntry> = {};
    const entries = Object.entries(parsed) as Array<[string, AllowlistEntryRaw]>;
    for (const [key, entry] of entries) {
      const normalizedEntry: AllowlistEntry = {
        effects: entry.effects.slice().sort(),
        source: entry.source,
        tier: entry.tier,
      };
      if (entry.expiresBy !== undefined) {
        normalizedEntry.expiresBy = asIsoDate(entry.expiresBy);
      }
      normalized[path.normalize(key)] = normalizedEntry;
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
  } catch (error: unknown) {
    void error;
    return null;
  }
}

function countLegacy(allowlist: Record<string, AllowlistEntry>): number {
  return Object.values(allowlist).filter((entry) => entry.source === 'legacy').length;
}

function countLegacyCombo(allowlist: Record<string, AllowlistEntry>): number {
  return Object.values(allowlist).filter((entry) => entry.tier === 'legacy-combo').length;
}

function inferTier(effects: string[]): AllowlistTier {
  const hasPrisma = effects.includes('prisma');
  const hasTime = effects.includes('time');
  if (hasPrisma && hasTime) return 'legacy-combo';
  if (hasPrisma) return 'persistence-only';
  return 'boundary-time';
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseExpiresBy(value: IsoDateString, file: string): number {
  if (!ISO_DATE_RE.test(value)) {
    fail(`Invalid expiresBy date for ${file}: ${value}`);
  }
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(timestamp)) {
    fail(`Invalid expiresBy date for ${file}: ${value}`);
  }
  return timestamp;
}

function startOfUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function main(): void {
  const current = loadCurrentAllowlist();
  const previous = loadPreviousAllowlist();

  if (previous === null) {
    fail('Allowlist baseline missing; commit the allowlist before running diff checks.');
  }

  const previousLegacyCount = countLegacy(previous);
  const currentLegacyCount = countLegacy(current);
  if (currentLegacyCount > previousLegacyCount) {
    fail(`Legacy allowlist entries increased (${previousLegacyCount} -> ${currentLegacyCount})`);
  }
  const previousLegacyComboCount = countLegacyCombo(previous);
  const currentLegacyComboCount = countLegacyCombo(current);
  if (currentLegacyComboCount > previousLegacyComboCount) {
    fail(
      `Legacy-combo allowlist entries increased (${previousLegacyComboCount} -> ${currentLegacyComboCount})`
    );
  }

  const todayUtcStart = startOfUtcDay(new Date());
  for (const [file, entry] of Object.entries(current)) {
    if (entry.tier !== 'legacy-combo') continue;
    if (entry.expiresBy === undefined) {
      fail(`Missing expiresBy for legacy-combo entry: ${file}`);
    }
    const expiresAt = parseExpiresBy(entry.expiresBy, file);
    if (expiresAt < todayUtcStart) {
      fail(`Legacy-combo entry expired (${entry.expiresBy}): ${file}`);
    }
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
    if (
      prevEntry.tier === 'legacy-combo' &&
      prevEntry.expiresBy !== undefined &&
      currEntry.expiresBy === undefined
    ) {
      fail(`expiresBy removed from legacy-combo entry: ${file}`);
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
