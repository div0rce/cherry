import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { parseJson } from './guardrails/lib/read-json.mjs';
import { asMessage } from './guardrails/lib/error.mjs';
import { fail } from './guardrails/lib/fail.mjs';

const PREFIX = 'check:repo-guardrails';
const FIX = 'Remove the violating token or update allowlists where permitted.';
const violations: string[] = [];

function recordViolation(message: string): void {
  violations.push(message);
}

function formatDetail(message: string): string {
  const fileMatch = message.match(/\b[\w./()-]+\.(?:ts|tsx|js|jsx|mjs|cjs|mts|json|md|mdx)\b/);
  const file = fileMatch?.[0];
  if (typeof file === 'string' && file.length > 0) {
    return `${file}:1:1: ${message}`;
  }
  return `scripts/check-repo-guardrails.mts:1:1: ${message}`;
}

const DEFAULT_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mts',
  '.cts',
  '.mjs',
  '.cjs',
]);
const MARKDOWN_EXTENSIONS = new Set(['.md', '.mdx']);
const DTS_EXT = '.d.ts';

const ENGINE_PRISMA_TOKENS = [
  { token: '@prisma/client', regex: /@prisma\/client/ },
  { token: '@/lib/prisma', regex: /@\/lib\/prisma/ },
  { token: 'PrismaClient', regex: /\bPrismaClient\b/ },
  { token: '.findMany(', regex: /\.findMany\s*\(/ },
  { token: '.create(', regex: /\.create\s*\(/ },
  { token: '.update(', regex: /\.update\s*\(/ },
];
const ENGINE_SIDE_EFFECT_TOKENS = [
  { token: 'console.', regex: /\bconsole\./ },
  { token: 'fetch(', regex: /\bfetch\s*\(/ },
  { token: 'axios', regex: /\baxios\b/ },
  { token: 'XMLHttpRequest', regex: /\bXMLHttpRequest\b/ },
];
const MIGRATION_GUARDED_MODELS = [
  'RecommendationSession',
  'CherryPointLedger',
  'BankTransaction',
];

const TIME_TOKENS = [
  { token: 'new Date(', regex: /\bnew Date\s*\(/ },
  { token: 'Date.now(', regex: /\bDate\.now\s*\(/ },
];
const INLINE_TS_NODE_LOADER = /node\s+--loader\s+ts-node\/esm/;
const INLINE_TSX_MTS = /\btsx\b[^\n]*\b[^\s'"]+\.mts\b/;
const DIRECT_NODE_MTS = /node\b[^\n]*\bscripts\/[^\s'"]+\.mts\b/;
const TS_NODE_MTS = /\bts-node\b[^\n]*\.mts\b/;
const TSX_MTS = /\btsx\b[^\n]*\b[^\s'"]+\.mts\b/;
const FORBIDDEN_TS_NODE_REGISTER = /\bts-node\/register\b|\bts-node\/register\/transpile-only\b/;
const RAW_ERROR_IDENTIFIER = /\b(err|error|caught)\b(?!\s*:)/g;
const RAW_LOG_CALL = /\blog(?:Error|Warn|Info)\s*\(/;
const AS_ERROR_ASSIGN = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*asAppError\s*\(/;
const AS_ERROR_CALL = /\basAppError\s*\(\s*([A-Za-z_$][\w$]*)\s*\)/g;
const ERROR_HELPER_NAME = ['as', 'Error'].join('');
const FORBIDDEN_AS_ERROR = new RegExp(`\\b${ERROR_HELPER_NAME}\\b`);
const CATCH_HEADER = /\bcatch\s*\(\s*([A-Za-z_$][\w$]*)\s*\)/;

const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'out',
  'coverage',
  'dist-scripts',
]);

const PackageJsonSchema = z
  .object({
    scripts: z.record(z.string(), z.string()),
  })
  .passthrough();

const MigrationBaselineSchema = z.array(z.string());

function collectFiles(startDir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(startDir)) return files;
  const stack: string[] = [startDir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (typeof current !== 'string') continue;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (IGNORE_DIRS.has(entry.name)) continue;
        stack.push(fullPath);
        continue;
      }
      if (!DEFAULT_EXTENSIONS.has(path.extname(entry.name))) continue;
      if (entry.name.endsWith('.d.ts')) continue;
      files.push(fullPath);
    }
  }
  return files;
}

function collectFilesByExtensions(startDir: string, extensions: Set<string>): string[] {
  const files: string[] = [];
  if (!fs.existsSync(startDir)) return files;
  const stack: string[] = [startDir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (typeof current !== 'string') continue;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (IGNORE_DIRS.has(entry.name)) continue;
        stack.push(fullPath);
        continue;
      }
      if (!extensions.has(path.extname(entry.name))) continue;
      files.push(fullPath);
    }
  }
  return files;
}

function collectDtsFiles(startDir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(startDir)) return files;
  const stack: string[] = [startDir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (typeof current !== 'string') continue;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (IGNORE_DIRS.has(entry.name)) continue;
        stack.push(fullPath);
        continue;
      }
      if (!entry.name.endsWith(DTS_EXT)) continue;
      files.push(fullPath);
    }
  }
  return files;
}

const argv = process.argv;
let root = process.cwd();
const idx = argv.indexOf('--root');
const next = idx === -1 ? undefined : argv[idx + 1];
if (typeof next === 'string' && next.length > 0) {
  root = path.resolve(next);
} else {
  const prefix = argv.find((arg) => arg.startsWith('--root='));
  if (typeof prefix === 'string' && prefix.length > 0) {
    root = path.resolve(prefix.slice('--root='.length));
  }
}

const runtimePrefix = path.normalize(path.join('lib', 'adapters', 'runtime')) + path.sep;
const adaptersPrefix = path.normalize(path.join('lib', 'adapters')) + path.sep;
const schemasPrefix = path.normalize(path.join('lib', 'schemas')) + path.sep;
const validationPrefix = path.normalize(path.join('lib', 'validation')) + path.sep;
const moneyModulePath = path.normalize(path.join('lib', 'money.ts'));
const apiPrefix = path.normalize(path.join('app', 'api')) + path.sep;
const engineDir = path.join(root, 'lib', 'engine');
const bucketsDir = path.join(root, 'lib', 'buckets');
const verificationDir = path.join(root, 'lib', 'verification');
const componentsDir = path.join(root, 'components');
const middlewareFile = path.join(root, 'middleware.ts');
const nextConfigFile = path.join(root, 'next.config.ts');

const libStart = path.join(root, 'lib');
const libFiles = collectFiles(libStart);

const engineFiles = collectFiles(engineDir);
const bucketFiles = collectFiles(bucketsDir);

const verificationFiles = collectFiles(verificationDir);
const componentFiles = collectFiles(componentsDir);

const appDir = path.join(root, 'app');
const apiDir = path.join(appDir, 'api');
const userDir = path.join(appDir, '(user)');
const packageJsonPath = path.join(root, 'package.json');
const appFiles = collectFiles(appDir);
const apiFiles = collectFiles(apiDir);
const userFiles = collectFiles(userDir);
const scriptsDir = path.join(root, 'scripts');
const scriptFiles = collectFiles(scriptsDir);
const testsDir = path.join(root, 'tests');
const testFiles = collectFiles(testsDir);
const docsDir = path.join(root, 'docs');
const docFiles = collectFilesByExtensions(docsDir, MARKDOWN_EXTENSIONS);
const rootDocs = [path.join(root, 'README.md'), path.join(root, 'AGENTS.md')].filter((file) =>
  fs.existsSync(file)
);
const guardrailFixturesPrefix =
  path.normalize(path.join('tests', 'fixtures', 'guardrails')) + path.sep;
const typesFiles = collectDtsFiles(path.join(root, 'types'));
const migrationsDir = path.join(root, 'prisma', 'migrations');
const migrationBaselinePath = path.join(
  root,
  'scripts',
  'guardrails',
  'migration-safety.baseline.json'
);

/**
 * @param {string} line
 * @param {number} startIndex
 * @returns {number}
 */
function countBraces(line: string, startIndex = 0): number {
  let delta = 0;
  for (let i = startIndex; i < line.length; i += 1) {
    const char = line[i];
    if (char === '{') delta += 1;
    if (char === '}') delta -= 1;
  }
  return delta;
}

/**
 * @param {string} content
 * @returns {boolean}
 */
function hasUserImport(content: string): boolean {
  return (
    /from\s+['"][^'"]*\(user\)[^'"]*['"]/.test(content) ||
    /require\(\s*['"][^'"]*\(user\)[^'"]*['"]\s*\)/.test(content)
  );
}

/**
 * @param {string} content
 * @returns {boolean}
 */
function importsUserApi(content: string): boolean {
  return (
    /from\s+['"][^'"]*(?:app\/)?\(user\)\/_lib\/api(?:\.[mc]?[jt]sx?)?['"]/.test(content) ||
    /require\(\s*['"][^'"]*(?:app\/)?\(user\)\/_lib\/api(?:\.[mc]?[jt]sx?)?['"]\s*\)/.test(content)
  );
}

/**
 * @param {string} content
 * @returns {boolean}
 */
function importsDeprecatedUserApi(content: string): boolean {
  return (
    /from\s+['"][^'"]*(?:app\/)?\(user\)\/_lib\/actions(?:\.[mc]?[jt]sx?)?['"]/.test(content) ||
    /require\(\s*['"][^'"]*(?:app\/)?\(user\)\/_lib\/actions(?:\.[mc]?[jt]sx?)?['"]\s*\)/.test(content)
  );
}

/**
 * @param {string} content
 * @returns {boolean}
 */
function hasMigrationEscapeHatch(content: string): boolean {
  return (
    /guardrail:\s*migration-no-replay-test-ok/.test(content) &&
    /justification:\s*\S+/.test(content)
  );
}

const MONEY_FLOAT_TOKENS = [
  { token: '/ 100', regex: /\s\/\s*100\b/ },
  { token: '* 100', regex: /\*\s*100\b/ },
  { token: '.toFixed(2)', regex: /\.toFixed\s*\(\s*2\s*\)/ },
  { token: 'parseFloat(', regex: /parseFloat\s*\(/ },
];
const SILENT_DEFAULT_TOKENS = [
  { token: '??', regex: /\?\?/ },
];
const MONEY_FLOAT_ALLOWLIST = new Map([
  ['lib/dashboard.ts', 'TEMP: UI aggregation, not core math'],
  ['lib/simulation.ts', 'TEMP: legacy sim, migrate to Cents'],
  ['lib/unified-activity.ts', 'TEMP: reporting layer'],
  ['lib/evaluator/offline-history.ts', 'TEMP: legacy stats'],
  ['lib/evaluator/stats.ts', 'TEMP: legacy stats'],
  ['lib/engine/legacy-mapper.ts', 'TEMP: legacy mapper'],
  ['lib/engine/objective.ts', 'TEMP: pre-Cents objective'],
  ['lib/engine/public.ts', 'TEMP: public adapter'],
  ['lib/autopilot/runSimulation.ts', 'TEMP: sim bridge'],
  ['lib/autopilot/service.ts', 'TEMP: service layer'],
  ['lib/alerts/sendEmailAlert.ts', 'TEMP: formatting only'],
]);
const FORBIDDEN_ALIAS = /from\s+['"]@\/|import\s*\(\s*['"]@\/|require\s*\(\s*['"]@\//;
const TS_CONFIG_PARSE = /JSON\.parse\s*\(/;

for (const file of libFiles) {
  const relPath = path.normalize(path.relative(root, file));
  if (relPath.startsWith(runtimePrefix)) continue;
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    if (line.includes('Math.random')) {
      recordViolation(`no-implicit-randomness: ${relPath}: Math.random`);
    }
    if (line.includes('crypto.randomUUID')) {
      recordViolation(`no-implicit-randomness: ${relPath}: crypto.randomUUID`);
    }
    if (line.includes('crypto.randomBytes')) {
      recordViolation(`no-implicit-randomness: ${relPath}: crypto.randomBytes`);
    }
    const typeContext =
      line.includes('interface ') ||
      line.includes('type ') ||
      line.includes('export type') ||
      line.includes('=>') ||
      (line.includes('<') && line.includes('>')) ||
      /:\s*[A-Za-z_<]/.test(line);
    if (line.includes('randomUUID(') && !typeContext) {
      recordViolation(`no-implicit-randomness: ${relPath}: randomUUID(`);
    }
    if (line.includes('randomBytes(') && !typeContext) {
      recordViolation(`no-implicit-randomness: ${relPath}: randomBytes(`);
    }
  }
}

for (const file of libFiles) {
  const relPath = path.normalize(path.relative(root, file));
  if (relPath.startsWith(adaptersPrefix)) continue;
  if (relPath.startsWith(schemasPrefix)) continue;
  if (relPath.startsWith(validationPrefix)) continue;
  if (relPath === moneyModulePath) continue;
  if (MONEY_FLOAT_ALLOWLIST.has(relPath)) continue;
  const content = fs.readFileSync(file, 'utf8');
  for (const { token, regex } of MONEY_FLOAT_TOKENS) {
    if (regex.test(content)) {
      recordViolation(`money-float-banned: ${relPath}: ${token}`);
    }
  }
}

const silentDefaultFiles = [...engineFiles, ...bucketFiles, ...verificationFiles];
for (const file of silentDefaultFiles) {
  const relPath = path.normalize(path.relative(root, file));
  if (relPath.startsWith(adaptersPrefix)) continue;
  if (relPath.startsWith(schemasPrefix)) continue;
  if (relPath.startsWith(validationPrefix)) continue;
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    for (const { token, regex } of SILENT_DEFAULT_TOKENS) {
      if (regex.test(line)) {
        recordViolation(`silent-default-banned: ${relPath}: ${token}`);
      }
    }
    if (line.includes('||')) {
      const returnMatch = /\breturn\b[^;]*\|\|/.test(line);
      const assignmentMatch = /(^|[^=!<>])=([^=]|$)/.test(line);
      if (returnMatch || assignmentMatch) {
        recordViolation(`silent-default-banned: ${relPath}: ||`);
      }
    }
  }
}

for (const file of engineFiles) {
  const relPath = path.normalize(path.relative(root, file));
  const content = fs.readFileSync(file, 'utf8');
  for (const { token, regex } of ENGINE_PRISMA_TOKENS) {
    if (regex.test(content)) {
      recordViolation(`engine-prisma-leak: ${relPath}: ${token}`);
    }
  }
}
for (const file of engineFiles) {
  const relPath = path.normalize(path.relative(root, file));
  const content = fs.readFileSync(file, 'utf8');
  for (const { token, regex } of ENGINE_SIDE_EFFECT_TOKENS) {
    if (regex.test(content)) {
      recordViolation(`engine-side-effect-banned: ${relPath}: ${token}`);
    }
  }
}

const timeFiles = [...engineFiles, ...verificationFiles];
for (const file of timeFiles) {
  const relPath = path.normalize(path.relative(root, file));
  if (relPath.startsWith(runtimePrefix)) continue;
  const content = fs.readFileSync(file, 'utf8');
  for (const { token, regex } of TIME_TOKENS) {
    if (regex.test(content)) {
      recordViolation(`no-implicit-time: ${relPath}: ${token}`);
    }
  }
}

const errorLogFiles = [...appFiles, ...libFiles];
const errorHelperFiles = [...appFiles, ...libFiles, ...scriptFiles, ...testFiles];

for (const file of errorHelperFiles) {
  const relPath = path.normalize(path.relative(root, file));
  if (relPath === path.normalize('scripts/guardrails/lib/error.mts')) continue;
  const content = fs.readFileSync(file, 'utf8');
  if (FORBIDDEN_AS_ERROR.test(content)) {
    recordViolation(`as-error-banned: ${relPath}`);
  }
}
for (const file of errorLogFiles) {
  const relPath = path.normalize(path.relative(root, file));
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  let inCatch = false;
  let pendingCatch = false;
  let catchDepth = 0;
  let currentCatchVar: string | null = null;
  let justEnteredCatch = false;
  let normalizedVars = new Set<string>();

  for (const line of lines) {
    let startIndex = -1;

    if (!inCatch) {
      const idx = line.indexOf('catch');
      if (idx !== -1) {
        startIndex = idx;
        const match = line.match(CATCH_HEADER);
        currentCatchVar = typeof match?.[1] === 'string' ? match[1] : null;
        if (line.indexOf('{', idx) !== -1) {
          inCatch = true;
          pendingCatch = false;
          catchDepth = countBraces(line, idx);
          justEnteredCatch = true;
          normalizedVars = new Set();
        } else {
          pendingCatch = true;
        }
      } else if (pendingCatch && line.includes('{')) {
        inCatch = true;
        pendingCatch = false;
        catchDepth = countBraces(line);
        justEnteredCatch = true;
        normalizedVars = new Set();
      }
    }

    if (inCatch) {
      const assignment = line.match(AS_ERROR_ASSIGN);
      if (assignment !== null && assignment[1] !== undefined && assignment[1] !== '') {
        normalizedVars.add(assignment[1]);
      }
      const callMatches = line.matchAll(AS_ERROR_CALL);
      for (const match of callMatches) {
        const name = match[1];
        if (name !== undefined && name !== '') {
          normalizedVars.add(name);
        }
      }

      if (currentCatchVar !== null && normalizedVars.has(currentCatchVar) === false) {
        if (justEnteredCatch === false) {
          const usesVar = new RegExp(`\\b${currentCatchVar}\\b`).test(line);
          if (usesVar && !line.includes('asAppError(')) {
            recordViolation(`error-normalization-missing: ${relPath}: ${currentCatchVar}`);
          }
        }
      }

      if (RAW_LOG_CALL.test(line)) {
        if (!line.includes('asAppError(')) {
          const matches = line.matchAll(RAW_ERROR_IDENTIFIER);
          for (const match of matches) {
            const identifier = match[1];
            if (identifier !== undefined && identifier !== '' && !normalizedVars.has(identifier)) {
              recordViolation(`raw-error-logging: ${relPath}: ${identifier}`);
            }
          }
        }
      }

      if (currentCatchVar !== null && relPath.startsWith(apiPrefix)) {
        const messageAccess = new RegExp(`\\b${currentCatchVar}\\.message\\b`);
        if (messageAccess.test(line)) {
          recordViolation(`api-error-message-banned: ${relPath}: ${currentCatchVar}`);
        }
      }

      if (justEnteredCatch === true) {
        justEnteredCatch = false;
      }

      if (startIndex >= 0) {
        catchDepth = countBraces(line, startIndex);
      } else {
        catchDepth += countBraces(line);
      }
      if (catchDepth <= 0) {
        if (currentCatchVar !== null && normalizedVars.has(currentCatchVar) === false) {
          recordViolation(`error-normalization-missing: ${relPath}: ${currentCatchVar}`);
        }
        inCatch = false;
        pendingCatch = false;
        catchDepth = 0;
        currentCatchVar = null;
        justEnteredCatch = false;
        normalizedVars = new Set();
      }
    }
  }
}

const commandFiles = [packageJsonPath];
for (const file of commandFiles) {
  if (!fs.existsSync(file)) continue;
  const relPath = path.normalize(path.relative(root, file));
  const content = fs.readFileSync(file, 'utf8');
  if (TS_NODE_MTS.test(content)) {
    recordViolation(`esm-loader-bypass: ${relPath}: ts-node .mts`);
  }
  if (INLINE_TS_NODE_LOADER.test(content)) {
    recordViolation(`esm-loader-bypass: ${relPath}: node --loader ts-node/esm`);
  }
  if (FORBIDDEN_TS_NODE_REGISTER.test(content)) {
    recordViolation(`ts-node-register-forbidden: ${relPath}: ts-node/register`);
  }
  if (relPath === 'package.json') {
    let scripts: Record<string, string>;
    try {
      scripts = PackageJsonSchema.parse(parseJson(content)).scripts;
    } catch (err: unknown) {
      void asMessage(err);
      scripts = {};
    }
    if (Object.keys(scripts).length === 0) {
      recordViolation('esm-loader-macro-missing: package.json: ts:esm');
    }
    const macro = scripts['ts:esm'];
    if (
      typeof macro !== 'string' ||
      !macro.includes('CHERRY_TSESM=1') ||
      !macro.includes('tsx') ||
      !macro.includes('--tsconfig tsconfig.scripts.json')
    ) {
      recordViolation('esm-loader-macro-missing: package.json: ts:esm');
    }
    for (const [name, command] of Object.entries(scripts)) {
      if (name === 'ts:esm') continue;
      if (INLINE_TS_NODE_LOADER.test(command)) {
        recordViolation(`esm-loader-inline: package.json: ${name}`);
      }
      if (INLINE_TSX_MTS.test(command)) {
        recordViolation(`esm-loader-inline: package.json: ${name}`);
      }
      if (DIRECT_NODE_MTS.test(command)) {
        recordViolation(`esm-loader-bypass: package.json: ${name}`);
      }
      if (TSX_MTS.test(command)) {
        recordViolation(`esm-loader-bypass: package.json: ${name}`);
      }
    }
  }
}

const executionContractFiles = [...scriptFiles, ...testFiles, ...docFiles, ...rootDocs];
for (const file of executionContractFiles) {
  if (!fs.existsSync(file)) continue;
  const relPath = path.normalize(path.relative(root, file));
  if (relPath.startsWith(guardrailFixturesPrefix)) continue;
  if (relPath === path.normalize(path.join('scripts', 'check-repo-guardrails.js'))) continue;
  if (relPath === path.normalize(path.join('scripts', 'check-repo-guardrails.mts'))) continue;
  const content = fs.readFileSync(file, 'utf8');
  const isDoc = MARKDOWN_EXTENSIONS.has(path.extname(relPath));
  if (!isDoc && FORBIDDEN_TS_NODE_REGISTER.test(content)) {
    recordViolation(`ts-node-register-forbidden: ${relPath}: ts-node/register`);
  }
  if (INLINE_TS_NODE_LOADER.test(content)) {
    recordViolation(`esm-loader-bypass: ${relPath}: node --loader ts-node/esm`);
  }
  if (DIRECT_NODE_MTS.test(content)) {
    recordViolation(`esm-loader-bypass: ${relPath}: node scripts/*.mts`);
  }
  if (TS_NODE_MTS.test(content)) {
    recordViolation(`esm-loader-bypass: ${relPath}: ts-node .mts`);
  }
  if (TSX_MTS.test(content)) {
    recordViolation(`esm-loader-bypass: ${relPath}: tsx .mts`);
  }
}

for (const file of appFiles) {
  const relPath = path.normalize(path.relative(root, file));
  const userPrefix = path.normalize(path.join('app', '(user)')) + path.sep;
  const apiPrefix = path.normalize(path.join('app', 'api')) + path.sep;
  const isUser = relPath.startsWith(userPrefix);
  const isApi = relPath.startsWith(apiPrefix);
  if (isUser || isApi) {
    continue;
  }
  const content = fs.readFileSync(file, 'utf8');
  if (importsUserApi(content)) {
    recordViolation(`user-fetch-boundary: ${relPath}: app/(user)/_lib/api`);
  }
}

for (const file of apiFiles) {
  const relPath = path.normalize(path.relative(root, file));
  const content = fs.readFileSync(file, 'utf8');
  if (hasUserImport(content)) {
    recordViolation(`no-user-imports: ${relPath}: app/(user)`);
  }
}

for (const file of libFiles) {
  const relPath = path.normalize(path.relative(root, file));
  const content = fs.readFileSync(file, 'utf8');
  if (hasUserImport(content)) {
    recordViolation(`no-user-imports: ${relPath}: app/(user)`);
  }
}

for (const file of scriptFiles) {
  const relPath = path.normalize(path.relative(root, file));
  const content = fs.readFileSync(file, 'utf8');
  if (hasUserImport(content)) {
    recordViolation(`no-user-imports: ${relPath}: app/(user)`);
  }
}

for (const file of userFiles) {
  const relPath = path.normalize(path.relative(root, file));
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('resolveUserContext')) {
    recordViolation(`user-context-boundary: ${relPath}: resolveUserContext`);
  }
}

const allFiles = new Set([...appFiles, ...libFiles, ...apiFiles, ...scriptFiles]);
for (const file of allFiles) {
  const relPath = path.normalize(path.relative(root, file));
  const content = fs.readFileSync(file, 'utf8');
  if (importsDeprecatedUserApi(content)) {
    recordViolation(`deprecated-user-api: ${relPath}: app/(user)/_lib/actions`);
  }
}

const aliasFiles = new Set([
  ...appFiles,
  ...libFiles,
  ...componentFiles,
  ...testFiles,
]);
if (fs.existsSync(middlewareFile)) aliasFiles.add(middlewareFile);
if (fs.existsSync(nextConfigFile)) aliasFiles.add(nextConfigFile);

for (const file of aliasFiles) {
  const relPath = path.normalize(path.relative(root, file));
  const content = fs.readFileSync(file, 'utf8');
  if (FORBIDDEN_ALIAS.test(content)) {
    recordViolation(`alias-forbidden: ${relPath}: @/`);
  }
}

for (const file of scriptFiles) {
  const relPath = path.normalize(path.relative(root, file));
  const content = fs.readFileSync(file, 'utf8');
  if (
    content.includes('tsconfig.json') &&
    TS_CONFIG_PARSE.test(content) &&
    !relPath.startsWith(path.normalize(path.join('scripts', 'lib')) + path.sep) &&
    !relPath.endsWith(path.normalize(path.join('scripts', 'check-repo-guardrails.js'))) &&
    !relPath.endsWith(path.normalize(path.join('scripts', 'check-repo-guardrails.mts')))
  ) {
    recordViolation(`tsconfig-parse-violation: ${relPath}: JSON.parse`);
  }
}

if (fs.existsSync(migrationsDir)) {
  if (!fs.existsSync(migrationBaselinePath)) {
    recordViolation('migration-safety-baseline: missing');
  }
  const baselineRaw = fs.readFileSync(migrationBaselinePath, 'utf8');
  let baselineList: string[] = [];
  try {
    baselineList = MigrationBaselineSchema.parse(parseJson(baselineRaw));
  } catch (err: unknown) {
    void asMessage(err);
    recordViolation('migration-safety-baseline: invalid JSON');
  }
  const baseline = new Set(baselineList.map((entry) => String(entry)));
  const migrationDirs = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  const replayDir = path.join(root, 'tests', 'replay');
  const hasReplayTests = fs.existsSync(replayDir) && collectFiles(replayDir).length > 0;

  for (const dirName of migrationDirs) {
    if (baseline.has(dirName)) continue;
    const migrationSql = path.join(migrationsDir, dirName, 'migration.sql');
    if (!fs.existsSync(migrationSql)) continue;
    const sql = fs.readFileSync(migrationSql, 'utf8');
    const touchesGuardedModel = MIGRATION_GUARDED_MODELS.some((model) => sql.includes(model));
    if (!touchesGuardedModel) continue;
    if (hasMigrationEscapeHatch(sql)) continue;

    const migrationTestDir = path.join(root, 'tests', 'migrations');
    const migrationTestCandidates = [
      path.join(migrationTestDir, `${dirName}.test.ts`),
      path.join(migrationTestDir, `${dirName}.test.js`),
      path.join(migrationTestDir, `${dirName}.test.mts`),
    ];
    const hasMigrationTest = migrationTestCandidates.some((candidate) => fs.existsSync(candidate));

    if (!hasReplayTests && !hasMigrationTest) {
      recordViolation(`migration-safety-missing-test: ${dirName}`);
    }
  }
}

const MODULE_DECL = /declare module ['"]([^'"]+)['"]/g;
// TODO: Consider a warning-only rule for package-level module shims (no slash),
// with explicit exceptions (e.g., next-auth, nodemailer) if/when contributor count grows.
const compatPrefix = path.normalize(path.join('types', 'compat')) + path.sep;
const jsxGlobalPath = path.normalize(path.join('types', 'jsx-global.d.ts'));

for (const file of typesFiles) {
  const relPath = path.normalize(path.relative(root, file));
  if (relPath === jsxGlobalPath) continue;
  if (relPath.startsWith(compatPrefix)) continue;
  recordViolation(`types-compat-only: ${relPath}`);
}

const moduleDeclarations = new Map<string, string[]>();
for (const file of typesFiles) {
  const relPath = path.normalize(path.relative(root, file));
  const content = fs.readFileSync(file, 'utf8');
  const matches = content.matchAll(MODULE_DECL);
  for (const match of matches) {
    const moduleName = match[1];
    if (typeof moduleName !== 'string' || moduleName.length === 0) continue;
    const entries = moduleDeclarations.get(moduleName) ?? [];
    entries.push(relPath);
    moduleDeclarations.set(moduleName, entries);
  }
}
for (const [moduleName, files] of moduleDeclarations) {
  if (files.length > 1) {
    recordViolation(`types-duplicate-module: ${moduleName}: ${files.join(', ')}`);
  }
}

if (violations.length > 0) {
  const details = violations.map((message) => formatDetail(message));
  fail(PREFIX, 'Repo guardrail violations detected', { details, fix: FIX });
}

process.stdout.write('check-repo-guardrails: ok\n');
