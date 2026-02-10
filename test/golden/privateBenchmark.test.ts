/**
 * Private Benchmark Test (T048-T049).
 *
 * Allows running conversion + invariant checks against a local collection
 * of real-world DOCX files. Set the `MD_FROM_DOCX_PRIVATE_FIXTURES` env
 * var to a directory path containing `.docx` files.
 *
 * Usage:
 *   cross-env MD_FROM_DOCX_PRIVATE_FIXTURES=/path/to/dir npx jest test/golden/privateBenchmark.test.ts
 *   npm run test:private   (configured in package.json)
 *
 * @module test/golden/privateBenchmark.test
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { convertDocxFile } from '../../src/conversion/index';
import { DEFAULT_CONVERSION_OPTIONS } from '../../src/types';
import { checkAllInvariants } from '../utils/invariants';
import { normalizeMarkdown } from '../utils/normalize';

const PRIVATE_DIR = process.env.MD_FROM_DOCX_PRIVATE_FIXTURES;

/**
 * Recursively find all .docx files in a directory.
 */
function findDocxFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findDocxFiles(full));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.docx') && !entry.name.startsWith('~$')) {
      results.push(full);
    }
  }
  return results.sort();
}

// Skip the entire suite when the env var is not set
const describeFn = PRIVATE_DIR ? describe : describe.skip;

describeFn('Private Benchmark (US10)', () => {
  let tmpDir: string;
  let docxFiles: string[];

  beforeAll(() => {
    if (!PRIVATE_DIR || !fs.existsSync(PRIVATE_DIR)) {
      throw new Error(`Private fixtures path does not exist: ${PRIVATE_DIR}`);
    }
    docxFiles = findDocxFiles(PRIVATE_DIR);
    if (docxFiles.length === 0) {
      throw new Error(`No .docx files found in ${PRIVATE_DIR}`);
    }
    // Create temp dir for outputs (T049)
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'md-from-docx-private-'));
  });

  afterAll(() => {
    // Clean up temp dir (T049)
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('discovers at least 1 .docx file', () => {
    expect(docxFiles.length).toBeGreaterThanOrEqual(1);
    // eslint-disable-next-line no-console
    console.log(`[Private Benchmark] Found ${docxFiles.length} .docx files`);
  });

  it('converts all private DOCX files and passes invariant checks', async () => {
    const results: { file: string; status: 'pass' | 'fail'; error?: string }[] = [];

    for (const docxPath of docxFiles) {
      const basename = path.basename(docxPath, '.docx');
      try {
        const result = await convertDocxFile(
          docxPath,
          { ...DEFAULT_CONVERSION_OPTIONS, imagesFolderName: `${basename}_images` }
        );

        const md = normalizeMarkdown(result.markdown);

        // Run all invariant checks
        const violations = checkAllInvariants(md);
        if (violations.length > 0) {
          const report = violations
            .map(v => `  [${v.rule}] line ${v.line}: ${v.match}`)
            .join('\n');
          results.push({ file: basename, status: 'fail', error: `Invariant violations:\n${report}` });
        } else {
          results.push({ file: basename, status: 'pass' });
        }

        // Write output to temp dir so it's not committed
        const outPath = path.join(tmpDir, `${basename}.md`);
        fs.writeFileSync(outPath, md, 'utf-8');
      } catch (err) {
        results.push({
          file: basename,
          status: 'fail',
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Print summary (T048)
    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    // eslint-disable-next-line no-console
    console.log(`\n[Private Benchmark Summary] ${docxFiles.length} files processed, ${passed} passed, ${failed} failed`);

    for (const r of results.filter(r => r.status === 'fail')) {
      // eslint-disable-next-line no-console
      console.log(`  FAIL: ${r.file} — ${r.error}`);
    }

    // All should pass
    expect(failed).toBe(0);
  }, 120_000); // 2-minute timeout for large fixture sets
});

// When skipped, output a message so it's clear why
if (!PRIVATE_DIR) {
  it('skips private benchmark (MD_FROM_DOCX_PRIVATE_FIXTURES not set)', () => {
    // eslint-disable-next-line no-console
    console.log('[Private Benchmark] No private fixtures path set — skipping. Set MD_FROM_DOCX_PRIVATE_FIXTURES to enable.');
  });
}
