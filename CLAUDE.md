# Quick Notes VS Code Extension - Development Guide

## Build Commands
- `npm install` - Install dependencies
- `npm run compile` - Compile TypeScript
- `npm run watch` - Watch and compile on changes
- `npm run test` - Run all tests
- `npm run test -- --grep="test name"` - Run specific test
- `npm run vscode:prepublish` - Prepare for publishing

## Lint Commands
- `npx eslint src/**/*.ts` - Lint TypeScript files

## Code Style
- Use Prettier for formatting (tabWidth: 4, semi: false, singleQuote: true)
- Format command: `npx prettier --write src/**/*.ts`
- TypeScript strict mode enabled
- Target: ES2021

## Import Conventions
- Use named imports with aliases where appropriate
- Group imports: VSCode APIs first, then project files

## Naming Conventions
- PascalCase for classes (FileExplorer)
- camelCase for functions, variables, and instances
- Use descriptive names that reflect purpose

## Error Handling
- Use try/catch blocks for error handling
- Log errors using console.error
- Return meaningful error messages

## Testing
- TDD style tests with Mocha
- Test files should end with .test.js
- Tests are in src/test/suite/ directory