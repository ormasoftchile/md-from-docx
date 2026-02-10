/**
 * Golden test suite — US2.
 * Compares actual conversion output against checked-in expected snapshots.
 * Fails with unified diff on mismatch.
 *
 * @module test/golden/goldenRunner.test
 */
import * as path from 'path';
import {
  loadManifest,
  runGoldenTest,
  assertImageManifest,
  assertImageLinksResolve,
  Fixture,
} from './goldenRunner';
import { checkInvariants } from '../utils/invariants';

const FIXTURES_ROOT = path.resolve(__dirname, 'fixtures');

describe('Golden Test Suite (US2)', () => {
  const manifest = loadManifest();

  describe.each(manifest.fixtures)('$id ($type)', (fixture: Fixture) => {
    it('matches expected golden snapshot', async () => {
      const result = await runGoldenTest(fixture);

      if (!result.passed) {
        if (result.error) {
          throw new Error(result.error);
        }
        if (result.diff) {
          throw new Error(
            `Golden snapshot mismatch for "${fixture.id}":\n\n${result.diff}`
          );
        }
      }

      expect(result.passed).toBe(true);
    });

    if (fixture.imagesManifest) {
      it('matches expected image manifest', async () => {
        const result = await runGoldenTest(fixture);
        if (!result.actualImages) {
          throw new Error('No images returned from conversion');
        }

        const manifestPath = path.join(FIXTURES_ROOT, fixture.imagesManifest!);
        const err = assertImageManifest(result.actualImages, manifestPath);
        if (err) {
          throw new Error(`Image manifest mismatch for "${fixture.id}": ${err}`);
        }
      });
    }

    it('has all image links resolving to extracted files', async () => {
      const result = await runGoldenTest(fixture);
      if (!result.actualMarkdown || !result.actualImages) {
        return; // conversion failed — caught by the snapshot test
      }

      const err = assertImageLinksResolve(result.actualMarkdown, result.actualImages);
      if (err) {
        throw new Error(`Unresolved image links for "${fixture.id}": ${err}`);
      }
    });

    it('satisfies declared invariants', async () => {
      const result = await runGoldenTest(fixture);
      if (!result.actualMarkdown) {
        return; // conversion failed — caught by the snapshot test
      }

      const violations = checkInvariants(result.actualMarkdown, fixture.invariants);
      if (violations.length > 0) {
        const details = violations
          .map((v) => `  [${v.rule}] ${v.message}${v.line ? ` (line ${v.line})` : ''}${v.match ? `: "${v.match}"` : ''}`)
          .join('\n');
        throw new Error(
          `Golden test "${fixture.id}" has ${violations.length} invariant violation(s):\n${details}`
        );
      }

      expect(violations).toHaveLength(0);
    });
  });
});
