# Implementation Plan: Robust HTML Parsing

**Branch**: `004-robust-html-parsing` | **Date**: February 6, 2026 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-robust-html-parsing/spec.md`

## Summary

Refactor the fragile regex-based HTML preprocessing pipeline to use proper techniques for each pipeline stage: string-based cleanup for safe Word namespace removal, Turndown's built-in domino DOM parser for structural work, Turndown custom rules for element-level conversion, and native DOMParser in the webview for clipboard image/SVG extraction. Fixes 12 specific parsing bugs (script tag leakage, TOC text deletion, table content loss, Unicode anchor truncation, heading number misdetection, orphaned data URIs, webview regex SVG extraction, entity decoding gaps, debug logging). **No new runtime dependency required** — leverages Turndown's bundled `@mixmark-io/domino` parser and the webview's native Chromium APIs.

## Technical Context

**Language/Version**: TypeScript 5.9 on Node.js 18+  
**Primary Dependencies**: mammoth ^1.11.0 (DOCX→HTML), turndown 7.2.2 (HTML→MD incl. @mixmark-io/domino), turndown-plugin-gfm 1.0.2, esbuild 0.27.0 (bundler). No new runtime dependency.  
**Storage**: File system only (VS Code workspace files)  
**Testing**: Jest 29.7.0 with ts-jest. Existing unit, functional, and regression test suites  
**Target Platform**: VS Code extension (Node.js host, Chromium webview)  
**Project Type**: Single VS Code extension project  
**Performance Goals**: <5 seconds for 100-page DOCX; bundle size increase ~0 KB (SC-007, SC-008)  
**Constraints**: Must bundle with esbuild under `--platform=node --format=cjs`; no browser DOM in extension host; webview has native DOMParser  
**Scale/Scope**: Documents up to ~1 MB HTML; 5 existing DOCX test fixtures; 13 functional requirements

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The constitution file (`.specify/memory/constitution.md`) is a blank template with no project-specific principles. No violations possible. Gate passes trivially.

**Pre-Phase 0**: ✅ PASS (no principles to violate)  
**Post-Phase 1**: ✅ PASS (re-checked — no principles to violate)

## Project Structure

### Documentation (this feature)

```text
specs/004-robust-html-parsing/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── extension.ts                      # Extension entry point (no changes)
├── commands/
│   ├── convertDocx.ts                # DOCX conversion command (no changes)
│   └── pasteAsMarkdown.ts            # Clipboard paste command (no changes)
├── config/
│   └── settings.ts                   # Settings accessor (no changes)
├── conversion/
│   ├── index.ts                      # Pipeline orchestrator (no changes)
│   ├── docxParser.ts                 # Mammoth wrapper (no changes)
│   ├── htmlToMarkdown.ts             # ★ PRIMARY TARGET — preprocessing, postprocessing, table converter, anchor generator
│   └── imageExtractor.ts             # Image processing (no changes)
├── types/
│   └── index.ts                      # Type definitions (no changes)
├── utils/
│   ├── errorHandler.ts               # Error handling (no changes)
│   ├── fileSystem.ts                 # FS utilities (no changes)
│   ├── logging.ts                    # Logging (no changes)
│   └── progress.ts                   # Progress reporting (no changes)
└── webview/
    └── clipboardCapture.ts           # Webview panel manager (no changes)

media/
└── clipboard.html                    # ★ SECONDARY TARGET — SVG/image extraction, debug logging

test/
├── unit/
│   └── edgeCases.test.ts             # Existing edge case tests
├── functional/
│   ├── features.test.ts              # Existing feature tests
│   └── regression.test.ts            # Existing regression tests
└── unit/
    └── htmlPreprocessor.test.ts      # ★ NEW — dedicated preprocessor tests
```

**Structure Decision**: This is a surgical refactor within the existing project structure. Only two files are modified (`htmlToMarkdown.ts`, `clipboard.html`), one new test file is added. No structural changes, no new dependencies.

## Research Findings

See [research.md](research.md) for full details. Key architectural decisions:

| # | Decision | Rationale |
|---|----------|-----------|
| AD-1 | **No new runtime dependency** | Turndown bundles `@mixmark-io/domino` (HTML5 parser). cheerio/slim evaluated but adds +279 KB (exceeds SC-007). Domino is battle-tested (Wikimedia Parsoid). |
| AD-2 | **String-based preprocessing for safe patterns** | Word namespace tags (`w:*`, `o:*`) have unique prefixes that never appear in valid HTML — regex removal is provably safe. |
| AD-3 | **Turndown instances for structural work** | The fallback table converter creates a lightweight Turndown instance for cell-level HTML→Markdown conversion (FR-007). No new rules are added to the main Turndown service. `addRule()` and `remove()` remain available for future use. |
| AD-4 | **Split unsafe regex into Turndown instances + post-processing** | Table inner HTML uses a lightweight Turndown instance; entity heuristic and heading detection moved to post-processing. |
| AD-5 | **Native DOMParser in webview** | Zero CSP impact. Creates inert off-screen Document. No resource loading. Replaces all regex SVG/image extraction. |
| AD-6 | **Turndown accepts DOM nodes directly** | `turndownService.turndown(domNode)` supported — but cheerio nodes are NOT DOM-compatible (different internal structure). Only domino/browser nodes work. |

### Pipeline Architecture (Revised)

```
Raw HTML (from mammoth or clipboard)
  │
  ├─ 1. Normalize line endings (\r\n → \n)
  ├─ 2. Extract iframe srcdoc content (existing logic, unchanged)
  ├─ 3. Detect & decode double-encoded entities (FR-006, widened heuristic)
  │
  ├─ 4. STRING PREPROCESSING (safe patterns only):
  │     • Remove <head>, <style>, <meta>, <link>, <?xml> (structural wrappers)
  │     • Remove XML-namespaced elements: w:*, o:* (unique prefixes)
  │     • Remove v:shapetype (template definitions)
  │     • Keep v:imagedata (actual image content)
  │     • Strip Mso* classes, mso-* styles
  │     • ★ NEW: Remove <script>, <noscript>, <template>, <object>, <embed>, <applet> (FR-002)
  │     • ★ NEW: Extract <body> content when wrappers present (FR-003) 
  │
  ├─ 5. TURNDOWN CONVERSION (domino parses internally):
  │     • Existing rules: headings, images, paragraphs, sup, sub, Loop cards
  │     • ★ NOTE: No new rules on the main Turndown service. The fallback table
  │       converter (Phase C) creates a lightweight Turndown instance internally
  │       for cell content HTML→Markdown conversion (FR-007).
  │     • Turndown's GFM plugin handles tables natively
  │
  ├─ 6. POST-PROCESSING (on Markdown string):
  │     • Strip remaining XML namespace tags in Markdown
  │     • Strip conditional comments
  │     • ★ FIXED: TOC link removal preserves text (FR-005): [text](#_Toc...) → text
  │     • ★ FIXED: Fallback table converter preserves inner formatting (FR-007, FR-008)
  │     • ★ FIXED: fixHeadingLevelsFromNumbering distinguishes versions (FR-010)
  │     • ★ NEW: Orphan data URI guard (FR-011)
  │     • Clean excessive newlines
  │
  └─ 7. OUTPUT: Clean Markdown string + warnings
```

## Implementation Phases

### Phase A: Preprocessing Hardening (FR-001 through FR-004)

**Scope**: Refactor `preprocessHtml()` in `htmlToMarkdown.ts`

1. Add `<script>`, `<noscript>`, `<template>`, `<object>`, `<embed>`, `<applet>` to dangerous tag removal (FR-002)
2. Add `<body>` content extraction before other preprocessing (FR-003)
3. Verify existing Word namespace removal handles all edge cases (FR-004)
4. Extract `PreprocessorConfig` type for testability
5. Return `PreprocessResult` with stats for debug logging

**Tests**: New `test/unit/htmlPreprocessor.test.ts` with isolated preprocessor tests
**Risk**: Low — additive changes to existing function

### Phase B: Post-processing Fixes (FR-005, FR-010, FR-011)

**Scope**: Fix TOC handler, heading level detector, add orphan guard in `htmlToMarkdown.ts`

1. **TOC links** (FR-005): Change `markdown.replace(/\[([^\]]+)\]\(#_[^)]+\)/g, '')` → `'$1'` to preserve text
2. **Heading levels** (FR-010): Add version-number exclusion (segment=0 or >3 segments)
3. **Orphan data URIs** (FR-011): New function scans for `![...](data:image/...)` > 100 chars, replaces with placeholder

**Tests**: Add cases to `edgeCases.test.ts`
**Risk**: Low — targeted regex fixes with clear before/after

### Phase C: Entity Decoding & Table Converter (FR-006, FR-007, FR-008)

**Scope**: Widen entity heuristic, fix fallback table converter in `htmlToMarkdown.ts`

1. **Entity decoding** (FR-006): Replace hardcoded 7-tag-name list with pattern matching any tag + class/id/style/data-* attribute
2. **Table converter** (FR-007): Preserve formatted cell content (bold, links, code) — use Turndown to convert cell HTML instead of stripping all tags
3. **Table column normalization** (FR-008): Detect max column count, pad shorter rows with empty cells

**Tests**: New table-specific test cases with formatted cells
**Risk**: Medium — entity heuristic widening needs careful testing to avoid false positives on literal `&lt;tag&gt;` in normal text

### Phase D: Anchor Generator & Webview (FR-009, FR-012, FR-013)

**Scope**: Fix `textToAnchor()` in `htmlToMarkdown.ts`; refactor `clipboard.html`

1. **Anchor generator** (FR-009): Replace `[^\w\-áéíóúñü]` with `[^\p{L}\p{N}\-]` (Unicode property escape with `u` flag)
2. **Webview image extraction** (FR-012): Replace regex-based SVG/image extraction with `DOMParser` + `querySelectorAll`
3. **Debug logging cleanup** (FR-013): Remove or gate all `console.log` calls in `clipboard.html`

**Tests**: Unicode anchor unit tests; manual webview testing
**Risk**: Low — DOMParser is native to the webview, zero CSP issues confirmed

### Phase E: Regression & Validation

**Scope**: Full test suite execution and validation

1. Run all existing regression tests against the 5 DOCX fixtures — verify zero regressions (SC-001)
2. Scan all fixture outputs for residual HTML tags (SC-002)
3. Add malformed HTML test cases (unclosed tags, mismatched nesting) (SC-003)
4. Verify bundle size delta (should be ~0 KB) (SC-007)
5. Performance benchmark: 100-page equivalent HTML in < 5 seconds (SC-008)

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Entity decoding heuristic false positives | Medium | Add negative test cases for literal `&lt;tag&gt;` in normal prose; require both tag name AND attribute pattern |
| Fallback table converter uses Turndown for cell content — recursive call | Medium | Create separate lightweight Turndown instance for cell conversion (no GFM plugin, no custom rules) |
| `\p{L}` Unicode property escapes require ES2018+ | Low | Already targeting ES2020; esbuild passes through Unicode regex |
| DOMParser in webview — escaped colon selectors for `v:imagedata` | Low | Use `v\\:imagedata` selector syntax (confirmed working in Chromium) |
| Heading version detection edge cases (e.g., "2.0 Overview") | Low | Validate: any segment = 0 → version-like; test with real document headings |

## Deliverables

| Artifact | Path | Status |
|----------|------|--------|
| Feature Spec | `specs/004-robust-html-parsing/spec.md` | ✅ Complete |
| Requirements Checklist | `specs/004-robust-html-parsing/checklists/requirements.md` | ✅ Complete |
| Research | `specs/004-robust-html-parsing/research.md` | ✅ Complete |
| Data Model | `specs/004-robust-html-parsing/data-model.md` | ✅ Complete |
| Quickstart | `specs/004-robust-html-parsing/quickstart.md` | ✅ Complete |
| Contracts | `specs/004-robust-html-parsing/contracts/` | ✅ Complete |
| Implementation Plan | `specs/004-robust-html-parsing/plan.md` | ✅ Complete |
| Agent Context | `.github/agents/copilot-instructions.md` | ✅ Updated |
| Tasks | `specs/004-robust-html-parsing/tasks.md` | ✅ Complete |
