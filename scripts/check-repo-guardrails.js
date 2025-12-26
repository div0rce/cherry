import fs from 'node:fs';
import path from 'node:path';

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
const INLINE_TSX_MTS = /\btsx\b[^\n]*\.mts\b/;
const DIRECT_NODE_MTS = /node\b[^\n]*\bscripts\/[^\s'"]+\.mts\b/;
const TS_NODE_MTS = /\bts-node\b[^\n]*\.mts\b/;
const TSX_MTS = /\btsx\b[^\n]*\.mts\b/;
const FORBIDDEN_TS_NODE_REGISTER = /\bts-node\/register\b|\bts-node\/register\/transpile-only\b/;
const RAW_ERROR_IDENTIFIER = /\b(err|error|caught)\b(?!\s*:)/g;
const RAW_LOG_CALL = /\blog(?:Error|Warn|Info)\s*\(/;
const AS_ERROR_ASSIGN = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*asError\s*\(/;
const AS_ERROR_CALL = /\basError\s*\(\s*([A-Za-z_$][\w$]*)\s*\)/g;
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

/**
 * @param {string} startDir
 * @param {Set<string>} extensions
 * @returns {string[]}
 */
function collectFilesByExtensions(startDir, extensions) {
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
      if (!extensions.has(path.extname(entry.name))) continue;
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * @param {string} startDir
 * @returns {string[]}
 */
function collectDtsFiles(startDir) {
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
function countBraces(line, startIndex = 0) {
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

/**
 * @param {string} content
 * @returns {boolean}
 */
function hasMigrationEscapeHatch(content) {
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
for (const file of engineFiles) {
  const relPath = path.normalize(path.relative(root, file));
  const content = fs.readFileSync(file, 'utf8');
  for (const { token, regex } of ENGINE_SIDE_EFFECT_TOKENS) {
    if (regex.test(content)) {
      console.error(`engine-side-effect-banned: ${relPath}: ${token}`);
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

const errorLogFiles = [...appFiles, ...libFiles];
for (const file of errorLogFiles) {
  const relPath = path.normalize(path.relative(root, file));
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  let inCatch = false;
  let pendingCatch = false;
  let catchDepth = 0;
  let currentCatchVar = null;
  let justEnteredCatch = false;
  /** @type {Set<string>} */
  let normalizedVars = new Set();

  for (const line of lines) {
    let startIndex = -1;

    if (!inCatch) {
      const idx = line.indexOf('catch');
      if (idx !== -1) {
        startIndex = idx;
        const match = line.match(CATCH_HEADER);
        currentCatchVar = match ? match[1] : null;
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
      if (assignment && assignment[1]) {
        normalizedVars.add(assignment[1]);
      }
      const callMatches = line.matchAll(AS_ERROR_CALL);
      for (const match of callMatches) {
        const name = match[1];
        if (name) {
          normalizedVars.add(name);
        }
      }

      if (currentCatchVar && !normalizedVars.has(currentCatchVar)) {
        if (!justEnteredCatch) {
          const usesVar = new RegExp(`\\b${currentCatchVar}\\b`).test(line);
          if (usesVar && !line.includes('asError(')) {
            console.error(`error-normalization-missing: ${relPath}: ${currentCatchVar}`);
            process.exit(1);
          }
        }
      }

      if (RAW_LOG_CALL.test(line)) {
        if (!line.includes('asError(')) {
          const matches = line.matchAll(RAW_ERROR_IDENTIFIER);
          for (const match of matches) {
            const identifier = match[1];
            if (identifier && !normalizedVars.has(identifier)) {
              console.error(`raw-error-logging: ${relPath}: ${identifier}`);
              process.exit(1);
            }
          }
        }
      }

      if (justEnteredCatch) {
        justEnteredCatch = false;
      }

      if (startIndex >= 0) {
        catchDepth = countBraces(line, startIndex);
      } else {
        catchDepth += countBraces(line);
      }
      if (catchDepth <= 0) {
        if (currentCatchVar && !normalizedVars.has(currentCatchVar)) {
          console.error(`error-normalization-missing: ${relPath}: ${currentCatchVar}`);
          process.exit(1);
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
    console.error(`esm-loader-bypass: ${relPath}: ts-node .mts`);
    process.exit(1);
  }
  if (INLINE_TS_NODE_LOADER.test(content)) {
    console.error(`esm-loader-bypass: ${relPath}: node --loader ts-node/esm`);
    process.exit(1);
  }
  if (FORBIDDEN_TS_NODE_REGISTER.test(content)) {
    console.error(`ts-node-register-forbidden: ${relPath}: ts-node/register`);
    process.exit(1);
  }
  if (relPath === 'package.json') {
    /** @type {{ scripts?: Record<string, string> }} */
    const packageJson = JSON.parse(content);
    const scripts = packageJson.scripts;
    if (!scripts || typeof scripts !== 'object') {
      console.error('esm-loader-macro-missing: package.json: ts:esm');
      process.exit(1);
    }
    const macro = scripts['ts:esm'];
    if (
      typeof macro !== 'string' ||
      !macro.includes('CHERRY_TSESM=1') ||
      !macro.includes('tsx') ||
      !macro.includes('--tsconfig tsconfig.scripts.json')
    ) {
      console.error('esm-loader-macro-missing: package.json: ts:esm');
      process.exit(1);
    }
    for (const [name, command] of Object.entries(scripts)) {
      if (name === 'ts:esm') continue;
      if (INLINE_TS_NODE_LOADER.test(command)) {
        console.error(`esm-loader-inline: package.json: ${name}`);
        process.exit(1);
      }
      if (INLINE_TSX_MTS.test(command)) {
        console.error(`esm-loader-inline: package.json: ${name}`);
        process.exit(1);
      }
      if (DIRECT_NODE_MTS.test(command)) {
        console.error(`esm-loader-bypass: package.json: ${name}`);
        process.exit(1);
      }
      if (TSX_MTS.test(command)) {
        console.error(`esm-loader-bypass: package.json: ${name}`);
        process.exit(1);
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
  const content = fs.readFileSync(file, 'utf8');
  const isDoc = MARKDOWN_EXTENSIONS.has(path.extname(relPath));
  if (!isDoc && FORBIDDEN_TS_NODE_REGISTER.test(content)) {
    console.error(`ts-node-register-forbidden: ${relPath}: ts-node/register`);
    process.exit(1);
  }
  if (INLINE_TS_NODE_LOADER.test(content)) {
    console.error(`esm-loader-bypass: ${relPath}: node --loader ts-node/esm`);
    process.exit(1);
  }
  if (DIRECT_NODE_MTS.test(content)) {
    console.error(`esm-loader-bypass: ${relPath}: node scripts/*.mts`);
    process.exit(1);
  }
  if (TS_NODE_MTS.test(content)) {
    console.error(`esm-loader-bypass: ${relPath}: ts-node .mts`);
    process.exit(1);
  }
  if (TSX_MTS.test(content)) {
    console.error(`esm-loader-bypass: ${relPath}: tsx .mts`);
    process.exit(1);
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
    console.error(`alias-forbidden: ${relPath}: @/`);
    process.exit(1);
  }
}

for (const file of scriptFiles) {
  const relPath = path.normalize(path.relative(root, file));
  const content = fs.readFileSync(file, 'utf8');
  if (
    content.includes('tsconfig.json') &&
    TS_CONFIG_PARSE.test(content) &&
    !relPath.startsWith(path.normalize(path.join('scripts', 'lib')) + path.sep) &&
    !relPath.endsWith(path.normalize(path.join('scripts', 'check-repo-guardrails.js')))
  ) {
    console.error(`tsconfig-parse-violation: ${relPath}: JSON.parse`);
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

if (fs.existsSync(migrationsDir)) {
  if (!fs.existsSync(migrationBaselinePath)) {
    console.error('migration-safety-baseline: missing');
    process.exit(1);
  }
  const baselineRaw = fs.readFileSync(migrationBaselinePath, 'utf8');
  /** @type {string[]} */
  const baselineList = JSON.parse(baselineRaw);
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
      console.error(`migration-safety-missing-test: ${dirName}`);
      process.exit(1);
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
  console.error(`types-compat-only: ${relPath}`);
  process.exit(1);
}

/** @type {Map<string, string[]>} */
const moduleDeclarations = new Map();
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
    console.error(`types-duplicate-module: ${moduleName}: ${files.join(', ')}`);
    process.exit(1);
  }
}

console.warn('check-repo-guardrails: ok');
