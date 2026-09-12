# Change Log

All notable changes to the "quick-memo" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## v0.0.8
- Require VS Code 1.136 or later.
- Upgrade ripgrep (`@vscode/ripgrep` 1.18), which fixes the sorting bug that previously required a manual workaround; remove the workaround from README.md.
- Modernize tooling: TypeScript 7, ESLint 10 with flat config, and updated test dependencies.
- Run integration tests in CI.

## v0.0.7
- Add `todoCount` front-matter property that shows the number of completed tasks versus total tasks (property name configurable via `quickNotes.todoCountProperty`).
- Update dependent libraries and resolve npm audit vulnerabilities.

## v0.0.6
- Make note path pattern configurable.
- Update README.md.
- Publish this extention to the marketplace.

## v0.0.5

## v0.0.4

## v0.0.3
- Update libraries
- Use ripgrep for traversing files.

## v0.0.1
- Initial release
