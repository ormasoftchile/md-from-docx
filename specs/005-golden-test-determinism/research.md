# Research: Golden Test Suite & Deterministic Output

**Feature**: `005-golden-test-determinism`
**Date**: 2026-02-10

## Decision 1: Synthetic DOCX Fixture Creation

**Context**: The golden test suite requires 6+ synthetic DOCX fixtures. They must be created without Microsoft Word, committed as static files, and cover: nested tables, colspan, outline numbering, images with spaces/unicode, mixed lists, and footnotes.

**Decision**: Use the `docx` npm package (devDependency) to generate fixtures via a TypeScript script.

**Rationale**:
- Full feature coverage — natively supports nested tables, colspan, footnotes, embedded images, and custom outline numbering. No raw XML hacking.
- Same ecosystem as the project (Node.js/TypeScript). No Python, LibreOffice, or other toolchain needed.
- Generates minimal DOCX files (5–15 KB each) via `Packer.toBuffer()`.
- The generation script (`scripts/generate-fixtures.ts`) is auditable and reproducible — committed alongside the fixtures.
- One-time generation: run the script, commit the `.docx` files. The script serves as documentation of fixture content.

**Alternatives considered**:
- `python-docx`: Strong for tables/images but footnotes and outline numbering require raw XML hacking. Introduces a Python dependency.
- `officegen`: Repository is gone (404). Eliminated.
- LibreOffice conversion (ODT→DOCX): Introduces its own artifacts, not representative of real Word output. Requires 400MB+ install in CI.
- Manual creation in LibreOffice: Not reproducible or auditable. Binary diffs are meaningless in PRs.

## Decision 2: Golden Test Strategy (Custom Files vs Jest Snapshots)

**Context**: Golden tests must compare actual conversion output against expected files. Outputs are multi-file (Markdown + images).

**Decision**: Use custom golden files with a purpose-built comparison helper — not Jest's built-in `toMatchSnapshot()`.

**Rationale**:
- Custom `.md` expected files are human-readable and reviewable in PR diffs.
- Multi-file outputs (markdown + images) don't fit Jest's single-value snapshot model.
- Jest snapshot diffs serialize strings with escape codes, making large Markdown diffs unreadable.
- `jest --updateSnapshot` updates ALL snapshots indiscriminately; the `UPDATE_GOLDENS=1` env var pattern allows selective update with explicit `git diff` review.
- Image manifests (JSON with sha256 + byte length) are naturally diffable as custom files.

**Implementation pattern**:
- `test/golden/goldenRunner.ts` — `runGoldenTest(fixture)`, `assertImageManifest(images, manifestPath)`.
- `UPDATE_GOLDENS=1` env var: when set, writes actual output to expected path instead of comparing.
- Normalize both actual and expected content before comparison (LF endings, trimmed whitespace, collapsed blank lines).

## Decision 3: Unified Diff Display

**Context**: Golden test failures must show readable diffs.

**Decision**: Use the `diff` npm package (`createTwoFilesPatch`) for standard unified diff output.

**Rationale**:
- Produces proper `---`/`+++` headers and `@@` hunks — familiar to every developer.
- Lightweight (no dependencies). One new devDependency: `diff` + `@types/diff`.
- `jest-diff` (already bundled) is designed for single values, not file-level diffs.
- `diff2html` is overkill for terminal output.

## Decision 4: Temp Directory Management

**Context**: Golden tests must write conversion output to temporary directories.

**Decision**: Use `fs.mkdtempSync(path.join(os.tmpdir(), 'md-golden-'))` with `fs.rmSync` cleanup in `afterAll`.

**Rationale**:
- Zero additional dependencies. `os.tmpdir()` is cross-platform.
- Per-fixture subdirectories prevent parallel test collisions.
- `afterAll` cleanup avoids temp dir accumulation.
- No `tmp-promise` or `tmp` package needed for this simple use case.

## Decision 5: Snapshot Update Workflow

**Context**: Need `npm run test:golden:update` to regenerate expected outputs.

**Decision**: Detect `UPDATE_GOLDENS=1` env var inside the test helper. Use `cross-env` for cross-platform npm scripts.

**Rationale**:
- `cross-env UPDATE_GOLDENS=1 jest test/golden` works on all platforms.
- Tests pass in update mode (to avoid false failures), but CI must guard against accidental `UPDATE_GOLDENS=1`.
- Developer reviews changes via `git diff` after updating — the expected files are version-controlled.

## Decision 6: Cross-Platform Normalization

**Context**: Tests must produce identical results on macOS, Windows, and Linux.

**Decision**: Single `normalize()` function applied to both actual and expected content:
1. CRLF/CR → LF
2. Strip trailing whitespace per line
3. Collapse 3+ blank lines → 2
4. Trim leading/trailing whitespace
5. Ensure trailing newline

Also: `.gitattributes` with `text eol=lf` for all golden test files to prevent Git from mangling expected files on Windows checkout.

## Decision 7: Image Manifest Validation

**Context**: Image outputs must be validated by content hash, not filename order.

**Decision**: JSON manifest with `filename`, `sha256`, `byteLength` — sorted by filename for deterministic comparison.

**Rationale**:
- `sha256` is the gold standard for content identity.
- `byteLength` is a fast sanity check that catches truncation bugs.
- Sorting by filename makes comparison order-independent.
- Additionally validate that all Markdown image links resolve to extracted filenames.

## Decision 8: Invariant Test Architecture

**Context**: Semantic invariant checks must run on every conversion output.

**Decision**: Shared utility module (`test/utils/invariants.ts`) with a dedicated test file (`test/golden/invariants.test.ts`).

**Rationale**:
- `checkInvariants(md)` returns structured `InvariantViolation[]` with rule name, message, and line number.
- `assertInvariants(md)` is a convenience wrapper that throws on any violation.
- Regex-based checks scan line-by-line for: `<script>`, `javascript:`, `style=`, Mso artifacts, empty image links.
- Table pipe consistency uses a state-machine parser that counts unescaped pipes per row.
- Anchor determinism is tested separately via `textToAnchor()` over a fixed heading corpus + inline snapshot.

**Key regex patterns**:
- Script tags: `/<\/?script[\s>]/i`
- JavaScript URIs: `/javascript\s*:/i`
- Inline styles: `/style\s*=\s*["']/i`
- Mso artifacts: `/\bMso\w|mso-[\w-]+|<o:p[\s>]|xmlns:o\s*=/i`
- Empty image links: `/!\[[^\]]*\]\(\s*\)/`

## Decision 9: New Dependencies

**Decision**: Add 3 devDependencies only. Zero new runtime dependencies.

| Package | Purpose | Size |
|---------|---------|------|
| `docx` | Synthetic DOCX fixture generation script | ~500 KB (devDep only) |
| `diff` + `@types/diff` | Unified diff in golden test failures | ~50 KB |
| `cross-env` | Cross-platform env vars in npm scripts | ~10 KB |

None of these are imported by `src/` files. They do not affect the extension bundle.
