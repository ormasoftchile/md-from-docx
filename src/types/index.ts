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

// ─── Preprocessor Types (004-robust-html-parsing) ───────────────────────────

/**
 * Configuration for the HTML preprocessor.
 * All fields have sensible defaults; override only when testing.
 */
export interface PreprocessorConfig {
  /** Tags to strip completely — tag + all content removed (FR-002) */
  dangerousTags: string[];

  /** Tags to unwrap — tag removed, inner content preserved, e.g., <body> (FR-003) */
  unwrapTags: string[];

  /** Wrapper tags to discard entirely including content, e.g., <html>, <head> (FR-003) */
  discardWrapperTags: string[];

  /** XML namespace prefixes to remove entirely: 'w', 'o' (FR-004) */
  stripNamespacePrefixes: string[];

  /** Specific namespaced tags to KEEP despite prefix match: 'v:imagedata' (FR-004) */
  keepNamespacedTags: string[];

  /** Class name prefixes to strip: 'Mso' (FR-004) */
  stripClassPrefixes: string[];

  /** Style property prefixes to strip: 'mso-' (FR-004) */
  stripStylePrefixes: string[];
}

/**
 * Result of HTML preprocessing.
 */
export interface PreprocessResult {
  /** Cleaned HTML string ready for Turndown conversion */
  html: string;

  /** Non-fatal issues encountered during preprocessing */
  warnings: string[];

  /** Statistics about the preprocessing pass (for debug logging) */
  stats: {
    /** Number of HTML elements removed */
    tagsRemoved: number;
    /** Number of attributes stripped */
    attributesStripped: number;
    /** Whether double-encoded entities were detected and decoded (FR-006) */
    entitiesDecoded: boolean;
  };
}

// ─── Pipeline Types (004-robust-html-parsing) ────────────────────────────────

/**
 * Configuration for heading anchor ID generation (FR-009).
 */
export interface AnchorGeneratorOptions {
  /**
   * Regex for characters to KEEP in anchor IDs.
   * Default: /[\p{L}\p{N}\s-]/gu — all Unicode letters, digits, spaces, hyphens.
   */
  allowedChars: RegExp;
}

/**
 * Parsed heading numbering pattern (FR-010).
 */
export interface HeadingNumberingPattern {
  /** Raw numeric prefix (e.g., "1.2.3") */
  raw: string;
  /** Parsed numeric segments (e.g., [1, 2, 3]) */
  segments: number[];
  /** true if this is genuine outline numbering, false if version-like */
  isOutlineNumber: boolean;
  /** Heading text after the number */
  title: string;
}

/**
 * Result of orphan data URI detection (FR-011).
 */
export interface OrphanDataUriResult {
  /** Cleaned Markdown with orphaned data URIs replaced by placeholders */
  markdown: string;
  /** Details of each orphaned data URI found */
  orphans: Array<{
    /** Character position in original Markdown */
    position: number;
    /** MIME type (e.g., 'image/png') */
    mimeType: string;
    /** Approximate byte size of the data URI */
    approximateSize: number;
  }>;
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
