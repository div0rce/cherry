/** @type {typeof import('node:fs')} */
const fs = require('node:fs');
/** @type {typeof import('node:path')} */
const path = require('node:path');

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

const REQUIRED_GUARDRAILS = [
  'scripts/check-no-side-effects.mts',
  'scripts/check-no-engine-prisma.mts',
  'scripts/check-no-engine-date.mts',
  'scripts/check-no-server-entropy.mts',
  'scripts/check-no-implicit-identity.mts',
  'scripts/check-no-implicit-time.mts',
];

const ENGINE_PRISMA_TOKENS = [
  { token: '@prisma/client', regex: /@prisma\/client/ },
  { token: '@/lib/prisma', regex: /@\/lib\/prisma/ },
  { token: 'PrismaClient', regex: /\bPrismaClient\b/ },
  { token: '.findMany(', regex: /\.findMany\s*\(/ },
  { token: '.create(', regex: /\.create\s*\(/ },
  { token: '.update(', regex: /\.update\s*\(/ },
];

const TIME_TOKENS = [
  { token: 'new Date(', regex: /\bnew Date\s*\(/ },
  { token: 'Date.now(', regex: /\bDate\.now\s*\(/ },
];

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

/**
 * @param {string} startDir
 * @returns {string[]}
 */
function collectFiles(startDir) {
  /** @type {string[]} */
  const files = [];
  if (!fs.existsSync(startDir)) return files;
  /** @type {string[]} */
  const stack = [startDir];
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
const engineDir = path.join(root, 'lib', 'engine');
const bucketsDir = path.join(root, 'lib', 'buckets');
const verificationDir = path.join(root, 'lib', 'verification');

const libStart = path.join(root, 'lib');
const libFiles = collectFiles(libStart);

const engineFiles = collectFiles(engineDir);
const bucketFiles = collectFiles(bucketsDir);

const verificationFiles = collectFiles(verificationDir);

const appDir = path.join(root, 'app');
const apiDir = path.join(appDir, 'api');
const userDir = path.join(appDir, '(user)');
const appFiles = collectFiles(appDir);
const apiFiles = collectFiles(apiDir);
const userFiles = collectFiles(userDir);
const scriptsDir = path.join(root, 'scripts');
const scriptFiles = collectFiles(scriptsDir);

/**
 * @param {string} content
 * @returns {boolean}
 */
function hasUserImport(content) {
  return (
    /from\s+['"][^'"]*\(user\)[^'"]*['"]/.test(content) ||
    /require\(\s*['"][^'"]*\(user\)[^'"]*['"]\s*\)/.test(content)
  );
}

/**
 * @param {string} content
 * @returns {boolean}
 */
function importsUserApi(content) {
  return (
    /from\s+['"][^'"]*(?:app\/)?\(user\)\/_lib\/api['"]/.test(content) ||
    /require\(\s*['"][^'"]*(?:app\/)?\(user\)\/_lib\/api['"]\s*\)/.test(content)
  );
}

/**
 * @param {string} content
 * @returns {boolean}
 */
function importsDeprecatedUserApi(content) {
  return (
    /from\s+['"][^'"]*(?:app\/)?\(user\)\/_lib\/actions['"]/.test(content) ||
    /require\(\s*['"][^'"]*(?:app\/)?\(user\)\/_lib\/actions['"]\s*\)/.test(content)
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

for (const file of libFiles) {
  const relPath = path.normalize(path.relative(root, file));
  if (relPath.startsWith(runtimePrefix)) continue;
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    if (line.includes('Math.random')) {
      console.error(`no-implicit-randomness: ${relPath}: Math.random`);
      process.exit(1);
    }
    if (line.includes('crypto.randomUUID')) {
      console.error(`no-implicit-randomness: ${relPath}: crypto.randomUUID`);
      process.exit(1);
    }
    if (line.includes('crypto.randomBytes')) {
      console.error(`no-implicit-randomness: ${relPath}: crypto.randomBytes`);
      process.exit(1);
    }
    const typeContext =
      line.includes('interface ') ||
      line.includes('type ') ||
      line.includes('export type') ||
      line.includes('=>') ||
      (line.includes('<') && line.includes('>')) ||
      /:\s*[A-Za-z_<]/.test(line);
    if (line.includes('randomUUID(') && !typeContext) {
      console.error(`no-implicit-randomness: ${relPath}: randomUUID(`);
      process.exit(1);
    }
    if (line.includes('randomBytes(') && !typeContext) {
      console.error(`no-implicit-randomness: ${relPath}: randomBytes(`);
      process.exit(1);
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
      console.error(`money-float-banned: ${relPath}: ${token}`);
      process.exit(1);
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
        console.error(`silent-default-banned: ${relPath}: ${token}`);
        process.exit(1);
      }
    }
    if (line.includes('||')) {
      const returnMatch = /\breturn\b[^;]*\|\|/.test(line);
      const assignmentMatch = /(^|[^=!<>])=([^=]|$)/.test(line);
      if (returnMatch || assignmentMatch) {
        console.error(`silent-default-banned: ${relPath}: ||`);
        process.exit(1);
      }
    }
  }
}

for (const file of engineFiles) {
  const relPath = path.normalize(path.relative(root, file));
  const content = fs.readFileSync(file, 'utf8');
  for (const { token, regex } of ENGINE_PRISMA_TOKENS) {
    if (regex.test(content)) {
      console.error(`engine-prisma-leak: ${relPath}: ${token}`);
      process.exit(1);
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
      console.error(`no-implicit-time: ${relPath}: ${token}`);
      process.exit(1);
    }
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
    console.error(`user-fetch-boundary: ${relPath}: app/(user)/_lib/api`);
    process.exit(1);
  }
}

for (const file of apiFiles) {
  const relPath = path.normalize(path.relative(root, file));
  const content = fs.readFileSync(file, 'utf8');
  if (hasUserImport(content)) {
    console.error(`no-user-imports: ${relPath}: app/(user)`);
    process.exit(1);
  }
}

for (const file of libFiles) {
  const relPath = path.normalize(path.relative(root, file));
  const content = fs.readFileSync(file, 'utf8');
  if (hasUserImport(content)) {
    console.error(`no-user-imports: ${relPath}: app/(user)`);
    process.exit(1);
  }
}

for (const file of scriptFiles) {
  const relPath = path.normalize(path.relative(root, file));
  const content = fs.readFileSync(file, 'utf8');
  if (hasUserImport(content)) {
    console.error(`no-user-imports: ${relPath}: app/(user)`);
    process.exit(1);
  }
}

for (const file of userFiles) {
  const relPath = path.normalize(path.relative(root, file));
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('resolveUserContext')) {
    console.error(`user-context-boundary: ${relPath}: resolveUserContext`);
    process.exit(1);
  }
}

const allFiles = new Set([...appFiles, ...libFiles, ...apiFiles, ...scriptFiles]);
for (const file of allFiles) {
  const relPath = path.normalize(path.relative(root, file));
  const content = fs.readFileSync(file, 'utf8');
  if (importsDeprecatedUserApi(content)) {
    console.error(`deprecated-user-api: ${relPath}: app/(user)/_lib/actions`);
    process.exit(1);
  }
}

const repoRoot = process.cwd();
for (const rel of REQUIRED_GUARDRAILS) {
  const fullPath = path.join(repoRoot, rel);
  if (!fs.existsSync(fullPath)) {
    console.error(`guardrail-integrity: ${rel}: missing`);
    process.exit(1);
  }
}

console.warn('check-repo-guardrails: ok');
