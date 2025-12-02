/**
 * Mammoth wrapper for DOCX to HTML conversion with image extraction
 */
import * as mammoth from 'mammoth';
import { ImageAsset } from '../types';
import { debug, warn } from '../utils/logging';

/**
 * Result of parsing a DOCX file.
 */
export interface DocxParseResult {
  /** Raw HTML content from the document */
  html: string;

  /** Extracted images with their data */
  images: ImageAsset[];

  /** Warning messages from mammoth */
  warnings: string[];
}

/**
 * Determines the output format for an image based on its content type.
 * @param contentType MIME type of the image
 * @returns Appropriate output format
 */
function getOutputFormat(contentType: string): 'png' | 'jpeg' | 'gif' {
  if (contentType.includes('jpeg') || contentType.includes('jpg')) {
    return 'jpeg';
  }
  if (contentType.includes('gif')) {
    return 'gif';
  }
  // Default to PNG for all other formats (including EMF, WMF, BMP, etc.)
  return 'png';
}

/**
 * Extracts the original format from a content type.
 * @param contentType MIME type of the image
 * @returns Format string
 */
function getOriginalFormat(contentType: string): string {
  const match = contentType.match(/image\/([a-z0-9+-]+)/i);
  return match ? match[1].toLowerCase() : 'unknown';
}

/**
 * Parses a DOCX file and extracts HTML content and images.
 * @param docxPath Absolute path to the DOCX file
 * @param imagesFolderName Name of the folder where images will be saved
 * @param imageFileNamePattern Pattern for image filenames (e.g., 'image-{index}')
 * @returns Parse result with HTML, images, and warnings
 */
export async function parseDocx(
  docxPath: string,
  imagesFolderName: string,
  imageFileNamePattern: string
): Promise<DocxParseResult> {
  const images: ImageAsset[] = [];
  let imageIndex = 0;

  debug(`Parsing DOCX file: ${docxPath}`);

  const result = await mammoth.convertToHtml(
    { path: docxPath },
    {
      convertImage: mammoth.images.imgElement((image) => {
        return image.read('base64').then((base64Data) => {
          imageIndex++;
          const contentType = image.contentType;
          const originalFormat = getOriginalFormat(contentType);
          const outputFormat = getOutputFormat(contentType);

          // Generate filename from pattern
          const paddedIndex = imageIndex.toString().padStart(3, '0');
          const filename = imageFileNamePattern.replace('{index}', paddedIndex) + '.' + outputFormat;
          const relativePath = `./${imagesFolderName}/${filename}`;
          
          // URL-encode the path for use in Markdown (handles spaces and special chars)
          const encodedRelativePath = './' + 
            imagesFolderName.split('/').map(s => encodeURIComponent(s)).join('/') + 
            '/' + encodeURIComponent(filename);

          debug(`Extracted image ${imageIndex}: ${originalFormat} -> ${outputFormat}`);

          // Store the image data
          const buffer = Buffer.from(base64Data, 'base64');
          images.push({
            buffer,
            originalFormat,
            outputFormat,
            filename,
            relativePath,
          });

          // Return encoded path that will be used in the HTML src attribute
          return { src: encodedRelativePath };
        });
      }),
    }
  );

  // Process warnings
  const warnings = result.messages
    .filter((msg) => msg.type === 'warning')
    .map((msg) => msg.message);

  if (warnings.length > 0) {
    warnings.forEach((w) => warn(`Mammoth warning: ${w}`));
  }

  debug(`Parsed DOCX: ${images.length} images extracted, ${warnings.length} warnings`);

  return {
    html: result.value,
    images,
    warnings,
  };
}

/**
 * Parses DOCX content from a buffer (for streaming or in-memory conversion).
 * @param buffer DOCX file content as Buffer
 * @param imagesFolderName Name of the folder where images will be saved
 * @param imageFileNamePattern Pattern for image filenames
 * @returns Parse result with HTML, images, and warnings
 */
export async function parseDocxFromBuffer(
  buffer: Buffer,
  imagesFolderName: string,
  imageFileNamePattern: string
): Promise<DocxParseResult> {
  const images: ImageAsset[] = [];
  let imageIndex = 0;

  debug('Parsing DOCX from buffer');

  const result = await mammoth.convertToHtml(
    { buffer },
    {
      convertImage: mammoth.images.imgElement((image) => {
        return image.read('base64').then((base64Data) => {
          imageIndex++;
          const contentType = image.contentType;
          const originalFormat = getOriginalFormat(contentType);
          const outputFormat = getOutputFormat(contentType);

          const paddedIndex = imageIndex.toString().padStart(3, '0');
          const filename = imageFileNamePattern.replace('{index}', paddedIndex) + '.' + outputFormat;
          const relativePath = `./${imagesFolderName}/${filename}`;
          
          // URL-encode the path for use in Markdown (handles spaces and special chars)
          const encodedRelativePath = './' + 
            imagesFolderName.split('/').map(s => encodeURIComponent(s)).join('/') + 
            '/' + encodeURIComponent(filename);

          const imageBuffer = Buffer.from(base64Data, 'base64');
          images.push({
            buffer: imageBuffer,
            originalFormat,
            outputFormat,
            filename,
            relativePath,
          });

          return { src: encodedRelativePath };
        });
      }),
    }
  );

  const warnings = result.messages
    .filter((msg) => msg.type === 'warning')
    .map((msg) => msg.message);

  debug(`Parsed DOCX buffer: ${images.length} images extracted`);

  return {
    html: result.value,
    images,
    warnings,
  };
}

/**
 * Checks if a document is empty (no meaningful content).
 * @param html HTML content to check
 * @returns True if document is empty
 */
export function isEmptyDocument(html: string): boolean {
  // Remove whitespace and check if there's any content
  const stripped = html.replace(/<[^>]*>/g, '').trim();
  return stripped.length === 0;
}
