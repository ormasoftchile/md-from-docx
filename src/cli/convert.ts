#!/usr/bin/env node
/**
 * Standalone CLI for DOCX to Markdown conversion
 * No VS Code dependency - can be used in tests, CI, or command line
 */
import { convertDocxFile, convertClipboardContent } from '../conversion';
import { ConversionOptions, ConversionResult } from '../types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Default conversion options (mirrors VS Code extension defaults)
 */
export const DEFAULT_OPTIONS: ConversionOptions = {
  outputFolderStrategy: 'sameFolder',
  imagesFolderName: '{docname}_images',
  imageFileNamePattern: 'image-{index}',
  overwriteBehavior: 'overwrite',
  pasteTarget: 'newFile',
  openAfterConversion: false,
  showNotifications: false,
};

/**
 * Convert a DOCX file to markdown (pure function, no side effects)
 */
export async function convertDocx(
  docxPath: string,
  options: Partial<ConversionOptions> = {}
): Promise<ConversionResult> {
  const fullPath = path.resolve(docxPath);
  
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }

  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  return convertDocxFile(fullPath, mergedOptions);
}

/**
 * Convert HTML content to markdown (for clipboard/paste scenarios)
 */
export function convertHtml(
  html: string,
  images: Array<{ dataUri: string; index: number }> = [],
  options: Partial<ConversionOptions> = {}
): ConversionResult {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  return convertClipboardContent(html, images, mergedOptions);
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
DOCX to Markdown Converter CLI

Usage:
  npx ts-node src/cli/convert.ts <input.docx> [output.md]
  npx ts-node src/cli/convert.ts --html <input.html> [output.md]

Options:
  --help, -h     Show this help
  --json         Output result as JSON (includes images info)
  --html         Convert HTML file instead of DOCX
  --no-images    Skip image extraction

Examples:
  npx ts-node src/cli/convert.ts document.docx
  npx ts-node src/cli/convert.ts document.docx output.md
  npx ts-node src/cli/convert.ts --html clipboard.html
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
    let result: ConversionResult;

    if (isHtml) {
      const html = fs.readFileSync(inputFile, 'utf-8');
      result = convertHtml(html);
    } else {
      result = await convertDocx(inputFile);
    }

    if (outputJson) {
      console.log(JSON.stringify({
        markdown: result.markdown,
        imageCount: result.images.length,
        images: result.images.map(img => ({
          filename: img.filename,
          format: img.outputFormat,
          size: img.buffer.length,
        })),
        warnings: result.warnings,
      }, null, 2));
    } else if (outputFile) {
      fs.writeFileSync(outputFile, result.markdown);
      console.log(`✅ Written to ${outputFile}`);
      if (result.images.length > 0) {
        console.log(`   ${result.images.length} images extracted`);
      }
      if (result.warnings.length > 0) {
        console.log(`   ⚠️  ${result.warnings.length} warnings`);
      }
    } else {
      // Output to stdout
      console.log(result.markdown);
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
