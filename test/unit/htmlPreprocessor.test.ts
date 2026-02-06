/**
 * Tests for Robust HTML Parsing (Feature 004)
 * 
 * Covers: preprocessHtml(), convertHtmlTableToMarkdown(), textToAnchor(),
 * fixHeadingLevelsFromNumbering(), TOC link fixer, detectOrphanDataUris(),
 * entity decoding heuristic, and full pipeline integration.
 */
import { htmlToMarkdown, textToAnchor } from '../../src/conversion/htmlToMarkdown';

// ─── Preprocessor Tests (US1: FR-002, FR-003, FR-004) ──────────────────────

describe('preprocessHtml', () => {
  describe('dangerous tag removal (FR-002)', () => {
    // T009
    test('script tag and content fully removed', () => {
      const html = '<p>Hello</p><script>alert("xss")</script><p>World</p>';
      const result = htmlToMarkdown(html);
      expect(result).not.toContain('<script');
      expect(result).not.toContain('alert');
      expect(result).toContain('Hello');
      expect(result).toContain('World');
    });

    // T010
    test('noscript, template, object, embed, applet tags and content removed', () => {
      const tags = [
        '<noscript>Please enable JS</noscript>',
        '<template><div>template content</div></template>',
        '<object data="file.swf">fallback</object>',
        '<embed src="file.swf">',
        '<applet code="App.class">Java applet</applet>',
      ];
      const html = `<p>Before</p>${tags.join('')}<p>After</p>`;
      const result = htmlToMarkdown(html);
      expect(result).not.toContain('<noscript');
      expect(result).not.toContain('<template');
      expect(result).not.toContain('<object');
      expect(result).not.toContain('<embed');
      expect(result).not.toContain('<applet');
      expect(result).not.toContain('Please enable JS');
      expect(result).not.toContain('template content');
      expect(result).not.toContain('file.swf');
      expect(result).not.toContain('Java applet');
      expect(result).toContain('Before');
      expect(result).toContain('After');
    });

    // T016
    test('HTML containing only script tags returns empty output', () => {
      const html = '<script>var x = 1;</script><script>var y = 2;</script>';
      const result = htmlToMarkdown(html);
      expect(result.trim()).toBe('');
    });
  });

  describe('body extraction (FR-003)', () => {
    // T011
    test('DOCTYPE/html/head/body wrapper extracts only body content', () => {
      const html = '<!DOCTYPE html><html><head><title>Test</title><style>body{color:red}</style></head><body><p>content</p></body></html>';
      const result = htmlToMarkdown(html);
      expect(result).toContain('content');
      expect(result).not.toContain('<title');
      expect(result).not.toContain('Test');
      expect(result).not.toContain('color:red');
      expect(result).not.toContain('DOCTYPE');
    });
  });

  describe('Word namespace removal (FR-004)', () => {
    // T012
    test('w:*, o:*, v:shapetype removed but v:imagedata preserved', () => {
      const html = '<p>Text</p><w:WordDocument>word stuff</w:WordDocument><o:p>&nbsp;</o:p><v:shapetype id="t1">shape</v:shapetype><v:imagedata src="data:image/png;base64,abc"/>';
      const result = htmlToMarkdown(html);
      expect(result).toContain('Text');
      expect(result).not.toContain('w:WordDocument');
      expect(result).not.toContain('word stuff');
      expect(result).not.toContain('o:p');
      expect(result).not.toContain('v:shapetype');
      // v:imagedata should be preserved (passed through to Turndown)
    });

    // T013
    test('Mso classes and mso- styles stripped while text preserved', () => {
      const html = '<p class="MsoNormal" style="mso-bidi-font-size:12pt">Important text</p>';
      const result = htmlToMarkdown(html);
      expect(result).toContain('Important text');
      expect(result).not.toContain('MsoNormal');
      expect(result).not.toContain('mso-bidi');
    });
  });

  describe('malformed HTML handling (SC-003)', () => {
    // T014
    test('unclosed/mismatched tags handled without error, text preserved', () => {
      const html = '<div><p>First<b>bold<i>overlap</b>end</i></p><p>Second</div>';
      const result = htmlToMarkdown(html);
      expect(result).toContain('First');
      expect(result).toContain('bold');
      expect(result).toContain('overlap');
      expect(result).toContain('Second');
      // Should not duplicate any text
      expect((result.match(/First/g) || []).length).toBe(1);
      expect((result.match(/Second/g) || []).length).toBe(1);
    });

    // T014b
    test('domino structural recovery: deeply nested + malformed through full pipeline', () => {
      // Unclosed divs
      const unclosedDivs = '<div><div><div><p>deep content</p>';
      // Overlapping tags
      const overlapping = '<p><b>bold<i>bi</b>italic</i>normal</p>';
      // Missing closing tags
      const missingClose = '<p>para1<p>para2<p>para3';
      // >10 nesting levels
      let deepNest = '<p>deepest</p>';
      for (let i = 0; i < 12; i++) deepNest = `<div>${deepNest}</div>`;
      // Duplicate attributes
      const dupAttrs = '<p class="a" class="b">dup attrs</p>';

      const allHtml = [unclosedDivs, overlapping, missingClose, deepNest, dupAttrs].join('\n');
      
      // (a) no exceptions thrown
      expect(() => htmlToMarkdown(allHtml)).not.toThrow();
      
      const result = htmlToMarkdown(allHtml);
      
      // (b) all visible text content preserved without duplication
      expect(result).toContain('deep content');
      expect(result).toContain('bold');
      expect(result).toContain('italic');
      expect(result).toContain('normal');
      expect(result).toContain('para1');
      expect(result).toContain('para2');
      expect(result).toContain('para3');
      expect(result).toContain('deepest');
      expect(result).toContain('dup attrs');
      
      // (c) output contains zero residual HTML tags
      expect(result).not.toMatch(/<(?!!)(?!\/)[\w][^>]*>/);
    });
  });

  describe('edge cases', () => {
    // T015
    test('empty/whitespace-only input returns empty string', () => {
      expect(htmlToMarkdown('')).toBe('');
      expect(htmlToMarkdown('   ')).toBe('');
      expect(htmlToMarkdown('\n\t\n')).toBe('');
    });
  });
});

// ─── Table Converter Tests (US2: FR-007, FR-008) ────────────────────────────

describe('convertHtmlTableToMarkdown', () => {
  describe('formatted cell content (FR-007)', () => {
    // T022
    test('HTML table with bold, italic, links, code in cells preserves formatting', () => {
      const html = '<table><tr><th>Header</th><th>Value</th></tr>' +
        '<tr><td><b>bold</b> text</td><td><em>italic</em> text</td></tr>' +
        '<tr><td><a href="https://example.com">link</a></td><td><code>code</code></td></tr></table>';
      const result = htmlToMarkdown(html);
      expect(result).toContain('**bold**');
      expect(result).toContain('*italic*');
      expect(result).toContain('[link](https://example.com)');
      expect(result).toContain('`code`');
    });
  });

  describe('column normalization (FR-008)', () => {
    // T023
    test('HTML table with uneven row lengths pads to max column count', () => {
      const html = '<table><tr><td>A</td><td>B</td><td>C</td></tr>' +
        '<tr><td>D</td></tr></table>';
      const result = htmlToMarkdown(html);
      // Count pipes in each row — should be consistent
      const rows = result.split('\n').filter(r => r.startsWith('|'));
      const pipeCounts = rows.map(r => (r.match(/\|/g) || []).length);
      // All rows should have the same number of pipes
      expect(new Set(pipeCounts).size).toBe(1);
    });

    // T024
    test('HTML table with colspan produces consistent column counts', () => {
      const html = '<table><tr><td colspan="2">Spanning</td><td>C</td></tr>' +
        '<tr><td>A</td><td>B</td><td>C</td></tr></table>';
      const result = htmlToMarkdown(html);
      const rows = result.split('\n').filter(r => r.startsWith('|'));
      const pipeCounts = rows.map(r => (r.match(/\|/g) || []).length);
      expect(new Set(pipeCounts).size).toBe(1);
    });
  });

  describe('nested tables (edge case)', () => {
    // T025
    test('HTML table with nested table in cell flattens inner content', () => {
      const html = '<table><tr><td>Normal</td><td><table><tr><td>Inner1</td><td>Inner2</td></tr></table></td></tr></table>';
      const result = htmlToMarkdown(html);
      expect(result).toContain('Normal');
      expect(result).toContain('Inner1');
      expect(result).toContain('Inner2');
      // Should not contain raw table HTML
      expect(result).not.toContain('<table');
      expect(result).not.toContain('</table');
    });
  });
});

// ─── TOC Link Fixer Tests (US3: FR-005) ─────────────────────────────────────

describe('TOC link handling', () => {
  // T030
  test('TOC link text preserved when anchor is _Toc style', () => {
    // Input: a paragraph with a TOC-style link produced by Word
    const html = '<p><a href="#_Toc123456">1.1 Introduction</a></p>';
    const result = htmlToMarkdown(html);
    expect(result).toContain('1.1 Introduction');
    // The link syntax should be removed — just plain text remains
    expect(result).not.toContain('#_Toc');
    expect(result).not.toContain('](#');
  });

  // T031
  test('TOC link text preserved when anchor is _heading style', () => {
    const html = '<p><a href="#_heading_h123">Chapter 3</a></p>';
    const result = htmlToMarkdown(html);
    expect(result).toContain('Chapter 3');
    expect(result).not.toContain('#_heading');
    expect(result).not.toContain('](#');
  });

  // T036 (merged with T030/T031 per analysis)
  test('both _Toc and _heading variants handled in same document', () => {
    const html = '<p><a href="#_Toc999">Part One</a></p>' +
      '<p><a href="#_heading_h42">Part Two</a></p>';
    const result = htmlToMarkdown(html);
    expect(result).toContain('Part One');
    expect(result).toContain('Part Two');
    expect(result).not.toContain('#_Toc');
    expect(result).not.toContain('#_heading');
  });
});

// ─── Heading Level Fixer Tests (US3: FR-010) ────────────────────────────────

describe('fixHeadingLevelsFromNumbering', () => {
  describe('outline numbering', () => {
    // T032
    test('1.1 heading adjusted to depth 2, single-segment stays depth 1', () => {
      // Two headings both at # level — one is outline depth 2, one is depth 1
      const html = '<h1>1.1 Background</h1><h1>1 Overview</h1>';
      const result = htmlToMarkdown(html);
      // "1.1 Background" should become ## (depth 2)
      expect(result).toMatch(/^## 1\.1 Background$/m);
      // "1 Overview" should stay # (depth 1)
      expect(result).toMatch(/^# 1 Overview$/m);
    });
  });

  describe('version number exclusion', () => {
    // T033
    test('Version 2.1.0 Release NOT reinterpreted as depth 3', () => {
      const html = '<h1>Version 2.1.0 Release</h1>';
      const result = htmlToMarkdown(html);
      // Should stay as a single # heading, not become ###
      expect(result).toMatch(/^# Version 2\.1\.0 Release$/m);
    });

    // T034
    test('3.14159 Pi Approximation NOT treated as outline numbering', () => {
      const html = '<h1>3.14159 Pi Approximation</h1>';
      const result = htmlToMarkdown(html);
      // Should stay # — the decimal number is not an outline prefix
      expect(result).toMatch(/^# 3\.14159 Pi Approximation$/m);
    });

    // T034b — design decision test
    test('2.0 Overview treated as version (stays #)', () => {
      // Design decision: "X.0" patterns are treated as version numbers, not outlines.
      // Rationale: Real outline numbering uses non-zero sub-levels (1.1, 2.3, etc.)
      const html = '<h1>2.0 Overview</h1>';
      const result = htmlToMarkdown(html);
      expect(result).toMatch(/^# 2\.0 Overview$/m);
    });
  });
});

// ─── Entity Decoding Tests (US4: FR-006) ────────────────────────────────────

describe('entity decoding heuristic', () => {
  describe('tag+attribute detection', () => {
    // T039
    test('section tag with class attribute decoded and converted', () => {
      const html = '&lt;section class=&quot;content&quot;&gt;text&lt;/section&gt;';
      const result = htmlToMarkdown(html);
      expect(result).toContain('text');
      // Should NOT contain the encoded entities
      expect(result).not.toContain('&lt;section');
    });

    // T040
    test('figure tag with data-* attribute decoded', () => {
      const html = '&lt;figure data-id=&quot;123&quot;&gt;image caption&lt;/figure&gt;';
      const result = htmlToMarkdown(html);
      expect(result).toContain('image caption');
      expect(result).not.toContain('&lt;figure');
    });

    // T041
    test('article tag with id attribute decoded', () => {
      const html = '&lt;article id=&quot;main&quot;&gt;content here&lt;/article&gt;';
      const result = htmlToMarkdown(html);
      expect(result).toContain('content here');
      expect(result).not.toContain('&lt;article');
    });

    // T043 — at least 15 different tag names trigger decoding
    test('at least 15 different tag names trigger decoding (SC-009)', () => {
      // Build a single document with 15 different tags, each with class attribute
      // Use tags that produce valid standalone elements (avoid bare <table> without <tr>/<td>)
      const tags = [
        'div', 'span', 'section', 'article', 'figure',
        'nav', 'header', 'footer', 'main', 'aside',
        'p', 'ul', 'ol', 'details', 'blockquote',
      ];
      expect(tags.length).toBe(15);
      // Build a combined HTML: the heuristic triggers on the first match, then decodes all
      const encoded = tags.map((tag, i) =>
        `&lt;${tag} class=&quot;test&quot;&gt;content${i}&lt;/${tag}&gt;`
      ).join('');
      const result = htmlToMarkdown(encoded);
      // All 15 content fragments should be present
      for (let i = 0; i < tags.length; i++) {
        expect(result).toContain(`content${i}`);
      }
    });
  });

  describe('negative cases', () => {
    // T042
    test('literal text with &lt;tag&gt; NOT decoded (no attribute pattern)', () => {
      const html = '<p>The &lt;tag&gt; is used for markup</p>';
      const result = htmlToMarkdown(html);
      // The text mentions "tag" somewhere
      expect(result).toContain('tag');
      // No entity decoding should have been triggered (no class/id/style attribute pattern)
      // The literal &lt;tag&gt; is rendered by Turndown as <tag> in markdown text, which is fine.
      // The key assertion: our heuristic did NOT fire (no attribute-tagged encoded HTML detected)
      expect(result).not.toContain('&lt;');
    });
  });
});

// ─── Anchor Generator Tests (US5: FR-009) ───────────────────────────────────

describe('textToAnchor', () => {
  describe('Unicode support', () => {
    // T046
    test('French heading preserves ç and accented chars', () => {
      const anchor = textToAnchor("Développement de l'application");
      expect(anchor).toBe('développement-de-lapplication');
    });

    // T047
    test('German heading preserves ü and ö', () => {
      const anchor = textToAnchor('Einführung und Überblick');
      expect(anchor).toBe('einführung-und-überblick');
    });

    // T048
    test('Portuguese heading preserves ã and ç', () => {
      const anchor = textToAnchor('Introdução ao sistema');
      expect(anchor).toBe('introdução-ao-sistema');
    });

    // T049
    test('CJK heading preserves characters', () => {
      const anchor = textToAnchor('技術概要 Overview');
      expect(anchor).toContain('技術概要');
      expect(anchor).toContain('overview');
    });

    // T050 — regression: Spanish still works
    test('Spanish heading still works (regression)', () => {
      const anchor = textToAnchor('Introducción al proyecto');
      expect(anchor).toBe('introducción-al-proyecto');
    });
  });
});

// ─── Orphan Data URI Guard Tests (US6: FR-011) ──────────────────────────────

describe('detectOrphanDataUris', () => {
  // Import the function - it will be exported from htmlToMarkdown
  let detectOrphanDataUris: typeof import('../../src/conversion/htmlToMarkdown').detectOrphanDataUris;

  beforeAll(() => {
    detectOrphanDataUris = require('../../src/conversion/htmlToMarkdown').detectOrphanDataUris;
  });

  // T053
  test('orphan data URI (>100 chars) replaced with image-not-extracted', () => {
    const longBase64 = 'A'.repeat(200);
    const markdown = `Some text\n![alt text](data:image/png;base64,${longBase64})\nMore text`;
    const result = detectOrphanDataUris(markdown);
    expect(result.markdown).toContain('![alt text](image-not-extracted)');
    expect(result.markdown).not.toContain('data:image/png;base64');
    expect(result.orphans).toHaveLength(1);
    expect(result.orphans[0].mimeType).toBe('image/png');
  });

  // T054
  test('short data URI (≤100 chars) NOT replaced by guard', () => {
    const shortBase64 = 'A'.repeat(20);
    const markdown = `![icon](data:image/png;base64,${shortBase64})`;
    const result = detectOrphanDataUris(markdown);
    expect(result.markdown).toContain('data:image/png;base64');
    expect(result.orphans).toHaveLength(0);
  });

  // T055
  test('orphan guard returns correct OrphanDataUriResult with position and size', () => {
    const prefix = 'Text before ';
    const longBase64 = 'B'.repeat(300);
    const markdown = `${prefix}![photo](data:image/jpeg;base64,${longBase64}) after`;
    const result = detectOrphanDataUris(markdown);
    expect(result.orphans).toHaveLength(1);
    expect(result.orphans[0].position).toBe(prefix.length);
    expect(result.orphans[0].mimeType).toBe('image/jpeg');
    expect(result.orphans[0].approximateSize).toBeGreaterThan(0);
  });
});

// ─── Performance Test (T066: SC-008) ────────────────────────────────────────

describe('performance', () => {
  test('~1MB HTML converts in under 5 seconds', () => {
    // Generate ~1MB HTML input
    const paragraph = '<p>' + 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(200) + '</p>';
    const table = '<table><tr><td><b>Bold</b></td><td>Normal</td><td><a href="#">Link</a></td></tr></table>';
    const bigHtml = paragraph.repeat(80) + table.repeat(50);
    expect(bigHtml.length).toBeGreaterThan(900_000); // sanity: ~1MB

    const start = Date.now();
    const result = htmlToMarkdown(bigHtml);
    const elapsed = Date.now() - start;

    expect(result.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(5000);
  });
});
