# Robust Parsing Improvement Plan

**Date**: February 6, 2026  
**Status**: Proposed  
**Scope**: Replace regex-based HTML parsing with DOM-based approach + fix specific parsing gaps

---

## Problem Statement

The HTML-to-Markdown conversion pipeline in `htmlToMarkdown.ts` relies on **~30+ regex patterns** to strip, transform, and sanitize HTML before and after Turndown processing. This approach is inherently fragile for HTML manipulation and has produced a steady stream of edge-case bugs — particularly with clipboard content from Word Online, Loop, and Teams.

Regex cannot reliably handle nested tags, malformed markup, attribute variations, or escaped content. Each fix introduces new regressions, creating an "unending" bug cycle.

---

## Proposed Solution: DOM-Based Preprocessing

### Core Change

Replace regex-based HTML manipulation with **`cheerio`** (built on `htmlparser2`), a lightweight Node.js DOM parser designed for server-side HTML manipulation.

### Why Cheerio

| Library | Bundle Size | esbuild | Notes |
|---|---|---|---|
| **`cheerio`** | ~200 KB | ✅ | Battle-tested, jQuery-like API, handles malformed HTML |
| `linkedom` | ~80 KB | ✅ | W3C-like DOM API, lighter but less mature |
| `htmlparser2` | ~30 KB | ✅ | Low-level SAX parser, no manipulation sugar |
| ~~`jsdom`~~ | ~5 MB+ | ❌ | Too heavy for a VS Code extension |

- Turndown already bundles `@mixmark-io/domino` (a DOM parser) internally — a DOM parser is already in the dependency tree
- `mammoth` is ~1 MB bundled; adding ~200 KB for cheerio is negligible
- Bundles cleanly with the existing esbuild config (`--platform=node --format=cjs`)
- Handles malformed HTML gracefully — critical for Word's messy output

### VS Code Extension Constraints

- Extensions run in **Node.js** (no browser DOM available) — hence the need for a library
- The webview (`clipboard.html`) runs in **Chromium** and has native `DOMParser` — no extra dependency needed there
- No esbuild or bundling issues with cheerio under `--platform=node`

---

## Improvement Items

### 🔴 Critical

#### 1. Replace regex preprocessing with cheerio DOM operations

**File**: `src/conversion/htmlToMarkdown.ts` — `preprocessHtml()` function

**Current** (~40 regex patterns):
```ts
cleaned = cleaned.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
cleaned = cleaned.replace(/<meta[^>]*>/gi, '');
// ... 30+ more regex patterns
```

**Proposed** (DOM operations):
```ts
import * as cheerio from 'cheerio';

function preprocessHtml(html: string): string {
  const $ = cheerio.load(html);

  // Remove non-content elements
  $('head, style, script, noscript, meta, link, template, object, embed, applet').remove();

  // Remove XML processing instructions and namespace declarations
  // (cheerio handles these during parsing)

  // Remove Word-specific XML namespaced elements
  $('*').filter((_, el) => {
    const tagName = (el as cheerio.TagElement).tagName || '';
    return /^(w|o|v):/.test(tagName) && tagName !== 'v:imagedata';
  }).remove();

  // Strip Word-specific classes and styles
  $('[class*="Mso"]').removeAttr('class');
  $('[style*="mso-"]').removeAttr('style');

  // Clean up empty attributes
  $('[style=""]').removeAttr('style');
  $('[class=""]').removeAttr('class');

  return $.html('body') || $.html();
}
```

**Impact**: Eliminates ~80% of regex parsing bugs. Handles nesting, malformed markup, and attribute edge cases automatically.

---

### 🟠 High

#### 2. Strip `<script>` and other dangerous/irrelevant tags

**File**: `src/conversion/htmlToMarkdown.ts` — `preprocessHtml()`

**Problem**: `<style>` tags are removed but `<script>`, `<noscript>`, `<template>`, `<object>`, `<embed>`, and `<applet>` tags are not. Clipboard HTML from web-based editors (Loop, Teams, Outlook) can include these.

**Fix**: Add to the DOM removal list (trivial with cheerio, see #1 above). If staying with regex:
```ts
cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
cleaned = cleaned.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
cleaned = cleaned.replace(/<template[^>]*>[\s\S]*?<\/template>/gi, '');
cleaned = cleaned.replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '');
cleaned = cleaned.replace(/<embed[^>]*\/?>/gi, '');
cleaned = cleaned.replace(/<applet[^>]*>[\s\S]*?<\/applet>/gi, '');
```

---

#### 3. Fix TOC link stripping — preserve link text

**File**: `src/conversion/htmlToMarkdown.ts` — post-processing (~line 331)

**Problem**: Current regex removes both the link AND its text:
```ts
// CURRENT — removes "1.1 Introduction" entirely
markdown = markdown.replace(/\[([^\]]+)\]\(#_[^)]+\)/g, '');
```

**Fix**: Keep the link text, remove only the link syntax:
```ts
// FIXED — keeps the text, removes the broken anchor
markdown = markdown.replace(/\[([^\]]+)\]\(#_[^)]+\)/g, '$1');
```

---

#### 4. Broaden the HTML entity-decoding heuristic

**File**: `src/conversion/htmlToMarkdown.ts` — entity decoding (~line 294)

**Problem**: The heuristic only triggers for a hardcoded list of tag names (`div|span|style|table|ul|ol|details`). If Loop/Teams uses `<section>`, `<article>`, `<nav>`, `<header>`, `<footer>`, `<figure>`, etc., the double-encoded HTML won't be decoded.

**Fix**: Broaden the detection pattern:
```ts
// CURRENT — misses many tags
if (/&lt;(div|span|style|table|ul|ol|details)\s+(class|id|style)=&quot;/i.test(normalizedHtml))

// FIXED — detect any HTML-like escaped tag with attributes
if (/&lt;[a-z][a-z0-9-]*\s+(class|id|style|data-)=&quot;/i.test(normalizedHtml))
```

---

#### 5. Use DOM parser for fallback table conversion

**File**: `src/conversion/htmlToMarkdown.ts` — `convertHtmlTableToMarkdown()`

**Problem**: The fallback table converter strips **all** HTML from cell content via `cell.replace(/<[^>]+>/g, '')`, meaning cells containing images, links, bold text, or other formatting lose their content entirely.

**Fix** (with cheerio):
```ts
function convertHtmlTableToMarkdown(tableHtml: string): string {
  const $ = cheerio.load(tableHtml);
  const rows = $('tr');
  // Process cells using DOM, preserving inner text properly
  // ...
}
```

---

### 🟡 Medium

#### 6. Add post-processing guard for orphaned `data:` URIs

**File**: `src/conversion/htmlToMarkdown.ts` — post-processing

**Problem**: If a data URI image isn't replaced during clipboard processing (regex mismatch in webview), it passes through to the final Markdown as a massive base64 string, producing bloated output.

**Fix**: Add a post-processing check:
```ts
// Warn about and optionally strip orphaned data URIs
markdown = markdown.replace(
  /!\[([^\]]*)\]\(data:image\/[^)]{100,}\)/g,
  (match, alt) => {
    warn(`Replacing orphaned data URI image (alt="${alt}") with placeholder`);
    return `![${alt}](image-not-extracted)`;
  }
);
```

---

#### 7. Use native DOMParser in the webview for SVG/image extraction

**File**: `media/clipboard.html`

**Problem**: SVG extraction uses regex (`/<svg[^>]*>[\s\S]*?<\/svg>/gi`) which fails on nested `<svg>` elements. Image extraction similarly uses regex.

**Fix**: The webview runs in Chromium — use native `DOMParser`:
```js
const parser = new DOMParser();
const doc = parser.parseFromString(capturedHtml, 'text/html');

// Extract SVGs properly
const svgs = doc.querySelectorAll('svg');
svgs.forEach((svg, idx) => {
  if (svg.outerHTML.length > 3000) {
    // Convert to data URI...
  }
});

// Extract images
const imgs = doc.querySelectorAll('img[src^="data:image"]');
```

---

#### 8. Fix `textToAnchor()` to support full Unicode

**File**: `src/conversion/htmlToMarkdown.ts` — `textToAnchor()` (~line 203)

**Problem**: Only Spanish accented characters are preserved: `[^\w\-áéíóúñü]`. French (ç, ê, ë), German (ä, ö, ü, ß), Portuguese (ã, õ), and all other Unicode letters are dropped, producing broken anchor links.

**Fix**: Use Unicode property escapes:
```ts
function textToAnchor(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}\w\-]/gu, '')  // Keep ALL Unicode letters and numbers
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '');
}
```

---

#### 9. Fix heading number detection to avoid false matches

**File**: `src/conversion/htmlToMarkdown.ts` — `fixHeadingLevelsFromNumbering()`

**Problem**: Headings like `# Version 2.1.0 Release` or `## 2.0 Summary` are incorrectly matched as numbered outlines. The pattern `^([\d.]+)\s+` matches too broadly.

**Fix**: Require the numbering to be a clean outline pattern (no trailing dot, no `.0` segments):
```ts
// CURRENT — matches "2.1.0" as depth 3, "10" as depth 1
const numberMatch = headingText.match(/^([\d.]+)\s+(.+)$/);

// FIXED — require outline-style numbering (1, 1.1, 1.2.3, not 2.0 or 2.1.0)
const numberMatch = headingText.match(/^(\d+(?:\.\d+)*)\s+(.+)$/);
// Additional validation: reject version-like numbers
if (numberMatch) {
  const parts = numberMatch[1].split('.');
  const looksLikeVersion = parts.length >= 3 || parts.some(p => p === '0');
  if (looksLikeVersion) numberMatch = null;
}
```

---

### 🟢 Low

#### 10. Strip `<!DOCTYPE>` and `<html>` wrappers in preprocessing

**File**: `src/conversion/htmlToMarkdown.ts` — `preprocessHtml()`

**Problem**: `<head>` is removed but `<!DOCTYPE html>` and `<html lang="...">` wrappers remain. These can affect Turndown's parsing behavior.

**Fix** (cheerio handles this automatically via `$.html('body')`). If regex:
```ts
cleaned = cleaned.replace(/<!DOCTYPE[^>]*>/gi, '');
cleaned = cleaned.replace(/<\/?html[^>]*>/gi, '');
```

---

#### 11. Remove debug logging from production webview

**File**: `media/clipboard.html`

**Problem**: The convert button handler contains extensive `console.log` statements for debugging metric cards and SVGs. These ship in the production extension.

**Fix**: Remove or gate behind a debug flag:
```js
const DEBUG = false;
function debugLog(...args) { if (DEBUG) console.log(...args); }
```

---

#### 12. Handle empty/mismatched column counts in fallback table conversion

**File**: `src/conversion/htmlToMarkdown.ts` — `convertHtmlTableToMarkdown()`

**Problem**: Tables with colspan/rowspan produce rows with different cell counts, resulting in invalid GFM. Empty cells produce `|  |` entries.

**Fix**: Normalize all rows to the same column count:
```ts
const maxCols = Math.max(...markdownRows.map(row => (row.match(/\|/g) || []).length - 1));
// Pad rows with fewer columns
```

---

## Implementation Order

| Phase | Items | Effort | Impact |
|---|---|---|---|
| **Phase 1** — Quick wins | #2 (script tags), #3 (TOC text), #10 (DOCTYPE), #11 (debug logs) | ~1 hour | Fixes active bugs |
| **Phase 2** — Core refactor | #1 (cheerio preprocessing), #5 (DOM table conversion) | ~4 hours | Eliminates root cause |
| **Phase 3** — Heuristic fixes | #4 (entity decoding), #8 (Unicode anchors), #9 (heading numbers) | ~2 hours | Fixes edge cases |
| **Phase 4** — Webview & guards | #6 (data URI guard), #7 (native DOMParser in webview), #12 (table columns) | ~2 hours | Prevents regressions |

**Total estimated effort**: ~9 hours across 4 phases.

---

## Dependencies

```
npm install cheerio
npm install -D @types/cheerio
```

No changes needed to esbuild config — cheerio bundles cleanly under `--platform=node --format=cjs`.

---

## Testing Strategy

- Re-run existing regression tests (`npm run test:regression`) after each phase
- Add specific test cases for:
  - `<script>` tag stripping
  - TOC link text preservation
  - Double-encoded HTML from Loop/Teams with various tag types
  - Tables with formatted cell content (bold, links, images)
  - Orphaned data URIs
  - Non-Spanish Unicode in heading anchors
  - Version numbers in headings (should NOT be treated as outline numbering)
- The existing DOCX fixtures in `test/docx/` provide real-world regression coverage
