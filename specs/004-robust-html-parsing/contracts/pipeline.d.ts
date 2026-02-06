/**
 * Contracts for the full HTML→Markdown pipeline and supporting functions
 * (FR-005, FR-007–FR-013)
 * 
 * These interfaces define the public API of refactored pipeline components.
 */

// ─── Anchor Generator (FR-009) ──────────────────────────────────────────────

/**
 * Configuration for heading anchor ID generation.
 */
export interface AnchorGeneratorOptions {
  /**
   * Regex for characters to KEEP in anchor IDs.
   * Default: /[\p{L}\p{N}\s-]/gu — all Unicode letters, digits, spaces, hyphens.
   * Spaces are converted to hyphens after filtering.
   */
  allowedChars: RegExp;
}

/**
 * Converts heading text to a GitHub-style anchor ID.
 * 
 * Contract:
 * - MUST lowercase the entire output
 * - MUST replace whitespace with hyphens
 * - MUST preserve all Unicode letter characters (\p{L}) by default (FR-009)
 * - MUST collapse consecutive hyphens
 * - MUST trim leading/trailing hyphens
 * 
 * @param text - Heading text
 * @param options - Optional override for allowed characters
 * @returns Anchor ID string
 */
export type TextToAnchor = (
  text: string,
  options?: Partial<AnchorGeneratorOptions>
) => string;

// ─── Heading Level Detection (FR-010) ────────────────────────────────────────

/**
 * Parsed heading numbering pattern.
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
 * Detects and adjusts heading levels based on outline numbering.
 * 
 * Contract:
 * - MUST treat "N.N.N text" as outline numbering when: segments ≥1, depth ≤3, no trailing dot
 * - MUST NOT treat version patterns as outline numbers (any segment = 0, or > 3 segments)
 * - MUST NOT modify headings without leading number patterns
 * - "# 1.1 Background" → "## 1.1 Background" (depth 2)
 * - "# Version 2.1.0 Release" → unchanged (version, not outline)
 * 
 * @param markdown - Full Markdown content with headings
 * @returns Markdown with corrected heading levels
 */
export type FixHeadingLevelsFromNumbering = (markdown: string) => string;

// ─── TOC Link Handling (FR-005) ──────────────────────────────────────────────

/**
 * Removes Word-style TOC anchor links while preserving visible text.
 * 
 * Contract:
 * - MUST match links with anchors starting with `#_Toc` or `#_heading`
 * - MUST preserve the link text as plain text in the output (FR-005)
 * - MUST NOT remove non-TOC internal links
 * - "[1.1 Introduction](#_Toc123456)" → "1.1 Introduction"
 * 
 * @param markdown - Markdown content with TOC links
 * @returns Markdown with TOC links replaced by their text
 */
export type FixTocLinks = (markdown: string) => string;

// ─── Fallback Table Converter (FR-007, FR-008) ──────────────────────────────

/**
 * Converts an HTML table to GFM Markdown when Turndown's built-in converter fails.
 * 
 * Contract:
 * - MUST preserve text content within formatted cells (bold, links, code) (FR-007)
 * - MUST normalize column counts — pad shorter rows with empty cells (FR-008)
 * - MUST produce valid GFM table syntax (header, separator, body rows)
 * - MUST handle colspan by spanning extra columns with repeated content or empty cells
 * - MUST return the original HTML unchanged if no rows can be parsed
 * 
 * @param tableHtml - HTML string of a `<table>` element
 * @returns GFM Markdown table string
 */
export type ConvertHtmlTableToMarkdown = (tableHtml: string) => string;

// ─── Orphan Data URI Guard (FR-011) ─────────────────────────────────────────

/**
 * Result of orphan data URI detection.
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
 * Detects orphaned data:image/* URIs in Markdown image references and replaces
 * them with a placeholder.
 * 
 * Contract:
 * - MUST detect `![...](data:image/...)` where the src is > 100 characters (FR-011)
 * - MUST replace with `![alt](image-not-extracted)` preserving original alt text
 * - MUST log a warning for each orphaned URI found
 * - MUST NOT modify short data URIs (≤ 100 chars) — these may be intentional small icons
 * 
 * @param markdown - Markdown content to scan
 * @returns OrphanDataUriResult with cleaned Markdown and orphan details
 */
export type DetectOrphanDataUris = (markdown: string) => OrphanDataUriResult;

// ─── Main Pipeline (updated signature) ──────────────────────────────────────

/**
 * Converts HTML to Markdown using the full pipeline:
 * 1. Preprocessing (string cleaning + entity decoding)
 * 2. Turndown conversion (domino DOM parse + rule traversal)
 * 3. Post-processing (TOC links, heading levels, orphan guard, whitespace)
 * 
 * Contract:
 * - MUST accept any HTML string including empty, malformed, or huge inputs
 * - MUST return empty string for empty/whitespace input (no error)
 * - MUST never throw — return warnings in ConversionResult instead
 * - Output MUST contain zero `<script>`, `<noscript>`, `<template>`, `<object>`,
 *   `<embed>`, or `<applet>` tags or their content
 * - Output MUST contain zero orphaned data URIs > 100 chars
 * 
 * @param html - Raw HTML content
 * @returns Clean Markdown string
 */
export type HtmlToMarkdown = (html: string) => string;
