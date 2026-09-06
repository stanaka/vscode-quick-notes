const { defineConfig } = require('eslint/config')
const eslint = require('@eslint/js')
const tseslint = require('typescript-eslint')

module.exports = defineConfig([
    {
        ignores: ['node_modules/**', 'out/**', 'dist/**', '.vscode-test/**'],
    },
    {
        files: ['src/**/*.ts'],
        extends: [
            eslint.configs.recommended,
            ...tseslint.configs.recommendedTypeChecked,
        ],
        languageOptions: {
            parserOptions: {
                project: ['./tsconfig.eslint.json'],
                tsconfigRootDir: __dirname,
            },
        },
    },
])
