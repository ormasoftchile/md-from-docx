/**
 * Image processor for format detection, naming, and buffer handling
 */
import { ImageAsset } from '../types';
import { debug, warn } from '../utils/logging';
import { writeFile, mkdir, exists, joinPath } from '../utils/fileSystem';

/**
 * Result of processing clipboard images.
 */
export interface ProcessedClipboardImages {
  /** Processed image assets ready to write */
  images: ImageAsset[];

  /** Updated HTML with corrected image paths */
  html: string;
}

/**
 * Extracts image format from a data URI.
 * @param dataUri Base64 data URI (e.g., 'data:image/png;base64,...')
 * @returns Format string or 'png' as default
 */
export function getFormatFromDataUri(dataUri: string): string {
  const match = dataUri.match(/^data:image\/([a-z0-9+-]+);/i);
  return match ? match[1].toLowerCase() : 'png';
}

/**
 * Converts a base64 data URI to a Buffer.
 * @param dataUri Base64 data URI
 * @returns Buffer containing image data
 */
export function dataUriToBuffer(dataUri: string): Buffer {
  // Extract base64 data after the comma
  const base64Data = dataUri.split(',')[1];
  if (!base64Data) {
    throw new Error('Invalid data URI: no base64 data found');
  }
  return Buffer.from(base64Data, 'base64');
}

/**
 * Determines the output format for a given input format.
 * @param inputFormat Original image format
 * @returns Web-safe output format
 */
export function normalizeFormat(inputFormat: string): 'png' | 'jpeg' | 'gif' | 'svg' {
  const format = inputFormat.toLowerCase();

  if (format === 'jpg' || format === 'jpeg') {
    return 'jpeg';
  }
  if (format === 'gif') {
    return 'gif';
  }
  if (format === 'svg+xml' || format === 'svg') {
    return 'svg';
  }

  // Convert all other formats (including emf, wmf, bmp, tiff) to PNG
  if (format !== 'png' && format !== 'jpeg' && format !== 'gif') {
    debug(`Converting unsupported format '${format}' to PNG`);
  }

  return 'png';
}

/**
 * Generates a padded index for image filenames.
 * @param index 1-based image index
 * @returns Zero-padded string (e.g., '001', '042')
 */
export function formatImageIndex(index: number): string {
  return index.toString().padStart(3, '0');
}

/**
 * Generates an image filename from a pattern.
 * @param pattern Filename pattern with {index} placeholder
 * @param index 1-based image index
 * @param format Image format (used as extension)
 * @returns Complete filename
 */
export function generateImageFilename(
  pattern: string,
  index: number,
  format: 'png' | 'jpeg' | 'gif' | 'svg'
): string {
  const paddedIndex = formatImageIndex(index);
  const name = pattern.replace('{index}', paddedIndex);
  return `${name}.${format}`;
}

/**
 * Processes clipboard images from data URIs into ImageAssets.
 * @param html HTML content with embedded images
 * @param imageDataUris Array of base64 data URIs
 * @param imagesFolderName Name of the images folder
 * @param imageFileNamePattern Pattern for image filenames
 * @returns Processed images and updated HTML
 */
export function processClipboardImages(
  html: string,
  imageDataUris: string[],
  imagesFolderName: string,
  imageFileNamePattern: string
): ProcessedClipboardImages {
  const images: ImageAsset[] = [];
  let updatedHtml = html;

  imageDataUris.forEach((dataUri, idx) => {
    const index = idx + 1;

    try {
      const originalFormat = getFormatFromDataUri(dataUri);
      const outputFormat = normalizeFormat(originalFormat);
      const buffer = dataUriToBuffer(dataUri);
      const filename = generateImageFilename(imageFileNamePattern, index, outputFormat);
      // URL-encode path segments for markdown compatibility (spaces, unicode, etc.)
      const encodedFolderName = imagesFolderName.split('/').map(encodeURIComponent).join('/');
      const relativePath = `./${encodedFolderName}/${encodeURIComponent(filename)}`;

      images.push({
        buffer,
        originalFormat,
        outputFormat,
        filename,
        relativePath,
      });

      // Replace ALL occurrences of data URI in HTML with relative path
      // (same data URI may appear multiple times in the source HTML)
      updatedHtml = updatedHtml.split(dataUri).join(relativePath);

      debug(`Processed clipboard image ${index}: ${originalFormat} -> ${outputFormat}`);
    } catch (err) {
      warn(`Failed to process clipboard image ${index}:`, err);
    }
  });

  return { images, html: updatedHtml };
}

/**
 * Writes all image assets to disk.
 * @param images Array of ImageAsset to write
 * @param imagesFolderPath Absolute path to the images folder
 */
export async function writeImages(
  images: ImageAsset[],
  imagesFolderPath: string
): Promise<void> {
  if (images.length === 0) {
    debug('No images to write');
    return;
  }

  // Ensure images folder exists
  if (!(await exists(imagesFolderPath))) {
    await mkdir(imagesFolderPath);
    debug(`Created images folder: ${imagesFolderPath}`);
  }

  // Write each image
  for (const image of images) {
    const imagePath = joinPath(imagesFolderPath, image.filename);
    await writeFile(imagePath, image.buffer);
    debug(`Wrote image: ${imagePath}`);
  }

  debug(`Wrote ${images.length} images to ${imagesFolderPath}`);
}

/**
 * Validates image data is not corrupted or empty.
 * @param buffer Image data buffer
 * @returns True if valid, false if corrupted
 */
export function isValidImageBuffer(buffer: Buffer): boolean {
  // Check for minimum size (at least a few bytes for any valid image)
  if (buffer.length < 8) {
    return false;
  }

  // Check for common image signatures
  // PNG: 89 50 4E 47
  // JPEG: FF D8 FF
  // GIF: 47 49 46 38
  const header = buffer.slice(0, 4);

  const isPng = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47;
  const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  const isGif = header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x38;

  return isPng || isJpeg || isGif;
}
