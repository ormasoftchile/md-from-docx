# Tasks: Robust HTML Parsing

**Input**: Design documents from `/specs/004-robust-html-parsing/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Tests are included — existing test infrastructure is in place and spec requires SC-001 (zero regressions) and SC-003 (malformed HTML coverage).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. User stories derived from spec.md priorities (P1→P3).

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Exact file paths included in all descriptions

## Path Conventions

- **Single project**: `src/`, `test/` at repository root
- Primary target: `src/conversion/htmlToMarkdown.ts`
- Secondary target: `media/clipboard.html`
- Types: `src/types/index.ts`
- Tests: `test/unit/`

---

## Phase 1: Setup

**Purpose**: Prepare types and test infrastructure shared by all user stories

- [x] T001 Add `PreprocessorConfig` and `PreprocessResult` interfaces to `src/types/index.ts` per data-model.md and contracts/preprocessor.d.ts
- [x] T002 [P] Add `AnchorGeneratorOptions`, `HeadingNumberingPattern`, and `OrphanDataUriResult` interfaces to `src/types/index.ts` per data-model.md and contracts/pipeline.d.ts
- [x] T003 [P] Create test file `test/unit/htmlPreprocessor.test.ts` with describe blocks for preprocessor, table converter, anchor generator, TOC fixer, heading fixer, and orphan guard — all tests empty/pending initially
- [x] T004 Run existing test suite (`npm test`) to confirm green baseline before any changes (SC-001 baseline)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extract the preprocessor function to accept `PreprocessorConfig` so all user stories can build on a testable, configurable preprocessor

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Extract `DEFAULT_PREPROCESSOR_CONFIG` constant in `src/conversion/htmlToMarkdown.ts` with current hardcoded values for `dangerousTags`, `unwrapTags`, `stripNamespacePrefixes`, `keepNamespacedTags`, `stripClassPrefixes`, `stripStylePrefixes` per contracts/preprocessor.d.ts
- [x] T006 Refactor `preprocessHtml()` in `src/conversion/htmlToMarkdown.ts` to accept optional `Partial<PreprocessorConfig>` parameter, merge with defaults, and return `PreprocessResult` (html + warnings + stats) instead of plain string
- [x] T007 Update `htmlToMarkdown()` in `src/conversion/htmlToMarkdown.ts` to consume `PreprocessResult` from the refactored `preprocessHtml()`, passing `.html` to Turndown and collecting `.warnings`
- [x] T008 Run existing test suite (`npm test`) to verify zero regressions after refactor (SC-001 gate)

**Checkpoint**: Preprocessor is now configurable and returns structured output. All existing tests still pass.

---

## Phase 3: User Story 1 — Reliable Conversion of Word Online Clipboard Content (Priority: P1) 🎯 MVP

**Goal**: Strip dangerous tags, extract body content, handle malformed HTML — clean Markdown output with no leftover HTML artifacts.

**Independent Test**: Paste complex Word Online HTML → output contains no `<script>`, no Word artifacts, no raw HTML. Text preserved without duplication.

### Tests for User Story 1

- [x] T009 [P] [US1] Write test: `<script>alert('xss')</script>` tag and content fully removed, in `test/unit/htmlPreprocessor.test.ts` (FR-002)
- [x] T010 [P] [US1] Write test: `<noscript>`, `<template>`, `<object>`, `<embed>`, `<applet>` tags and content fully removed, in `test/unit/htmlPreprocessor.test.ts` (FR-002)
- [x] T011 [P] [US1] Write test: `<!DOCTYPE><html><head>...</head><body>content</body></html>` → only "content" returned, in `test/unit/htmlPreprocessor.test.ts` (FR-003)
- [x] T012 [P] [US1] Write test: HTML with `<w:WordDocument>`, `<o:p>`, `<v:shapetype>` removed but `<v:imagedata>` preserved, in `test/unit/htmlPreprocessor.test.ts` (FR-004)
- [x] T013 [P] [US1] Write test: HTML with `class="MsoNormal"` and `style="mso-bidi-font-size:12pt"` attributes stripped while text preserved, in `test/unit/htmlPreprocessor.test.ts` (FR-004)
- [x] T014 [P] [US1] Write test: malformed HTML with unclosed `<div>`, mismatched `<b><i></b></i>` nesting → conversion completes without error, text preserved without duplication, in `test/unit/htmlPreprocessor.test.ts` (SC-003)
- [x] T014b [P] [US1] Write integration test: feed intentionally malformed HTML (unclosed divs, overlapping tags, missing closing tags, >10 nesting levels, duplicate attributes) through full `htmlToMarkdown()` pipeline and assert: (a) no exceptions thrown, (b) all visible text content preserved without duplication, (c) output contains zero residual HTML tags — verifying Turndown's domino parser handles structural recovery correctly, in `test/unit/htmlPreprocessor.test.ts` (FR-001, SC-003)
- [x] T015 [P] [US1] Write test: empty/whitespace-only HTML input → returns empty string without error, in `test/unit/htmlPreprocessor.test.ts`
- [x] T016 [P] [US1] Write test: HTML containing only `<script>` tags and no visible content → returns empty output, in `test/unit/htmlPreprocessor.test.ts`

### Implementation for User Story 1

- [x] T017 [US1] Add dangerous tag removal (`script`, `noscript`, `template`, `object`, `embed`, `applet`) with content stripping to `preprocessHtml()` in `src/conversion/htmlToMarkdown.ts` (FR-002)
- [x] T018 [US1] Add `<body>` content extraction to `preprocessHtml()` in `src/conversion/htmlToMarkdown.ts` — when `<body>` tag detected, extract inner content and discard DOCTYPE/html/head wrappers (FR-003)
- [x] T019 [US1] Verify and harden existing Word namespace removal (`w:*`, `o:*`, `v:shapetype`) and `v:imagedata` preservation in `preprocessHtml()` in `src/conversion/htmlToMarkdown.ts` (FR-004)
- [x] T020 [US1] Verify and harden existing `Mso*` class and `mso-*` style attribute stripping in `preprocessHtml()` in `src/conversion/htmlToMarkdown.ts` (FR-004)
- [x] T021 [US1] Run all US1 tests plus full regression suite (`npm test`) to confirm green (SC-001)

**Checkpoint**: User Story 1 complete — dangerous tags stripped, body extracted, Word artifacts removed, malformed HTML handled. All tests green.

---

## Phase 4: User Story 2 — Table Content Preservation (Priority: P1)

**Goal**: Fallback table converter preserves formatted cell content (bold, links, code) and normalizes column counts.

**Independent Test**: Convert HTML table with `<td><b>bold</b> and <a href="#">link</a></td>` → GFM table cell contains `**bold** and [link](#)`.

### Tests for User Story 2

- [x] T022 [P] [US2] Write test: HTML table with `<b>`, `<em>`, `<a>`, `<code>` in cells → GFM preserves `**bold**`, `*italic*`, `[link](url)`, `` `code` `` in cells, in `test/unit/htmlPreprocessor.test.ts` (FR-007)
- [x] T023 [P] [US2] Write test: HTML table with uneven row lengths → all rows padded to max column count with empty cells, in `test/unit/htmlPreprocessor.test.ts` (FR-008)
- [x] T024 [P] [US2] Write test: HTML table with colspan=2 on a cell → output has consistent column counts across all rows, in `test/unit/htmlPreprocessor.test.ts` (FR-008)
- [x] T025 [P] [US2] Write test: HTML table with nested table in a cell → inner table content flattened into cell text, in `test/unit/htmlPreprocessor.test.ts` (edge case)

### Implementation for User Story 2

- [x] T026 [US2] Refactor `convertHtmlTableToMarkdown()` in `src/conversion/htmlToMarkdown.ts` to use a lightweight Turndown instance for cell content conversion instead of stripping all HTML with `.replace(/<[^>]+>/g, '')` (FR-007)
- [x] T027 [US2] Add column count normalization to `convertHtmlTableToMarkdown()` in `src/conversion/htmlToMarkdown.ts` — detect max column count across all rows and pad shorter rows with empty `|  |` cells (FR-008)
- [x] T028 [US2] Add colspan handling to `convertHtmlTableToMarkdown()` in `src/conversion/htmlToMarkdown.ts` — when `colspan` attribute detected, span cell content or add empty cells to maintain column count (FR-008)
- [x] T029 [US2] Run all US2 tests plus full regression suite (`npm test`) to confirm green (SC-001, SC-004)

**Checkpoint**: User Story 2 complete — tables with formatted content produce valid GFM with consistent columns. All tests green.

---

## Phase 5: User Story 3 — TOC and Heading Fidelity (Priority: P2)

**Goal**: TOC link text preserved (not deleted), heading levels respect outline numbering without misinterpreting version numbers.

**Independent Test**: `[1.1 Introduction](#_Toc123456)` → "1.1 Introduction" preserved as plain text. `# Version 2.1.0 Release` → unchanged.

### Tests for User Story 3

- [x] T030 [P] [US3] Write test: `[1.1 Introduction](#_Toc123456)` → text "1.1 Introduction" preserved in output, link syntax removed, in `test/unit/htmlPreprocessor.test.ts` (FR-005)
- [x] T031 [P] [US3] Write test: `[Chapter 3](#_heading_h123)` → text "Chapter 3" preserved, in `test/unit/htmlPreprocessor.test.ts` (FR-005)
- [x] T032 [P] [US3] Write test: `# 1.1 Background` → becomes `## 1.1 Background` (depth 2) and `# 1 Overview` → stays `# 1 Overview` (depth 1), in `test/unit/htmlPreprocessor.test.ts` (FR-010)
- [x] T033 [P] [US3] Write test: `# Version 2.1.0 Release` → NOT reinterpreted as depth 3, stays unchanged, in `test/unit/htmlPreprocessor.test.ts` (FR-010)
- [x] T034 [P] [US3] Write test: `# 3.14159 Pi Approximation` → NOT treated as outline numbering, stays unchanged, in `test/unit/htmlPreprocessor.test.ts` (FR-010, edge case)
- [x] T034b [P] [US3] Write test: `# 2.0 Overview` → design decision test: determine if `2.0` is treated as version (skip, stays `#`) or outline (adjust to `##`), document decision in test comment, in `test/unit/htmlPreprocessor.test.ts` (FR-010, edge case)

### Implementation for User Story 3

- [x] T035 [US3] Fix TOC link post-processing in `htmlToMarkdown()` in `src/conversion/htmlToMarkdown.ts` — change `markdown.replace(/\[([^\]]+)\]\(#_[^)]+\)/g, '')` to `'$1'` to preserve link text (FR-005)
- [x] T036 [US3] Verify that the updated TOC regex in T035 still handles both `#_Toc*` and `#_heading*` anchor patterns — add test case for `#_heading_h` variant if not covered by T030/T031, in `test/unit/htmlPreprocessor.test.ts` (FR-005)
- [x] T037 [US3] Refactor `fixHeadingLevelsFromNumbering()` in `src/conversion/htmlToMarkdown.ts` — add version-number exclusion: reject patterns where any segment = 0, > 3 segments, or > 5 decimal digits in any segment (FR-010)
- [x] T038 [US3] Run all US3 tests plus full regression suite (`npm test`) to confirm green (SC-001, SC-005)

**Checkpoint**: User Story 3 complete — TOC text preserved, heading versions not misinterpreted. All tests green.

---

## Phase 6: User Story 4 — Loop/Teams Double-Encoded Content (Priority: P2)

**Goal**: Entity-decoding heuristic triggers for any valid HTML tag name with class/id/style/data-* — not just the hardcoded 7.

**Independent Test**: HTML with `&lt;section class=&quot;content&quot;&gt;text&lt;/section&gt;` → correctly decoded and converted.

### Tests for User Story 4

- [x] T039 [P] [US4] Write test: `&lt;section class=&quot;content&quot;&gt;text&lt;/section&gt;` → decoded and converted, in `test/unit/htmlPreprocessor.test.ts` (FR-006)
- [x] T040 [P] [US4] Write test: `&lt;figure data-id=&quot;123&quot;&gt;image&lt;/figure&gt;` → decoded via `data-*` attribute match, in `test/unit/htmlPreprocessor.test.ts` (FR-006)
- [x] T041 [P] [US4] Write test: `&lt;article id=&quot;main&quot;&gt;` → decoded via `id` attribute match, in `test/unit/htmlPreprocessor.test.ts` (FR-006)
- [x] T042 [P] [US4] Write negative test: literal text `The &lt;tag&gt; is used for...` → NOT decoded (no attribute pattern), in `test/unit/htmlPreprocessor.test.ts` (FR-006 edge case)
- [x] T043 [P] [US4] Write test: at least 15 different tag names trigger decoding (div, span, section, article, figure, nav, header, footer, main, aside, table, ul, ol, details, summary), in `test/unit/htmlPreprocessor.test.ts` (SC-009)

### Implementation for User Story 4

- [x] T044 [US4] Replace hardcoded 7-tag-name entity detection regex in `htmlToMarkdown()` in `src/conversion/htmlToMarkdown.ts` with a generalized pattern: `&lt;([a-z][a-z0-9]*)\s+(class|id|style|data-[a-z-]*)=&quot;` that matches any valid HTML tag name followed by a recognized attribute (FR-006)
- [x] T045 [US4] Run all US4 tests plus full regression suite (`npm test`) to confirm green (SC-001, SC-009)

**Checkpoint**: User Story 4 complete — entity decoding triggers for any tag+attribute combo. All tests green.

---

## Phase 7: User Story 5 — International Heading Anchors (Priority: P3)

**Goal**: Anchor IDs preserve all Unicode letters (French ç, German ü, Portuguese ã, CJK characters), not just Spanish.

**Independent Test**: `textToAnchor("Développement de l'application")` → contains "développement", not "dveloppement".

### Tests for User Story 5

- [x] T046 [P] [US5] Write test: French heading "Développement de l'application" → anchor "développement-de-lapplication", in `test/unit/htmlPreprocessor.test.ts` (FR-009)
- [x] T047 [P] [US5] Write test: German heading "Einführung und Überblick" → anchor "einführung-und-überblick", in `test/unit/htmlPreprocessor.test.ts` (FR-009)
- [x] T048 [P] [US5] Write test: Portuguese heading "Introdução ao sistema" → anchor "introdução-ao-sistema", in `test/unit/htmlPreprocessor.test.ts` (FR-009)
- [x] T049 [P] [US5] Write test: CJK heading "技術概要 Overview" → anchor preserves "技術概要-overview", in `test/unit/htmlPreprocessor.test.ts` (FR-009)
- [x] T050 [P] [US5] Write test: existing Spanish heading "Introducción al proyecto" → anchor still works (regression), in `test/unit/htmlPreprocessor.test.ts` (SC-006)

### Implementation for User Story 5

- [x] T051 [US5] Refactor `textToAnchor()` in `src/conversion/htmlToMarkdown.ts` — replace `[^\w\-áéíóúñü]` character class with `[^\p{L}\p{N}\-]` using the `u` flag for full Unicode letter support (FR-009)
- [x] T052 [US5] Run all US5 tests plus full regression suite (`npm test`) to confirm green (SC-001, SC-006)

**Checkpoint**: User Story 5 complete — anchors work for all Unicode scripts. All tests green.

---

## Phase 8: User Story 6 — Webview Image Extraction Robustness (Priority: P3)

**Goal**: Webview uses DOMParser for SVG/image extraction; orphan data URIs caught by post-processing guard; debug logging removed.

**Independent Test**: Paste HTML with nested `<svg>` elements → each top-level SVG correctly extracted. No debug console.log in production.

### Tests for User Story 6

- [x] T053 [P] [US6] Write test: orphan data URI guard — `![alt](data:image/png;base64,<200+ chars>)` → replaced with `![alt](image-not-extracted)`, in `test/unit/htmlPreprocessor.test.ts` (FR-011)
- [x] T054 [P] [US6] Write test: short data URI (≤100 chars) → NOT replaced by guard (intentional small icons), in `test/unit/htmlPreprocessor.test.ts` (FR-011)
- [x] T055 [P] [US6] Write test: orphan guard returns correct `OrphanDataUriResult` with position, mimeType, and approximateSize, in `test/unit/htmlPreprocessor.test.ts` (FR-011)

### Implementation for User Story 6

- [x] T056 [US6] Implement `detectOrphanDataUris()` function in `src/conversion/htmlToMarkdown.ts` per contracts/pipeline.d.ts — scan for `![...](data:image/...)` with src > 100 chars, replace with `![alt](image-not-extracted)`, return `OrphanDataUriResult` (FR-011)
- [x] T057 [US6] Integrate `detectOrphanDataUris()` into the post-processing pipeline in `htmlToMarkdown()` in `src/conversion/htmlToMarkdown.ts` — call after all other post-processing, log warnings for each orphan (FR-011)
- [x] T058 [US6] Replace regex-based SVG extraction in `media/clipboard.html` with `DOMParser` — use `const doc = new DOMParser().parseFromString(capturedHtml, 'text/html'); doc.querySelectorAll('svg')` for top-level SVG extraction (FR-012)
- [x] T059 [US6] Replace regex-based image extraction in `media/clipboard.html` with `DOMParser` — use `doc.querySelectorAll('img[src^="data:image/"]')` for data URI images and `doc.querySelectorAll('v\\:imagedata[src^="data:"]')` for VML images (FR-012)
- [x] T060 [US6] Replace regex-based background-image extraction in `media/clipboard.html` with DOM-based approach — iterate `doc.querySelectorAll('[style]')` and parse `style.backgroundImage` property (FR-012)
- [x] T061 [US6] Remove or gate all debug `console.log` statements in `media/clipboard.html` — either remove entirely or wrap in `if (window.__MD_FROM_DOCX_DEBUG)` guard (FR-013)
- [x] T062 [US6] Run all US6 tests plus full regression suite (`npm test`) to confirm green (SC-001)

**Checkpoint**: User Story 6 complete — webview uses DOMParser, orphan URIs caught, no debug logging. All tests green.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Full regression validation, performance verification, and bundle size check

- [x] T063 Run all existing regression tests against 5 DOCX fixtures in `test/docx/` — verify zero regressions (SC-001)
- [x] T064 Scan all DOCX fixture Markdown outputs in `test/docx/*.md` for residual HTML tags (`<script>`, `<style>`, `<o:p>`, etc.) — verify zero matches (SC-002)
- [x] T065 [P] Compile extension with `npm run compile` and measure bundle size delta vs baseline 1,693 KB — verify increase < 250 KB (SC-007)
- [x] T066 [P] Create performance test: generate ~1 MB HTML string, convert via `htmlToMarkdown()`, assert completes in < 5 seconds (SC-008)
- [x] T067 Run `npm run lint` and fix any TypeScript/ESLint errors introduced by changes
- [x] T068 Run quickstart.md verification checklist — confirm all 9 items pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 — first MVP increment
- **US2 (Phase 4)**: Depends on Phase 2 — independent of US1 (different function: `convertHtmlTableToMarkdown`)
- **US3 (Phase 5)**: Depends on Phase 2 — independent of US1/US2 (TOC + heading functions)
- **US4 (Phase 6)**: Depends on Phase 2 — independent of US1/US2/US3 (entity decoding in `htmlToMarkdown`)
- **US5 (Phase 7)**: Depends on Phase 2 — independent of all others (isolated `textToAnchor` function)
- **US6 (Phase 8)**: Depends on Phase 2 — independent for webview (FR-012/FR-013), orphan guard (FR-011) is independent in `htmlToMarkdown.ts`
- **Polish (Phase 9)**: Depends on ALL user stories being complete

### User Story Dependencies

- **US1 (P1)**: No dependencies on other stories — operates on `preprocessHtml()`
- **US2 (P1)**: No dependencies on other stories — operates on `convertHtmlTableToMarkdown()`
- **US3 (P2)**: No dependencies on other stories — operates on TOC regex + `fixHeadingLevelsFromNumbering()`
- **US4 (P2)**: No dependencies on other stories — operates on entity decoding heuristic in `htmlToMarkdown()`
- **US5 (P3)**: No dependencies on other stories — operates on `textToAnchor()`
- **US6 (P3)**: No dependencies on other stories — orphan guard in `htmlToMarkdown.ts` + webview in `media/clipboard.html`

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Implementation tasks are sequential within each story
- Story checkpoint (final test run) must pass before moving on

### Parallel Opportunities

**After Phase 2 (Foundational) completes, ALL 6 user stories can proceed in parallel** because they operate on different functions/files:

| Story | Primary Function/File | No Conflict With |
|-------|----------------------|-----------------|
| US1 | `preprocessHtml()` in htmlToMarkdown.ts | US2–US6 |
| US2 | `convertHtmlTableToMarkdown()` in htmlToMarkdown.ts | US1, US3–US6 |
| US3 | TOC regex + `fixHeadingLevelsFromNumbering()` in htmlToMarkdown.ts | US1, US2, US4–US6 |
| US4 | Entity decoding block in `htmlToMarkdown()` in htmlToMarkdown.ts | US1–US3, US5, US6 |
| US5 | `textToAnchor()` in htmlToMarkdown.ts | US1–US4, US6 |
| US6 | `detectOrphanDataUris()` in htmlToMarkdown.ts + `media/clipboard.html` | US1–US5 |

---

## Parallel Example: After Foundational Phase

```text
# All test tasks for all stories can run in parallel (T009–T055):
T009, T010, T011, T012, T013, T014, T015, T016  (US1 tests)
T022, T023, T024, T025                            (US2 tests)
T030, T031, T032, T033, T034                      (US3 tests)
T039, T040, T041, T042, T043                      (US4 tests)
T046, T047, T048, T049, T050                      (US5 tests)
T053, T054, T055                                   (US6 tests)

# Then implementation per story — each story's impl is sequential,
# but different stories run in parallel:
US1: T017 → T018 → T019 → T020 → T021
US2: T026 → T027 → T028 → T029
US3: T035 → T036 → T037 → T038
US4: T044 → T045
US5: T051 → T052
US6: T056 → T057 → T058 → T059 → T060 → T061 → T062
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T004)
2. Complete Phase 2: Foundational (T005–T008)
3. Complete Phase 3: User Story 1 — preprocessing hardening (T009–T021)
4. **STOP and VALIDATE**: Run full test suite, verify dangerous tags stripped, body extracted, Word artifacts removed
5. Deploy/demo if ready — core conversion is now robust

### Incremental Delivery

1. Setup + Foundational → Preprocessor is configurable and testable
2. Add US1 (preprocessing) → Test independently → **MVP: robust conversion** ✅
3. Add US2 (tables) → Test independently → Tables preserve formatting ✅
4. Add US3 (TOC + headings) → Test independently → TOC text preserved, versions not misread ✅
5. Add US4 (entity decoding) → Test independently → Loop/Teams content decoded ✅
6. Add US5 (anchors) → Test independently → International headings work ✅
7. Add US6 (webview + orphan guard) → Test independently → Images robust, no debug logs ✅
8. Polish → Full regression + performance + bundle validation ✅

### Parallel Team Strategy

With multiple developers after Foundational completes:

- **Developer A**: US1 (preprocessing) + US4 (entity decoding) — both in `htmlToMarkdown()`
- **Developer B**: US2 (tables) + US3 (TOC/headings) — different functions in same file
- **Developer C**: US5 (anchors) + US6 (webview + orphan guard) — isolated functions + different file

---

## Notes

- All 6 user stories touch `src/conversion/htmlToMarkdown.ts` but operate on **different functions** within that file, enabling safe parallel work
- US6 is the only story that also modifies `media/clipboard.html` (webview)
- No new runtime dependencies are added (research decision AD-1) — bundle delta ~0 KB
- Tests reference `test/unit/htmlPreprocessor.test.ts` as the single new test file (covers all stories)
- Commit after each task or logical group; run `npm test` at every checkpoint
