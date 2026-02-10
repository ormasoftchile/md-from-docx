/**
 * Synthetic DOCX fixture generator for the golden test suite.
 * Uses the `docx` npm package to generate reproducible test fixtures.
 *
 * Usage: npx ts-node scripts/generate-fixtures.ts
 *
 * @module scripts/generate-fixtures
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeadingLevel,
  ImageRun,
  FootnoteReferenceRun,
  AlignmentType,
  BorderStyle,
  NumberFormat,
  LevelFormat,
} from 'docx';

const OUTPUT_DIR = path.resolve(__dirname, '..', 'test', 'golden', 'fixtures', 'inputs');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function simpleBorders() {
  const border = { style: BorderStyle.SINGLE, size: 1, color: '000000' };
  return { top: border, bottom: border, left: border, right: border };
}

function cell(text: string, columnSpan?: number): TableCell {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun(text)] })],
    borders: simpleBorders(),
    ...(columnSpan ? { columnSpan } : {}),
  });
}

// ─── Fixture: tables-nested ──────────────────────────────────────────────────

async function generateTablesNested(): Promise<Buffer> {
  const innerTable = new Table({
    rows: [
      new TableRow({ children: [cell('Inner A'), cell('Inner B')] }),
      new TableRow({ children: [cell('Inner 1'), cell('Inner 2')] }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          children: [new TextRun({ text: 'Nested Tables Test', bold: true })],
          heading: HeadingLevel.HEADING_1,
        }),
        new Table({
          rows: [
            new TableRow({
              children: [
                cell('Outer Header 1'),
                cell('Outer Header 2'),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [innerTable],
                  borders: simpleBorders(),
                }),
                cell('Outer Data'),
              ],
            }),
          ],
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
      ],
    }],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

// ─── Fixture: tables-colspan ─────────────────────────────────────────────────

async function generateTablesColspan(): Promise<Buffer> {
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          children: [new TextRun({ text: 'Column Span Test', bold: true })],
          heading: HeadingLevel.HEADING_1,
        }),
        new Table({
          rows: [
            new TableRow({
              children: [
                cell('A'),
                cell('B'),
                cell('C'),
              ],
            }),
            new TableRow({
              children: [
                cell('Spans two columns', 2),
                cell('Single'),
              ],
            }),
            new TableRow({
              children: [
                cell('X'),
                cell('Y'),
                cell('Z'),
              ],
            }),
          ],
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
      ],
    }],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

// ─── Fixture: headings-outline-numbering ─────────────────────────────────────

async function generateHeadingsOutlineNumbering(): Promise<Buffer> {
  const doc = new Document({
    numbering: {
      config: [{
        reference: 'outline-numbering',
        levels: [
          { level: 0, format: LevelFormat.DECIMAL, text: '%1', alignment: AlignmentType.LEFT },
          { level: 1, format: LevelFormat.DECIMAL, text: '%1.%2', alignment: AlignmentType.LEFT },
          { level: 2, format: LevelFormat.DECIMAL, text: '%1.%2.%3', alignment: AlignmentType.LEFT },
        ],
      }],
    },
    sections: [{
      children: [
        new Paragraph({
          children: [new TextRun({ text: 'Document with Outline Numbering', bold: true })],
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({
          children: [new TextRun('Introduction')],
          heading: HeadingLevel.HEADING_2,
          numbering: { reference: 'outline-numbering', level: 0 },
        }),
        new Paragraph({ children: [new TextRun('This is the introduction section.')] }),
        new Paragraph({
          children: [new TextRun('Background')],
          heading: HeadingLevel.HEADING_3,
          numbering: { reference: 'outline-numbering', level: 1 },
        }),
        new Paragraph({ children: [new TextRun('Background content goes here.')] }),
        new Paragraph({
          children: [new TextRun('Methods')],
          heading: HeadingLevel.HEADING_2,
          numbering: { reference: 'outline-numbering', level: 0 },
        }),
        new Paragraph({ children: [new TextRun('Methods description.')] }),
        new Paragraph({
          children: [new TextRun('Data Collection')],
          heading: HeadingLevel.HEADING_3,
          numbering: { reference: 'outline-numbering', level: 1 },
        }),
        new Paragraph({
          children: [new TextRun('Analysis')],
          heading: HeadingLevel.HEADING_3,
          numbering: { reference: 'outline-numbering', level: 1 },
        }),
        new Paragraph({ children: [new TextRun('Analysis details.')] }),
      ],
    }],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

// ─── Fixture: images-spaces-unicode ──────────────────────────────────────────

async function generateImagesSpacesUnicode(): Promise<Buffer> {
  // Create a tiny 1x1 red PNG (68 bytes)
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // 8-bit RGB
    0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, // IDAT
    0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
    0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc,
    0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, // IEND
    0x44, 0xae, 0x42, 0x60, 0x82,
  ]);

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          children: [new TextRun({ text: 'Images with Spaces & Unicode', bold: true })],
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({ children: [new TextRun('Below is an embedded test image:')] }),
        new Paragraph({
          children: [
            new ImageRun({
              data: pngHeader,
              transformation: { width: 100, height: 100 },
              type: 'png',
            }),
          ],
        }),
        new Paragraph({ children: [new TextRun('And another image after some text with résumé and naïve characters.')] }),
        new Paragraph({
          children: [
            new ImageRun({
              data: pngHeader,
              transformation: { width: 50, height: 50 },
              type: 'png',
            }),
          ],
        }),
      ],
    }],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

// ─── Fixture: lists-mixed ────────────────────────────────────────────────────

async function generateListsMixed(): Promise<Buffer> {
  const doc = new Document({
    numbering: {
      config: [{
        reference: 'ordered-list',
        levels: [{
          level: 0,
          format: LevelFormat.DECIMAL,
          text: '%1.',
          alignment: AlignmentType.LEFT,
        }],
      }],
    },
    sections: [{
      children: [
        new Paragraph({
          children: [new TextRun({ text: 'Mixed Lists Test', bold: true })],
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({ children: [new TextRun('Unordered list:')] }),
        new Paragraph({
          children: [new TextRun('Apple')],
          bullet: { level: 0 },
        }),
        new Paragraph({
          children: [new TextRun('Banana')],
          bullet: { level: 0 },
        }),
        new Paragraph({
          children: [new TextRun('Cherry (nested)')],
          bullet: { level: 1 },
        }),
        new Paragraph({ children: [new TextRun('Ordered list:')] }),
        new Paragraph({
          children: [new TextRun('First item')],
          numbering: { reference: 'ordered-list', level: 0 },
        }),
        new Paragraph({
          children: [new TextRun('Second item')],
          numbering: { reference: 'ordered-list', level: 0 },
        }),
        new Paragraph({
          children: [new TextRun('Third item')],
          numbering: { reference: 'ordered-list', level: 0 },
        }),
        new Paragraph({ children: [new TextRun('Paragraph after lists.')] }),
      ],
    }],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

// ─── Fixture: footnotes-simple ───────────────────────────────────────────────

async function generateFootnotesSimple(): Promise<Buffer> {
  const doc = new Document({
    footnotes: {
      1: {
        children: [
          new Paragraph({
            children: [new TextRun('This is the first footnote content.')],
          }),
        ],
      },
      2: {
        children: [
          new Paragraph({
            children: [new TextRun('This is the second footnote with more detail.')],
          }),
        ],
      },
    },
    sections: [{
      children: [
        new Paragraph({
          children: [new TextRun({ text: 'Document with Footnotes', bold: true })],
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({
          children: [
            new TextRun('This paragraph has a footnote'),
            new FootnoteReferenceRun(1),
            new TextRun(' in the middle of the text.'),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun('Another paragraph with a different footnote reference'),
            new FootnoteReferenceRun(2),
            new TextRun('.'),
          ],
        }),
      ],
    }],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

// ─── Main Generator ──────────────────────────────────────────────────────────

interface FixtureGenerator {
  name: string;
  filename: string;
  generate: () => Promise<Buffer>;
}

const generators: FixtureGenerator[] = [
  { name: 'Nested tables', filename: 'tables-nested.docx', generate: generateTablesNested },
  { name: 'Column spans', filename: 'tables-colspan.docx', generate: generateTablesColspan },
  { name: 'Outline numbering', filename: 'headings-outline-numbering.docx', generate: generateHeadingsOutlineNumbering },
  { name: 'Images with spaces/unicode', filename: 'images-spaces-unicode.docx', generate: generateImagesSpacesUnicode },
  { name: 'Mixed lists', filename: 'lists-mixed.docx', generate: generateListsMixed },
  { name: 'Footnotes', filename: 'footnotes-simple.docx', generate: generateFootnotesSimple },
];

async function main(): Promise<void> {
  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(`Generating ${generators.length} DOCX fixtures to ${OUTPUT_DIR}\n`);

  for (const gen of generators) {
    try {
      const buffer = await gen.generate();
      const outputPath = path.join(OUTPUT_DIR, gen.filename);
      fs.writeFileSync(outputPath, buffer);
      console.log(`  ✓ ${gen.filename} (${buffer.length} bytes) — ${gen.name}`);
    } catch (err) {
      console.error(`  ✗ ${gen.filename} — ${gen.name}: ${err}`);
      process.exitCode = 1;
    }
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
