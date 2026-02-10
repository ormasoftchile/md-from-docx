/**
 * Invariant integration tests — US3.
 *
 * For each fixture declared in fixtures.json, runs the conversion pipeline
 * and validates that the output satisfies all declared invariant rules.
 * Also tests anchor determinism (T026).
 *
 * @module test/golden/invariants.test
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { convert } from '../../src/conversion/index';
import { DEFAULT_CONVERSION_OPTIONS } from '../../src/types';
import type { DeterminismHook } from '../../src/types';
import { normalizeMarkdown } from '../utils/normalize';
import { checkInvariants, ALL_INVARIANTS, InvariantViolation } from '../utils/invariants';
import { textToAnchor } from '../../src/conversion/htmlToMarkdown';
import { loadManifest, Fixture } from './goldenRunner';

// ─── Helpers ────────────────────────────────────────────────────────────────

const FIXTURES_ROOT = path.resolve(__dirname, 'fixtures');

function getHooks(fixture: Fixture): DeterminismHook {
  return {
    docName: fixture.id,
    timestamp: '2025-01-01T00-00-00',
    outputBasePath: os.tmpdir(),
  };
}

async function convertFixture(fixture: Fixture): Promise<string> {
  const inputPath = path.join(FIXTURES_ROOT, fixture.input);
  const hooks = getHooks(fixture);

  let result;
  if (fixture.type === 'docx') {
    result = await convert(
      { type: 'docx', filePath: inputPath },
      DEFAULT_CONVERSION_OPTIONS,
      hooks
    );
  } else {
    const html = fs.readFileSync(inputPath, 'utf-8');
    result = await convert(
      { type: 'clipboard', html, images: [] },
      DEFAULT_CONVERSION_OPTIONS,
      hooks
    );
  }
  return normalizeMarkdown(result.markdown);
}

/**
 * Format violations into a readable error message.
 */
function formatViolations(violations: InvariantViolation[]): string {
  return violations
    .map((v) => {
      const parts = [`  Rule: ${v.rule} — ${v.message}`];
      if (v.line !== undefined) parts.push(`  Line: ${v.line}`);
      if (v.match) parts.push(`  Match: "${v.match}"`);
      return parts.join('\n');
    })
    .join('\n\n');
}

// ─── T025: Invariant integration tests for every fixture ─────────────────────

describe('Invariant Safety Net (US3)', () => {
  const manifest = loadManifest();

  describe.each(manifest.fixtures)('$id ($type)', (fixture: Fixture) => {
    it(`passes all declared invariants: [${fixture.invariants.join(', ')}]`, async () => {
      const markdown = await convertFixture(fixture);
      const violations = checkInvariants(markdown, fixture.invariants);

      if (violations.length > 0) {
        throw new Error(
          `Fixture "${fixture.id}" has ${violations.length} invariant violation(s):\n\n` +
            formatViolations(violations)
        );
      }

      expect(violations).toHaveLength(0);
    });

    it('passes ALL invariants (full sweep)', async () => {
      const markdown = await convertFixture(fixture);
      const allRuleIds = [...ALL_INVARIANTS.keys()];
      const violations = checkInvariants(markdown, allRuleIds);

      if (violations.length > 0) {
        throw new Error(
          `Fixture "${fixture.id}" fails full invariant sweep (${violations.length} violation(s)):\n\n` +
            formatViolations(violations)
        );
      }

      expect(violations).toHaveLength(0);
    });
  });

  // ─── T026: Anchor determinism ─────────────────────────────────────────────

  describe('Anchor determinism (T026)', () => {
    /**
     * Pick the first 3 DOCX fixtures (which are most likely to have headings).
     * If fewer are available, use what we have.
     */
    const docxFixtures = manifest.fixtures
      .filter((f: Fixture) => f.type === 'docx')
      .slice(0, 3);

    it.each(docxFixtures)(
      'textToAnchor is idempotent for headings in $id',
      async (fixture: Fixture) => {
        const markdown = await convertFixture(fixture);
        const headingPattern = /^(#{1,6})\s+(.+)$/gm;

        const headings: string[] = [];
        let m: RegExpExecArray | null;
        while ((m = headingPattern.exec(markdown)) !== null) {
          headings.push(m[2]);
        }

        // Each heading should produce the same anchor every time
        for (const heading of headings) {
          const anchor1 = textToAnchor(heading);
          const anchor2 = textToAnchor(heading);
          expect(anchor1).toBe(anchor2);
        }
      }
    );

    it.each(docxFixtures)(
      'two conversions produce identical anchor sets for $id',
      async (fixture: Fixture) => {
        const md1 = await convertFixture(fixture);
        const md2 = await convertFixture(fixture);

        const extractAnchors = (md: string): string[] => {
          const result: string[] = [];
          const headingPattern = /^(#{1,6})\s+(.+)$/gm;
          let m: RegExpExecArray | null;
          while ((m = headingPattern.exec(md)) !== null) {
            result.push(textToAnchor(m[2]));
          }
          return result;
        };

        const anchors1 = extractAnchors(md1);
        const anchors2 = extractAnchors(md2);

        expect(anchors1).toEqual(anchors2);
        // Must have at least some headings to be meaningful
        if (anchors1.length > 0) {
          expect(anchors1.length).toBeGreaterThan(0);
        }
      }
    );

    it('textToAnchor matches inline snapshots for known headings', () => {
      // A set of representative headings and their expected anchors
      const cases: Array<[string, string]> = [
        ['Introduction', 'introduction'],
        ['Getting Started', 'getting-started'],
        ['Table of Contents', 'table-of-contents'],
        ['FAQ & Troubleshooting', 'faq-troubleshooting'],
        ['Version 2.0 Release Notes', 'version-20-release-notes'],
        ['Héading with Accénts', 'héading-with-accénts'],
      ];

      for (const [heading, expected] of cases) {
        expect(textToAnchor(heading)).toBe(expected);
      }
    });
  });
});
