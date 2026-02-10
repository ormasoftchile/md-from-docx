# Copilot Instructions — md-from-docx

## Build & Test

```bash
npm run compile          # esbuild bundle → dist/extension.js
npm test                 # Jest unit + functional tests
npm run test:unit        # Unit tests only
npm run lint             # ESLint (TypeScript files in src/)
npx tsc --noEmit         # Type-check without emitting
```

Run a single test file:

```bash
npx jest test/unit/htmlPreprocessor.test.ts
```

Run tests matching a name pattern:

```bash
npx jest -t "script tag and content fully removed"
```

## Architecture

This is a **VS Code extension** that converts `.docx` files and clipboard rich content (Word, Loop, Teams) to GitHub-Flavored Markdown.

### Conversion pipeline

```
DOCX file ──► mammoth (DOCX→HTML) ──► preprocessHtml() ──► Turndown (HTML→MD) ──► post-processing ──► .md + images/
Clipboard  ──► webview capture ─────► preprocessHtml() ──► Turndown (HTML→MD) ──► post-processing ──► .md + images/
```

- **`src/conversion/docxParser.ts`** — Wraps mammoth; extracts HTML + images from `.docx` files.
- **`src/conversion/htmlToMarkdown.ts`** — The core module (~1000 lines). Contains:
  - `preprocessHtml()` — Strips Word/Loop/Teams proprietary markup (namespaced tags, `Mso*` classes, dangerous tags, double-encoded entities).
  - Custom Turndown rules for headings, images, footnotes, superscript/subscript, Loop TL;DR/metric/insight cards, and Loop/Teams citation links.
  - `htmlToMarkdown()` — Main entry point. Normalizes line endings, transforms Loop citations and iframe `srcdoc` embeds, runs preprocessor, calls Turndown, then applies post-processing (heading level repair, TOC link cleanup, orphan data-URI detection, GFM table repair, whitespace normalization).
  - `textToAnchor()` — Generates heading anchor IDs.
- **`src/conversion/imageExtractor.ts`** — Handles image format detection, naming, and writing extracted images to disk.
- **`src/conversion/index.ts`** — Orchestrates the full pipeline via `convert()` and `convertAndWrite()`.

### Entry points

- **`src/extension.ts`** — Registers two VS Code commands: `convertFile` and `pasteAsMarkdown`.
- **`src/commands/convertDocx.ts`** — File conversion command handler.
- **`src/commands/pasteAsMarkdown.ts`** — Opens a webview for clipboard capture.
- **`src/webview/clipboardCapture.ts`** — Webview HTML/JS for the paste panel.

### Supporting modules

- **`src/config/settings.ts`** — Reads VS Code settings under `docxMarkdownConverter.*`; merges with `DEFAULT_CONVERSION_OPTIONS` from `src/types/index.ts`.
- **`src/utils/logging.ts`** — Outputs to VS Code Output Channel when available, falls back to `console.log` in tests.
- **`src/utils/fileSystem.ts`** — Thin wrappers around `vscode.workspace.fs` with fallbacks for Node.js `fs`.

### Test structure

- **`test/unit/`** — Unit tests (Jest). The `vscode` module is mocked via `test/__mocks__/vscode.ts`.
- **`test/functional/`** — Functional/regression tests against real DOCX files.
- **`test/docx/`** — Sample `.docx` fixtures.

## Conventions

- **Bundler**: esbuild (single-file CJS bundle). `vscode` is external — never bundle it.
- **Turndown singleton**: `getTurndownService()` lazily creates one `TurndownService` instance with custom rules. Call `resetTurndownService()` in tests to clear state.
- **Logging**: Use `debug()`, `info()`, `warn()`, `error()` from `src/utils/logging.ts` — not raw `console.log`.
- **Type annotations**: Strict TypeScript. Unused vars prefixed with `_` are allowed (ESLint rule). Imports must be `camelCase` or `PascalCase`.
- **HTML preprocessing order matters**: `preprocessHtml()` runs before Turndown. Loop/Teams-specific transforms (citation links, iframe srcdoc extraction, FluentUI button stripping) happen in `htmlToMarkdown()` *before* the preprocessor call.
- **Feature specs** live in `specs/` as numbered directories (e.g., `004-robust-html-parsing`). Reference these for detailed requirements and test matrices.
