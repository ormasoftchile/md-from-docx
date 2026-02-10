# Quickstart: Golden Test Suite & Deterministic Output

## Prerequisites

- Node.js 22.x
- npm 10+
- VS Code (for extension debugging)

## Install new dependencies

```bash
npm install --save-dev docx diff @types/diff cross-env
```

## Directory layout after implementation

```
test/
  golden/
    fixtures/
      inputs/           # DOCX files + HTML clipboard files
      expected/         # Golden markdown snapshots + image manifests
    fixtures.json       # Fixture manifest (validated by JSON Schema)
    goldenRunner.ts     # Golden test harness
    goldenRunner.test.ts# Jest test file
    invariants.test.ts  # Invariant-focused tests
  utils/
    invariants.ts       # Invariant checker utility
    normalize.ts        # Output normalization utility
```

## Running tests

### Run all tests (includes golden tests)

```bash
npm test
```

Golden tests are integrated into the standard Jest run — no separate command needed.

### Run only golden tests

```bash
npx jest test/golden/
```

### Run only invariant tests

```bash
npx jest test/golden/invariants.test.ts
```

## Adding a new fixture

### 1. Create the fixture generator (if using `docx` package)

Add a generator function in `scripts/generate-fixtures.ts` (the canonical fixture generator script):

```typescript
// scripts/generate-fixtures.ts — add a new export for your fixture
import { Document, Packer, Paragraph, TextRun } from 'docx';

export async function generate(): Promise<Buffer> {
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          children: [new TextRun({ text: 'Hello World', bold: true })],
        }),
      ],
    }],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}
```

### 2. Register in fixtures.json

```json
{
  "id": "my-new-fixture",
  "type": "docx",
  "input": "inputs/my-new-fixture.docx",
  "expected": "expected/my-new-fixture.md",
  "imagesManifest": null,
  "invariants": ["no-script-tags", "no-mso-artifacts"],
  "description": "Tests bold text conversion"
}
```

### 3. Generate the golden snapshot

```bash
cross-env UPDATE_GOLDENS=1 npx jest test/golden/ -t "my-new-fixture"
```

### 4. Review and commit

```bash
git diff test/golden/fixtures/expected/my-new-fixture.md
git add test/golden/
git commit -m "test: add golden fixture for my-new-fixture"
```

## Updating golden snapshots

When conversion logic changes intentionally:

```bash
# Update all golden snapshots
cross-env UPDATE_GOLDENS=1 npx jest test/golden/

# Update a specific fixture
cross-env UPDATE_GOLDENS=1 npx jest test/golden/ -t "tables-nested"
```

**Always review diffs** before committing updated snapshots:

```bash
git diff test/golden/fixtures/expected/
```

## How golden tests work

1. The harness reads `fixtures.json` and iterates each fixture.
2. For each fixture:
   - Reads the input file (DOCX or HTML).
   - Runs the conversion pipeline with determinism hooks.
   - Normalizes the output (LF line endings, trim whitespace, collapse blank lines).
   - If `UPDATE_GOLDENS=1`: writes the output to the `expected/` path and passes.
   - Otherwise: reads the expected file and compares with a unified diff.
3. After comparison, runs invariant checks for each fixture.
4. If images are expected: compares actual images against the image manifest (SHA-256 + byte length).

## How invariant checks work

Invariants are semantic rules that **every** conversion output must satisfy, regardless of input:

| Rule | What it catches |
|------|----------------|
| `no-script-tags` | `<script>` tags that survived preprocessing |
| `no-javascript-uri` | `javascript:` links that could be XSS vectors |
| `no-inline-style` | `style="..."` attributes from Word/Loop |
| `no-mso-artifacts` | `MsoNormal`, `mso-*`, `<o:p>`, `xmlns:o` artifacts |
| `no-empty-image-src` | `![alt]()` with empty src |
| `gfm-table-pipe-consistency` | Table rows with mismatched pipe counts |
| `stable-anchors` | Heading anchors that change between runs |

A fixture must declare at least 2 invariants in its `invariants` array.

## Determinism hooks

Tests inject hooks to eliminate non-deterministic inputs:

```typescript
const hooks: DeterminismHook = {
  docName: 'test-document',
  timestamp: '2025-01-01T00-00-00',
  outputBasePath: tmpDir,
};
```

These hooks override:
- Document name resolution (removes filesystem dependency)
- Timestamp generation (removes time dependency)
- Output path (uses `os.tmpdir()` for isolation)

## Troubleshooting

### Test fails with "Golden snapshot mismatch"

The output shows a unified diff. Review the diff:
- If the change is **intentional** → run `UPDATE_GOLDENS=1` and commit.
- If the change is **unintentional** → fix the conversion code.

### Test fails with "Invariant violation"

The error includes the rule ID, line number, and offending text. Fix the conversion pipeline to eliminate the violation.

### "Unknown invariant rule" error

The fixture references a rule ID not in `ALL_INVARIANTS`. Check for typos in `fixtures.json`.
