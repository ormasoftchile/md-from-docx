# Research: DOCX to Markdown Converter

**Feature**: 001-docx-markdown-converter  
**Date**: December 2, 2025  
**Phase**: 0 - Research

## Library Evaluation

### DOCX Parsing: Mammoth

**Decision**: Use `mammoth` for DOCX→HTML conversion with image extraction

**Rationale**:
- Pure JavaScript/TypeScript implementation (no native dependencies)
- MIT-compatible license (BSD-2-Clause)
- Built-in image extraction via `convertToHtml()` with `convertImage` option
- Actively maintained with 4.1k+ GitHub stars
- Semantic HTML output (preserves document structure)
- Handles headings, paragraphs, lists, tables, bold, italic, links

**Alternatives considered**:
- **docx4js**: Less maintained, complex API
- **Pandoc (CLI)**: GPL license, requires external installation
- **Office.js**: Requires Office add-in context, not suitable for standalone extension

**Image extraction approach**:
```typescript
// Mammoth provides image buffers via convertImage callback
mammoth.convertToHtml({ path: docxPath }, {
  convertImage: mammoth.images.imgElement((image) => {
    return image.read("base64").then((imageBuffer) => {
      // Store image buffer for later file writing
      return { src: `placeholder-${index}.png` };
    });
  })
});
```

### HTML to Markdown: Turndown

**Decision**: Use `turndown` for HTML→Markdown conversion

**Rationale**:
- Pure JavaScript implementation
- MIT license
- Highly configurable with plugins
- `turndown-plugin-gfm` adds GitHub Flavored Markdown support (tables, strikethrough)
- Handles all required elements: headings, paragraphs, lists, bold, italic, links
- 8.4k+ GitHub stars, actively maintained

**Alternatives considered**:
- **rehype-remark**: More complex setup, overkill for this use case
- **html-to-markdown**: Less configurable, fewer features
- **showdown**: Primarily Markdown→HTML, reverse support is limited

**Table handling**:
```typescript
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

const turndown = new TurndownService();
turndown.use(gfm); // Enables table support
```

### VS Code Extension Patterns

**Decision**: Standard VS Code extension architecture with webview for clipboard

**Rationale**:
- Commands registered via `vscode.commands.registerCommand`
- Context menu via `contributes.menus` in package.json
- Settings via `contributes.configuration`
- Webview required for clipboard because `vscode.env.clipboard.readText()` only returns plain text

**Webview clipboard approach**:
```typescript
// Extension creates webview panel
const panel = vscode.window.createWebviewPanel(
  'clipboardCapture',
  'Paste from Word',
  vscode.ViewColumn.One,
  { enableScripts: true }
);

// Webview HTML captures paste event
// <div contenteditable="true" onpaste="handlePaste(event)">
// handlePaste reads event.clipboardData.getData('text/html')
// and extracts image blobs from clipboardData.items
```

## Best Practices

### VS Code Extension Development

1. **Activation events**: Use `onCommand:*` for lazy activation
2. **Async operations**: Use `vscode.window.withProgress()` for long operations
3. **Error handling**: Use `vscode.window.showErrorMessage()` with actionable messages
4. **Output channel**: Create dedicated channel for debug logging
5. **Settings**: Use `vscode.workspace.getConfiguration()` with proper defaults
6. **File operations**: Use `vscode.workspace.fs` for cross-platform file handling

### Bundling

**Decision**: Use esbuild for bundling (VS Code recommended)

**Rationale**:
- Fast bundling for development iteration
- Tree-shaking reduces extension size
- VS Code extension template default
- Handles Node.js modules correctly

### Testing Strategy

1. **Unit tests**: Jest for pure conversion logic (no VS Code dependency)
2. **Integration tests**: @vscode/test-electron for command testing
3. **Test fixtures**: Pre-created DOCX files with known content

## Technical Decisions Summary

| Area | Decision | Why |
|------|----------|-----|
| DOCX Parser | mammoth | BSD-2 license, pure JS, built-in image extraction |
| HTML→Markdown | turndown + gfm plugin | MIT license, table support, configurable |
| Bundler | esbuild | VS Code recommended, fast, tree-shaking |
| Clipboard | Webview + paste event | VS Code API limitation workaround |
| Testing | Jest (unit) + @vscode/test-electron (integration) | Standard VS Code testing stack |
| File handling | vscode.workspace.fs | Cross-platform, async |

## Dependency Versions

```json
{
  "dependencies": {
    "mammoth": "^1.6.0",
    "turndown": "^7.1.2",
    "turndown-plugin-gfm": "^1.0.2"
  },
  "devDependencies": {
    "@types/node": "^18.x",
    "@types/vscode": "^1.85.0",
    "@types/turndown": "^5.0.4",
    "@vscode/test-electron": "^2.3.8",
    "@vscode/vsce": "^2.22.0",
    "esbuild": "^0.19.0",
    "jest": "^29.7.0",
    "typescript": "^5.3.0"
  }
}
```

## Risk Mitigations

| Risk | Mitigation |
|------|------------|
| Large documents block UI | Use `vscode.window.withProgress()` + async chunking |
| Image format incompatibility | Fall back to PNG, log warning for unsupported formats |
| Webview paste fails on some OSes | Provide fallback file-based workflow |
| Table conversion loses complex formatting | Document limitation, provide best-effort |
| Extension size too large | Tree-shake with esbuild, exclude dev dependencies |
