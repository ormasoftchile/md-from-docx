# Contract: Invariant Checker

**Module**: `test/utils/invariants.ts`
**Visibility**: Test-only (not exported from `src/`)

## Types

```typescript
/** A single invariant rule definition. */
interface InvariantRule {
  /** Unique rule identifier, e.g., 'no-script-tags'. */
  rule: string;
  /** Human-readable description of what the rule checks. */
  message: string;
  /** Check function. Returns violations found in the input markdown string. */
  check: (markdown: string) => InvariantViolation[];
}

/** A violation detected by an invariant check. */
interface InvariantViolation {
  /** The invariant rule ID that was violated. */
  rule: string;
  /** Human-readable description. */
  message: string;
  /** 1-indexed line number of the first offending match, if applicable. */
  line?: number;
  /** The offending substring, truncated to 100 characters. */
  match?: string;
}
```

## Public API

### `ALL_INVARIANTS: Map<string, InvariantRule>`

A read-only map of all registered invariant rules keyed by rule ID.

**Registered rules:**

| Key | Description |
|-----|-------------|
| `no-script-tags` | Detects `<script>` or `</script>` tags |
| `no-javascript-uri` | Detects `javascript:` URI schemes |
| `no-inline-style` | Detects `style="..."` attributes |
| `no-mso-artifacts` | Detects Microsoft Office artifacts (`Mso*` classes, `mso-*` styles, `<o:p>`, `xmlns:o`) |
| `no-empty-image-src` | Detects image links with empty source: `![...](  )` |
| `gfm-table-pipe-consistency` | Verifies all rows in a GFM table block have the same pipe count |
| `stable-anchors` | Verifies heading anchors are deterministic (same input → same output) |

---

### `checkInvariants(markdown: string, ruleIds: string[]): InvariantViolation[]`

Run a set of invariant checks against a markdown string.

**Parameters:**
- `markdown` — The converted markdown content to validate.
- `ruleIds` — An array of rule IDs to check. Must be keys in `ALL_INVARIANTS`.

**Returns:** An array of `InvariantViolation` objects. Empty array means all checks passed.

**Throws:** `Error` if any `ruleId` is not found in `ALL_INVARIANTS`.

**Example:**
```typescript
import { checkInvariants } from '../utils/invariants';

const violations = checkInvariants(markdownOutput, [
  'no-script-tags',
  'no-mso-artifacts',
  'gfm-table-pipe-consistency',
]);
expect(violations).toEqual([]);
```

---

### `checkAllInvariants(markdown: string): InvariantViolation[]`

Run all registered invariants against a markdown string. Convenience wrapper around `checkInvariants`.

**Parameters:**
- `markdown` — The converted markdown content to validate.

**Returns:** An array of all `InvariantViolation` objects across all rules.

---

## Invariant Detection Logic

### `no-script-tags`
```
Pattern: /<\/?script[\s>]/i
Scan: Line-by-line
```

### `no-javascript-uri`
```
Pattern: /javascript\s*:/i
Scan: Line-by-line
```

### `no-inline-style`
```
Pattern: /style\s*=\s*["']/i
Scan: Line-by-line
```

### `no-mso-artifacts`
```
Pattern: /\bMso\w+|mso-[\w-]+|<o:p[\s>]|xmlns:o\s*=/i
Scan: Line-by-line
```

### `no-empty-image-src`
```
Pattern: /!\[[^\]]*\]\(\s*\)/
Scan: Line-by-line
```

### `gfm-table-pipe-consistency`
```
Algorithm:
1. Identify table blocks: consecutive lines starting/ending with |
2. For each table block, count unescaped | characters per row
3. Report rows where pipe count differs from header row
```

### `stable-anchors`
```
Algorithm:
1. Extract all heading lines (^#{1,6}\s)
2. For each heading, compute anchor via textToAnchor()
3. Run conversion twice on same input
4. Compare anchor sets — must be identical
```

## Integration with Golden Tests

The golden test harness calls `checkInvariants()` after each fixture conversion:

```typescript
for (const fixture of manifest.fixtures) {
  const result = await convert(inputContent, options);
  const violations = checkInvariants(result.markdown, fixture.invariants);
  expect(violations).toEqual([]);
  // ... then compare against golden snapshot
}
```

Invariant failures produce clear error messages with the rule ID, violation line, and offending match text.
