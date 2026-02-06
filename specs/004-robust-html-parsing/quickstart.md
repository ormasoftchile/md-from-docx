# Quickstart: Robust HTML Parsing (004)

## Prerequisites

- Node.js 18+
- VS Code 1.85+
- Repository cloned and on branch `004-robust-html-parsing`

## Setup

```bash
# Install dependencies
npm install

# Compile
npm run compile

# Run tests
npm test
```

## Development Workflow

### 1. Run in Watch Mode

```bash
npm run watch
```

Then press **F5** in VS Code to launch the Extension Development Host.

### 2. Run Unit Tests

```bash
npm test
```

Key test files:
- `test/unit/edgeCases.test.ts` — Existing edge case coverage
- `test/unit/preprocessor.test.ts` — New: isolated preprocessor tests (to be created)
- `test/unit/anchorGenerator.test.ts` — New: Unicode anchor tests (to be created)
- `test/unit/tableConverter.test.ts` — New: fallback table tests (to be created)

### 3. Run Regression Tests

```bash
npm run test -- --testPathPattern=regression
```

These use real DOCX fixtures in `test/docx/` to verify end-to-end output.

### 4. Manual Testing

1. Launch Extension Development Host (F5)
2. Open a `.docx` file → **Right-click → Convert DOCX to Markdown**
3. Or use **Ctrl+Shift+P → Paste as Markdown** to test clipboard flow
4. Verify output in the generated `.md` file

### Test Fixtures

Real DOCX conversion outputs in `test/docx/`:
- `02 INFORME DE PROYECTO Postula Fácil.md` — Spanish content with accented characters
- `Correo institucional_como ingresar.md` — Simple institutional document
- `Doc2.md` — General document
- `Documentación.md` — Documentation with images
- `TESIS-RENATOGERMANI.md` — Long academic thesis with TOC, tables, headings

## Key Files to Modify

| File | Changes |
|------|---------|
| `src/conversion/htmlToMarkdown.ts` | Refactor `preprocessHtml()`, `convertHtmlTableToMarkdown()`, `textToAnchor()`, `fixHeadingLevelsFromNumbering()`, TOC link handler, entity decoding heuristic |
| `media/clipboard.html` | Replace regex image/SVG extraction with `DOMParser`, remove debug `console.log` |
| `src/types/index.ts` | Add new internal types (`PreprocessorConfig`, `PreprocessResult`, etc.) |

## Architecture Notes

- **No new runtime dependency** — Turndown's bundled `@mixmark-io/domino` handles DOM parsing
- **Webview uses native `DOMParser`** — Chromium provides it, zero CSP impact
- **String-level preprocessing** continues for safe Word namespace removal (unique prefixes like `w:`, `o:`)
- **Turndown rules** handle structural element conversion during tree traversal
- **Post-processing** on Markdown string for TOC links, heading levels, orphan image detection

## Verification Checklist

Before submitting:

- [ ] All existing regression tests pass unchanged (SC-001)
- [ ] No residual HTML tags in DOCX test fixture output (SC-002)
- [ ] Malformed HTML tests pass — text preserved without duplication (SC-003)
- [ ] Tables with formatted cells retain inner text (SC-004)
- [ ] TOC links preserve visible text (SC-005)
- [ ] French/German/Portuguese/CJK anchors work (SC-006)
- [ ] Bundle size delta < 250 KB — should be ~0 KB (SC-007)
- [ ] 100-page HTML converts in < 5 seconds (SC-008)
- [ ] ≥15 HTML tag names trigger entity decoding (SC-009)
