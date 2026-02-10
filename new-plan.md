
# Objective

Evolve the VS Code extension “md-from-docx” into a highly reliable, refactor-safe, best-in-class Word / Loop / Teams → Markdown converter by:

1) improving correctness, determinism, and UX where it matters,

2) introducing a rigorous golden test suite (DOCX + clipboard HTML),

3) enabling safe future refactors through snapshot + invariant testing.

The work must preserve the extension’s core strengths: no external runtime dependencies, VS Code–native UX, and deep cleanup of Microsoft-specific HTML artifacts.

# High-level product direction

Position the extension as:
> “The most reliable way to convert Word / Loop / Teams content into clean, readable Markdown directly inside VS Code — no Python, no Pandoc dependency, no CLI.”

We optimize for:

- correctness over cleverness,

- deterministic output,

- predictable Markdown readability,

- enterprise/devbox friendliness.

# Core behaviors that must remain true

- DOCX → HTML → Markdown pipeline remains the foundation.

- Clipboard paste (Word / Loop / Teams) is a first-class input mode.

- Images are always extracted to disk and referenced relatively.

- Microsoft-specific junk (Mso*, namespaces, srcdoc, inline styles) is aggressively removed.

- No new required external tools (Pandoc, Word, Python, etc.) at runtime or CI.

# Required improvements (functional + UX)

## A) Determinism and correctness (must)

1) Ensure deterministic output across OS:

   - Stable image naming (no timestamps/randomness)

   - Stable ordering of extracted images

   - Always use forward slashes in Markdown paths

   - Normalize line endings to LF

2) Fix Markdown whitespace handling:

   - Do NOT remove all blank lines

   - Normalize to a maximum of 1–2 consecutive blank lines between blocks

3) Clipboard image replacement:

   - Replace all occurrences of a data URI (global replacement)

   - URL-encode image path segments consistently (same logic as DOCX images)

   - Avoid folder collisions in paste mode (use deterministic suffix or injected name)

4) TOC handling:

   - Either correctly rewrite TOC links to real anchors OR explicitly remove them,

     but do not keep dead code paths.

## B) UX improvements (high value)

1) Support batch conversion:

   - multi-select DOCX files

   - optional folder conversion

2) Preview / diff before overwrite when overwriteBehavior ≠ “always”

3) Ensure activationEvents include onCommand entries for both commands

## C) Output quality knobs (add settings)

Add optional settings for:

- Markdown flavor (gfm / commonmark / default)

- Line wrapping (wrap width or “no wrap”)

- Heading strategy:

  - infer from outline numbering

  - or preserve original heading levels

- Image output strategy (relative path base)

# Golden test suite (primary engineering investment)

## Goal

Create a portable, open-source-safe golden test suite that:

- catches regressions in conversion behavior,

- allows intentional snapshot updates,

- does not rely on private or copyrighted documents,

- does not require Pandoc or Word in CI.

## Fixture strategy

Create synthetic fixtures that represent tricky real-world cases.

Folder layout:

tests/

  fixtures/

    docx/

      tables-nested.docx

      tables-colspan.docx

      headings-outline-numbering.docx

      images-spaces-unicode.docx

      lists-mixed.docx

      footnotes-simple.docx

    clipboard-html/

      word-paste-mso.html

      teams-card.html

      loop-citations.html

      iframe-srcdoc.html

    expected/

      docx/

        tables-nested.md

        tables-colspan.md

        headings-outline-numbering.md

        images-spaces-unicode/

          out.md

          images-manifest.json

      clipboard/

        word-paste-mso.md

        teams-card.md

        loop-citations.md

        iframe-srcdoc.md

    fixtures.json

    README.md

## Fixture manifest (fixtures.json)

Each fixture declares:

- id

- type: docx | clipboard

- input path

- expected markdown path

- expected image manifest (optional)

- invariants to check

Example invariants:

- noMsoArtifacts

- noDangerousTags

- allImageLinksExist

- tablesNormalized

- anchorsStable

## Test harness

Implement a test harness that:

1) Runs the real conversion pipeline (no mocks)

2) Writes outputs to a temp directory

3) Normalizes Markdown (line endings, trailing spaces, blank lines)

4) Compares normalized output to expected snapshot

5) Produces a readable unified diff on failure

## Image validation

For fixtures with images:

- Compare via images-manifest.json using:

  - sha256 hash

  - byte length

- Order must be irrelevant

- Validate that all markdown image links resolve to extracted files

## Invariant tests (semantic safety net)

Add invariant checks independent of snapshot text:

- no `<script>`, `javascript:` links, or inline styles

- no `Mso`, `mso-`, `<o:p>`, `xmlns:o=`

- no empty image links

- table pipe consistency

- stable anchor generation behavior

## Determinism hooks

Allow tests to inject:

- fixed docname

- fixed image naming strategy

- fixed output base paths

These hooks must not affect normal extension behavior.

# Private benchmark mode (optional, not committed)

Support a local-only test mode:

- reads DOCX files from path in env var (e.g. MD_FROM_DOCX_PRIVATE_FIXTURES)

- runs conversion and prints summary (counts, failures)

- never committed

- never run in CI

# Developer scripts

Add npm scripts:

- test                → run public golden fixtures

- test:golden:update  → regenerate expected outputs intentionally

- test:private        → run private benchmark if env var is set

# Constraints

- No new runtime dependencies required by users

- Minimal additional dev dependencies

- CI must pass on macOS, Windows, Linux

- Tests must be deterministic and readable

- README “Contributing” updated with:

  - how to add a new fixture

  - how to update goldens intentionally

  - rules for synthetic/anonymized content only

# Acceptance criteria

- A regression in tables, images, anchors, MSO cleanup, or clipboard handling fails tests clearly.

- Intentional changes are easy to update via test:golden:update.

- Output remains readable Markdown, not just renderer-correct.

- Extension behavior is predictable, stable, and refactor-safe.
