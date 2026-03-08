/**
 * Standalone DOCX to Markdown converter for CLI/test usage
 * No VS Code dependency - uses native Node.js modules
 */
import * as fs from 'fs';
import * as path from 'path';
import mammoth from 'mammoth';
import TurndownService from 'turndown';
// @ts-expect-error - turndown-plugin-gfm has incomplete type definitions
import { gfm } from 'turndown-plugin-gfm';

/**
 * Conversion result without VS Code dependencies
 */
export interface StandaloneConversionResult {
  /** The generated Markdown content */
  markdown: string;
  /** Number of images extracted */
  imageCount: number;
  /** Image filenames */
  imageFilenames: string[];
  /** Warnings encountered during conversion */
  warnings: string[];
}

/**
 * Turndown service singleton
 */
let turndownService: TurndownService | undefined;

function getTurndownService(): TurndownService {
  if (!turndownService) {
    turndownService = new TurndownService({
      headingStyle: 'atx',
      hr: '---',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      fence: '```',
      emDelimiter: '*',
      strongDelimiter: '**',
      linkStyle: 'inlined',
      preformattedCode: false,
    });

    // Add GFM support
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    turndownService.use(gfm);

    // Custom heading rule
    turndownService.remove('heading');
    turndownService.addRule('headings', {
      filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      replacement: (content, node) => {
        const element = node as unknown as { nodeName?: string };
        const tagName = element.nodeName?.toLowerCase() || 'h1';
        const level = parseInt(tagName.charAt(1), 10);
        const hashes = '#'.repeat(Math.min(level, 6));
        return `\n\n${hashes} ${content}\n\n`;
      },
    });

    // Custom image rule with path encoding
    turndownService.remove('image');
    turndownService.addRule('encodedImages', {
      filter: 'img',
      replacement: (_content, node) => {
        const element = node as { getAttribute(name: string): string | null };
        const src = element.getAttribute('src') ?? '';
        const alt = element.getAttribute('alt') ?? '';
        const title = element.getAttribute('title');

        let normalizedSrc: string;
        try {
          normalizedSrc = decodeURIComponent(src);
        } catch {
          normalizedSrc = src;
        }
        
        const encodedSrc = normalizedSrc
          .split('/')
          .map((segment) => encodeURIComponent(segment))
          .join('/');

        if (title) {
          return `![${alt}](${encodedSrc} "${title}")`;
        }
        return `![${alt}](${encodedSrc})`;
      },
    });

    // Paragraph rule
    turndownService.addRule('paragraph', {
      filter: 'p',
      replacement: (content) => `\n\n${content}\n\n`,
    });
  }

  return turndownService;
}

/**
 * Convert HTML to Markdown
 */
function htmlToMarkdown(html: string): string {
  if (!html || html.trim().length === 0) {
    return '';
  }

  const service = getTurndownService();
  let markdown = service.turndown(html);

  // Clean up excessive whitespace
  markdown = markdown
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+$/gm, '')
    .trim();

  return markdown;
}

/**
 * Convert a DOCX file to Markdown (pure function, no side effects)
 */
export async function convertDocxToMarkdown(docxPath: string): Promise<StandaloneConversionResult> {
  const fullPath = path.resolve(docxPath);
  
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }

  const docName = path.basename(fullPath, '.docx');
  const imagesFolderName = `${docName}_images`;
  
  const warnings: string[] = [];
  const imageFilenames: string[] = [];
  let imageIndex = 0;

  // Parse DOCX with mammoth
  const result = await mammoth.convertToHtml(
    { path: fullPath },
    {
      convertImage: mammoth.images.imgElement((image) => {
        imageIndex++;
        const extension = image.contentType?.split('/')[1] || 'png';
        const filename = `image-${String(imageIndex).padStart(3, '0')}.${extension}`;
        imageFilenames.push(filename);
        
        return image.read('base64').then((_data) => {
          return {
            src: `${imagesFolderName}/${filename}`,
            alt: `Image ${imageIndex}`,
          };
        });
      }),
    }
  );

  // Collect warnings
  if (result.messages) {
    for (const msg of result.messages) {
      if (msg.type === 'warning') {
        warnings.push(msg.message);
      }
    }
  }

  // Convert HTML to Markdown
  const markdown = htmlToMarkdown(result.value);

  return {
    markdown,
    imageCount: imageFilenames.length,
    imageFilenames,
    warnings,
  };
}

/**
 * Convert HTML content to Markdown (for clipboard scenarios)
 */
export function convertHtmlToMarkdown(html: string): StandaloneConversionResult {
  const markdown = htmlToMarkdown(html);
  
  // Count images in the markdown
  const imageMatches = markdown.match(/!\[[^\]]*\]\([^)]+\)/g) || [];

  return {
    markdown,
    imageCount: imageMatches.length,
    imageFilenames: [],
    warnings: [],
  };
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
DOCX to Markdown Converter CLI (Standalone)

Usage:
  npx ts-node src/cli/standalone.ts <input.docx> [output.md]
  npx ts-node src/cli/standalone.ts --html <input.html> [output.md]

Options:
  --help, -h     Show this help
  --json         Output result as JSON
  --html         Convert HTML file instead of DOCX

Examples:
  npx ts-node src/cli/standalone.ts document.docx
  npx ts-node src/cli/standalone.ts document.docx output.md
  npx ts-node src/cli/standalone.ts --html clipboard.html
`);
    process.exit(0);
  }

  const isHtml = args.includes('--html');
  const outputJson = args.includes('--json');
  const inputFile = args.find(a => !a.startsWith('--'));
  const outputFile = args.filter(a => !a.startsWith('--'))[1];

  if (!inputFile) {
    console.error('Error: No input file specified');
    process.exit(1);
  }

  try {
    let result: StandaloneConversionResult;

    if (isHtml) {
      const html = fs.readFileSync(inputFile, 'utf-8');
      result = convertHtmlToMarkdown(html);
    } else {
      result = await convertDocxToMarkdown(inputFile);
    }

    if (outputJson) {
      console.log(JSON.stringify(result, null, 2));
    } else if (outputFile) {
      fs.writeFileSync(outputFile, result.markdown);
      console.log(`✅ Written to ${outputFile}`);
      if (result.imageCount > 0) {
        console.log(`   ${result.imageCount} images referenced`);
      }
      if (result.warnings.length > 0) {
        console.log(`   ⚠️  ${result.warnings.length} warnings`);
      }
    } else {
      console.log(result.markdown);
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  void main();
}
