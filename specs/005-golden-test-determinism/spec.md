# Feature Specification: Golden Test Suite & Deterministic Output

**Feature Branch**: `005-golden-test-determinism`
**Created**: 2026-02-10
**Status**: Draft
**Input**: User description: "Evolve the extension into a highly reliable, refactor-safe, best-in-class converter by improving correctness, determinism, and UX, and introducing a rigorous golden test suite with snapshot and invariant testing"

## Clarifications

### Session 2026-02-10

- Q: Should TOC links be rewritten to real heading anchors or removed entirely? → A: Remove TOC link wrappers — strip `<a href="#_Toc...">` tags and preserve inner text as plain text. No anchor rewriting.
- Q: What deterministic strategy should avoid paste folder name collisions? → A: Numeric suffix — keep `paste-<timestamp>` as base, append `-1`, `-2`, etc. if folder already exists.
- Q: Should the GFM table pipe-count invariant be strict or lenient for edge cases? → A: Strict — every data row and separator row must have exactly the same pipe count as the header row; any mismatch is a test failure.
- Q: What does the `default` Markdown flavor mean vs `gfm`? → A: `default` is an alias for `gfm`. The extension is fundamentally a GFM converter; `commonmark` is the explicit opt-out.
- Q: Should golden tests be integrated into `npm test` (Jest) or a separate script? → A: Integrated — golden tests live as Jest test files under `test/golden/`; `npm test` runs everything (unit + golden). Developers can filter with `npx jest test/golden`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Deterministic Conversion Output (Priority: P1)

A developer converts the same DOCX file or pastes the same clipboard HTML on macOS, Windows, and Linux. Every run produces byte-identical Markdown output (after LF normalization), with images in the same order and with the same filenames.

**Why this priority**: Determinism is the foundation for all other work — golden tests cannot exist without reproducible output.

**Independent Test**: Convert a fixture DOCX three times in a row and compare the three outputs; they must be identical. Repeat on a second OS in CI.

**Acceptance Scenarios**:

1. **Given** a DOCX file with 5 embedded images, **When** the file is converted twice, **Then** the generated Markdown and image file names are byte-identical across both runs.
2. **Given** a Markdown output file, **When** inspected on any OS, **Then** all line endings are LF (`\n`), never CRLF.
3. **Given** a Markdown output with image references, **When** the paths are inspected, **Then** all separators are forward slashes (`/`), never backslashes.
4. **Given** a conversion with images, **When** image filenames are generated, **Then** names are derived from a zero-padded sequential index (e.g., `image-001.png`) with no timestamps, UUIDs, or random components.

---

### User Story 2 — Golden Test Suite for Regression Detection (Priority: P1)

A contributor changes the HTML preprocessing or Turndown rules and runs `npm test`. The golden test suite compares actual output against checked-in expected snapshots and fails with a clear unified diff if the output changed.

**Why this priority**: Without regression tests, any change to the conversion pipeline risks silent breakage. This is the primary engineering investment described in the plan.

**Independent Test**: Modify a Turndown rule intentionally (e.g., change heading style), run `npm test`, and observe a clear diff-based failure for all heading-related fixtures.

**Acceptance Scenarios**:

1. **Given** the golden test suite and all fixtures, **When** `npm test` is run without code changes, **Then** all golden tests pass.
2. **Given** a code change that alters table output, **When** `npm test` is run, **Then** the tables fixture test fails and prints a readable unified diff showing old vs. new output.
3. **Given** an intentional output change, **When** the developer runs `npm run test:golden:update`, **Then** the expected snapshot files are regenerated to match the new output.
4. **Given** a fixture with images, **When** the golden test runs, **Then** it validates the image manifest (sha256 hash, byte length) and confirms all Markdown image links resolve to extracted files.

---

### User Story 3 — Invariant Safety Net (Priority: P1)

Regardless of snapshot text, every conversion output is checked against semantic invariants: no `<script>` tags, no `Mso` artifacts, no empty image links, consistent table pipes, and stable anchor IDs.

**Why this priority**: Invariant tests catch entire classes of bugs that specific snapshots might miss; they are complementary to golden tests and equally critical.

**Independent Test**: Inject a `<script>` tag into a fixture HTML input, run invariant tests, and observe a clear failure.

**Acceptance Scenarios**:

1. **Given** any converted Markdown output, **When** invariant checks run, **Then** the output contains no `<script>`, `javascript:` links, or inline `style=` attributes.
2. **Given** any converted Markdown output, **When** invariant checks run, **Then** the output contains no `Mso`, `mso-`, `<o:p>`, or `xmlns:o=` artifacts.
3. **Given** any Markdown with image references, **When** invariant checks run, **Then** no image link has an empty `src` (i.e., no `![]()` or `![alt]()`).
4. **Given** any Markdown with GFM tables, **When** invariant checks run, **Then** every table row has the same pipe count as its header row.
5. **Given** the same heading text, **When** anchor IDs are generated across multiple runs, **Then** the IDs are identical each time.

---

### User Story 4 — Synthetic Fixture Library (Priority: P1)

The test suite uses a library of synthetic, open-source-safe DOCX and clipboard-HTML fixtures that cover all tricky real-world cases: nested tables, colspan, outline numbering, images with spaces/unicode, mixed lists, footnotes, Mso paste, Teams cards, Loop citations, and iframe srcdoc.

**Why this priority**: Fixtures are the backbone of the golden test suite. Without representative inputs, tests cannot catch real regressions.

**Independent Test**: Verify each fixture file exists, is parseable, and has a corresponding expected output entry in the fixture manifest.

**Acceptance Scenarios**:

1. **Given** the fixtures directory, **When** listing DOCX fixtures, **Then** at least these exist: `tables-nested.docx`, `tables-colspan.docx`, `headings-outline-numbering.docx`, `images-spaces-unicode.docx`, `lists-mixed.docx`, `footnotes-simple.docx`.
2. **Given** the fixtures directory, **When** listing clipboard-HTML fixtures, **Then** at least these exist: `word-paste-mso.html`, `teams-card.html`, `loop-citations.html`, `iframe-srcdoc.html`.
3. **Given** `fixtures.json`, **When** parsed, **Then** every fixture has `id`, `type` (docx or clipboard), `input` path, `expected` markdown path, and `invariants` array.
4. **Given** a fixture with images, **When** its expected output is checked, **Then** an `images-manifest.json` exists listing sha256 hashes and byte lengths for each expected image.

---

### User Story 5 — Whitespace Normalization (Priority: P2)

A user converts a Word document with varied spacing. The output Markdown preserves intentional blank lines between paragraphs (1 blank line) but never produces excessive blank lines (3+ consecutive blank lines are collapsed to 2).

**Why this priority**: Readable Markdown is a core product promise. Excessive blank lines or zero blank lines both degrade readability.

**Independent Test**: Convert a fixture with paragraphs separated by varying amounts of whitespace and verify the output has at most 2 consecutive blank lines.

**Acceptance Scenarios**:

1. **Given** an HTML input with 5 consecutive `<p>&nbsp;</p>` spacers, **When** converted, **Then** the Markdown output has at most 2 consecutive blank lines at that point.
2. **Given** a normal document with headings and paragraphs, **When** converted, **Then** each heading is preceded and followed by exactly 1 blank line.
3. **Given** the Markdown output, **When** inspected, **Then** the file does not begin or end with blank lines (trimmed edges).

---

### User Story 6 — Clipboard Image Handling Improvements (Priority: P2)

A user pastes rich content from Word with multiple images. All occurrences of each data URI are replaced globally (not just the first), image paths are URL-encoded consistently, and output folder names never collide with existing files.

**Why this priority**: Clipboard paste is a first-class input mode. Bugs here cause broken image references in real daily workflows.

**Independent Test**: Paste HTML containing the same data URI referenced three times; verify all three `![...]()` references point to the same extracted image file.

**Acceptance Scenarios**:

1. **Given** clipboard HTML where the same data URI appears 3 times, **When** pasted, **Then** all 3 occurrences are replaced with the relative path to one extracted image file.
2. **Given** an image whose folder name contains spaces or unicode, **When** the path is written in Markdown, **Then** each path segment is URL-encoded (e.g., `My%20Doc_images/image-001.png`).
3. **Given** an existing `paste-<timestamp>_images/` folder, **When** a new paste occurs at the same second, **Then** the new folder uses a deterministic suffix to avoid collision.

---

### User Story 7 — TOC Link Resolution (Priority: P2)

A user converts a DOCX that contains a Word-generated Table of Contents. TOC links either resolve to real heading anchors in the output Markdown, or are cleanly removed — no dead `#_Toc` links remain.

**Why this priority**: Dead TOC links are a visible quality issue that makes the output look broken.

**Independent Test**: Convert a fixture with a Word TOC; verify zero `#_Toc` or `#_heading` fragments survive in the output.

**Acceptance Scenarios**:

1. **Given** a DOCX with a Word-generated TOC, **When** converted, **Then** no Markdown link contains `#_Toc` or `#_heading` as the href fragment.
2. **Given** a TOC entry whose heading exists in the document, **When** converted, **Then** the TOC link text is preserved as plain text (the link wrapper is removed).

---

### User Story 8 — Batch DOCX Conversion (Priority: P3)

A user selects multiple DOCX files in the Explorer and runs "DOCX: Convert to Markdown". All selected files are converted, with a single progress notification showing overall progress.

**Why this priority**: Batch conversion is a frequently requested UX improvement but is not required for the core quality and testing goals.

**Independent Test**: Multi-select 3 DOCX files in Explorer, run the command, verify 3 Markdown files are produced.

**Acceptance Scenarios**:

1. **Given** 3 DOCX files selected in the Explorer, **When** "Convert to Markdown" is run, **Then** all 3 are converted and 3 Markdown files plus their image folders are created.
2. **Given** a batch conversion in progress, **When** the user observes the notification, **Then** a progress bar shows "Converting 2 of 3..." with the current filename.
3. **Given** a batch where 1 file fails, **When** conversion completes, **Then** the other 2 files are successfully converted, and the error for the failed file is reported.

---

### User Story 9 — Conversion Settings Knobs (Priority: P3)

A user configures optional settings to control output flavor (GFM vs. CommonMark), line wrapping width, heading strategy (infer from outline numbering vs. preserve original), and image path base.

**Why this priority**: Power-user knobs add flexibility but are not essential for correctness or testing.

**Independent Test**: Change `markdownFlavor` to `commonmark`, convert a fixture with a table, verify the table is not rendered as GFM.

**Acceptance Scenarios**:

1. **Given** `markdownFlavor` set to `commonmark`, **When** a document with strikethrough is converted, **Then** the output does not use `~~text~~` syntax.
2. **Given** `lineWrapWidth` set to `80`, **When** a paragraph with 200 characters is converted, **Then** the output wraps at approximately 80 characters per line.
3. **Given** `headingStrategy` set to `preserve`, **When** a document with outline numbering is converted, **Then** heading levels match the original HTML heading tags without adjustment.

---

### User Story 10 — Private Benchmark Mode (Priority: P3)

A developer sets the `MD_FROM_DOCX_PRIVATE_FIXTURES` environment variable to a folder of real-world DOCX files. Running `npm run test:private` converts all files and prints a summary (counts, failures), without committing any private content.

**Why this priority**: Useful for testing against real enterprise documents but not required for the public test suite.

**Independent Test**: Set the env var to a folder with 2 DOCX files, run `npm run test:private`, verify a summary is printed.

**Acceptance Scenarios**:

1. **Given** `MD_FROM_DOCX_PRIVATE_FIXTURES` pointing to a folder with 5 DOCX files, **When** `npm run test:private` is run, **Then** a summary prints "5 files processed, N passed, M failed".
2. **Given** the env var is not set, **When** `npm run test:private` is run, **Then** the script exits gracefully with a message "No private fixtures path set — skipping".
3. **Given** private fixture files, **When** inspecting git status after running the benchmark, **Then** no private files or outputs appear in the git working tree.

---

### Edge Cases

- What happens when a DOCX file has zero images? → Conversion succeeds, no images folder is created, no image manifest entry needed.
- What happens when clipboard HTML has no rich content (plain text only)? → Plain text is inserted directly without conversion.
- What happens when a fixture expected file is missing? → The golden test fails with a clear message: "Expected snapshot not found for fixture X".
- What happens when `test:golden:update` is run but no fixtures changed? → Expected files are overwritten with identical content; git shows no diff.
- What happens when a DOCX contains only images and no text? → Conversion produces Markdown with only image references, no warnings.
- What happens when a table has 0 rows or 0 columns? → The table is skipped or converted to an empty string without crashing.

## Requirements *(mandatory)*

### Functional Requirements

**Determinism & Correctness**

- **FR-001**: System MUST produce byte-identical Markdown output (after LF normalization) for the same input across repeated runs on any OS.
- **FR-002**: System MUST use sequential zero-padded image filenames (e.g., `image-001.png`) with no timestamps, UUIDs, or random components.
- **FR-003**: System MUST use forward slashes (`/`) in all Markdown image and link paths, regardless of host OS.
- **FR-004**: System MUST normalize all output line endings to LF (`\n`).
- **FR-005**: System MUST normalize whitespace to at most 2 consecutive blank lines between blocks; no leading/trailing blank lines in the document.
- **FR-006**: System MUST perform global replacement of clipboard data URIs (all occurrences, not just first match).
- **FR-007**: System MUST URL-encode image path segments consistently for both DOCX and clipboard sources.
- **FR-008**: System MUST avoid folder name collisions in paste mode by appending a numeric suffix (`-1`, `-2`, etc.) to the `paste-<timestamp>` base name when the folder already exists.
- **FR-009**: System MUST remove TOC link wrappers (`<a href="#_Toc...">`, `<a href="#_heading...">`) and preserve the inner text as plain text — no dead `#_Toc` or `#_heading` fragments may remain in the output. Anchor rewriting is explicitly out of scope.

**Golden Test Suite**

- **FR-010**: System MUST include a golden test suite that compares actual conversion output against checked-in expected snapshot files.
- **FR-011**: System MUST include at least 6 synthetic DOCX fixtures covering: nested tables, colspan tables, outline-numbered headings, images with spaces/unicode in names, mixed lists, and footnotes.
- **FR-012**: System MUST include at least 4 synthetic clipboard-HTML fixtures covering: Word Mso paste, Teams cards, Loop citations, and iframe srcdoc.
- **FR-013**: System MUST provide a fixture manifest (`fixtures.json`) declaring `id`, `type`, `input` path, `expected` markdown path, optional `images-manifest` path, and `invariants` array for each fixture.
- **FR-014**: System MUST validate image outputs using an `images-manifest.json` containing sha256 hash and byte length for each expected image; comparison must be order-independent.
- **FR-015**: System MUST verify that all Markdown image links in the output resolve to actually extracted image files.
- **FR-016**: System MUST provide `npm run test:golden:update` to regenerate expected snapshots intentionally.
- **FR-017**: Golden test failures MUST display a readable unified diff showing expected vs. actual output.
- **FR-018**: The golden test harness MUST run the real conversion pipeline (no mocks for the converter), write outputs to a temp directory, and normalize Markdown before comparison.

**Invariant Tests**

- **FR-019**: System MUST run invariant checks on every conversion output asserting: no `<script>` tags, no `javascript:` links, no inline `style=` attributes.
- **FR-020**: System MUST run invariant checks asserting no Microsoft-proprietary artifacts: `Mso`, `mso-`, `<o:p>`, `xmlns:o=`.
- **FR-021**: System MUST run invariant checks asserting no empty image links (`![]()` or `![alt]()`).
- **FR-022**: System MUST run invariant checks asserting strict GFM table pipe consistency — every data row and separator row must have exactly the same pipe count as the header row; no ±1 tolerance.
- **FR-023**: System MUST run invariant checks asserting stable/deterministic anchor ID generation.

**Test Infrastructure**

- **FR-024**: System MUST support determinism hooks — tests can inject a fixed doc name, fixed image naming strategy, and fixed output base paths — without affecting normal extension behavior.
- **FR-025**: System MUST support a private benchmark mode via `MD_FROM_DOCX_PRIVATE_FIXTURES` environment variable that reads DOCX files from a local path, runs conversion, and prints a summary; this mode is never committed and never runs in CI.
- **FR-026**: Golden tests MUST be Jest test files under `test/golden/` so that `npm test` runs unit, functional, and golden tests together. System MUST additionally provide npm scripts: `test:golden:update` (regenerates expected outputs) and `test:private` (runs private benchmark if env var is set). Developers can run golden tests in isolation via `npx jest test/golden`.

**UX Improvements**

- **FR-027**: System MUST support batch conversion — users can multi-select DOCX files in the Explorer and convert all of them with a single command invocation.
- **FR-028**: System MUST show batch progress (e.g., "Converting 2 of 3: filename.docx") during batch conversion.
- **FR-029**: Batch conversion MUST be fault-tolerant — one file's failure does not prevent conversion of remaining files.
- **FR-030**: `activationEvents` in `package.json` MUST include `onCommand` entries for both registered commands.

**Output Quality Settings**

- **FR-031**: System MUST add optional settings for: Markdown flavor (`gfm`, `commonmark`, `default` where `default` is an alias for `gfm`), line wrap width (number or `none`), heading strategy (`infer` from outline numbering or `preserve` original), and image output path base.

### Key Entities

- **Fixture**: A synthetic test input (DOCX file or clipboard HTML) paired with its expected Markdown output and optional image manifest. Defined in `test/golden/fixtures.json`.
- **Golden Snapshot**: The checked-in expected Markdown output for a fixture. Lives in `test/golden/fixtures/expected/`.
- **Image Manifest**: A JSON file listing expected images with `filename`, `sha256`, and `byteLength`. Used for order-independent image validation.
- **Invariant**: A semantic boolean check applied to all conversion outputs regardless of specific fixture content (e.g., "no script tags").
- **Determinism Hook**: A test-only injection point that overrides runtime-variable values (doc name, timestamps) with fixed values for reproducibility.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Converting the same fixture 10 times in a row produces 10 byte-identical Markdown outputs (after LF normalization) on any single OS.
- **SC-002**: The golden test suite runs in under 30 seconds for all public fixtures on a standard developer machine.
- **SC-003**: A single-line change to a Turndown rule produces a golden test failure within 5 seconds of running `npm test`, with a diff that clearly identifies the changed output.
- **SC-004**: 100% of golden test fixtures have corresponding entries in `fixtures.json` with at least 2 invariants each.
- **SC-005**: 0 Microsoft-proprietary artifacts (`Mso`, `mso-`, `<o:p>`, `xmlns:o=`) survive in any fixture's golden output.
- **SC-006**: 0 empty image links (`![]()`) survive in any fixture's golden output that contains images.
- **SC-007**: CI passes on macOS, Windows, and Linux without any OS-specific test skips or workarounds.
- **SC-008**: All fixture content is synthetic and open-source-safe — no copyrighted or proprietary documents are committed.
- **SC-009**: Batch conversion of 5 DOCX files completes and produces 5 Markdown outputs, with failures isolated per file.
- **SC-010**: `npm run test:golden:update` regenerates all expected snapshots and the developer can review changes via `git diff` before committing.

## Assumptions

- The existing conversion pipeline (mammoth → preprocessHtml → Turndown → post-processing) is fundamentally sound and will be improved, not replaced.
- Synthetic DOCX fixtures can be created programmatically or manually using freely available tools (e.g., python-docx, LibreOffice) without requiring Microsoft Word.
- Clipboard HTML fixtures can be captured once from real Word/Loop/Teams paste operations and committed as static `.html` files.
- The extension's existing image naming logic (`image-{index}` with 3-digit zero-padding) is already deterministic; the requirement is to verify and enforce this, not redesign it.
- CommonMark flavor output (FR-031) disables GFM-specific features (tables, strikethrough, task lists) but does not require a separate Turndown configuration — it reuses the same pipeline with features toggled off.
- "No dead code paths" for TOC handling (FR-009) means the current implementation is audited and either completed or removed — not that new TOC rewriting logic must be built from scratch.
