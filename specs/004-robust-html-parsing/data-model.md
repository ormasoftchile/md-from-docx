# Data Model: Robust HTML Parsing (004)

## Overview

This feature refactors existing interfaces and introduces new internal types for the HTML preprocessing pipeline. No new database entities or persistent data models are created. All types below exist within the TypeScript source at compile-time only.

---

## Existing Types (Unchanged)

These types are already defined in `src/types/index.ts` and remain unchanged:

| Type | Role in this feature |
|------|---------------------|
| `ConversionResult` | Output of the pipeline — `markdown`, `images[]`, `warnings[]`. The `warnings` array gains new entries from the orphan data URI guard (FR-011). |
| `ImageAsset` | Individual extracted image. Unchanged. |
| `ConversionOptions` | User settings. Unchanged. |
| `ClipboardPayload` | Webview ↔ extension message. Unchanged. |

---

## New Internal Types

### PreprocessorConfig

Controls the HTML preprocessing stage. Extracted as a type to make the preprocessor testable in isolation.

```typescript
interface PreprocessorConfig {
  /** Tags to strip completely (tag + content removed) */
  dangerousTags: string[];
  
  /** Tags to unwrap (tag removed, inner content preserved — e.g., <body>) */
  unwrapTags: string[];
  
  /** Wrapper tags to discard entirely including content (e.g., <html>, <head>) */
  discardWrapperTags: string[];
  
  /** XML namespace prefixes to remove (e.g., 'w', 'o') */
  stripNamespacePrefixes: string[];
  
  /** XML namespace prefixes to keep selectively (e.g., 'v' for v:imagedata) */
  keepNamespacedTags: string[];
  
  /** Class name prefixes to strip (e.g., 'Mso') */
  stripClassPrefixes: string[];
  
  /** Style property prefixes to strip (e.g., 'mso-') */
  stripStylePrefixes: string[];
}
```

**Default values:**
- `dangerousTags`: `['script', 'noscript', 'template', 'object', 'embed', 'applet']` (FR-002)
- `unwrapTags`: `['body']` (FR-003 — extract inner content, discard tag)
- `discardWrapperTags`: `['html', 'head']` (FR-003 — discard tag AND content; `<head>` contains styles/metadata)
- `stripNamespacePrefixes`: `['w', 'o']` (FR-004)
- `keepNamespacedTags`: `['v:imagedata']` (FR-004)
- `stripClassPrefixes`: `['Mso']` (FR-004)
- `stripStylePrefixes`: `['mso-']` (FR-004)

---

### PreprocessResult

Output of the preprocessing stage, enabling the pipeline to pass structured data (not just a string) between stages.

```typescript
interface PreprocessResult {
  /** Cleaned HTML string ready for Turndown */
  html: string;
  
  /** Non-fatal issues found during preprocessing */
  warnings: string[];
  
  /** Metadata about what was stripped (for debug logging) */
  stats: {
    tagsRemoved: number;
    attributesStripped: number;
    entitiesDecoded: boolean;
  };
}
```

---

### AnchorGeneratorOptions

Configuration for the heading anchor ID generator, enabling Unicode support (FR-009).

```typescript
interface AnchorGeneratorOptions {
  /** 
   * Regex pattern for characters to KEEP in anchors.
   * Default: /[\p{L}\p{N}\s-]/gu (all Unicode letters, digits, spaces, hyphens)
   */
  allowedChars: RegExp;
}
```

**Relationship to FR-009:** The current `textToAnchor()` uses a hardcoded character class `[^\w\-áéíóúñü]`. The new type makes this configurable and defaults to Unicode-aware `\p{L}`.

---

### HeadingNumberingPattern

Describes the structure used to distinguish genuine outline numbering from version-like strings (FR-010).

```typescript
interface HeadingNumberingPattern {
  /** The raw numeric prefix (e.g., "1.2.3") */
  raw: string;
  
  /** Parsed segments (e.g., [1, 2, 3]) */
  segments: number[];
  
  /** Whether this looks like a genuine outline number (not a version) */
  isOutlineNumber: boolean;
  
  /** The heading text after the number */
  title: string;
}
```

**Validation rules (FR-010):**
- Genuine outline: all segments ≥ 1, ≤ 3 segment depth, no trailing dot
- Version-like: segment containing 0 (e.g., "2.0", "1.0.0"), or > 3 segments

---

### OrphanDataUriResult

Output of the post-processing guard that catches unextracted images (FR-011).

```typescript
interface OrphanDataUriResult {
  /** The cleaned Markdown with placeholders substituted */
  markdown: string;
  
  /** Details of each orphaned image found */
  orphans: Array<{
    /** Character position in original Markdown */
    position: number;
    /** MIME type if detectable (e.g., 'image/png') */
    mimeType: string;
    /** Approximate size in bytes of the data URI */
    approximateSize: number;
  }>;
}
```

---

## Entity Relationships

```
┌──────────────────┐     ┌──────────────────┐
│  Raw HTML Input   │────▶│   Preprocessor    │
│  (string)         │     │  (PreprocessorConfig) │
└──────────────────┘     └────────┬─────────┘
                                  │
                         PreprocessResult
                                  │
                         ┌────────▼─────────┐
                         │   Turndown + Rules │
                         │  (domino parser)   │
                         └────────┬─────────┘
                                  │
                           Raw Markdown
                                  │
                    ┌─────────────┼─────────────┐
                    │             │              │
           ┌───────▼──────┐ ┌───▼────────┐ ┌──▼───────────┐
           │ TOC Fix       │ │ Heading Fix │ │ Orphan Guard  │
           │ (FR-005)      │ │ (FR-010)    │ │ (FR-011)      │
           └───────┬──────┘ └───┬────────┘ └──┬───────────┘
                    │           │              │
                    └─────────┬─┘──────────────┘
                              │
                     ┌────────▼─────────┐
                     │ ConversionResult  │
                     │ (existing type)   │
                     └──────────────────┘
```

---

## State Transitions

No entities in this feature have persistent state. The pipeline is purely functional: input HTML → output Markdown + warnings. All types above are value objects passed through the pipeline.

---

## Validation Rules Summary

| Field/Concept | Rule | Source |
|---------------|------|--------|
| `dangerousTags` content | Must be stripped including inner content | FR-002 |
| Body extraction | Only `<body>` content proceeds | FR-003 |
| Namespace removal | `w:*`, `o:*` fully removed; `v:imagedata` kept | FR-004 |
| TOC link text | Preserved as plain text when link is stripped | FR-005 |
| Entity decoding trigger | Any tag name + `class/id/style/data-*` attribute | FR-006 |
| Table column count | All rows padded to max column count | FR-008 |
| Anchor characters | All Unicode `\p{L}` letters retained | FR-009 |
| Outline number | Segments ≥1, ≤3 depth, no trailing dot | FR-010 |
| Orphan data URI threshold | Image src > 100 chars containing `data:image/` | FR-011 |
