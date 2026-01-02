import fs from 'node:fs';
import path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { asMessage } from './guardrails/lib/error.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { PackageJsonSchema, readJsonFile } from './guardrails/lib/read-json.mjs';
import { GUARDRAIL_ENTRYPOINT, GUARDRAILS } from './guardrails/registry.mjs';

ensureTsEsm();

type Violation = {
  file: string;
  line?: number;
  col?: number;
  message: string;
};

const PREFIX = 'check:guardrail-execution';
const EXECUTION_BYPASS_MESSAGE = 'direct execution is forbidden';
const ROOT_ENV = process.env['CHERRY_GUARDRAIL_EXECUTION_ROOT'];
const ROOT = ROOT_ENV !== undefined && ROOT_ENV !== ''
  ? path.resolve(ROOT_ENV)
  : process.cwd();
const ENTRYPOINT = GUARDRAIL_ENTRYPOINT;

const SCRIPT_ROOT = 'scripts';
const CHECK_FILE_PREFIX = 'check-';
const CHECK_PATH_TOKEN = `${SCRIPT_ROOT}/${CHECK_FILE_PREFIX}`;

const NPM_TOKEN = 'npm';
const RUN_TOKEN = 'run';
const CHECK_SCRIPT_PREFIX = 'check:';
const NPM_RUN_TOKEN = `${NPM_TOKEN} ${RUN_TOKEN}`;

const CHECK_PATH_REGEX = new RegExp(
  `${escapeRegex(CHECK_PATH_TOKEN)}[^\\s'\"\\)]+(?:\\.(ts|mts|js|mjs))?`,
  'g'
);
const CHECK_EXECUTOR_REGEX = new RegExp(
  `(?:^|\\s)(?:npx\\s+)?(?:tsx|ts-node|node)\\s+[^\\s'\"\\)]*${escapeRegex(
    CHECK_PATH_TOKEN
  )}[^\\s'\"\\)]*`,
  'g'
);
const NPM_RUN_CHECK_REGEX = new RegExp(
  `${escapeRegex(NPM_RUN_TOKEN)}\\s+(${escapeRegex(CHECK_SCRIPT_PREFIX)}[^\\s'\"&]+)`,
  'g'
);
const NPM_RUN_SCRIPT_REGEX = new RegExp(`${escapeRegex(NPM_RUN_TOKEN)}\\s+([^\\s'\"&]+)`, 'g');

const PACKAGE_JSON = path.join(ROOT, 'package.json');
const WORKFLOWS_DIR = path.join(ROOT, '.github', 'workflows');
const DOCS_DIR = path.join(ROOT, 'docs');
const SCRIPTS_DIR = path.join(ROOT, 'scripts');

const PATH_ALLOWLIST = new Set([
  path.join(ROOT, 'scripts', 'check-guardrail-registry.mts'),
]);

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function lineColForToken(raw: string, token: string): { line: number; col: number } {
  const index = raw.indexOf(token);
  if (index <= 0) return { line: 1, col: 1 };
  const slice = raw.slice(0, index);
  const line = slice.split('\n').length;
  const lastNewline = slice.lastIndexOf('\n');
  const col = lastNewline === -1 ? index + 1 : index - lastNewline;
  return { line, col };
}

function listFiles(dir: string, extensions: Set<string>): string[] {
  if (fs.existsSync(dir) === false) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(fullPath, extensions));
    } else {
      const ext = path.extname(entry.name);
      if (extensions.has(ext)) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

function recordPathViolations(filePath: string, content: string, violations: Violation[]): void {
  if (PATH_ALLOWLIST.has(filePath)) return;
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    CHECK_PATH_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null = null;
    while ((match = CHECK_PATH_REGEX.exec(line)) !== null) {
      if (match[0].includes('check-<name>')) {
        continue;
      }
      violations.push({
        file: filePath,
        line: i + 1,
        col: match.index + 1,
        message: `Direct check script reference is forbidden: ${match[0]}`,
      });
    }
    CHECK_EXECUTOR_REGEX.lastIndex = 0;
    while ((match = CHECK_EXECUTOR_REGEX.exec(line)) !== null) {
      violations.push({
        file: filePath,
        line: i + 1,
        col: match.index + 1,
        message: `Direct check script execution is forbidden: ${match[0]}`,
      });
    }
  }
}

function parseNpmRunMatches(command: string): Array<{ name: string }> {
  const matches: Array<{ name: string }> = [];
  const lines = command.split(/\r?\n/);
  for (const line of lines) {
    NPM_RUN_CHECK_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null = null;
    while ((match = NPM_RUN_CHECK_REGEX.exec(line)) !== null) {
      const name = match[1];
      if (typeof name === 'string' && name.length > 0) {
        matches.push({ name });
      }
    }
  }
  return matches;
}

function parseNpmRunScripts(command: string): string[] {
  const names: string[] = [];
  const lines = command.split(/\r?\n/);
  for (const line of lines) {
    NPM_RUN_SCRIPT_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null = null;
    while ((match = NPM_RUN_SCRIPT_REGEX.exec(line)) !== null) {
      const name = match[1];
      if (typeof name === 'string' && name.length > 0) {
        names.push(name);
      }
    }
  }
  return names;
}

function isGuardrailScript(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(GUARDRAILS, name);
}

function isAllowedNpmRun(scriptName: string, currentScript: string | null): boolean {
  if (scriptName === ENTRYPOINT) return true;
  if (isGuardrailScript(scriptName)) {
    return currentScript !== null && currentScript === ENTRYPOINT;
  }
  return true;
}

function scanScriptCommands(scripts: Record<string, string>, violations: Violation[]): void {
  const queue = [...Object.keys(scripts)];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) continue;
    if (visited.has(current)) continue;
    visited.add(current);

    const command = scripts[current];
    if (typeof command !== 'string') continue;
    recordPathViolations(PACKAGE_JSON, command, violations);

    for (const nested of parseNpmRunScripts(command)) {
      if (nested === current) continue;
      if (scripts[nested] !== undefined && !visited.has(nested)) {
        queue.push(nested);
      }
    }
  }
}

function scanPackageJson(violations: Violation[]): void {
  if (fs.existsSync(PACKAGE_JSON) === false) {
    fail(PREFIX, 'package.json missing', {
      details: [path.normalize(path.relative(ROOT, PACKAGE_JSON))],
      fix: 'Restore package.json with guardrail scripts.',
    });
  }
  const raw = fs.readFileSync(PACKAGE_JSON, 'utf8');
  recordPathViolations(PACKAGE_JSON, raw, violations);
  let scripts: Record<string, string>;
  try {
    const parsed = PackageJsonSchema.parse(readJsonFile(PACKAGE_JSON));
    if (parsed.scripts === undefined) {
      fail(PREFIX, 'package.json scripts missing', {
        details: [path.normalize(path.relative(ROOT, PACKAGE_JSON))],
        fix: 'Add a scripts object to package.json.',
      });
    }
    scripts = parsed.scripts;
  } catch (err: unknown) {
    const message = asMessage(err);
    fail(PREFIX, `package.json scripts missing: ${message}`, {
      details: [path.normalize(path.relative(ROOT, PACKAGE_JSON))],
      fix: 'Fix invalid JSON in package.json.',
    });
  }

  const entrypointCommand = scripts[ENTRYPOINT];
  if (entrypointCommand === undefined || entrypointCommand.trim().length === 0) {
    const { line, col } = lineColForToken(raw, `"${ENTRYPOINT}"`);
    fail(PREFIX, `package.json missing ${ENTRYPOINT} command`, {
      details: [
        `${path.normalize(path.relative(ROOT, PACKAGE_JSON))}:${line}:${col}: ${ENTRYPOINT}`,
      ],
      fix: `Add ${ENTRYPOINT} to package.json scripts.`,
    });
  }

  scanScriptCommands(scripts, violations);

  for (const [name, command] of Object.entries(scripts)) {
    const matches = parseNpmRunMatches(command);
    for (const match of matches) {
      if (isAllowedNpmRun(match.name, name)) continue;
      const { line, col } = lineColForToken(raw, `"${name}"`);
      violations.push({
        file: PACKAGE_JSON,
        line,
        col,
        message: `script ${name} invokes ${match.name} outside ${ENTRYPOINT}`,
      });
    }
  }
}

function scanContentFile(filePath: string, violations: Violation[]): void {
  const relative = path.normalize(path.relative(ROOT, filePath));
  const guardrailPrefix = path.normalize(path.join('scripts', 'check-'));
  const guardrailsDir = path.normalize(path.join('scripts', 'guardrails')) + path.sep;
  if (relative.startsWith(guardrailPrefix) || relative.startsWith(guardrailsDir)) {
    return;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  recordPathViolations(filePath, content, violations);

  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    NPM_RUN_CHECK_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null = null;
    while ((match = NPM_RUN_CHECK_REGEX.exec(line)) !== null) {
      const name = match[1];
      if (typeof name !== 'string' || name.length === 0) continue;
      if (isAllowedNpmRun(name, null)) continue;
      violations.push({
        file: filePath,
        line: i + 1,
        col: match.index + 1,
        message: `npm run for ${name} is only allowed inside ${ENTRYPOINT}`,
      });
    }
  }
}

function main(): void {
  const violations: Violation[] = [];

  scanPackageJson(violations);

  const workflowFiles = listFiles(WORKFLOWS_DIR, new Set(['.yml', '.yaml']));
  const scriptFiles = listFiles(
    SCRIPTS_DIR,
    new Set(['.mts', '.ts', '.js', '.mjs', '.sh', '.bash', '.zsh'])
  );
  const docFiles = listFiles(DOCS_DIR, new Set(['.md']));

  for (const file of [...workflowFiles, ...scriptFiles, ...docFiles]) {
    scanContentFile(file, violations);
  }

  if (violations.length > 0) {
    const details = violations.map((violation) => {
      const relative = path.normalize(path.relative(ROOT, violation.file));
      const line = violation.line ?? 1;
      const col = violation.col ?? 1;
      return `${relative}:${line}:${col}: ${EXECUTION_BYPASS_MESSAGE} (${violation.message})`;
    });
    fail(PREFIX, EXECUTION_BYPASS_MESSAGE, {
      details,
      fix: 'Run guardrails only via npm run check:<name>.',
    });
  }

  process.stdout.write('guardrail-execution-exclusivity: ok\n');
}

try {
  main();
} catch (error: unknown) {
  const message = asMessage(error);
  fail(PREFIX, `Guardrail crashed: ${message}`, {
    fix: 'Investigate guardrail execution enforcement.',
  });
}
