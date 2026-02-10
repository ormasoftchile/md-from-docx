/**
 * Golden test harness — runs conversion on a fixture and compares against expected output.
 * Supports UPDATE_GOLDENS=1 env var to regenerate expected files.
 *
 * @module test/golden/goldenRunner
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { createTwoFilesPatch } from 'diff';
import { convert } from '../../src/conversion/index';
import { DEFAULT_CONVERSION_OPTIONS } from '../../src/types';
import type { DeterminismHook, ConversionResult, ImageAsset } from '../../src/types';
import { normalizeMarkdown } from '../utils/normalize';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Fixture {
  id: string;
  type: 'docx' | 'clipboard';
  input: string;
  expected: string;
  imagesManifest: string | null;
  invariants: string[];
  description?: string;
}

export interface FixturesManifest {
  $schema: string;
  fixtures: Fixture[];
}

export interface GoldenTestResult {
  passed: boolean;
  fixture: Fixture;
  diff?: string;
  error?: string;
  actualMarkdown?: string;
  actualImages?: ImageAsset[];
}

interface ImageManifestEntry {
  filename: string;
  sha256: string;
  byteLength: number;
}

interface ImageManifest {
  $schema: string;
  images: ImageManifestEntry[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const FIXTURES_ROOT = path.resolve(__dirname, 'fixtures');
const FIXTURES_JSON_PATH = path.resolve(__dirname, 'fixtures.json');
const UPDATE_GOLDENS = process.env.UPDATE_GOLDENS === '1';

// ─── Helpers ────────────────────────────────────────────────────────────────

function sha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Load and parse fixtures.json.
 */
export function loadManifest(): FixturesManifest {
  const raw = fs.readFileSync(FIXTURES_JSON_PATH, 'utf-8');
  return JSON.parse(raw) as FixturesManifest;
}

/**
 * Get determinism hooks for a fixture.
 */
function getHooks(fixture: Fixture): DeterminismHook {
  return {
    docName: fixture.id,
    timestamp: '2025-01-01T00-00-00',
    outputBasePath: os.tmpdir(),
  };
}

// ─── Core: runGoldenTest ────────────────────────────────────────────────────

/**
 * Run a golden test for a single fixture.
 *
 * 1. Read the input file (DOCX or HTML)
 * 2. Run conversion pipeline with determinism hooks
 * 3. Normalize output
 * 4. If UPDATE_GOLDENS=1: write to expected path and pass
 * 5. Otherwise: compare against expected file with unified diff
 */
export async function runGoldenTest(fixture: Fixture): Promise<GoldenTestResult> {
  const inputPath = path.join(FIXTURES_ROOT, fixture.input);
  const expectedPath = path.join(FIXTURES_ROOT, fixture.expected);
  const hooks = getHooks(fixture);

  let result: ConversionResult;

  try {
    if (fixture.type === 'docx') {
      result = await convert(
        { type: 'docx', filePath: inputPath },
        DEFAULT_CONVERSION_OPTIONS,
        hooks
      );
    } else {
      // clipboard type — read HTML file
      const html = fs.readFileSync(inputPath, 'utf-8');
      result = await convert(
        { type: 'clipboard', html, images: [] },
        DEFAULT_CONVERSION_OPTIONS,
        hooks
      );
    }
  } catch (err) {
    return {
      passed: false,
      fixture,
      error: `Conversion failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const actualNormalized = normalizeMarkdown(result.markdown);

  if (UPDATE_GOLDENS) {
    // Write actual output as the new expected file
    fs.mkdirSync(path.dirname(expectedPath), { recursive: true });
    fs.writeFileSync(expectedPath, actualNormalized, 'utf-8');

    // Also write image manifest if fixture expects one
    if (fixture.imagesManifest && result.images.length > 0) {
      const manifestPath = path.join(FIXTURES_ROOT, fixture.imagesManifest);
      const manifestEntries: ImageManifestEntry[] = result.images
        .map(img => ({
          filename: img.filename,
          sha256: sha256(img.buffer),
          byteLength: img.buffer.length,
        }))
        .sort((a, b) => a.filename.localeCompare(b.filename));

      const manifest: ImageManifest = {
        $schema: '../../../specs/005-golden-test-determinism/contracts/images-manifest-schema.json',
        images: manifestEntries,
      };
      fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
    }

    return {
      passed: true,
      fixture,
      actualMarkdown: actualNormalized,
      actualImages: result.images,
    };
  }

  // Compare mode
  if (!fs.existsSync(expectedPath)) {
    return {
      passed: false,
      fixture,
      error: `Expected file not found: ${expectedPath}. Run with UPDATE_GOLDENS=1 to generate.`,
    };
  }

  const expectedContent = fs.readFileSync(expectedPath, 'utf-8');
  const expectedNormalized = normalizeMarkdown(expectedContent);

  if (actualNormalized === expectedNormalized) {
    return {
      passed: true,
      fixture,
      actualMarkdown: actualNormalized,
      actualImages: result.images,
    };
  }

  // Generate unified diff
  const diff = createTwoFilesPatch(
    `expected/${fixture.id}.md`,
    `actual/${fixture.id}.md`,
    expectedNormalized,
    actualNormalized,
    'expected',
    'actual'
  );

  return {
    passed: false,
    fixture,
    diff,
    actualMarkdown: actualNormalized,
    actualImages: result.images,
  };
}

// ─── Image Manifest Comparison (T021) ───────────────────────────────────────

/**
 * Validate actual images against an expected image manifest.
 *
 * @param actualImages - Images extracted by the conversion
 * @param manifestPath - Absolute path to the expected images-manifest.json
 * @returns null if passed, or an error message string if failed
 */
export function assertImageManifest(
  actualImages: ImageAsset[],
  manifestPath: string
): string | null {
  if (!fs.existsSync(manifestPath)) {
    if (UPDATE_GOLDENS) {
      return null; // manifest was just written by runGoldenTest
    }
    return `Image manifest not found: ${manifestPath}. Run with UPDATE_GOLDENS=1 to generate.`;
  }

  const raw = fs.readFileSync(manifestPath, 'utf-8');
  const expected: ImageManifest = JSON.parse(raw);

  // Build actual manifest entries, sorted by filename
  const actualEntries: ImageManifestEntry[] = actualImages
    .map(img => ({
      filename: img.filename,
      sha256: sha256(img.buffer),
      byteLength: img.buffer.length,
    }))
    .sort((a, b) => a.filename.localeCompare(b.filename));

  const expectedEntries = [...expected.images].sort((a, b) => a.filename.localeCompare(b.filename));

  // Compare count
  if (actualEntries.length !== expectedEntries.length) {
    return `Image count mismatch: expected ${expectedEntries.length}, got ${actualEntries.length}`;
  }

  // Compare each entry
  for (let i = 0; i < actualEntries.length; i++) {
    const act = actualEntries[i];
    const exp = expectedEntries[i];

    if (act.filename !== exp.filename) {
      return `Image filename mismatch at index ${i}: expected "${exp.filename}", got "${act.filename}"`;
    }
    if (act.sha256 !== exp.sha256) {
      return `Image hash mismatch for "${act.filename}": expected ${exp.sha256}, got ${act.sha256}`;
    }
    if (act.byteLength !== exp.byteLength) {
      return `Image size mismatch for "${act.filename}": expected ${exp.byteLength} bytes, got ${act.byteLength} bytes`;
    }
  }

  return null; // all good
}

/**
 * Validate that all markdown image links resolve to extracted image filenames.
 *
 * @param markdown - Converted markdown content
 * @param images - Extracted image assets
 * @returns null if all links resolve, or error message
 */
export function assertImageLinksResolve(
  markdown: string,
  images: ImageAsset[]
): string | null {
  const imageFilenames = new Set(images.map(img => img.filename));
  const imagePattern = /!\[[^\]]*\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  const unresolvedLinks: string[] = [];

  while ((match = imagePattern.exec(markdown)) !== null) {
    const src = match[1];
    // Extract the filename from the path
    const filename = path.basename(decodeURIComponent(src));
    if (!imageFilenames.has(filename) && !src.startsWith('http') && !src.startsWith('data') && !decodeURIComponent(src).startsWith('data:')) {
      unresolvedLinks.push(src);
    }
  }

  if (unresolvedLinks.length > 0) {
    return `Unresolved image links: ${unresolvedLinks.join(', ')}`;
  }

  return null;
}
