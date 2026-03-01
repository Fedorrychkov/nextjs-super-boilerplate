import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

import prettierPlugin from 'eslint-plugin-prettier'
import simpleImportSortPlugin from 'eslint-plugin-simple-import-sort'
import prettierConfig from 'eslint-config-prettier'
import importPlugin from 'eslint-plugin-import'
import jsdocPlugin from 'eslint-plugin-jsdoc'
import globals from 'globals'
import reactRefresh from 'eslint-plugin-react-refresh'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  prettierConfig,
  { ignores: ['eslint.config.mjs', '/dist/**/*', '.next', 'next.config.ts', 'node_modules'] },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },
    plugins: {
      'react-refresh': reactRefresh,
      'prettier': prettierPlugin,
      'jsdoc': jsdocPlugin,
      'import': importPlugin,
      'simple-import-sort': simpleImportSortPlugin,
      // '@typescript-eslint': tsEslintPlugin,
    },
    rules: {
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      quotes: ['error', 'single'],
      'import/no-unresolved': 0,
      semi: ['error', 'never'],
      'prettier/prettier': [
        'error',
        {
          'endOfLine': 'auto'
        },
      ],
      'object-curly-spacing': ['error', 'always'],
      'require-jsdoc': 0,
      'jsdoc/require-returns': 'off',
      'jsdoc/require-jsdoc': 'off',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'import/first': 'error',
      'import/newline-after-import': 'error',
      'import/no-duplicates': 'error',
      'no-empty-function': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'max-len': [
        'error',
        {
          code: 160,
          ignoreComments: true,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreRegExpLiterals: true,
        },
      ],
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'always', prev: '*', next: 'if' },
      ],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'prefer-promise-reject-errors': 'off',
    },
  },
  {
    // Disable rule for Next.js layout files where metadata export is standard
    files: ['**/layout.tsx', '**/layout.ts', '**/page.tsx', '**/page.ts', '**/loading.tsx', '**/loading.ts', '**/error.tsx', '**/error.ts', '**/not-found.tsx', '**/not-found.ts'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
]);

export default eslintConfig;
