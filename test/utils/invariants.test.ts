/**
 * Unit tests for the invariant checker utility.
 * Tests each of the 7 invariant rules with positive (clean) and negative (violation) inputs.
 *
 * @module test/utils/invariants.test
 */
import {
  ALL_INVARIANTS,
  checkInvariants,
  checkAllInvariants,
  InvariantViolation,
} from '../utils/invariants';

describe('invariants', () => {
  // ─── Meta ──────────────────────────────────────────────────────────

  it('registers all 7 invariant rules', () => {
    expect(ALL_INVARIANTS.size).toBe(7);
    expect([...ALL_INVARIANTS.keys()]).toEqual(
      expect.arrayContaining([
        'no-script-tags',
        'no-javascript-uri',
        'no-inline-style',
        'no-mso-artifacts',
        'no-empty-image-src',
        'gfm-table-pipe-consistency',
        'stable-anchors',
      ])
    );
  });

  it('throws on unknown rule ID', () => {
    expect(() => checkInvariants('# Hello', ['nonexistent-rule'])).toThrow(
      /Unknown invariant rule.*nonexistent-rule/
    );
  });

  // ─── no-script-tags ────────────────────────────────────────────────

  describe('no-script-tags', () => {
    it('passes on clean markdown', () => {
      const md = '# Hello\n\nSome text with **bold**.\n';
      const violations = checkInvariants(md, ['no-script-tags']);
      expect(violations).toEqual([]);
    });

    it('detects <script> opening tag', () => {
      const md = '# Title\n\n<script>alert("xss")</script>\n';
      const violations = checkInvariants(md, ['no-script-tags']);
      expect(violations.length).toBeGreaterThanOrEqual(1);
      expect(violations[0].rule).toBe('no-script-tags');
      expect(violations[0].line).toBe(3);
    });

    it('detects </script> closing tag', () => {
      const md = 'text\n</script>\n';
      const violations = checkInvariants(md, ['no-script-tags']);
      expect(violations.length).toBeGreaterThanOrEqual(1);
    });

    it('detects case-insensitive <SCRIPT>', () => {
      const md = '<SCRIPT src="bad.js"></SCRIPT>\n';
      const violations = checkInvariants(md, ['no-script-tags']);
      expect(violations.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── no-javascript-uri ─────────────────────────────────────────────

  describe('no-javascript-uri', () => {
    it('passes on clean links', () => {
      const md = '[link](https://example.com)\n';
      const violations = checkInvariants(md, ['no-javascript-uri']);
      expect(violations).toEqual([]);
    });

    it('detects javascript: URI', () => {
      const md = '[click](javascript:alert(1))\n';
      const violations = checkInvariants(md, ['no-javascript-uri']);
      expect(violations.length).toBe(1);
      expect(violations[0].rule).toBe('no-javascript-uri');
    });

    it('detects javascript : with space', () => {
      const md = '[click](javascript :void(0))\n';
      const violations = checkInvariants(md, ['no-javascript-uri']);
      expect(violations.length).toBe(1);
    });
  });

  // ─── no-inline-style ───────────────────────────────────────────────

  describe('no-inline-style', () => {
    it('passes on clean markdown', () => {
      const md = '# Title\n\nParagraph.\n';
      const violations = checkInvariants(md, ['no-inline-style']);
      expect(violations).toEqual([]);
    });

    it('detects style= attribute with double quotes', () => {
      const md = '<div style="color:red">text</div>\n';
      const violations = checkInvariants(md, ['no-inline-style']);
      expect(violations.length).toBe(1);
      expect(violations[0].rule).toBe('no-inline-style');
      expect(violations[0].line).toBe(1);
    });

    it('detects style= attribute with single quotes', () => {
      const md = "<span style='font-size:12px'>text</span>\n";
      const violations = checkInvariants(md, ['no-inline-style']);
      expect(violations.length).toBe(1);
    });
  });

  // ─── no-mso-artifacts ──────────────────────────────────────────────

  describe('no-mso-artifacts', () => {
    it('passes on clean markdown', () => {
      const md = '# Title\n\nParagraph text.\n';
      const violations = checkInvariants(md, ['no-mso-artifacts']);
      expect(violations).toEqual([]);
    });

    it('detects MsoNormal class', () => {
      const md = '<p class="MsoNormal">text</p>\n';
      const violations = checkInvariants(md, ['no-mso-artifacts']);
      expect(violations.length).toBe(1);
      expect(violations[0].match).toContain('MsoNormal');
    });

    it('detects mso- style property', () => {
      const md = 'text with mso-bidi-font-size remnant\n';
      const violations = checkInvariants(md, ['no-mso-artifacts']);
      expect(violations.length).toBe(1);
    });

    it('detects <o:p> tag', () => {
      const md = '<o:p>&nbsp;</o:p>\n';
      const violations = checkInvariants(md, ['no-mso-artifacts']);
      expect(violations.length).toBe(1);
    });

    it('detects xmlns:o namespace', () => {
      const md = '<html xmlns:o="urn:schemas-microsoft-com:office:office">\n';
      const violations = checkInvariants(md, ['no-mso-artifacts']);
      expect(violations.length).toBe(1);
    });
  });

  // ─── no-empty-image-src ────────────────────────────────────────────

  describe('no-empty-image-src', () => {
    it('passes on images with src', () => {
      const md = '![alt](./images/photo.png)\n';
      const violations = checkInvariants(md, ['no-empty-image-src']);
      expect(violations).toEqual([]);
    });

    it('detects ![]() with empty src', () => {
      const md = '![]()\n';
      const violations = checkInvariants(md, ['no-empty-image-src']);
      expect(violations.length).toBe(1);
      expect(violations[0].rule).toBe('no-empty-image-src');
    });

    it('detects ![alt]() with empty src', () => {
      const md = '![some alt text]()\n';
      const violations = checkInvariants(md, ['no-empty-image-src']);
      expect(violations.length).toBe(1);
    });

    it('detects ![alt](  ) with whitespace-only src', () => {
      const md = '![alt](  )\n';
      const violations = checkInvariants(md, ['no-empty-image-src']);
      expect(violations.length).toBe(1);
    });
  });

  // ─── gfm-table-pipe-consistency ────────────────────────────────────

  describe('gfm-table-pipe-consistency', () => {
    it('passes on consistent table', () => {
      const md = [
        '| A | B | C |',
        '|---|---|---|',
        '| 1 | 2 | 3 |',
        '| 4 | 5 | 6 |',
      ].join('\n');
      const violations = checkInvariants(md, ['gfm-table-pipe-consistency']);
      expect(violations).toEqual([]);
    });

    it('detects inconsistent pipe count', () => {
      const md = [
        '| A | B | C |',
        '|---|---|---|',
        '| 1 | 2 |',       // missing one pipe
        '| 4 | 5 | 6 |',
      ].join('\n');
      const violations = checkInvariants(md, ['gfm-table-pipe-consistency']);
      expect(violations.length).toBe(1);
      expect(violations[0].line).toBe(3);
    });

    it('ignores escaped pipes', () => {
      const md = [
        '| A | B |',
        '|---|---|',
        '| x\\|y | z |',   // escaped pipe — should count as 3 unescaped
      ].join('\n');
      const violations = checkInvariants(md, ['gfm-table-pipe-consistency']);
      expect(violations).toEqual([]);
    });

    it('passes when no tables exist', () => {
      const md = '# Just a heading\n\nSome text.\n';
      const violations = checkInvariants(md, ['gfm-table-pipe-consistency']);
      expect(violations).toEqual([]);
    });
  });

  // ─── stable-anchors ────────────────────────────────────────────────

  describe('stable-anchors', () => {
    it('passes on markdown with consistent headings', () => {
      const md = '# Hello World\n\n## Another Section\n\n### Third Level\n';
      const violations = checkInvariants(md, ['stable-anchors']);
      expect(violations).toEqual([]);
    });

    // The stable-anchors check verifies that textToAnchor is deterministic
    // (same input → same output). Since it's a pure function, this should always pass.
    it('passes on headings with special characters', () => {
      const md = '# Hello & World!\n\n## Café résumé\n';
      const violations = checkInvariants(md, ['stable-anchors']);
      expect(violations).toEqual([]);
    });
  });

  // ─── checkAllInvariants ────────────────────────────────────────────

  describe('checkAllInvariants', () => {
    it('runs all rules and returns combined violations', () => {
      const md = '# Title\n\n<script>bad</script>\n\n![]()\n';
      const violations = checkAllInvariants(md);
      const ruleIds = violations.map((v: InvariantViolation) => v.rule);
      expect(ruleIds).toContain('no-script-tags');
      expect(ruleIds).toContain('no-empty-image-src');
    });

    it('returns empty array for clean markdown', () => {
      const md = '# Clean Document\n\nJust some text.\n';
      const violations = checkAllInvariants(md);
      expect(violations).toEqual([]);
    });
  });

  // ─── Multiple rules at once ────────────────────────────────────────

  describe('checkInvariants with multiple rules', () => {
    it('returns violations from all specified rules', () => {
      const md = '<script>x</script>\n<div style="bad">y</div>\n';
      const violations = checkInvariants(md, ['no-script-tags', 'no-inline-style']);
      expect(violations.length).toBe(2);
      const ruleIds = violations.map((v: InvariantViolation) => v.rule);
      expect(ruleIds).toContain('no-script-tags');
      expect(ruleIds).toContain('no-inline-style');
    });
  });
});
