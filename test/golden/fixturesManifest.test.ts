/**
 * Fixtures manifest validation test — US4.
 * Verifies that fixtures.json is well-formed and all referenced files exist.
 *
 * @module test/golden/fixturesManifest.test
 */
import * as path from 'path';
import * as fs from 'fs';

const FIXTURES_ROOT = path.resolve(__dirname, 'fixtures');
const FIXTURES_JSON_PATH = path.resolve(__dirname, 'fixtures.json');

interface Fixture {
  id: string;
  type: 'docx' | 'clipboard';
  input: string;
  expected: string;
  imagesManifest: string | null;
  invariants: string[];
  description?: string;
}

interface FixturesManifest {
  $schema: string;
  fixtures: Fixture[];
}

const VALID_INVARIANT_IDS = [
  'no-script-tags',
  'no-javascript-uri',
  'no-inline-style',
  'no-mso-artifacts',
  'no-empty-image-src',
  'gfm-table-pipe-consistency',
  'stable-anchors',
];

describe('fixtures.json manifest (US4)', () => {
  let manifest: FixturesManifest;

  beforeAll(() => {
    const raw = fs.readFileSync(FIXTURES_JSON_PATH, 'utf-8');
    manifest = JSON.parse(raw) as FixturesManifest;
  });

  it('is valid JSON with required fields', () => {
    expect(manifest).toBeDefined();
    expect(manifest.fixtures).toBeDefined();
    expect(Array.isArray(manifest.fixtures)).toBe(true);
    expect(manifest.fixtures.length).toBeGreaterThanOrEqual(10);
  });

  it('has unique fixture IDs', () => {
    const ids = manifest.fixtures.map(f => f.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it.each(['tables-nested', 'tables-colspan', 'headings-outline-numbering', 'images-spaces-unicode', 'lists-mixed', 'footnotes-simple'])(
    'contains required DOCX fixture: %s',
    (id) => {
      const fixture = manifest.fixtures.find(f => f.id === id);
      expect(fixture).toBeDefined();
      expect(fixture!.type).toBe('docx');
    }
  );

  it.each(['word-paste-mso', 'teams-card', 'loop-citations', 'iframe-srcdoc'])(
    'contains required clipboard fixture: %s',
    (id) => {
      const fixture = manifest.fixtures.find(f => f.id === id);
      expect(fixture).toBeDefined();
      expect(fixture!.type).toBe('clipboard');
    }
  );

  describe.each(
    // Load manifest synchronously for parameterized tests
    JSON.parse(fs.readFileSync(FIXTURES_JSON_PATH, 'utf-8')).fixtures as Fixture[]
  )('fixture "$id"', (fixture: Fixture) => {
    it('has valid type', () => {
      expect(['docx', 'clipboard']).toContain(fixture.type);
    });

    it('has kebab-case ID', () => {
      expect(fixture.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    });

    it('has input file that exists', () => {
      const inputPath = path.join(FIXTURES_ROOT, fixture.input);
      expect(fs.existsSync(inputPath)).toBe(true);
    });

    it('has at least 2 invariants', () => {
      expect(fixture.invariants.length).toBeGreaterThanOrEqual(2);
    });

    it('has valid invariant IDs', () => {
      for (const inv of fixture.invariants) {
        expect(VALID_INVARIANT_IDS).toContain(inv);
      }
    });

    it('has no duplicate invariants', () => {
      const unique = new Set(fixture.invariants);
      expect(unique.size).toBe(fixture.invariants.length);
    });
  });
});
