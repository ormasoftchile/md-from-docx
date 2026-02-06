# Feature Specification: Robust HTML Parsing

**Feature Branch**: `004-robust-html-parsing`  
**Created**: February 6, 2026  
**Status**: Draft  
**Input**: User description: "Replace regex-based HTML parsing with DOM-based approach using cheerio, fix script tag leakage, TOC link text loss, entity decoding gaps, Unicode anchor issues, and other parsing fragilities in the DOCX-to-Markdown conversion pipeline"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reliable Conversion of Word Online Clipboard Content (Priority: P1)

A user copies content from Word Online, Loop, or Teams and pastes it into the extension's clipboard capture panel. The HTML contains malformed markup, deeply nested tags, script blocks, and Word-specific namespace elements. The conversion produces clean Markdown without leftover HTML tags, script content, or garbled formatting.

**Why this priority**: This is the core user-facing workflow. Every paste operation exercises the HTML preprocessing pipeline. Fragile regex parsing here causes the most visible and frequent bugs.

**Independent Test**: Can be tested by pasting complex Word Online content and verifying the Markdown output contains no raw HTML tags, script content, or Word artifacts.

**Acceptance Scenarios**:

1. **Given** HTML containing `<script>`, `<noscript>`, `<template>`, `<object>`, or `<embed>` tags, **When** the user converts it to Markdown, **Then** none of those tags or their content appear in the output.
2. **Given** HTML with deeply nested `<div>` and `<span>` elements containing Word-specific `Mso*` classes and `mso-*` styles, **When** the user converts it, **Then** all Word-specific styling is removed while text content is fully preserved.
3. **Given** HTML with malformed markup (unclosed tags, mismatched nesting), **When** the user converts it, **Then** the conversion completes without error and text content is preserved without duplication or loss.
4. **Given** HTML containing `<!DOCTYPE>`, `<html>`, and `<head>` wrappers around the actual body content, **When** the user converts it, **Then** only the body content is processed and converted.

---

### User Story 2 - Table Content Preservation (Priority: P1)

A user converts a Word document containing tables with formatted cell content (bold text, links, images). The Markdown output contains properly formatted GFM tables with inner formatting preserved, and all rows have consistent column counts.

**Why this priority**: Tables are one of the most common document elements. The current fallback table converter strips all inner formatting, causing data loss for any table with rich content.

**Independent Test**: Can be tested by converting a DOCX with a table containing bold, links, and images in cells, then verifying the GFM output preserves that content.

**Acceptance Scenarios**:

1. **Given** an HTML table with cells containing bold text, links, and inline code, **When** converted to Markdown, **Then** the GFM table preserves the formatting within cells.
2. **Given** an HTML table with colspan or rowspan attributes, **When** converted to Markdown, **Then** the output has consistent column counts across all rows (padded as needed) and does not produce invalid GFM.
3. **Given** an HTML table that Turndown fails to convert (falling back to the custom converter), **When** the fallback converter runs, **Then** cell text content is fully preserved including any nested element text.

---

### User Story 3 - TOC and Heading Fidelity (Priority: P2)

A user converts a Word document containing a table of contents with `#_Toc` anchors and numbered outline headings (1, 1.1, 1.1.1). The TOC link text is preserved in the output (not silently deleted), and heading levels correctly reflect the document's outline structure without misinterpreting version numbers.

**Why this priority**: TOC text removal causes silent content loss that users may not notice. Heading level misinterpretation changes the document's visual structure.

**Independent Test**: Can be tested by converting a DOCX with a TOC and numbered headings, verifying TOC text appears as plain text and heading levels match the numbering depth.

**Acceptance Scenarios**:

1. **Given** Markdown containing TOC links like `[1.1 Introduction](#_Toc123456)`, **When** the post-processing runs, **Then** the text "1.1 Introduction" is kept in the output and only the broken anchor link syntax is removed.
2. **Given** a heading like `# 1.1 Background`, **When** heading levels are adjusted, **Then** it becomes `## 1.1 Background` (depth 2 from the numbering).
3. **Given** a heading like `# Version 2.1.0 Release`, **When** heading levels are processed, **Then** it is NOT reinterpreted as depth 3 — it remains `# Version 2.1.0 Release`.

---

### User Story 4 - Loop/Teams Double-Encoded Content (Priority: P2)

A user pastes content from Microsoft Loop or Teams that contains double-encoded HTML entities (HTML tags encoded as `&lt;div class=&quot;...&quot;&gt;`). The extension detects and decodes these entities regardless of which HTML tag names are used.

**Why this priority**: Loop/Teams is a growing source of clipboard content. The current entity-decoding heuristic only triggers for a specific hardcoded list of tag names, silently failing for many valid HTML tags.

**Independent Test**: Can be tested by providing HTML with double-encoded tags using `<section>`, `<article>`, `<figure>`, or other non-hardcoded tags, verifying they are decoded and converted.

**Acceptance Scenarios**:

1. **Given** HTML containing `&lt;section class=&quot;content&quot;&gt;text&lt;/section&gt;`, **When** the entity-decoding heuristic runs, **Then** it detects and decodes the escaped HTML tags.
2. **Given** HTML containing `&lt;figure data-id=&quot;123&quot;&gt;`, **When** the heuristic runs, **Then** the `data-*` attribute pattern triggers decoding.
3. **Given** HTML containing normal entities like `&lt;tag&gt;` in literal text (not double-encoded markup), **When** the heuristic runs, **Then** the literal text is NOT incorrectly decoded.

---

### User Story 5 - International Heading Anchors (Priority: P3)

A user converts a document written in French, German, Portuguese, or another non-English/non-Spanish language. Heading text containing accented characters (ç, ê, ä, ö, ü, ß, ã, etc.) produces correct anchor IDs that work as link targets in Markdown.

**Why this priority**: The extension already supports Spanish accented characters. Extending this to full Unicode is a consistency and internationalization improvement.

**Independent Test**: Can be tested by generating anchor IDs from headings with French, German, and Portuguese characters, then verifying the anchors retain those characters.

**Acceptance Scenarios**:

1. **Given** a heading "Développement de l'application", **When** an anchor is generated, **Then** the anchor contains "développement" (not "dveloppement").
2. **Given** a heading "Einführung und Überblick", **When** an anchor is generated, **Then** the anchor contains "einführung-und-überblick".
3. **Given** a heading with mixed CJK and Latin characters, **When** an anchor is generated, **Then** all Unicode letters are preserved in the anchor.

---

### User Story 6 - Webview Image Extraction Robustness (Priority: P3)

A user pastes content containing SVG diagrams and embedded images from Loop/Teams. The webview correctly extracts SVGs (including nested SVGs) and image data URIs using DOM-based methods. Any images that fail extraction are handled gracefully with placeholders rather than leaking base64 data into the Markdown.

**Why this priority**: SVG/image extraction failures currently result in either missing images or bloated Markdown output with embedded base64 strings. Using the webview's native DOMParser eliminates regex parsing bugs.

**Independent Test**: Can be tested by pasting HTML with nested SVGs and verifying they are extracted as images without regex mismatches, and any unextracted data URIs are caught by the post-processing guard.

**Acceptance Scenarios**:

1. **Given** HTML containing nested `<svg>` elements, **When** the webview extracts SVGs, **Then** each top-level SVG is correctly identified and extracted without truncating at inner `</svg>` tags.
2. **Given** a clipboard paste where an image data URI fails to be replaced, **When** the final Markdown is produced, **Then** the orphaned data URI is replaced with a placeholder `![alt](image-not-extracted)` and a warning is logged.
3. **Given** debug logging statements in the webview, **When** the extension is shipped, **Then** no debug console.log output is produced during normal operation.

---

### Edge Cases

- What happens when the HTML input is completely empty or contains only whitespace? → Returns empty string, no error.
- What happens when HTML contains only `<script>` tags and no visible content? → All script tags are stripped, resulting in empty output.
- What happens when a table has cells with nested tables? → Inner table content is flattened into the cell text.
- What happens when the iframe `srcdoc` attribute contains single quotes or escaped quotes? → The DOM parser handles attribute parsing correctly, including edge cases that trip up pattern-based approaches.
- What happens when heading text starts with a decimal number like "3.14159 Pi Approximation"? → Not treated as outline numbering due to validation (too many decimal places or zero segments).
- What happens when HTML is >1 MB in size? → The DOM parser handles large documents; conversion completes within reasonable time.

### Out of Scope

- Refactoring Turndown custom rules (headings, images, superscript, subscript, paragraph, etc.)
- Refactoring iframe/srcdoc extraction logic
- Refactoring Loop-specific card conversions (metric-card, insight-card, TL;DR container handling)
- Full HTML sanitization for XSS (event handler attributes, `javascript:` URIs) — deferred to a dedicated security feature

## Clarifications

### Session 2026-02-06

- Q: Should the preprocessor strip XSS vectors beyond `<script>` tags (e.g., `onclick` attributes, `javascript:` URIs) for both conversion output and webview preview? → A: Keep current scope — strip dangerous tags for conversion output only. Webview CSP is the mitigation for preview. Full HTML sanitization is deferred to a separate security feature.
- Q: What is explicitly out of scope to prevent scope creep during implementation? → A: Turndown custom rules, iframe/srcdoc extraction, and Loop card-specific conversions (metric-card, insight-card, TL;DR) are out of scope. Only preprocessing, postprocessing, fallback table converter, anchor generator, and webview image extraction are in scope.
- Q: What does "readable Markdown" mean for malformed HTML input (US1-AS3)? → A: Text content is preserved without duplication or loss.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The preprocessing stage MUST use provably safe techniques for HTML cleanup: string-based removal for patterns with unique prefixes (Word XML namespaces `w:*`, `o:*`, classes `Mso*`, styles `mso-*`) and Turndown's built-in domino DOM parser for all structural HTML operations. Raw regex MUST NOT be used for structural operations such as extracting nested element content or manipulating tag hierarchies.
- **FR-002**: The preprocessor MUST remove `<script>`, `<noscript>`, `<template>`, `<object>`, `<embed>`, and `<applet>` tags and their content from input HTML.
- **FR-003**: The preprocessor MUST remove `<!DOCTYPE>`, `<html>`, and `<head>` wrappers, extracting only body content for conversion.
- **FR-004**: The preprocessor MUST remove all Word-specific XML-namespaced elements (`w:*`, `o:*`, `v:*` except `v:imagedata`), classes (`Mso*`), and styles (`mso-*`).
- **FR-005**: TOC link post-processing MUST preserve the link text content when stripping Word-specific anchor links (`#_Toc*`, `#_heading*`).
- **FR-006**: The entity-decoding heuristic MUST detect double-encoded HTML for any valid HTML tag name with `class`, `id`, `style`, or `data-*` attributes — not just a hardcoded list.
- **FR-007**: The fallback table converter MUST preserve text content within formatted cells (bold, italic, links, code) rather than stripping all inner HTML.
- **FR-008**: The fallback table converter MUST normalize all rows to consistent column counts, padding shorter rows with empty cells.
- **FR-009**: The anchor ID generator MUST preserve all Unicode letters (not just Spanish accented characters) when generating heading anchor IDs.
- **FR-010**: The heading-level detection MUST distinguish genuine outline numbering (1, 1.1, 1.2.3) from version-like patterns (2.1.0, 3.0) and not reinterpret them.
- **FR-011**: A post-processing guard MUST detect orphaned `data:image/*` URIs in image references longer than 100 characters and replace them with a placeholder, logging a warning.
- **FR-012**: The webview clipboard panel MUST use DOM-based methods for SVG and image extraction instead of regular expressions.
- **FR-013**: The webview MUST NOT emit debug `console.log` statements during normal production operation.

### Key Entities

- **HTML Preprocessor**: The pipeline stage that sanitizes raw clipboard/DOCX HTML before passing it to the Markdown converter. This includes tag removal, attribute stripping, and entity decoding.
- **Fallback Table Converter**: The component that handles HTML tables the primary converter fails to process natively, producing GFM-compatible table output.
- **Anchor Generator**: The component that converts heading text to URL-safe anchor IDs for internal document links.
- **Webview Clipboard Panel**: The paste capture interface that extracts embedded images and SVG diagrams from clipboard content.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All existing regression tests pass without modification after the refactor (zero regressions).
- **SC-002**: The converted Markdown output from all existing DOCX test fixtures contains zero residual HTML tags.
- **SC-003**: Conversion of malformed HTML (unclosed tags, mismatched nesting, deeply nested structures) completes without errors and preserves text content without duplication or loss in 100% of test cases.
- **SC-004**: Tables with formatted cell content (bold, links, code) retain their inner text in 100% of test cases.
- **SC-005**: TOC links preserve their visible text content after conversion (zero silent text deletions).
- **SC-006**: Heading anchors correctly preserve French, German, Portuguese, and CJK characters in generated IDs.
- **SC-007**: The extension bundle size increases by no more than 250 KB after adding the DOM parser dependency.
- **SC-008**: Conversion of a 100-page equivalent HTML document completes in under 5 seconds (matching current performance baseline).
- **SC-009**: Double-encoded HTML from Loop/Teams is correctly decoded for at least 15 common HTML tag names (not just the current 7).

## Assumptions

- A lightweight, Node.js-compatible DOM parser library will be used for the preprocessing refactor. It must handle malformed HTML gracefully, bundle under 250 KB, and be compatible with the existing build toolchain. Research determined that Turndown's built-in `@mixmark-io/domino` parser is sufficient, eliminating the need for a new dependency (see `research.md` AD-1).
- The existing Markdown conversion engine configuration and custom rules remain unchanged — only the preprocessing and post-processing stages are refactored.
- The webview already runs in a browser context with native DOM parsing available — no additional dependencies are needed for webview changes.
- Existing DOCX test fixtures provide sufficient real-world regression coverage.
- The chosen DOM parser performs acceptably for documents up to ~1 MB of HTML (typical Word document range).
- The webview's existing Content-Security-Policy (`default-src 'none'; script-src 'unsafe-inline'`) mitigates XSS risk in the paste preview. Full HTML sanitization (event handler attributes, `javascript:` URIs) is out of scope for this feature and deferred to a dedicated security hardening effort.
