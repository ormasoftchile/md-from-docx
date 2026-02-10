/**
 * Output normalization utility for golden test comparison.
 * Applied to both actual and expected content before comparison.
 *
 * @module test/utils/normalize
 */

/**
 * Normalizes Markdown output for deterministic comparison across OSes.
 *
 * Steps applied in order:
 * 1. CRLF/CR → LF
 * 2. Strip trailing whitespace per line
 * 3. Collapse 3+ consecutive blank lines → 2
 * 4. Trim leading/trailing whitespace from entire document
 * 5. Ensure single trailing newline
 *
 * @param markdown - Raw Markdown string
 * @returns Normalized Markdown string
 */
export function normalizeMarkdown(markdown: string): string {
  let result = markdown;

  // 1. Normalize line endings: CRLF and lone CR → LF
  result = result.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 2. Strip trailing whitespace per line
  result = result.replace(/[ \t]+$/gm, '');

  // 3. Collapse 3+ consecutive blank lines to exactly 2
  // A "blank line" is a line containing nothing (or only whitespace, already stripped above)
  result = result.replace(/\n{3,}/g, '\n\n');

  // 4. Trim leading/trailing whitespace from entire document
  result = result.trim();

  // 5. Ensure single trailing newline
  result = result + '\n';

  return result;
}
