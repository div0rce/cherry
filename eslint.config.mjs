import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'eslint.config.mjs',
    'postcss.config.mjs',
  ]),
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
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
]);
