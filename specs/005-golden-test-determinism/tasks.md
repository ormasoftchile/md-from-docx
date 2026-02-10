# Tasks: Golden Test Suite & Deterministic Output

**Input**: Design documents from `/specs/005-golden-test-determinism/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Tests are INCLUDED — this feature is fundamentally a test infrastructure initiative. The golden test suite, invariant tests, and fixture harness ARE the deliverables.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `test/` at repository root
- New test infra: `test/golden/`, `test/utils/`
- Fixture generator: `scripts/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies, create directory structure, configure tooling

- [x] T001 Install devDependencies: `npm install --save-dev docx diff @types/diff cross-env` and verify in package.json
- [x] T002 [P] Create directory structure: `test/golden/fixtures/inputs/`, `test/golden/fixtures/expected/`, `test/utils/`, `scripts/`
- [x] T003 [P] Add `.gitattributes` entries for golden test files: `test/golden/** text eol=lf` and `*.md text eol=lf`
- [x] T004 [P] Add npm scripts to package.json: `test:golden` (`jest test/golden`), `test:golden:update` (`cross-env UPDATE_GOLDENS=1 jest test/golden`), `test:private` (`jest test/golden/privateBenchmark.test.ts`)
- [x] T005 [P] Add `DeterminismHook` interface and extended `ConversionOptions` fields (`markdownFlavor`, `lineWrapWidth`, `headingStrategy`, `imagePathBase`) to src/types/index.ts

**Checkpoint**: Dependencies installed, directories exist, types defined, npm scripts ready

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core utilities that ALL user stories depend on — normalization and invariant checker

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Create output normalization utility in test/utils/normalize.ts — implement `normalizeMarkdown()`: CRLF→LF, strip trailing whitespace per line, collapse 3+ blank lines to 2, trim edges, ensure trailing newline
- [x] T007 [P] Create invariant checker utility in test/utils/invariants.ts — implement `InvariantRule` and `InvariantViolation` types, `ALL_INVARIANTS` map with all 7 rules (no-script-tags, no-javascript-uri, no-inline-style, no-mso-artifacts, no-empty-image-src, gfm-table-pipe-consistency, stable-anchors), `checkInvariants()`, and `checkAllInvariants()` per contracts/invariant-checker.md
- [x] T008 [P] Create invariant checker unit tests in test/utils/invariants.test.ts — test each of the 7 invariant rules with positive (clean) and negative (violation) inputs, verify violation line numbers and match text
- [x] T009 [P] Create normalize utility unit tests in test/utils/normalize.test.ts — test CRLF conversion, blank line collapsing, trailing whitespace stripping, edge trimming, trailing newline insertion

**Checkpoint**: Foundation ready — `normalizeMarkdown()` and `checkInvariants()` are tested and working. User story implementation can begin.

---

## Phase 3: User Story 1 — Deterministic Conversion Output (Priority: P1) 🎯 MVP

**Goal**: Same input always produces byte-identical Markdown and images across runs and OSes.

**Independent Test**: Convert a fixture DOCX three times and compare the three outputs — they must be identical.

**Covers**: FR-001, FR-002, FR-003, FR-004, FR-024

### Implementation for User Story 1

- [x] T010 [US1] Thread `DeterminismHook` parameter through the conversion pipeline: update `convert()` and `convertDocxFile()` and `convertClipboardContent()` signatures in src/conversion/index.ts to accept optional `DeterminismHook`; pass hook values to downstream functions when provided, default to production behavior when absent
- [x] T011 [US1] Enforce sequential zero-padded image filenames in src/conversion/imageExtractor.ts — audit existing `image-{index}` naming to confirm `image-001.png` format (3-digit zero-pad), remove any timestamp/UUID/random components if present, accept optional `imageNamingStrategy` from DeterminismHook
- [x] T012 [US1] Enforce forward-slash path separators in all Markdown image and link paths in src/conversion/htmlToMarkdown.ts and src/conversion/imageExtractor.ts — replace `\` with `/` in all generated `relativePath` values, regardless of host OS
- [x] T013 [US1] Enforce LF line endings in final output — add `normalizeLineEndings()` call (CRLF→LF) in src/conversion/index.ts before returning `ConversionResult.markdown`
- [x] T014 [US1] Create determinism verification test in test/golden/determinism.test.ts — convert a fixture DOCX 3 times in a row, compare all 3 outputs are byte-identical after LF normalization; verify image filenames match across runs; verify all paths use forward slashes

**Checkpoint**: User Story 1 complete — repeated conversions produce identical output. Determinism hooks are injectable for testing.

---

## Phase 4: User Story 4 — Synthetic Fixture Library (Priority: P1)

**Goal**: Create 10+ synthetic fixtures covering all tricky real-world conversion cases.

**Independent Test**: Verify each fixture file exists, is parseable, and has a corresponding entry in fixtures.json.

**Covers**: FR-011, FR-012, FR-013

### Implementation for User Story 4

- [x] T015 [US4] Create fixture generator script in scripts/generate-fixtures.ts — use `docx` package to generate 6 DOCX fixtures: `tables-nested.docx`, `tables-colspan.docx`, `headings-outline-numbering.docx`, `images-spaces-unicode.docx`, `lists-mixed.docx`, `footnotes-simple.docx`; write to test/golden/fixtures/inputs/
- [x] T016 [P] [US4] Create 4 clipboard-HTML fixture files manually in test/golden/fixtures/inputs/: `word-paste-mso.html` (with MsoNormal, mso-* styles, `<o:p>` tags), `teams-card.html` (Teams Adaptive Card markup), `loop-citations.html` (Loop citation links), `iframe-srcdoc.html` (iframe with srcdoc attribute)
- [x] T017 [US4] Run fixture generator script and commit generated DOCX files to test/golden/fixtures/inputs/
- [x] T018 [US4] Create fixtures.json manifest in test/golden/fixtures.json — declare all 10+ fixtures with `id`, `type`, `input` path, `expected` path, `imagesManifest` (if applicable), and `invariants` array (≥2 per fixture) per contracts/fixtures-schema.json
- [x] T019 [US4] Create fixtures.json validation test in test/golden/fixturesManifest.test.ts — verify every fixture entry has a valid `input` file that exists, `id` is unique, `type` is valid, `invariants` array has ≥2 entries

**Checkpoint**: User Story 4 complete — all 10+ fixtures exist, fixtures.json is valid, all input files are parseable.

---

## Phase 5: User Story 2 — Golden Test Suite for Regression Detection (Priority: P1)

**Goal**: Compare actual conversion output against checked-in expected snapshots; fail with unified diff on mismatch.

**Independent Test**: Modify a Turndown rule, run `npm test`, observe a clear diff-based failure.

**Covers**: FR-010, FR-014, FR-015, FR-016, FR-017, FR-018

### Implementation for User Story 2

- [x] T020 [US2] Create golden test harness in test/golden/goldenRunner.ts — implement `runGoldenTest(fixture)`: read input, run conversion pipeline with determinism hooks, normalize output, compare against expected file using `diff` package `createTwoFilesPatch`, return pass/fail with unified diff; support `UPDATE_GOLDENS=1` env var to write actual output instead of comparing
- [x] T021 [US2] Create image manifest comparison helper in test/golden/goldenRunner.ts — implement `assertImageManifest(actualImages, manifestPath)`: compute sha256 + byteLength for each actual image, load expected manifest JSON, sort both by filename, deep-equal compare; on mismatch report which images differ
- [x] T022 [US2] Create golden test Jest file in test/golden/goldenRunner.test.ts — load fixtures.json, iterate each fixture, call `runGoldenTest()`, assert no diff; call `assertImageManifest()` for fixtures with `imagesManifest`; verify all Markdown image links resolve to extracted files
- [x] T023 [US2] Generate initial golden snapshots — run `cross-env UPDATE_GOLDENS=1 npx jest test/golden/goldenRunner.test.ts` to create all expected/*.md files and expected/*.images-manifest.json files; review and commit
- [x] T024 [US2] Verify round-trip: run `npm test` with no code changes and confirm all golden tests pass; then make a trivial Turndown change, run `npm test`, confirm clear diff failure

**Checkpoint**: User Story 2 complete — golden test suite catches regressions with readable diffs; `test:golden:update` regenerates snapshots.

---

## Phase 6: User Story 3 — Invariant Safety Net (Priority: P1)

**Goal**: Every conversion output is checked against semantic invariants — no script tags, no Mso artifacts, consistent tables, stable anchors.

**Independent Test**: Inject a `<script>` tag into a fixture HTML, run invariant tests, observe clear failure.

**Covers**: FR-019, FR-020, FR-021, FR-022, FR-023

### Implementation for User Story 3

- [x] T025 [US3] Create invariant integration test file in test/golden/invariants.test.ts — load fixtures.json, for each fixture: run conversion, call `checkInvariants(output, fixture.invariants)`, assert zero violations; test produces clear error messages with rule ID, line number, and offending text
- [x] T026 [US3] Add anchor determinism test in test/golden/invariants.test.ts — extract headings from 3+ fixtures, run `textToAnchor()` on each heading, verify anchors match inline snapshots; run conversion twice and compare anchor sets
- [x] T027 [US3] Wire invariant checks into golden test loop — in test/golden/goldenRunner.test.ts, add `checkInvariants()` call after each golden comparison so invariant violations are caught alongside snapshot mismatches

**Checkpoint**: User Story 3 complete — every fixture conversion is validated against its declared invariants. Any new invariant violation fails `npm test`.

---

## Phase 7: User Story 5 — Whitespace Normalization (Priority: P2)

**Goal**: Output never has 3+ consecutive blank lines; headings have consistent spacing; no leading/trailing blank lines.

**Independent Test**: Convert a fixture with varied spacing, verify max 2 consecutive blank lines.

**Covers**: FR-005

### Implementation for User Story 5

- [x] T028 [US5] Audit and fix whitespace normalization in src/conversion/htmlToMarkdown.ts post-processing — ensure `collapseBlankLines()` reduces 3+ consecutive blank lines to exactly 2; ensure headings are preceded and followed by exactly 1 blank line; trim document edges
- [x] T029 [US5] Add whitespace-focused fixture in test/golden/fixtures/inputs/whitespace-excessive.html — HTML with 5 consecutive `<p>&nbsp;</p>` spacers, headings with varied spacing, leading/trailing blank blocks
- [x] T030 [US5] Update fixtures.json with `whitespace-excessive` entry; generate golden snapshot; verify max 2 consecutive blank lines in expected output

**Checkpoint**: User Story 5 complete — whitespace normalization is deterministic and tested.

---

## Phase 8: User Story 6 — Clipboard Image Handling Improvements (Priority: P2)

**Goal**: Global data-URI replacement, consistent URL encoding, no folder name collisions.

**Independent Test**: Paste HTML with the same data URI 3 times; verify all 3 references point to one extracted file.

**Covers**: FR-006, FR-007, FR-008

### Implementation for User Story 6

- [x] T031 [US6] Fix global data-URI replacement in src/conversion/imageExtractor.ts — ensure `replaceAll()` or global regex replaces ALL occurrences of a data URI, not just the first match
- [x] T032 [US6] Enforce consistent URL encoding for image path segments in src/conversion/imageExtractor.ts — encode spaces, unicode chars, and special chars in folder and file names (e.g., `My%20Doc_images/image-001.png`)
- [x] T033 [US6] Implement folder collision avoidance in src/commands/pasteAsMarkdown.ts — when `paste-<timestamp>_images/` already exists, append `-1`, `-2`, etc. until a non-existing folder name is found
- [x] T034 [US6] Add clipboard image fixture in test/golden/fixtures/inputs/clipboard-duplicate-images.html — HTML with same data URI referenced 3 times; add to fixtures.json; generate golden snapshot verifying all 3 references resolve to one image

**Checkpoint**: User Story 6 complete — clipboard paste handles duplicate data URIs, URL encodes paths, and avoids collisions.

---

## Phase 9: User Story 7 — TOC Link Resolution (Priority: P2)

**Goal**: Word-generated TOC links are cleanly stripped; no dead `#_Toc` or `#_heading` fragments.

**Independent Test**: Convert fixture with Word TOC; verify zero `#_Toc` fragments survive.

**Covers**: FR-009

### Implementation for User Story 7

- [x] T035 [US7] Audit and fix TOC link stripping in src/conversion/htmlToMarkdown.ts — ensure `preprocessHtml()` removes `<a href="#_Toc...">` and `<a href="#_heading...">` wrappers, preserving inner text as plain text; no anchor rewriting
- [x] T036 [US7] Add TOC-focused fixture in test/golden/fixtures/inputs/toc-word-generated.docx (or .html) — document with a Word-generated Table of Contents with multiple `#_Toc` and `#_heading` links; add to fixtures.json; generate golden snapshot verifying zero dead TOC fragments

**Checkpoint**: User Story 7 complete — no `#_Toc` or `#_heading` fragments in any output.

---

## Phase 10: User Story 8 — Batch DOCX Conversion (Priority: P3)

**Goal**: Multi-select DOCX files in Explorer, convert all with progress indicator.

**Independent Test**: Select 3 DOCX files, run command, verify 3 Markdown files produced.

**Covers**: FR-027, FR-028, FR-029, FR-030

### Implementation for User Story 8

- [x] T037 [US8] Implement batch conversion handler in src/commands/convertDocx.ts — accept array of URIs from Explorer context menu; iterate and convert each; isolate errors per file so one failure doesn't block others
- [x] T038 [US8] Add batch progress notification in src/commands/convertDocx.ts — use `vscode.window.withProgress()` to show "Converting 2 of 3: filename.docx" during batch conversion
- [x] T039 [US8] Update `activationEvents` in package.json to include `onCommand` entries for both registered commands (`docxMarkdownConverter.convertFile` and `docxMarkdownConverter.pasteAsMarkdown`)
- [x] T040 [US8] Update `menus.explorer/context` contribution in package.json to support multi-select (set `"when": "resourceExtname == .docx"` and ensure `commandPalette` still works for single files)
- [x] T041 [US8] Add batch conversion unit test in test/unit/batchConversion.test.ts — mock `vscode.workspace.fs`, verify 3 inputs produce 3 outputs, verify error isolation (1 failure + 2 successes)

**Checkpoint**: User Story 8 complete — batch conversion works with progress and fault isolation.

---

## Phase 11: User Story 9 — Conversion Settings Knobs (Priority: P3)

**Goal**: Users can configure Markdown flavor, line wrap, heading strategy, image path base.

**Independent Test**: Set `markdownFlavor` to `commonmark`, convert a table fixture, verify no GFM table output.

**Covers**: FR-031

### Implementation for User Story 9

- [x] T042 [US9] Add new settings declarations in package.json `contributes.configuration` — `docxMarkdownConverter.markdownFlavor` (enum: gfm, commonmark, default), `docxMarkdownConverter.lineWrapWidth` (number or "none"), `docxMarkdownConverter.headingStrategy` (enum: infer, preserve), `docxMarkdownConverter.imagePathBase` (string)
- [x] T043 [US9] Read new settings in src/config/settings.ts — extend `getConversionOptions()` to read the 4 new settings and map `"default"` flavor to `"gfm"`; return as part of `ConversionOptions`
- [x] T044 [US9] Implement `markdownFlavor` handling in src/conversion/htmlToMarkdown.ts — when `commonmark`, disable GFM table/strikethrough/task-list Turndown plugins; `gfm` and `default` keep current behavior
- [x] T045 [US9] Implement `lineWrapWidth` handling in src/conversion/htmlToMarkdown.ts — when a number, wrap paragraphs at approximately that width; when `"none"`, preserve current behavior (no wrapping)
- [x] T046 [US9] Implement `headingStrategy` handling in src/conversion/htmlToMarkdown.ts — when `"preserve"`, skip the heading level inference/repair post-processing; when `"infer"`, keep current behavior
- [x] T047 [US9] Add settings unit test in test/unit/settings.test.ts — verify `getConversionOptions()` reads new settings; verify `"default"` maps to `"gfm"`; verify defaults when settings not configured

**Checkpoint**: User Story 9 complete — all 4 settings are configurable and affect conversion output.

---

## Phase 12: User Story 10 — Private Benchmark Mode (Priority: P3)

**Goal**: Developer points `MD_FROM_DOCX_PRIVATE_FIXTURES` to a folder of real-world DOCX files; `npm run test:private` converts all and prints a summary.

**Independent Test**: Set env var, run script, verify summary output.

**Covers**: FR-025

### Implementation for User Story 10

- [x] T048 [US10] Create private benchmark test file in test/golden/privateBenchmark.test.ts — read `MD_FROM_DOCX_PRIVATE_FIXTURES` env var; if not set, skip with message "No private fixtures path set — skipping"; if set, find all .docx files recursively, convert each with determinism hooks, run all invariant checks, print summary ("N files processed, X passed, Y failed")
- [x] T049 [US10] Ensure private benchmark outputs go to temp dir and are cleaned up — use `os.tmpdir()` + `mkdtempSync()`; `afterAll` cleanup; verify no files added to git working tree
- [x] T050 [US10] Add `.gitignore` entry for private fixture outputs — add `test/golden/private/` to .gitignore (safety net in case temp dir logic fails)

**Checkpoint**: User Story 10 complete — private benchmark runs on local fixtures without committing anything.

---

## Phase 13: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, validation, cleanup

- [x] T051 [P] Update jest.config.js to include `test/golden/` and `test/utils/` paths in test discovery
- [x] T052 [P] Update README.md Testing section to document golden test commands: `npm test`, `npx jest test/golden`, `npm run test:golden:update`
- [x] T053 [P] Update TESTING_GUIDE.md with golden test architecture, adding/updating fixtures, invariant rules
- [x] T054 Run full test suite (`npm test`) — verify all unit, functional, and golden tests pass; verify no regressions in existing tests
- [x] T055 Run `npx tsc --noEmit` — verify zero type errors after all changes
- [x] T056 Run `npm run lint` — verify zero lint errors after all changes
- [x] T057 Run quickstart.md validation — follow each step in specs/005-golden-test-determinism/quickstart.md and verify they work as documented
- [x] T058 [P] Validate SC-002 performance gate — measure golden test suite elapsed time during T054 run; assert total time < 30 seconds for all public fixtures; add timing assertion or CI annotation
- [x] T059 [P] Validate SC-007 cross-OS CI — update GitHub Actions workflow (`.github/workflows/`) to include a matrix strategy running tests on `ubuntu-latest`, `windows-latest`, and `macos-latest`; verify golden tests pass on all 3 OSes without OS-specific skips

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (T001 for packages, T005 for types) — **BLOCKS stories that use test utilities** (US1, US2, US3, US5, US6, US7, US10)
- **US1 Determinism (Phase 3)**: Depends on Phase 2 (normalize utility)
- **US4 Fixtures (Phase 4)**: Depends on Phase 1 only (T001 for `docx` package, T002 for directories) — can start in parallel with Phase 2
- **US2 Golden Suite (Phase 5)**: Depends on Phase 3 (determinism hooks) + Phase 4 (fixtures exist) + Phase 2 (normalize utility)
- **US3 Invariants (Phase 6)**: Depends on Phase 2 (invariant checker) + Phase 5 (golden test loop to wire into)
- **US5 Whitespace (Phase 7)**: Depends on Phase 2 (normalize) — can run in parallel with Phase 3-6
- **US6 Clipboard (Phase 8)**: Depends on Phase 2 — can run in parallel with Phase 3-6
- **US7 TOC (Phase 9)**: Depends on Phase 2 — can run in parallel with Phase 3-6
- **US8 Batch (Phase 10)**: No dependency on golden tests — can run after Phase 1
- **US9 Settings (Phase 11)**: Depends on Phase 1 (T005 for extended ConversionOptions type)
- **US10 Private Benchmark (Phase 12)**: Depends on Phase 5 (golden harness) + Phase 6 (invariants)
- **Polish (Phase 13)**: Depends on all desired user stories being complete

### User Story Dependencies

```
Phase 1 (Setup)
  │
  ├──────────────────────────────────────────┐
  │                                          │
  ▼                                          ▼
Phase 2 (Foundational)                     Phase 4 (US4: Fixtures)
  │  BLOCKS test-utility-dependent stories   │  (only needs Phase 1)
  │                                          │
  ├── Phase 3 (US1: Determinism)             │
  │     │                                    │
  │     └──────────────┬─────────────────────┘
  │                    ▼
  │              Phase 5 (US2: Golden Suite)
  │                    │
  │                    ▼
  │              Phase 6 (US3: Invariants)
  │                    │
  │                    ▼
  │              Phase 12 (US10: Benchmark)
  │
  ├── Phase 7 (US5: Whitespace)
  ├── Phase 8 (US6: Clipboard)
  ├── Phase 9 (US7: TOC Links)
  │
  Phase 10 (US8: Batch) ← needs Phase 1 only
  Phase 11 (US9: Settings) ← needs Phase 1 only
         │
         ▼
      Phase 13 (Polish)
```

### Within Each User Story

- Shared utilities before story-specific code
- Source code changes before test files
- Core implementation before integration wiring
- Fixture creation before golden snapshot generation
- Commit after each task or logical group

### Parallel Opportunities

**After Phase 2 completes, these can run in parallel:**

- Stream A (Golden Test Critical Path): US1 → US4 → US2 → US3 → US10
- Stream B (Output Quality): US5 + US6 + US7 (all independent, all parallelizable with [P])
- Stream C (UX): US8 + US9 (independent of golden tests, parallelizable with [P])

**Within phases, [P]-marked tasks can run simultaneously.**

---

## Parallel Example: Phase 2 (Foundational)

```bash
# All four foundational tasks can run in parallel (different files):
Task T006: "Create normalization utility in test/utils/normalize.ts"
Task T007: "Create invariant checker in test/utils/invariants.ts"
Task T008: "Create invariant checker tests in test/utils/invariants.test.ts"
Task T009: "Create normalize utility tests in test/utils/normalize.test.ts"
```

## Parallel Example: User Story 4 (Fixtures)

```bash
# DOCX generation and HTML fixture creation can run in parallel:
Task T015: "Create fixture generator script in scripts/generate-fixtures.ts"
Task T016: "Create 4 clipboard-HTML fixture files in test/golden/fixtures/inputs/"
```

## Parallel Example: P2 Stories (After Phase 2)

```bash
# All three P2 stories are independent and can run in parallel:
Stream B-1: T028, T029, T030 (US5: Whitespace)
Stream B-2: T031, T032, T033, T034 (US6: Clipboard)
Stream B-3: T035, T036 (US7: TOC Links)
```

---

## Implementation Strategy

### MVP First (P1 Stories Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (**CRITICAL — blocks all stories**)
3. Complete Phase 3: US1 Determinism
4. Complete Phase 4: US4 Fixtures
5. Complete Phase 5: US2 Golden Suite
6. Complete Phase 6: US3 Invariants
7. **STOP and VALIDATE**: Run `npm test` — all golden tests, invariant tests, and existing tests pass
8. This is a shippable MVP with full golden test infrastructure

### Incremental Delivery

1. **MVP** (P1): Setup → Foundational → US1 → US4 → US2 → US3 → Golden test suite working ✅
2. **Quality** (P2): US5 + US6 + US7 → Output quality improvements verified by goldens ✅
3. **UX** (P3): US8 + US9 + US10 → Batch conversion, settings, benchmark ✅
4. **Polish**: Documentation, full validation, lint/type checks ✅

### Parallel Team Strategy

With multiple developers:

1. Team completes Phase 1 + Phase 2 together
2. Once Phase 2 is done:
   - Developer A: US1 → US4 → US2 → US3 (golden test critical path)
   - Developer B: US5 + US6 + US7 (output quality, in parallel)
   - Developer C: US8 + US9 (UX improvements, in parallel)
3. After P1 and P2 stories merge: US10 (private benchmark)
4. Everyone: Polish phase

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable at its checkpoint
- US4 (Fixtures) is extracted as its own phase because US2 (Golden Suite) depends on fixtures existing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Run `npm test` frequently to catch regressions early
