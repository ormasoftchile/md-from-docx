# md-from-docx Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-06

## Active Technologies

- TypeScript 5.x, Node.js 18+ (VS Code extension host) + mammoth (DOCX→HTML), turndown (HTML→Markdown), @vscode/vsce (packaging) (001-docx-markdown-converter)
- TypeScript 5.9 on Node.js 18+ + mammoth ^1.11.0 (DOCX→HTML), turndown 7.2.2 (HTML→MD), turndown-plugin-gfm 1.0.2, esbuild 0.27.0 (bundler) (004-robust-html-parsing)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.x, Node.js 18+ (VS Code extension host): Follow standard conventions

## Recent Changes

- 004-robust-html-parsing: Added TypeScript 5.9 on Node.js 18+ + mammoth ^1.11.0, turndown 7.2.2, esbuild 0.27.0
- 001-docx-markdown-converter: Added TypeScript 5.x, Node.js 18+ (VS Code extension host) + mammoth (DOCX→HTML), turndown (HTML→Markdown), @vscode/vsce (packaging)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
