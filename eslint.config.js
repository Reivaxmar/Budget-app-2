import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import typescriptParser from '@typescript-eslint/parser';
import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import react from 'eslint-plugin-react';

// Import the flat recommended configs from the plugins
const typescriptRecommended = typescriptPlugin.configs['flat/recommended'];
const reactRecommended = react.configs.flat.recommended;
const reactHooksRecommended = reactHooks.configs.flat.recommended;

export default [
  { ignores: ['dist', 'src-tauri', 'node_modules'] },
  { settings: { react: { version: '19.1.0', jsx: 'modern' } } },
  js.configs.recommended,
  ...typescriptRecommended,
  reactRecommended,
  reactHooksRecommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      ecmaVersion: 2020,
      sourceType: 'module',
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    settings: {
      react: {
        version: '19.1.0',
        jsx: 'modern',
      },
    },
    rules: {
      // React Refresh
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // TypeScript rules
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      // Disable some rules that might be too strict for a foundation
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
];