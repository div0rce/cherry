export type EnvironmentName = 'node' | 'next' | 'guardrail';
export type EnvironmentId = `env:${EnvironmentName}`;

export type EnvironmentOwnership = {
  include: string[];
  exclude?: string[];
};

export type EnvironmentContract = {
  name: EnvironmentName;
  id: EnvironmentId;
  label: string;
  guarantees: string[];
  forbidden: string[];
  ownership: EnvironmentOwnership;
  allowedImportsFrom: EnvironmentName[];
};

const SOURCE_EXT = '*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}';

const NEXT_SINGLETONS = [
  'lib/auth.ts',
  'lib/user-context.ts',
  'lib/validation.ts',
  'lib/with-user.ts',
];

export const ENVIRONMENT_CONTRACTS = Object.freeze({
  node: {
    name: 'node',
    id: 'env:node',
    label: 'Node Core',
    guarantees: ['Pure Node ESM', 'No bundler semantics'],
    forbidden: ['react', 'react-dom', 'next/*', 'dom APIs'],
    ownership: {
      include: [
        `lib/core/**/${SOURCE_EXT}`,
        `lib/engine/**/${SOURCE_EXT}`,
        `lib/accounting/**/${SOURCE_EXT}`,
        `lib/**/${SOURCE_EXT}`,
        `scripts/**/${SOURCE_EXT}`,
        `tests/engine/**/${SOURCE_EXT}`,
        `tests/node/**/${SOURCE_EXT}`,
        `tests/db/**/${SOURCE_EXT}`,
        `types/**/${SOURCE_EXT}`,
        `prisma/scripts/**/${SOURCE_EXT}`,
        'eslint.config.mjs',
        'postcss.config.mjs',
        'tailwind.config.ts',
      ],
      exclude: [
        'lib/client/**',
        ...NEXT_SINGLETONS,
        'scripts/guardrails/**',
        'scripts/check-*.mts',
        'scripts/guardrails-aggregate.mts',
      ],
    },
    allowedImportsFrom: ['node', 'guardrail'],
  },
  next: {
    name: 'next',
    id: 'env:next',
    label: 'Next Runtime',
    guarantees: ['Next.js bundler + RSC'],
    forbidden: ['Node-only APIs'],
    ownership: {
      include: [
        `app/**/${SOURCE_EXT}`,
        `components/ui/**/${SOURCE_EXT}`,
        `components/**/${SOURCE_EXT}`,
        `tests/next/**/${SOURCE_EXT}`,
        `lib/client/**/${SOURCE_EXT}`,
        ...NEXT_SINGLETONS,
        'next.config.ts',
        'proxy.ts',
      ],
    },
    allowedImportsFrom: ['next', 'node'],
  },
  guardrail: {
    name: 'guardrail',
    id: 'env:guardrail',
    label: 'Guardrails',
    guarantees: ['Static + semantic analysis'],
    forbidden: ['Runtime imports'],
    ownership: {
      include: [
        `scripts/guardrails/**/${SOURCE_EXT}`,
        'scripts/check-*.mts',
        'scripts/guardrails-aggregate.mts',
      ],
    },
    allowedImportsFrom: ['guardrail', 'node'],
  },
} satisfies Record<EnvironmentName, EnvironmentContract>);

export const ENVIRONMENT_SCAN_GLOBS = [
  `app/**/${SOURCE_EXT}`,
  `components/**/${SOURCE_EXT}`,
  `lib/**/${SOURCE_EXT}`,
  `scripts/**/${SOURCE_EXT}`,
  `tests/**/${SOURCE_EXT}`,
  `types/**/${SOURCE_EXT}`,
  `prisma/scripts/**/${SOURCE_EXT}`,
  'eslint.config.mjs',
  'postcss.config.mjs',
  'tailwind.config.ts',
  'next.config.ts',
  'proxy.ts',
];

export const ENVIRONMENT_IGNORE_GLOBS = [
  '**/node_modules/**',
  '**/.next/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  'tests/fixtures/**',
  'dist-scripts/**',
  '**/*.d.ts',
  '**/*.d.mts',
  '**/*.d.cts',
];

export const NODE_BUILTIN_ROOTS = [
  'assert',
  'assert/strict',
  'async_hooks',
  'buffer',
  'child_process',
  'cluster',
  'console',
  'constants',
  'crypto',
  'dgram',
  'diagnostics_channel',
  'dns',
  'domain',
  'events',
  'fs',
  'http',
  'http2',
  'https',
  'inspector',
  'module',
  'net',
  'os',
  'path',
  'perf_hooks',
  'process',
  'punycode',
  'querystring',
  'readline',
  'repl',
  'stream',
  'string_decoder',
  'sys',
  'timers',
  'tls',
  'trace_events',
  'tty',
  'url',
  'util',
  'v8',
  'vm',
  'wasi',
  'worker_threads',
  'zlib',
];
