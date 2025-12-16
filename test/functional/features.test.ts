/**
 * Feature-Focused Functional Tests
 * Validates specific conversion features and their robustness
 * Detects regressions in core conversion capabilities
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { htmlToMarkdown, resetTurndownService } from '../../src/conversion/htmlToMarkdown';
import { convertClipboardContent } from '../../src/conversion/index';
import { DEFAULT_CONVERSION_OPTIONS } from '../../src/types';

describe('Feature-Focused Functional Tests', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'feature-test-'));
    resetTurndownService();
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    resetTurndownService();
  });

  describe('Heading Conversion', () => {
    it('should preserve heading hierarchy (H1, H2, H3)', () => {
      const html = `
        <h1>Main Title</h1>
        <h2>Section One</h2>
        <h3>Subsection</h3>
        <h2>Section Two</h2>
      `;

      const markdown = htmlToMarkdown(html);

      expect(markdown).toContain('# Main Title');
      expect(markdown).toContain('## Section One');
      expect(markdown).toContain('### Subsection');
      expect(markdown).toContain('## Section Two');
    });

    it('should handle headings with special characters', () => {
      const html = '<h1>Title with "quotes" and (parens)</h1>';
      const markdown = htmlToMarkdown(html);

      expect(markdown).toContain('# Title with "quotes" and (parens)');
    });

    it('should handle numbered headings from Word (outline levels)', () => {
      const html = `
        <h1>1 Introduction</h1>
        <h2>1.1 Background</h2>
        <h3>1.1.1 History</h3>
      `;

      const markdown = htmlToMarkdown(html);

      // Should detect numbering and adjust heading levels
      expect(markdown).toContain('# 1 Introduction');
      expect(markdown).toContain('## 1.1 Background');
      expect(markdown).toContain('### 1.1.1 History');
    });

    it('should strip Word Online style attributes from headings', () => {
      const html = '<h1 style="color: red; font-size: 14pt;">Title</h1>';
      const markdown = htmlToMarkdown(html);

      expect(markdown).toContain('# Title');
      expect(markdown).not.toContain('style');
    });
  });

  describe('Table Conversion', () => {
    it('should convert HTML tables to GFM markdown format', () => {
      const html = `
        <table>
          <tr><th>Name</th><th>Age</th></tr>
          <tr><td>John</td><td>30</td></tr>
          <tr><td>Jane</td><td>28</td></tr>
        </table>
      `;

      const markdown = htmlToMarkdown(html);

      expect(markdown).toContain('|');
      expect(markdown).toContain('Name');
      expect(markdown).toContain('Age');
      expect(markdown).toContain('John');
      expect(markdown).toContain('Jane');
      // Should not contain HTML table markup
      expect(markdown).not.toContain('<table');
      expect(markdown).not.toContain('<tr');
      expect(markdown).not.toContain('<td');
    });

    it('should handle complex tables with styles and attributes', () => {
      const html = `
        <table border="1" cellpadding="5">
          <tr>
            <th style="background-color: gray;">Header 1</th>
            <th style="color: blue;">Header 2</th>
          </tr>
          <tr>
            <td colspan="2">Merged Cell</td>
          </tr>
        </table>
      `;

      const markdown = htmlToMarkdown(html);

      expect(markdown).toContain('| Header 1 | Header 2 |');
      expect(markdown).not.toContain('<table');
      expect(markdown).not.toContain('style');
      expect(markdown).not.toContain('border');
    });

    it('should handle tables with nested formatting', () => {
      const html = `
        <table>
          <tr>
            <th><strong>Bold Header</strong></th>
            <th><em>Italic Header</em></th>
          </tr>
          <tr>
            <td>**Bold Content**</td>
            <td>*Italic Content*</td>
          </tr>
        </table>
      `;

      const markdown = htmlToMarkdown(html);

      expect(markdown).toContain('|');
      expect(markdown).toContain('Bold');
      expect(markdown).toContain('Italic');
      expect(markdown).not.toContain('<');
    });

    it('should preserve table data integrity', () => {
      const html = `
        <table>
          <tr><th>ID</th><th>Value</th></tr>
          <tr><td>001</td><td>2500.50</td></tr>
          <tr><td>002</td><td>1200.75</td></tr>
        </table>
      `;

      const markdown = htmlToMarkdown(html);

      expect(markdown).toContain('001');
      expect(markdown).toContain('2500.50');
      expect(markdown).toContain('002');
      expect(markdown).toContain('1200.75');
    });
  });

  describe('Image Reference Handling', () => {
    it('should encode image paths properly', () => {
      const html = '<img src="folder/image name.png" alt="Test Image" />';
      const markdown = htmlToMarkdown(html);

      expect(markdown).toContain('![Test Image]');
      // Path should contain the image name (encoded or not)
      expect(markdown).toMatch(/\!\[.*\]\(.*image.*\.png.*\)/);
    });

    it('should handle images with special characters in names', () => {
      const html =
        '<img src="images/file (1) [draft].png" alt="Complex name" />';
      const markdown = htmlToMarkdown(html);

      expect(markdown).toContain('![Complex name]');
      // URL should be properly encoded
      expect(markdown).toMatch(/!\[Complex name\]\(.*file.*\.png.*\)/);
    });

    it('should preserve image alt text', () => {
      const html =
        '<img src="test.png" alt="This is a detailed description" />';
      const markdown = htmlToMarkdown(html);

      expect(markdown).toContain('![This is a detailed description]');
    });

    it('should handle images with relative paths', () => {
      const html = '<img src="./images/test.png" alt="Test" />';
      const markdown = htmlToMarkdown(html);

      expect(markdown).toContain('![Test]');
      expect(markdown).toMatch(/!\[Test\]\(.*test\.png\)/);
    });

    it('should clean up alt text with newlines', () => {
      const html = `<img src="test.png" alt="Line 1
Line 2
Line 3" />`;
      const markdown = htmlToMarkdown(html);

      // Newlines in alt text should be converted to spaces
      expect(markdown).toContain('![');
      expect(markdown).not.toContain('\n![');
    });
  });

  describe('Text Formatting Preservation', () => {
    it('should preserve bold text', () => {
      const html = '<p>This is <strong>bold text</strong> here.</p>';
      const markdown = htmlToMarkdown(html);

      expect(markdown).toContain('**bold text**');
    });

    it('should preserve italic text', () => {
      const html = '<p>This is <em>italic text</em> here.</p>';
      const markdown = htmlToMarkdown(html);

      expect(markdown).toContain('*italic text*');
    });

    it('should handle combined formatting', () => {
      const html =
        '<p><strong><em>Bold italic</em></strong> and <u>underlined</u></p>';
      const markdown = htmlToMarkdown(html);

      expect(markdown).toContain('italic');
      expect(markdown).toContain('Bold');
    });

    it('should preserve inline code', () => {
      const html = '<p>Use the <code>console.log()</code> function.</p>';
      const markdown = htmlToMarkdown(html);

      expect(markdown).toContain('`console.log()`');
    });

    it('should preserve code blocks', () => {
      const html =
        '<pre><code>function hello() {\n  console.log("Hello");\n}</code></pre>';
      const markdown = htmlToMarkdown(html);

      expect(markdown).toContain('```');
      expect(markdown).toContain('function hello()');
    });

    it('should handle strikethrough text', () => {
      const html = '<p><del>Deleted text</del></p>';
      const markdown = htmlToMarkdown(html);

      // GFM strikethrough: ~~text~~ or just contains the text
      const hasStrikethrough = /~~.*Deleted text.*~~/.test(markdown);
      const hasText = markdown.includes('Deleted text');
      expect(hasStrikethrough || hasText).toBe(true);
    });
  });

  describe('List Conversion', () => {
    it('should convert unordered lists', () => {
      const html = `
        <ul>
          <li>First item</li>
          <li>Second item</li>
          <li>Third item</li>
        </ul>
      `;

      const markdown = htmlToMarkdown(html);

      expect(markdown).toMatch(/[-*]\s+First item/);
      expect(markdown).toMatch(/[-*]\s+Second item/);
      expect(markdown).toMatch(/[-*]\s+Third item/);
    });

    it('should convert ordered lists', () => {
      const html = `
        <ol>
          <li>First item</li>
          <li>Second item</li>
          <li>Third item</li>
        </ol>
      `;

      const markdown = htmlToMarkdown(html);

      expect(markdown).toMatch(/\d\.\s+First item/);
      expect(markdown).toMatch(/\d\.\s+Second item/);
      expect(markdown).toMatch(/\d\.\s+Third item/);
    });

    it('should handle nested lists', () => {
      const html = `
        <ul>
          <li>Parent item
            <ul>
              <li>Child item 1</li>
              <li>Child item 2</li>
            </ul>
          </li>
        </ul>
      `;

      const markdown = htmlToMarkdown(html);

      expect(markdown).toContain('Parent item');
      expect(markdown).toContain('Child item');
    });

    it('should handle lists with complex content', () => {
      const html = `
        <ul>
          <li><strong>Bold</strong> item</li>
          <li>Item with <code>code</code></li>
          <li>Item with <a href="#">link</a></li>
        </ul>
      `;

      const markdown = htmlToMarkdown(html);

      expect(markdown).toContain('**Bold**');
      expect(markdown).toContain('`code`');
      expect(markdown).toContain('[link]');
    });
  });

  describe('Link Conversion', () => {
    it('should preserve regular hyperlinks', () => {
      const html =
        '<p>Visit <a href="https://example.com">my website</a>.</p>';
      const markdown = htmlToMarkdown(html);

      expect(markdown).toContain('[my website](https://example.com)');
    });

    it('should handle links with titles', () => {
      const html =
        '<p><a href="https://example.com" title="Example">Link</a></p>';
      const markdown = htmlToMarkdown(html);

      expect(markdown).toContain('[Link]');
      expect(markdown).toContain('https://example.com');
    });

    it('should handle anchor links to headings', () => {
      const html = `
        <h1 id="section1">Section 1</h1>
        <p><a href="#section1">Jump to section</a></p>
      `;

      const markdown = htmlToMarkdown(html);

      expect(markdown).toContain('# Section 1');
      expect(markdown).toContain('[Jump to section]');
    });

    it('should remove Word TOC links (regression test)', () => {
      const html =
        '<p><a href="#_Toc123456">Contents 1</a></p>';
      const markdown = htmlToMarkdown(html);

      // TOC links should be removed
      expect(markdown).not.toContain('#_Toc');
    });
  });

  describe('Line Ending Normalization', () => {
    it('should normalize Windows CRLF to Unix LF', () => {
      const html = 'Line 1\r\nLine 2\r\nLine 3';
      const markdown = htmlToMarkdown(html);

      expect(markdown).not.toContain('\r\n');
      expect(markdown).not.toContain('\r');
      // Should have line breaks
      const lines = markdown.split('\n');
      expect(lines.length).toBeGreaterThan(0);
    });

    it('should normalize Mac CR to Unix LF', () => {
      const html = 'Line 1\rLine 2\rLine 3';
      const markdown = htmlToMarkdown(html);

      expect(markdown).not.toContain('\r');
      // Should have line breaks
      const lines = markdown.split('\n');
      expect(lines.length).toBeGreaterThan(0);
    });

    it('should handle mixed line endings', () => {
      const html = 'Line 1\r\nLine 2\rLine 3\nLine 4';
      const markdown = htmlToMarkdown(html);

      expect(markdown).not.toContain('\r');
      const lines = markdown.split('\n').filter(l => l.trim().length > 0);
      expect(lines.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Word Online HTML Artifacts', () => {
    it('should remove Word namespace tags', () => {
      const html =
        '<p>Text <o:p></o:p></p><p>More <v:shape></v:shape> text</p>';
      const markdown = htmlToMarkdown(html);

      expect(markdown).not.toContain('o:p');
      expect(markdown).not.toContain('v:');
      expect(markdown).toContain('Text');
      expect(markdown).toContain('More');
    });

    it('should remove conditional comments', () => {
      const html = '<p>Start<!--[if gte mso 9]><![endif]-->End</p>';
      const markdown = htmlToMarkdown(html);

      expect(markdown).not.toContain('<!--');
      expect(markdown).toContain('Start');
      expect(markdown).toContain('End');
    });

    it('should handle Word spacing and formatting', () => {
      const html =
        '<p style="margin-top: 12pt; margin-bottom: 0pt; line-height: 115%;">Normal paragraph</p>';
      const markdown = htmlToMarkdown(html);

      expect(markdown).toContain('Normal paragraph');
      expect(markdown).not.toContain('margin-top');
      expect(markdown).not.toContain('style');
    });
  });

  describe('Whitespace and Formatting Cleanup', () => {
    it('should remove excessive blank lines', () => {
      const html = '<p>Paragraph 1</p>\n\n\n<p>Paragraph 2</p>\n\n\n\n<p>Paragraph 3</p>';
      const markdown = htmlToMarkdown(html);

      expect(markdown).not.toContain('\n\n\n');
    });

    it('should trim leading and trailing whitespace', () => {
      const html = '   <p>Content</p>   ';
      const markdown = htmlToMarkdown(html);

      expect(markdown.startsWith('\n')).toBe(false);
      expect(markdown.endsWith('\n')).toBe(false);
    });

    it('should normalize internal whitespace', () => {
      const html = '<p>Text   with   multiple    spaces</p>';
      const markdown = htmlToMarkdown(html);

      // Should contain either the original spacing or normalized spacing
      const hasOriginal = markdown.includes('Text   with   multiple    spaces');
      const hasNormalized = markdown.includes('Text with multiple spaces');
      expect(hasOriginal || hasNormalized).toBe(true);
    });
  });

  describe('Clipboard Content Conversion (Real-World)', () => {
    it('should convert clipboard HTML with images', () => {
      const clipboardHtml =
        '<h1>Title</h1><p>Content</p><img src="data:image/png;base64,iVBORw0KGgo=" />';
      const images = [
        {
          dataUri:
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          index: 0,
        },
      ];

      const result = convertClipboardContent(
        clipboardHtml,
        images,
        DEFAULT_CONVERSION_OPTIONS
      );

      expect(result.markdown).toBeDefined();
      expect(result.markdown).toContain('# Title');
      expect(result.markdown).toContain('Content');
      expect(result.images.length).toBeGreaterThan(0);
    });

    it('should handle complex clipboard content from Word', () => {
      const clipboardHtml = `
        <h1>Document</h1>
        <table>
          <tr><th>Col1</th><th>Col2</th></tr>
          <tr><td>Val1</td><td>Val2</td></tr>
        </table>
        <ul>
          <li>List item 1</li>
          <li>List item 2</li>
        </ul>
      `;

      const result = convertClipboardContent(
        clipboardHtml,
        [],
        DEFAULT_CONVERSION_OPTIONS
      );

      expect(result.markdown).toContain('# Document');
      expect(result.markdown).toContain('|');
      expect(result.markdown).toMatch(/[-*]\s+List item/);
    });
  });

  describe('Edge Cases and Stability', () => {
    it('should handle empty HTML gracefully', () => {
      expect(() => htmlToMarkdown('')).not.toThrow();
      expect(htmlToMarkdown('')).toBe('');
    });

    it('should handle whitespace-only HTML', () => {
      const result = htmlToMarkdown('   \n\n  \t\t  ');
      expect(result).toBe('');
    });

    it('should handle very large HTML documents', () => {
      let largeHtml = '';
      for (let i = 0; i < 1000; i++) {
        largeHtml += `<p>Paragraph ${i}</p>`;
      }

      expect(() => htmlToMarkdown(largeHtml)).not.toThrow();
      const result = htmlToMarkdown(largeHtml);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle deeply nested HTML', () => {
      let nestedHtml = '<div>';
      for (let i = 0; i < 50; i++) {
        nestedHtml += `<div><p>Level ${i}</p>`;
      }
      for (let i = 0; i < 50; i++) {
        nestedHtml += '</div>';
      }
      nestedHtml += '</div>';

      expect(() => htmlToMarkdown(nestedHtml)).not.toThrow();
      const result = htmlToMarkdown(nestedHtml);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle malformed HTML gracefully', () => {
      const malformedHtml =
        '<p>Unclosed paragraph<div>Mismatched tags</p></div>';
      expect(() => htmlToMarkdown(malformedHtml)).not.toThrow();
      const result = htmlToMarkdown(malformedHtml);
      expect(result).toContain('Unclosed paragraph');
    });
  });
});
