/**
 * Unified conversion pipeline orchestrating DOCX parsing, HTML-to-Markdown, and image extraction
 */
import { ConversionResult, ConversionSource, ConversionOptions, OutputPaths } from '../types';
import { parseDocx, isEmptyDocument } from './docxParser';
import { htmlToMarkdown } from './htmlToMarkdown';
import { processClipboardImages, writeImages } from './imageExtractor';
import { writeFile, dirname, basename, joinPath, exists, mkdir } from '../utils/fileSystem';
import { resolveImagesFolderName } from '../config/settings';
import { debug, info, warn } from '../utils/logging';

/**
 * Main conversion function that handles both DOCX files and clipboard content.
 * @param source The input source (DOCX file path or clipboard data)
 * @param options Conversion options from settings
 * @returns ConversionResult with markdown and image data
 */
export async function convert(
  source: ConversionSource,
  options: ConversionOptions
): Promise<ConversionResult> {
  debug('Starting conversion', { sourceType: source.type });

  if (source.type === 'docx') {
    return convertDocxFile(source.filePath, options);
  } else {
    return convertClipboardContent(source.html, source.images, options);
  }
}

/**
 * Converts a DOCX file to Markdown with images.
 * @param filePath Absolute path to the DOCX file
 * @param options Conversion options
 * @returns ConversionResult
 */
export async function convertDocxFile(
  filePath: string,
  options: ConversionOptions
): Promise<ConversionResult> {
  const docName = basename(filePath, '.docx');
  const imagesFolderName = resolveImagesFolderName(options.imagesFolderName, docName);

  debug(`Converting DOCX: ${filePath}`);

  // Parse DOCX to HTML + images
  const parseResult = await parseDocx(
    filePath,
    imagesFolderName,
    options.imageFileNamePattern
  );

  // Check for empty document
  if (isEmptyDocument(parseResult.html)) {
    warn('Document appears to be empty');
    return {
      markdown: '',
      images: [],
      warnings: [...parseResult.warnings, 'Document is empty or contains only whitespace'],
    };
  }

  // Convert HTML to Markdown
  const markdown = htmlToMarkdown(parseResult.html);

  info(`Conversion complete: ${parseResult.images.length} images extracted`);

  return {
    markdown,
    images: parseResult.images,
    warnings: parseResult.warnings,
  };
}

/**
 * Converts clipboard HTML content to Markdown with images.
 * @param html HTML content from clipboard
 * @param images Array of image data URIs from clipboard
 * @param options Conversion options
 * @returns ConversionResult
 */
export function convertClipboardContent(
  html: string,
  images: Array<{ dataUri: string; index: number }>,
  options: ConversionOptions
): ConversionResult {
  debug(`Converting clipboard content: ${html.length} chars, ${images.length} images`);

  const imagesFolderName = resolveImagesFolderName(options.imagesFolderName, 'paste');

  // Process clipboard images
  const imageDataUris = images.map((img) => img.dataUri);
  const { images: processedImages, html: updatedHtml } = processClipboardImages(
    html,
    imageDataUris,
    imagesFolderName,
    options.imageFileNamePattern
  );

  // Convert HTML to Markdown
  const markdown = htmlToMarkdown(updatedHtml);

  info(`Clipboard conversion complete: ${processedImages.length} images extracted`);

  return {
    markdown,
    images: processedImages,
    warnings: [],
  };
}

/**
 * Resolves output paths based on source and options.
 * @param sourcePath Source file path (or workspace path for clipboard)
 * @param docName Document name (without extension)
 * @param options Conversion options
 * @returns Resolved output paths
 */
export function resolveOutputPaths(
  sourcePath: string,
  docName: string,
  options: ConversionOptions
): OutputPaths {
  const sourceDir = dirname(sourcePath);
  const imagesFolderName = resolveImagesFolderName(options.imagesFolderName, docName);

  let baseDir: string;
  let markdownPath: string;
  let imagesFolderPath: string;

  if (options.outputFolderStrategy === 'subFolder') {
    // Create a subfolder for output
    baseDir = joinPath(sourceDir, docName);
    markdownPath = joinPath(baseDir, `${docName}.md`);
    imagesFolderPath = joinPath(baseDir, imagesFolderName);
  } else {
    // Same folder as source
    baseDir = sourceDir;
    markdownPath = joinPath(sourceDir, `${docName}.md`);
    imagesFolderPath = joinPath(sourceDir, imagesFolderName);
  }

  debug('Resolved output paths', { markdownPath, imagesFolderPath });

  return {
    markdownPath,
    imagesFolderPath,
    baseDir,
  };
}

/**
 * Writes conversion result to disk.
 * @param result Conversion result to write
 * @param outputPaths Resolved output paths
 */
export async function writeConversionResult(
  result: ConversionResult,
  outputPaths: OutputPaths
): Promise<void> {
  debug('Writing conversion result', outputPaths);

  // Ensure base directory exists
  if (!(await exists(outputPaths.baseDir))) {
    await mkdir(outputPaths.baseDir);
  }

  // Write markdown file
  await writeFile(outputPaths.markdownPath, result.markdown);
  info(`Wrote markdown: ${outputPaths.markdownPath}`);

  // Write images if any
  if (result.images.length > 0) {
    await writeImages(result.images, outputPaths.imagesFolderPath);
  }
}

/**
 * Full conversion workflow: parse, convert, write to disk.
 * @param source Input source
 * @param outputPaths Where to write output
 * @param options Conversion options
 * @returns ConversionResult
 */
export async function convertAndWrite(
  source: ConversionSource,
  outputPaths: OutputPaths,
  options: ConversionOptions
): Promise<ConversionResult> {
  // Convert
  const result = await convert(source, options);

  // Write to disk
  await writeConversionResult(result, outputPaths);

  return result;
}
