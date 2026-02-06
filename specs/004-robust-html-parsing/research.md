# Research: Robust HTML Parsing (004)

## R-001: cheerio/slim + esbuild Compatibility

**Decision:** cheerio/slim is viable but **not needed** — use string-based preprocessing + Turndown internals instead.

**Rationale:**
- cheerio/slim bundles cleanly with esbuild (zero warnings, no config changes)
- Import as `import * as cheerio from 'cheerio/slim'` to avoid `undici`/`iconv-lite`
- Bundle delta: +279 KB (current 1,693 KB → 1,971 KB) — **exceeds SC-007 <250 KB limit**
- `@types/cheerio` deprecated; types are built-in to `cheerio/slim`
- However, research R-002 found that cheerio is unnecessary (see below)

**Alternatives Considered:**
| Option | Bundle Impact | Notes |
|--------|-------------|-------|
| `cheerio` (full) | +1.8 MB | Pulls undici, iconv-lite — too heavy |
| `cheerio/slim` | +279 KB | Viable but exceeds SC-007 by ~29 KB |
| `htmlparser2` standalone | ~100 KB | Lower-level, no jQuery API |
| No new dependency | 0 KB | ✅ **Selected** — leverage Turndown's domino |

---

## R-002: Turndown Internal DOM Parser (domino)

**Decision:** Leverage Turndown's built-in `@mixmark-io/domino` parser rather than adding a new dependency.

**Rationale:**
- Turndown already bundles `@mixmark-io/domino` — a full HTML5 browser-grade parser
- domino implements the HTML5 adoption agency algorithm (handles unclosed/overlapping tags correctly)
- Used by Wikimedia's Parsoid (Wikipedia rendering) — battle-tested with messy HTML
- **Turndown accepts DOM nodes directly** via `turndownService.turndown(domNode)` — nodes must implement standard DOM API (`.cloneNode()`, `.childNodes`, `.nodeName`, `.getAttribute()`)
- cheerio nodes are **NOT** DOM-compatible and cannot be passed directly to Turndown
- No pre-processing hook exists in Turndown's plugin API — rules operate per-node during traversal only

**Architecture Implication:**
The optimal pipeline is:
1. mammoth produces HTML string
2. **String-based preprocessing** cleans Word artifacts (empty spans, `mso-*` styles, `<o:p>`, namespaced tags)
3. Cleaned HTML string → `turndownService.turndown(cleanedString)` (domino parses internally)
4. Turndown custom rules (`addRule()`) handle element-level conversion
5. Turndown `remove()` strips `<style>`, `<meta>`, etc.
6. Post-processing on the Markdown string (entity decoding, whitespace normalization)

This means **our preprocessing stays string-based** but must be done with proper techniques (not fragile regex for structural operations).

---

## R-003: cheerio XML Namespace Handling

**Decision:** Document for reference only — cheerio not selected as dependency.

**Findings:**
- In default mode (parse5), namespaced tags like `<w:table>`, `<o:p>` are preserved but may be reparented
- In XML mode (`{ xml: true }`), tags are preserved in place with case
- CSS selectors require escaped colons: `$('w\\:table')`, `$('o\\:p')`
- The `.filter()` approach is more reliable: `$('*').filter((_, el) => /^(w|o):/.test(el.name))`
- Pipe syntax (`w|table`) is NOT supported by cheerio's `css-select`

**Impact on Design:**
Since we're using string-based preprocessing (not cheerio), Word namespace removal continues via regex — but these regexes are **safe** because:
- Namespaced tags like `<o:p>`, `<w:*>`, `<v:*>` have unique prefixes that don't appear in valid HTML
- Tag-level removal regex (matching a specific tag name) is far less fragile than structural HTML regex
- This is explicitly scoped in the spec (FR-001, FR-002)

---

## R-004: Webview DOMParser for Clipboard Parsing

**Decision:** Use native `DOMParser` in the webview to replace all clipboard HTML regex parsing.

**Rationale:**
- VS Code webviews run in Chromium — full `DOMParser` API is available
- `DOMParser.parseFromString(html, 'text/html')` creates an inert, off-screen Document
- **Zero CSP impact** — DOMParser doesn't execute scripts, load resources, or touch the live DOM
- Current CSP (`default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'`) requires no changes
- Returns a full `Document` with `<html>`, `<head>`, `<body>` — ideal for Word clipboard HTML which is a complete document

**Key Selectors Available:**
```
doc.querySelectorAll('img[src^="data:image/"]')   // data URI images
doc.querySelectorAll('svg')                         // SVG elements (handles nesting)
doc.querySelectorAll('v\\:imagedata[src^="data:"]') // VML images
```

**Alternatives Considered:**
| Option | Notes |
|--------|-------|
| `DOMParser` | ✅ Native, zero-cost, robust, handles complete documents |
| `document.createElement('template')` | Fragments only — clipboard HTML is complete documents |
| Keep regex | Fragile — fails on nested SVGs, attribute variations, malformed HTML |

---

## R-005: Preprocessing Strategy — Regex Safety Boundaries

**Decision:** Categorize existing regex operations by safety level; replace only the unsafe ones.

**Rationale:**
Research into the existing codebase reveals that not all regex operations are equally fragile. Some are provably safe, others are structural and dangerous:

### Safe Regex Operations (KEEP)
| Pattern | Why Safe |
|---------|----------|
| Remove `<o:p>` tags | Unique namespace prefix, never in valid HTML |
| Remove `<w:*>` tags | Unique namespace prefix, never in valid HTML |
| Strip `style="mso-*"` attributes | Word-specific attribute values |
| Strip `class="Mso*"` attributes | Word-specific class prefix |
| HTML entity decode (`&amp;` → `&`) | Character-level substitution, no structural risk |

### Unsafe Regex Operations (REPLACE)
| Pattern | Why Unsafe |
|---------|-----------|
| Strip tags between arbitrary tags | Can't handle nesting or attributes |
| Extract content from `<td>` / `<th>` | Fails on nested tables |
| TOC link stripping (`<a href="#_Toc">`) | Accidentally deletes visible link text |
| Entity detection by counting tags | Heuristic based on 7 hardcoded tag names |
| Heading detection from list numbering | False-matches version numbers ("1.0.0") |
| Table fallback converter (strips all inner HTML) | Destroys cell formatting/links |

**Architecture Implication:**
The preprocessing function should be split into:
1. **String-level cleaning** (safe regexes) — runs BEFORE Turndown parsing
2. **Turndown rules** — handles structural element conversion DURING tree traversal
3. **Markdown post-processing** — runs AFTER Turndown on the output string

---

## Summary: Architectural Decisions

| # | Decision | Impact |
|---|----------|--------|
| AD-1 | No new runtime dependency (no cheerio) | Bundle stays at 1,693 KB (SC-007 satisfied) |
| AD-2 | String-based preprocessing for safe cleanup | Minimal refactoring risk |
| AD-3 | Leverage Turndown's domino parser for structural work | Zero dependency cost |
| AD-4 | Turndown instances for cell-level structural work | Fallback table converter uses lightweight Turndown instance for cell HTML→Markdown (FR-007) |
| AD-5 | Native DOMParser in webview for clipboard | Zero dependency cost |
| AD-6 | Split unsafe regex into Turndown instances + post-processing | Fixes root cause bugs |
