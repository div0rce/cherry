import { createRequire } from 'node:module';
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import zodPlugin from 'eslint-plugin-zod';
const requireJson = createRequire(import.meta.url);
const serverEntropyAllowlist = requireJson('./scripts/guardrails/server-entropy.allowlist.json');

const serverEntropyAllowlistFiles = (serverEntropyAllowlist.files ?? []);
const libRestrictedSyntaxRules = [
  {
    selector: "NewExpression[callee.name='Date'][arguments.length=0]",
    message: '❌ new Date() is forbidden in lib/. Inject time explicitly via { now }.'
  },
  {
    selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
    message: '❌ Date.now() is forbidden in lib/. Inject time explicitly via { nowMs }.'
  },
  {
    selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
    message: '❌ Math.random() is forbidden in lib/. Inject entropy explicitly.',
  },
  {
    selector:
      "CallExpression[callee.object.name='crypto'][callee.property.name=/^(randomUUID|getRandomValues|randomBytes)$/]",
    message: '❌ crypto randomness is forbidden in lib/. Inject entropy explicitly.',
  },
  {
    selector: "MemberExpression[object.name='process'][property.name='env']",
    message: '❌ process.env is forbidden in lib/. Inject configuration explicitly.',
  },
  {
    selector: "CallExpression[callee.property.name='sort'][arguments.length=0]",
    message: '❌ Array.sort() without comparator is forbidden; provide a total, deterministic comparator.',
  },
  {
    selector:
      "CallExpression[callee.property.name='sort'][arguments.length=1] CallExpression[arguments.0.type='ArrowFunctionExpression'][arguments.0.body.type='BinaryExpression'][arguments.0.body.operator=/^[<>]=?$/]",
    message: '❌ Comparator returning boolean is forbidden; return numeric ordering with equality handling.',
  },
];

const engineSideEffectRules = [
  {
    selector: "CallExpression[callee.object.name='console']",
    message: '❌ console usage is forbidden in engine core; inject a logger.',
  },
  {
    selector: "CallExpression[callee.name='fetch']",
    message: '❌ fetch() is forbidden in engine core; move I/O to boundaries.',
  },
  {
    selector: "NewExpression[callee.name='XMLHttpRequest']",
    message: '❌ XMLHttpRequest is forbidden in engine core; move I/O to boundaries.',
  },
  {
    selector: "CallExpression[callee.name='axios']",
    message: '❌ axios is forbidden in engine core; move I/O to boundaries.',
  },
  {
    selector: "CallExpression[callee.object.name='axios']",
    message: '❌ axios is forbidden in engine core; move I/O to boundaries.',
  },
  {
    selector: "ImportDeclaration[source.value='axios']",
    message: '❌ axios import is forbidden in engine core; move I/O to boundaries.',
  },
  {
    selector: "ImportDeclaration[source.value='@/lib/prisma']",
    message: '❌ prisma import is forbidden in engine core; use adapters.',
  },
  {
    selector: "ImportDeclaration[source.value='@prisma/client']",
    message: '❌ prisma import is forbidden in engine core; use adapters.',
  },
  {
    selector: "ImportDeclaration[source.value=/^(node:)?fs$/]",
    message: '❌ fs import is forbidden in engine core; move I/O to boundaries.',
  },
  {
    selector: "ImportDeclaration[source.value=/^(node:)?child_process$/]",
    message: '❌ child_process import is forbidden in engine core.',
  },
];

const coreSilentDefaultRules = [
  {
    selector: 'LogicalExpression[operator="??"]',
    message: '❌ Nullish coalescing is forbidden in core logic; handle missing values explicitly.',
  },
  {
    selector: 'AssignmentExpression > LogicalExpression[operator="||"]',
    message: '❌ Silent defaults via || are forbidden in core logic; branch explicitly.',
  },
  {
    selector: 'VariableDeclarator > LogicalExpression[operator="||"]',
    message: '❌ Silent defaults via || are forbidden in core logic; branch explicitly.',
  },
  {
    selector: 'ReturnStatement > LogicalExpression[operator="||"]',
    message: '❌ Silent defaults via || are forbidden in core logic; branch explicitly.',
  },
];

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.tmp/**',
    '.next/**',
    'out/**',
    'build/**',
    'tests/fixtures/**',
    'next-env.d.ts',
    'next.config.ts',
    'tailwind.config.ts',
    'proxy.ts',
    'eslint.config.mjs',
    'postcss.config.mjs',
  ]),
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
    plugins: { zod: zodPlugin },
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.eslint.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Zod schema hygiene
      'zod/prefer-enum': 'error',
      'zod/require-strict': 'error',
      // Promise safety
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      // Unsafe any/access
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/strict-boolean-expressions': [
        'error',
        {
          allowString: false,
          allowNumber: false,
          allowNullableObject: true,
          allowNullableBoolean: true,
          allowNullableString: false,
          allowNullableNumber: false,
          allowAny: false,
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.object.name="JSON"][callee.property.name="parse"]',
          message: 'Prefer schema-validated parsing (Zod) instead of raw JSON.parse.',
        },
        {
          selector: 'CatchClause[param.typeAnnotation=null]',
          message: 'All catch params must be typed as unknown and normalized.',
        },
      ],
      // Exhaustive switches
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      // Cleanliness
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@next/next/no-img-element': 'off',
    },
  },
  {
    files: ['scripts/**/*.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['app/api/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.property.name="json"][callee.object.name=/^(request|req)$/]',
          message: 'Use parseJsonBody + Zod schema instead of calling request.json() directly.',
        },
      ],
    },
  },
  {
    files: ['lib/**/*.ts', 'lib/**/*.tsx'],
    ignores: serverEntropyAllowlistFiles.filter((f) => f.startsWith('lib/')),
    rules: {
      'no-restricted-syntax': ['error', ...libRestrictedSyntaxRules],
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message: '❌ process.env is forbidden in lib/. Inject configuration explicitly.',
        },
      ],
    },
  },
  {
    files: ['lib/adapters/runtime/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='sort'][arguments.length=0]",
          message:
            '❌ Array.sort() without comparator is forbidden; provide a total, deterministic comparator.',
        },
        {
          selector:
            "CallExpression[callee.property.name='sort'][arguments.length=1] CallExpression[arguments.0.type='ArrowFunctionExpression'][arguments.0.body.type='BinaryExpression'][arguments.0.body.operator=/^[<>]=?$/]",
          message:
            '❌ Comparator returning boolean is forbidden; return numeric ordering with equality handling.',
        },
      ],
      'no-restricted-properties': 'off',
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    },
  },
  {
    files: [
      'lib/buckets/**/*.{ts,tsx}',
      'lib/verification/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...libRestrictedSyntaxRules,
        ...coreSilentDefaultRules,
      ],
    },
  },
  {
    files: ['lib/engine/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...libRestrictedSyntaxRules,
        ...coreSilentDefaultRules,
        ...engineSideEffectRules,
      ],
    },
  },
  {
    files: ['app/**/*.ts', 'app/**/*.tsx'],
    ignores: [
      'app/api/**/*',
      'app/**/client.tsx',
      'app/**/client.ts',
      'app/**/*Client.tsx',
      'app/**/*Client.ts',
      'app/**/actions.ts',
      ...serverEntropyAllowlistFiles.filter((f) => f.startsWith('app/')),
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message:
            '❌ new Date() forbidden in server components. Capture once per request and thread.',
        },
        {
          selector:
            "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: '❌ Date.now() forbidden in server components.',
        },
        {
          selector: "CallExpression[callee.property.name='sort'][arguments.length=0]",
          message: '❌ Array.sort() without comparator is forbidden; provide a total, deterministic comparator.',
        },
        {
          selector:
            "CallExpression[callee.property.name='sort'][arguments.length=1] CallExpression[arguments.0.type='ArrowFunctionExpression'][arguments.0.body.type='BinaryExpression'][arguments.0.body.operator=/^[<>]=?$/]",
          message: '❌ Comparator returning boolean is forbidden; return numeric ordering with equality handling.',
        },
        {
          selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message: '❌ Math.random() forbidden in server components.',
        },
        {
          selector:
            "CallExpression[callee.object.name='crypto'][callee.property.name=/^(randomUUID|getRandomValues|randomBytes)$/]",
          message: '❌ crypto randomness forbidden in server components.',
        },
        {
          selector: "MemberExpression[object.name='process'][property.name='env']",
          message: '❌ process.env forbidden in server components; inject via props.',
        },
        {
          selector: "CallExpression[callee.name='headers']",
          message: '❌ headers() forbidden in server components; pass values from boundary.',
        },
        {
          selector: "CallExpression[callee.name='cookies']",
          message: '❌ cookies() forbidden in server components; pass values from boundary.',
        },
        {
          selector: "CallExpression[callee.name='draftMode']",
          message: '❌ draftMode() forbidden in server components; pass values from boundary.',
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message: '❌ process.env forbidden in server components; inject via props.',
        },
      ],
    },
  },
  {
    files: ['app/**/page.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'JSXAttribute[name.name=/^on.*/][value.expression.type="ArrowFunctionExpression"]',
          message:
            'Server Components (page.tsx) must not define inline event handlers. Move interactivity into a client component.',
        },
        {
          selector:
            'JSXAttribute[name.name=/^on.*/][value.expression.type="Identifier"]',
          message:
            'Server Components (page.tsx) must not pass handler props. Move interactivity into a client component.',
        },
      ],
    },
  },
  {
    files: ['app/scan/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.name="fetch"]',
          message:
            'Use lib/client/api.callApi + useApiAction instead of raw fetch in React components.',
        },
        {
          selector: 'JSXElement JSXText[value=/Scan failed/i]',
          message: 'Error messages must be rendered from error state, not hard-coded.',
        },
      ],
    },
  },
  {
    files: [
      'tests/api-rewards.validation.test.js',
    ],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]);
