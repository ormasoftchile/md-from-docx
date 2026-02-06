/**
 * Reproduction test: feed the real sample.txt through htmlToMarkdown()
 * to see the actual broken citation output.
 *
 * NOTE: sample.txt contains private data and is .gitignored.
 * This test skips automatically when the file is absent (e.g. CI).
 */
import * as fs from 'fs';
import * as path from 'path';
import { htmlToMarkdown } from '../../src/conversion/htmlToMarkdown';

const samplePath = path.join(__dirname, '../../specs/004-robust-html-parsing/sample.txt');
const hasSample = fs.existsSync(samplePath);

(hasSample ? describe : describe.skip)('Real sample.txt reproduction', () => {

  it('should convert sample.txt and not have broken citation fragments like [1](http', () => {
    const html = fs.readFileSync(samplePath, 'utf-8');
    const md = htmlToMarkdown(html);

    // Write output for manual inspection
    const outPath = path.join(__dirname, '../../specs/004-robust-html-parsing/sample-output.md');
    fs.writeFileSync(outPath, md, 'utf-8');

    // Check for broken citation patterns: [1](url) or [N](url) where N is a number
    // These are the raw markdown-attribute citations leaking through
    const brokenCitations = md.match(/\[\d+\]\(https?:\/\/[^\)]+\)/g);
    if (brokenCitations) {
      console.log('BROKEN CITATIONS FOUND:');
      brokenCitations.forEach(c => console.log('  ', c.substring(0, 120)));
    }

    // Check for the specific "Word]" pattern
    const wordBracket = md.match(/Word\]\]/g);
    if (wordBracket) {
      console.log('WORD]] FRAGMENTS FOUND:', wordBracket.length);
    }

    // For debug: search for "markdown=" in output
    const markdownAttr = md.match(/markdown="/g);
    if (markdownAttr) {
      console.log('markdown= ATTRIBUTE LEAKED:', markdownAttr.length, 'times');
    }

    // The test: no broken [N](url) citation links should appear
    expect(brokenCitations).toBeNull();
  });
});
