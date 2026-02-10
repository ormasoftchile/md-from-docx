/**
 * Invariant checker utility for golden test suite.
 * Semantic rules that every conversion output must satisfy.
 *
 * @module test/utils/invariants
 */

// Re-use textToAnchor from the conversion module for stable-anchors invariant
import { textToAnchor } from '../../src/conversion/htmlToMarkdown';

// ─── Types ──────────────────────────────────────────────────────────────────

/** A single invariant rule definition. */
export interface InvariantRule {
  /** Unique rule identifier, e.g., 'no-script-tags'. */
  rule: string;
  /** Human-readable description of what the rule checks. */
  message: string;
  /** Check function. Returns violations found in the input markdown string. */
  check: (markdown: string) => InvariantViolation[];
}

/** A violation detected by an invariant check. */
export interface InvariantViolation {
  /** The invariant rule ID that was violated. */
  rule: string;
  /** Human-readable description. */
  message: string;
  /** 1-indexed line number of the first offending match, if applicable. */
  line?: number;
  /** The offending substring, truncated to 100 characters. */
  match?: string;
}

// ─── Helper: line-by-line regex scanner ──────────────────────────────────────

function scanLines(
  markdown: string,
  rule: string,
  message: string,
  pattern: RegExp
): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  const lines = markdown.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(pattern);
    if (m) {
      violations.push({
        rule,
        message,
        line: i + 1, // 1-indexed
        match: m[0].length > 100 ? m[0].substring(0, 100) : m[0],
      });
    }
  }

  return violations;
}

// ─── GFM Table Pipe Consistency ──────────────────────────────────────────────

/**
 * Count unescaped pipe characters in a line.
 */
function countPipes(line: string): number {
  let count = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '|' && (i === 0 || line[i - 1] !== '\\')) {
      count++;
    }
  }
  return count;
}

/**
 * Check that all rows in each GFM table block have matching pipe counts.
 */
function checkTablePipeConsistency(markdown: string): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  const lines = markdown.split('\n');

  let inTable = false;
  let headerPipeCount = 0;
  let _tableStartLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const isTableRow = line.startsWith('|') && line.endsWith('|');

    if (isTableRow && !inTable) {
      // Start of a new table
      inTable = true;
      headerPipeCount = countPipes(line);
      _tableStartLine = i + 1;
    } else if (isTableRow && inTable) {
      // Continuation of a table
      const rowPipeCount = countPipes(line);
      if (rowPipeCount !== headerPipeCount) {
        violations.push({
          rule: 'gfm-table-pipe-consistency',
          message: `Table row has ${rowPipeCount} pipes but header has ${headerPipeCount}`,
          line: i + 1,
          match: line.length > 100 ? line.substring(0, 100) : line,
        });
      }
    } else {
      // Not a table row — reset
      inTable = false;
      headerPipeCount = 0;
    }
  }

  return violations;
}

// ─── Stable Anchors ──────────────────────────────────────────────────────────

/**
 * Check that heading anchors are deterministic.
 * Extracts all headings, generates anchors, then runs again to verify identity.
 */
function checkStableAnchors(markdown: string): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  const headingPattern = /^(#{1,6})\s+(.+)$/gm;

  const anchors1: string[] = [];
  const anchors2: string[] = [];

  let match: RegExpExecArray | null;

  // First pass
  headingPattern.lastIndex = 0;
  while ((match = headingPattern.exec(markdown)) !== null) {
    anchors1.push(textToAnchor(match[2]));
  }

  // Second pass — should produce identical results
  headingPattern.lastIndex = 0;
  while ((match = headingPattern.exec(markdown)) !== null) {
    anchors2.push(textToAnchor(match[2]));
  }

  for (let i = 0; i < anchors1.length; i++) {
    if (anchors1[i] !== anchors2[i]) {
      violations.push({
        rule: 'stable-anchors',
        message: `Anchor for heading changed between runs: "${anchors1[i]}" vs "${anchors2[i]}"`,
        line: undefined,
        match: anchors1[i],
      });
    }
  }

  return violations;
}

// ─── ALL_INVARIANTS Map ──────────────────────────────────────────────────────

export const ALL_INVARIANTS: Map<string, InvariantRule> = new Map([
  [
    'no-script-tags',
    {
      rule: 'no-script-tags',
      message: 'Output contains <script> tags',
      check: (md) => scanLines(md, 'no-script-tags', 'Output contains <script> tags', /<\/?script[\s>]/i),
    },
  ],
  [
    'no-javascript-uri',
    {
      rule: 'no-javascript-uri',
      message: 'Output contains javascript: URI',
      check: (md) => scanLines(md, 'no-javascript-uri', 'Output contains javascript: URI', /javascript\s*:/i),
    },
  ],
  [
    'no-inline-style',
    {
      rule: 'no-inline-style',
      message: 'Output contains inline style attributes',
      check: (md) => scanLines(md, 'no-inline-style', 'Output contains inline style attributes', /style\s*=\s*["']/i),
    },
  ],
  [
    'no-mso-artifacts',
    {
      rule: 'no-mso-artifacts',
      message: 'Output contains Microsoft Office artifacts',
      check: (md) =>
        scanLines(
          md,
          'no-mso-artifacts',
          'Output contains Microsoft Office artifacts',
          /\bMso\w+|mso-[\w-]+|<o:p[\s>]|xmlns:o\s*=/i
        ),
    },
  ],
  [
    'no-empty-image-src',
    {
      rule: 'no-empty-image-src',
      message: 'Output contains image with empty src',
      check: (md) => scanLines(md, 'no-empty-image-src', 'Output contains image with empty src', /!\[[^\]]*\]\(\s*\)/),
    },
  ],
  [
    'gfm-table-pipe-consistency',
    {
      rule: 'gfm-table-pipe-consistency',
      message: 'Table rows have inconsistent pipe counts',
      check: checkTablePipeConsistency,
    },
  ],
  [
    'stable-anchors',
    {
      rule: 'stable-anchors',
      message: 'Heading anchors are not deterministic',
      check: checkStableAnchors,
    },
  ],
]);

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Run a set of invariant checks against a markdown string.
 *
 * @param markdown - The converted markdown content to validate.
 * @param ruleIds - An array of rule IDs to check. Must be keys in ALL_INVARIANTS.
 * @returns Array of InvariantViolation objects. Empty array means all checks passed.
 * @throws Error if any ruleId is not found in ALL_INVARIANTS.
 */
export function checkInvariants(markdown: string, ruleIds: string[]): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  for (const ruleId of ruleIds) {
    const rule = ALL_INVARIANTS.get(ruleId);
    if (!rule) {
      throw new Error(`Unknown invariant rule: "${ruleId}". Valid rules: ${[...ALL_INVARIANTS.keys()].join(', ')}`);
    }
    violations.push(...rule.check(markdown));
  }

  return violations;
}

/**
 * Run all registered invariants against a markdown string.
 * Convenience wrapper around checkInvariants.
 *
 * @param markdown - The converted markdown content to validate.
 * @returns Array of all InvariantViolation objects across all rules.
 */
export function checkAllInvariants(markdown: string): InvariantViolation[] {
  return checkInvariants(markdown, [...ALL_INVARIANTS.keys()]);
}
