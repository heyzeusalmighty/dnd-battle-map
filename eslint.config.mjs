// // eslint.config.js
// import { defineConfig } from 'eslint/config';

// export default defineConfig([
//   {
//     rules: {
//       semi: 'error',
//       'prefer-const': 'error',
//     },
//     // env: {
//     //   browser: true,
//     //   es2021: true,
//     //   node: true,
//     // },
//     // extends: [
//     //   'eslint:recommended',
//     //   'plugin:@typescript-eslint/recommended',
//     //   'plugin:react/recommended',
//     //   'plugin:react-hooks/recommended',
//     //   'plugin:prettier/recommended',
//     //   'next/core-web-vitals',
//     // ],
//     // parser: '@typescript-eslint/parser',
//     // parserOptions: {
//     //   ecmaFeatures: {
//     //     jsx: true,
//     //   },
//     //   ecmaVersion: 'latest',
//     //   sourceType: 'module',
//     // },
//     // plugins: ['react', '@typescript-eslint', 'prettier'],
//     // rules: {
//     //   'prettier/prettier': 'error',
//     // },
//     // settings: {
//     //   react: {
//     //     version: 'detect',
//     //   },
//     // },
//   },
// ]);

import eslint from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(eslint.configs.recommended, tseslint.configs.recommended, [
  globalIgnores(['node_modules/', '.next/', 'next-env.d.ts']),
]);
