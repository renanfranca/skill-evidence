import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

const typescriptFiles = ['experiments/**/*.ts', 'test/**/*.ts'];

export default [
  { ignores: ['dist/', 'coverage/', 'node_modules/', '.skill-evidence/'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({ ...config, files: typescriptFiles })),
  {
    files: typescriptFiles,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
];
