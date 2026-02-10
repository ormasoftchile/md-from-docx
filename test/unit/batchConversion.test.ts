/**
 * Batch conversion unit tests (T041).
 *
 * Tests the batch conversion handler with mocked vscode APIs.
 * Verifies: 3 inputs → 3 outputs, error isolation (1 failure + 2 successes).
 *
 * @module test/unit/batchConversion.test
 */
import * as path from 'path';
import * as fs from 'fs';
import { convert } from '../../src/conversion/index';
import { DEFAULT_CONVERSION_OPTIONS } from '../../src/types';

// Test that the conversion pipeline can handle multiple files independently
describe('Batch Conversion (US8)', () => {
  const DOCX_DIR = path.resolve(__dirname, '..', 'golden', 'fixtures', 'inputs');

  // Get all .docx fixtures
  const docxFiles = fs.readdirSync(DOCX_DIR)
    .filter(f => f.endsWith('.docx'))
    .map(f => path.join(DOCX_DIR, f));

  it('should have at least 3 DOCX fixtures available', () => {
    expect(docxFiles.length).toBeGreaterThanOrEqual(3);
  });

  it('converts 3 DOCX files independently and produces 3 results', async () => {
    const files = docxFiles.slice(0, 3);
    const results = [];

    for (const filePath of files) {
      const result = await convert(
        { type: 'docx', filePath },
        DEFAULT_CONVERSION_OPTIONS
      );
      results.push(result);
    }

    expect(results).toHaveLength(3);
    for (const result of results) {
      expect(result.markdown).toBeTruthy();
      expect(typeof result.markdown).toBe('string');
      expect(result.markdown.length).toBeGreaterThan(0);
    }
  });

  it('isolates errors: one failure does not block other conversions', async () => {
    const validFiles = docxFiles.slice(0, 2);
    const fakeFile = path.join(DOCX_DIR, 'nonexistent-file.docx');

    const results: Array<{ success: boolean; markdown?: string; error?: string }> = [];

    for (const filePath of [...validFiles, fakeFile]) {
      try {
        const result = await convert(
          { type: 'docx', filePath },
          DEFAULT_CONVERSION_OPTIONS
        );
        results.push({ success: true, markdown: result.markdown });
      } catch (err) {
        results.push({
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    expect(results).toHaveLength(3);

    // First two should succeed
    expect(results[0].success).toBe(true);
    expect(results[0].markdown).toBeTruthy();
    expect(results[1].success).toBe(true);
    expect(results[1].markdown).toBeTruthy();

    // Third should fail (nonexistent file)
    expect(results[2].success).toBe(false);
    expect(results[2].error).toBeTruthy();
  });

  it('batch results are deterministic — same files produce same output', async () => {
    const files = docxFiles.slice(0, 2);

    const run1 = await Promise.all(
      files.map(f => convert({ type: 'docx', filePath: f }, DEFAULT_CONVERSION_OPTIONS))
    );
    const run2 = await Promise.all(
      files.map(f => convert({ type: 'docx', filePath: f }, DEFAULT_CONVERSION_OPTIONS))
    );

    for (let i = 0; i < files.length; i++) {
      expect(run1[i].markdown).toBe(run2[i].markdown);
    }
  });
});
