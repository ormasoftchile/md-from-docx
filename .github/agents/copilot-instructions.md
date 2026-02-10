# md-from-docx Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-06

## Active Technologies

- TypeScript 5.x, Node.js 18+ (VS Code extension host) + mammoth (DOCX→HTML), turndown (HTML→Markdown), @vscode/vsce (packaging) (001-docx-markdown-converter)
- TypeScript 5.9 on Node.js 18+ + mammoth ^1.11.0 (DOCX→HTML), turndown 7.2.2 (HTML→MD), turndown-plugin-gfm 1.0.2, esbuild 0.27.0 (bundler) (004-robust-html-parsing)
- TypeScript 5.3+ on Node.js 22.x + Jest 29.7, ts-jest 29.1, docx (fixture gen), diff (unified diffs), cross-env (npm scripts) — all devDeps (005-golden-test-determinism)

## Project Structure

```text
src/
  conversion/    # Core pipeline: docxParser, htmlToMarkdown, imageExtractor, index
  commands/      # VS Code command handlers: convertDocx, pasteAsMarkdown
  config/        # Settings reader
  types/         # Shared interfaces
  utils/         # Logging, file system, error handling
  webview/       # Clipboard capture panel
test/
  unit/          # Unit tests (Jest)
  functional/    # Functional/regression tests
  golden/        # Golden test suite (fixtures, harness, invariants)
  utils/         # Shared test utilities (invariants, normalize)
scripts/         # One-time scripts (generate-fixtures.ts)
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.x, Node.js 18+ (VS Code extension host): Follow standard conventions

## Recent Changes

- 005-golden-test-determinism: Added Jest 29.7 golden test suite, docx (fixture gen), diff (unified diffs), cross-env (npm scripts). New dirs: test/golden/, test/utils/, scripts/
- 004-robust-html-parsing: Added TypeScript 5.9 on Node.js 18+ + mammoth ^1.11.0, turndown 7.2.2, esbuild 0.27.0
- 001-docx-markdown-converter: Added TypeScript 5.x, Node.js 18+ (VS Code extension host) + mammoth (DOCX→HTML), turndown (HTML→Markdown), @vscode/vsce (packaging)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
