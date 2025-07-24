// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: [
            'node_modules',
            '.vitepress',
        ]
    },
    eslint.configs.recommended,
    // tseslint.configs.recommended,
    tseslint.configs.strict,
    tseslint.configs.stylistic,
    tseslint.configs.eslintRecommended,
    {
        rules: {
            '@typescript-eslint/no-namespace': 'off',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/prefer-for-of': 'off',
            semi: ['error', 'always'],
            'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 1 }],
            quotes: ['error', 'single'],
            'no-trailing-spaces': 'error',
            '@typescript-eslint/no-unused-vars': ['warn', {
                'argsIgnorePattern': '^_',
                'varsIgnorePattern': '^_'
            }]
        }
    }
);