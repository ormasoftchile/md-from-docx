/**
 * Unit tests for the output normalization utility.
 *
 * @module test/utils/normalize.test
 */
import { normalizeMarkdown } from '../utils/normalize';

describe('normalizeMarkdown', () => {
  // ─── Line ending normalization ─────────────────────────────────────

  it('converts CRLF to LF', () => {
    const input = '# Hello\r\n\r\nWorld\r\n';
    const result = normalizeMarkdown(input);
    expect(result).not.toContain('\r');
    expect(result).toBe('# Hello\n\nWorld\n');
  });

  it('converts lone CR to LF', () => {
    const input = '# Hello\r\rWorld\r';
    const result = normalizeMarkdown(input);
    expect(result).not.toContain('\r');
    expect(result).toBe('# Hello\n\nWorld\n');
  });

  it('preserves LF-only content', () => {
    const input = '# Hello\n\nWorld\n';
    const result = normalizeMarkdown(input);
    expect(result).toBe('# Hello\n\nWorld\n');
  });

  // ─── Trailing whitespace stripping ─────────────────────────────────

  it('strips trailing spaces from lines', () => {
    const input = '# Title   \n\nSome text.  \n';
    const result = normalizeMarkdown(input);
    expect(result).toBe('# Title\n\nSome text.\n');
  });

  it('strips trailing tabs from lines', () => {
    const input = '# Title\t\t\n\nSome text.\t\n';
    const result = normalizeMarkdown(input);
    expect(result).toBe('# Title\n\nSome text.\n');
  });

  // ─── Blank line collapsing ─────────────────────────────────────────

  it('collapses 3 consecutive blank lines to 2', () => {
    const input = '# Title\n\n\n\nParagraph.\n';
    const result = normalizeMarkdown(input);
    expect(result).toBe('# Title\n\nParagraph.\n');
  });

  it('collapses 5 consecutive blank lines to 2', () => {
    const input = '# Title\n\n\n\n\n\nParagraph.\n';
    const result = normalizeMarkdown(input);
    expect(result).toBe('# Title\n\nParagraph.\n');
  });

  it('preserves exactly 2 consecutive blank lines (1 empty line)', () => {
    const input = '# Title\n\nParagraph.\n';
    const result = normalizeMarkdown(input);
    expect(result).toBe('# Title\n\nParagraph.\n');
  });

  // ─── Edge trimming ─────────────────────────────────────────────────

  it('removes leading blank lines', () => {
    const input = '\n\n\n# Title\n\nText.\n';
    const result = normalizeMarkdown(input);
    expect(result).toBe('# Title\n\nText.\n');
  });

  it('removes trailing blank lines', () => {
    const input = '# Title\n\nText.\n\n\n\n';
    const result = normalizeMarkdown(input);
    expect(result).toBe('# Title\n\nText.\n');
  });

  it('removes leading and trailing whitespace', () => {
    const input = '   \n\n# Title\n\nText.\n\n   ';
    const result = normalizeMarkdown(input);
    expect(result).toBe('# Title\n\nText.\n');
  });

  // ─── Trailing newline ──────────────────────────────────────────────

  it('adds trailing newline if missing', () => {
    const input = '# Title\n\nText.';
    const result = normalizeMarkdown(input);
    expect(result).toBe('# Title\n\nText.\n');
  });

  it('preserves exactly one trailing newline', () => {
    const input = '# Title\n\nText.\n';
    const result = normalizeMarkdown(input);
    expect(result).toBe('# Title\n\nText.\n');
  });

  // ─── Combined ──────────────────────────────────────────────────────

  it('normalizes complex mixed input', () => {
    const input = '\r\n  # Title  \r\n\r\n\r\n\r\nSome text.\t \r\n\r\nMore text.\r\n\r\n\r\n';
    const result = normalizeMarkdown(input);
    expect(result).toBe('# Title\n\nSome text.\n\nMore text.\n');
  });

  it('handles empty string', () => {
    const result = normalizeMarkdown('');
    expect(result).toBe('\n');
  });

  it('handles whitespace-only string', () => {
    const result = normalizeMarkdown('   \n  \n   ');
    expect(result).toBe('\n');
  });
});
