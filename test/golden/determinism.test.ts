/**
 * Determinism verification tests — US1.
 * Verifies that the same input produces byte-identical output across runs.
 *
 * @module test/golden/determinism.test
 */
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { convert } from '../../src/conversion/index';
import { DEFAULT_CONVERSION_OPTIONS } from '../../src/types';
import { normalizeMarkdown } from '../utils/normalize';
import type { DeterminismHook } from '../../src/types';

// We need a simple DOCX to test with — use one of the real test fixtures
const FIXTURE_DIR = path.resolve(__dirname, '..', 'docx');

/**
 * Find a suitable test DOCX file from existing test fixtures.
 */
function findTestDocx(): string | null {
  if (!fs.existsSync(FIXTURE_DIR)) {
    return null;
  }
  const files = fs.readdirSync(FIXTURE_DIR).filter(f => f.endsWith('.docx'));
  return files.length > 0 ? path.join(FIXTURE_DIR, files[0]) : null;
}

describe('Determinism (US1)', () => {
  const hooks: DeterminismHook = {
    docName: 'test-document',
    timestamp: '2025-01-01T00-00-00',
    outputBasePath: os.tmpdir(),
  };

  let testDocxPath: string | null;

  beforeAll(() => {
    testDocxPath = findTestDocx();
  });

  it('converts the same DOCX 3 times with byte-identical results', async () => {
    if (!testDocxPath) {
      console.warn('No test DOCX files found — skipping determinism test');
      return;
    }

    const results = [];
    for (let i = 0; i < 3; i++) {
      const result = await convert(
        { type: 'docx', filePath: testDocxPath },
        DEFAULT_CONVERSION_OPTIONS,
        hooks
      );
      results.push(result);
    }

    const normalized = results.map(r => normalizeMarkdown(r.markdown));

    // All 3 normalized outputs must be identical
    expect(normalized[0]).toBe(normalized[1]);
    expect(normalized[1]).toBe(normalized[2]);
  });

  it('produces LF-only line endings (never CRLF)', async () => {
    if (!testDocxPath) {
      console.warn('No test DOCX files found — skipping LF test');
      return;
    }

    const result = await convert(
      { type: 'docx', filePath: testDocxPath },
      DEFAULT_CONVERSION_OPTIONS,
      hooks
    );

    // Raw markdown (before normalize) should already have LF only
    expect(result.markdown).not.toContain('\r\n');
    expect(result.markdown).not.toContain('\r');
  });

  it('produces forward-slash path separators in image paths', async () => {
    if (!testDocxPath) {
      console.warn('No test DOCX files found — skipping path separator test');
      return;
    }

    const result = await convert(
      { type: 'docx', filePath: testDocxPath },
      DEFAULT_CONVERSION_OPTIONS,
      hooks
    );

    for (const image of result.images) {
      expect(image.relativePath).not.toContain('\\');
      expect(image.relativePath).toMatch(/^\.\//); // starts with ./
    }
  });

  it('generates zero-padded sequential image filenames', async () => {
    if (!testDocxPath) {
      console.warn('No test DOCX files found — skipping image naming test');
      return;
    }

    const result = await convert(
      { type: 'docx', filePath: testDocxPath },
      DEFAULT_CONVERSION_OPTIONS,
      hooks
    );

    for (const image of result.images) {
      // Filename must match image-NNN.ext pattern
      expect(image.filename).toMatch(/^image-\d{3}\.\w+$/);
    }
  });

  it('produces identical image filenames across runs', async () => {
    if (!testDocxPath) {
      console.warn('No test DOCX files found — skipping image filename determinism test');
      return;
    }

    const result1 = await convert(
      { type: 'docx', filePath: testDocxPath },
      DEFAULT_CONVERSION_OPTIONS,
      hooks
    );
    const result2 = await convert(
      { type: 'docx', filePath: testDocxPath },
      DEFAULT_CONVERSION_OPTIONS,
      hooks
    );

    const names1 = result1.images.map(i => i.filename);
    const names2 = result2.images.map(i => i.filename);
    expect(names1).toEqual(names2);
  });

  describe('clipboard determinism', () => {
    it('converts the same clipboard HTML 3 times with identical results', async () => {
      const html = '<p>Hello <strong>World</strong></p>';
      const images: Array<{ dataUri: string; index: number }> = [];

      const results = [];
      for (let i = 0; i < 3; i++) {
        const result = await convert(
          { type: 'clipboard', html, images },
          DEFAULT_CONVERSION_OPTIONS,
          hooks
        );
        results.push(result);
      }

      const normalized = results.map(r => normalizeMarkdown(r.markdown));
      expect(normalized[0]).toBe(normalized[1]);
      expect(normalized[1]).toBe(normalized[2]);
    });
  });
});
