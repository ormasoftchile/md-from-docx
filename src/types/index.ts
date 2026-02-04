/**
 * Core TypeScript interfaces for DOCX to Markdown Converter
 * Based on data-model.md specification
 */

/**
 * The output of any conversion operation (DOCX file or clipboard).
 */
export interface ConversionResult {
  /** The generated Markdown content */
  markdown: string;

  /** Array of extracted images with their data */
  images: ImageAsset[];

  /** Warnings encountered during conversion (non-fatal issues) */
  warnings: string[];
}

/**
 * Represents an extracted image ready to be written to disk.
 */
export interface ImageAsset {
  /** Binary data of the image */
  buffer: Buffer;

  /** Original format from source (e.g., 'png', 'jpeg', 'gif', 'emf', 'wmf') */
  originalFormat: string;

  /** Target format for output file (e.g., 'png', 'jpeg') */
  outputFormat: 'png' | 'jpeg' | 'gif' | 'svg';

  /** Generated filename (e.g., 'image-001.png') */
  filename: string;

  /** Relative path from markdown file to image (e.g., './my-doc_images/image-001.png') */
  relativePath: string;
}

/**
 * User-configurable options controlling conversion behavior.
 */
export interface ConversionOptions {
  /** Strategy for output folder placement */
  outputFolderStrategy: 'sameFolder' | 'subFolder';

  /** Name pattern for images folder (supports {docname} placeholder) */
  imagesFolderName: string;

  /** Pattern for image filenames (supports {index} placeholder) */
  imageFileNamePattern: string;

  /** How to handle existing files */
  overwriteBehavior: 'prompt' | 'overwrite' | 'skip' | 'rename';

  /** Where to put pasted content from clipboard */
  pasteTarget: 'newFile' | 'currentEditor';

  /** Whether to open the file after conversion */
  openAfterConversion: boolean;

  /** Whether to show notifications */
  showNotifications: boolean;
}

/**
 * Represents the input source for conversion.
 */
export type ConversionSource =
  | { type: 'docx'; filePath: string }
  | { type: 'clipboard'; html: string; images: ClipboardImage[] };

/**
 * Image extracted from clipboard content.
 */
export interface ClipboardImage {
  /** Base64-encoded image data (from data URI) */
  dataUri: string;

  /** Original index in the HTML content */
  index: number;
}

/**
 * Data received from the webview after paste operation.
 */
export interface ClipboardPayload {
  /** HTML content from clipboard */
  html: string;

  /** Array of image data URIs extracted from clipboard */
  images: string[];

  /** Whether the paste contained any rich content */
  hasRichContent: boolean;
}

/**
 * Resolved file system paths for output files.
 */
export interface OutputPaths {
  /** Absolute path to the output markdown file */
  markdownPath: string;

  /** Absolute path to the images folder */
  imagesFolderPath: string;

  /** Base directory for relative path calculation */
  baseDir: string;
}

/**
 * Default conversion options matching VS Code settings defaults.
 */
export const DEFAULT_CONVERSION_OPTIONS: ConversionOptions = {
  outputFolderStrategy: 'sameFolder',
  imagesFolderName: '{docname}_images',
  imageFileNamePattern: 'image-{index}',
  overwriteBehavior: 'prompt',
  pasteTarget: 'newFile',
  openAfterConversion: true,
  showNotifications: true,
};
