# Implementation Plan: Golden Test Suite & Deterministic Output

**Branch**: `005-golden-test-determinism` | **Date**: 2026-02-10 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/005-golden-test-determinism/spec.md`

## Summary

Evolve the md-from-docx VS Code extension into a highly reliable, refactor-safe converter by:
1. **Enforcing deterministic output** — same input always produces byte-identical Markdown and images.
2. **Building a golden test suite** — 10+ synthetic fixtures with checked-in expected snapshots, unified diff on failure.
3. **Implementing invariant tests** — semantic rules (no script tags, no Mso artifacts, pipe consistency) checked on every conversion.
4. **Adding infrastructure** — determinism hooks, private benchmark mode, batch conversion, output settings.

Technical approach: Custom golden files (not Jest snapshots) compared after normalization, `docx` package for fixture generation, `diff` package for unified diffs, shared invariant checker module.

## Technical Context

**Language/Version**: TypeScript 5.3+ on Node.js 22.x (ES2020 target, CommonJS modules)
**Primary Dependencies**: mammoth ^1.6.0 (DOCX→HTML), turndown ^7.1.2 (HTML→MD), turndown-plugin-gfm ^1.0.2 (GFM tables/strikethrough), esbuild (bundler)
**New DevDependencies**: `docx` (fixture generation), `diff` + `@types/diff` (unified diffs), `cross-env` (npm scripts)
**Storage**: File-system only (no database). Temp dirs via `os.tmpdir()` + `mkdtempSync`.
**Testing**: Jest 29.7 + ts-jest 29.1. Golden tests integrated as Jest files under `test/golden/`.
**Target Platform**: VS Code extension — macOS, Windows, Linux. Extension host Node.js.
**Project Type**: Single project (VS Code extension with test suite)
**Performance Goals**: Golden test suite completes in <30 seconds for all public fixtures.
**Constraints**: Zero new runtime dependencies. All new packages are devDependencies only. No impact on extension bundle size.
**Scale/Scope**: 6+ DOCX fixtures, 4+ clipboard-HTML fixtures, 7 invariant rules, ~15 new test files.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution (`.specify/memory/constitution.md`) is an unfilled template with no project-specific gates defined. All principle slots (`PRINCIPLE_1` through `PRINCIPLE_5`), sections, and governance rules are placeholder text.

**Pre-Phase 0 assessment**: ✅ PASS — No gates to violate.
**Post-Phase 1 assessment**: ✅ PASS — No gates to violate. The design adds only test infrastructure and devDependencies; no architectural or structural violations possible.

## Project Structure

### Documentation (this feature)

```text
specs/005-golden-test-determinism/
├── plan.md              # This file
├── research.md          # Phase 0: technology decisions (9 decisions)
├── data-model.md        # Phase 1: entity definitions
├── quickstart.md        # Phase 1: developer getting-started guide
├── contracts/
│   ├── fixtures-schema.json        # JSON Schema for fixtures.json
│   ├── images-manifest-schema.json # JSON Schema for image manifests
│   └── invariant-checker.md        # Invariant utility API contract
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── conversion/
│   ├── htmlToMarkdown.ts   # Modified: determinism hooks, normalization fixes
│   ├── imageExtractor.ts   # Modified: sequential naming enforcement, URL encoding
│   ├── index.ts            # Modified: accept DeterminismHook parameter
│   └── docxParser.ts       # Unchanged
├── commands/
│   ├── convertDocx.ts      # Modified: batch conversion, folder collision avoidance
│   └── pasteAsMarkdown.ts  # Modified: global data-URI replacement, folder suffix
├── config/
│   └── settings.ts         # Modified: new settings (flavor, wrap, heading, imagePath)
├── types/
│   └── index.ts            # Modified: ConversionOptions extended, DeterminismHook type
└── extension.ts            # Modified: activationEvents, batch command registration

test/
├── golden/
│   ├── fixtures/
│   │   ├── inputs/          # DOCX + HTML fixture files
│   │   └── expected/        # Golden snapshots + image manifests
│   ├── fixtures.json        # Fixture manifest
│   ├── goldenRunner.ts      # Test harness logic
│   ├── goldenRunner.test.ts # Jest test: golden comparison
│   └── invariants.test.ts   # Jest test: invariant-focused checks
├── utils/
│   ├── invariants.ts        # Shared invariant checker (7 rules)
│   └── normalize.ts         # Output normalization utility
├── unit/                    # Existing unit tests (unchanged)
└── functional/              # Existing functional tests (unchanged)

scripts/
└── generate-fixtures.ts     # One-time DOCX fixture generator (uses `docx` package)
```

**Structure Decision**: Single project structure. New test infrastructure lives under `test/golden/` and `test/utils/`, co-located with existing `test/unit/` and `test/functional/`. Fixture generator script lives in `scripts/` at repo root.

## Phase Summaries

### Phase 0: Research (COMPLETE)

All technology decisions are documented in [research.md](research.md). Key decisions:

| # | Decision | Choice |
|---|----------|--------|
| 1 | Fixture creation | `docx` npm package |
| 2 | Golden test strategy | Custom files (not Jest snapshots) |
| 3 | Diff display | `diff` package (`createTwoFilesPatch`) |
| 4 | Temp directories | `os.tmpdir()` + `mkdtempSync` |
| 5 | Update workflow | `UPDATE_GOLDENS=1` env var + `cross-env` |
| 6 | Normalization | LF, trim, collapse blanks, `.gitattributes eol=lf` |
| 7 | Image validation | JSON manifest with sha256 + byteLength |
| 8 | Invariant architecture | `test/utils/invariants.ts` + `test/golden/invariants.test.ts` |
| 9 | New dependencies | `docx`, `diff`, `@types/diff`, `cross-env` (all devDeps) |

### Phase 1: Design & Contracts (COMPLETE)

Artifacts generated:

- **[data-model.md](data-model.md)** — 8 entities: Fixture, GoldenSnapshot, ImageManifest, ImageManifestEntry, Invariant, InvariantViolation, DeterminismHook, ConversionOptions (extended).
- **[contracts/fixtures-schema.json](contracts/fixtures-schema.json)** — JSON Schema for `fixtures.json` with kebab-case ID validation, enum types, and min 2 invariants per fixture.
- **[contracts/images-manifest-schema.json](contracts/images-manifest-schema.json)** — JSON Schema for image manifests with sha256 pattern, byte length, and filename pattern validation.
- **[contracts/invariant-checker.md](contracts/invariant-checker.md)** — TypeScript API contract for `checkInvariants()`, `checkAllInvariants()`, and `ALL_INVARIANTS` map. Includes detection logic for all 7 rules.
- **[quickstart.md](quickstart.md)** — Developer guide: install deps, directory layout, running tests, adding fixtures, updating goldens, troubleshooting.

### Phase 2: Task Breakdown (PENDING)

To be generated by `/speckit.tasks`. Will decompose the plan into ordered implementation tasks with:
- Dependency graph between tasks
- Estimated effort per task
- Test requirements per task
- Acceptance criteria tied to spec FRs

## Implementation Order (High-Level)

Based on the spec's priority tiers and dependency analysis:

1. **Foundation** (P1 prereqs): Install devDeps, create directory structure, `.gitattributes`, normalize utility
2. **Determinism Hooks** (FR-024): Add `DeterminismHook` type, thread through conversion pipeline
3. **Invariant Checker** (FR-019–FR-023): Implement `test/utils/invariants.ts` with all 7 rules
4. **Fixture Generation** (FR-011–FR-012): Build `scripts/generate-fixtures.ts`, generate 10+ fixtures
5. **Golden Test Harness** (FR-010, FR-013–FR-018): Build runner, comparison helpers, fixtures.json
6. **Determinism Fixes** (FR-001–FR-009): Fix image naming, path slashes, TOC links, paste collisions
7. **Golden Snapshots**: Generate initial expected outputs with `UPDATE_GOLDENS=1`
8. **Invariant Test File** (FR-019–FR-023): Wire invariants into golden test loop
9. **Settings & UX** (FR-027–FR-031): Batch conversion, new settings knobs, activationEvents
10. **Private Benchmark** (FR-025): Optional env-var-driven benchmark mode

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `docx` package can't generate certain Word features (colspan, footnotes) | Low | Medium | Fall back to manually authored DOCX via LibreOffice; document in research.md |
| Golden tests flaky on Windows due to path separators | Medium | High | Normalize all paths to forward slashes; `.gitattributes eol=lf`; CI on all 3 OS |
| Determinism hooks leak into production code | Low | High | Type guards + build-time dead code elimination; hooks only in `test/` imports |
| Image hash differs across platforms (different mammoth extraction) | Low | Medium | Pin mammoth version; verify image hashes in CI on all 3 OS |
| Fixture generation script rot (not run regularly) | Medium | Low | CI step validates fixtures.json references resolve to existing files |
