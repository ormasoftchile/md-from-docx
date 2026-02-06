/**
 * Contracts for the HTML Preprocessor (FR-001 through FR-004, FR-006)
 * 
 * These interfaces define the public API of the refactored preprocessor.
 * Implementation details are intentionally omitted.
 */

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

/**
 * Preprocesses raw HTML from clipboard or mammoth output.
 * 
 * Contract:
 * - MUST remove all tags listed in config.dangerousTags INCLUDING their content (FR-002)
 * - MUST extract body content when DOCTYPE/html/head wrappers present (FR-003)
 * - MUST remove XML-namespaced elements per config, keeping exceptions (FR-004)
 * - MUST strip Word-specific classes and styles per config (FR-004)
 * - MUST detect double-encoded HTML for ANY valid tag with class/id/style/data-* (FR-006)
 * - MUST NOT alter text content that appears between tags
 * - MUST return warnings for any anomalies (do not throw)
 * 
 * @param html - Raw HTML string
 * @param config - Optional configuration override (defaults used if omitted)
 * @returns PreprocessResult with cleaned HTML and metadata
 */
export type PreprocessHtml = (
  html: string,
  config?: Partial<PreprocessorConfig>
) => PreprocessResult;

/**
 * Default preprocessor configuration values.
 */
export declare const DEFAULT_PREPROCESSOR_CONFIG: PreprocessorConfig;
