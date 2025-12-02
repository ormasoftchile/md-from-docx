# Implementation Plan: DOCX to Markdown Converter VS Code Extension

**Branch**: `001-docx-markdown-converter` | **Date**: December 2, 2025 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/001-docx-markdown-converter/spec.md`

## Summary

Build a VS Code extension that converts `.docx` files to Markdown with extracted images via two workflows: (1) file-based conversion from Explorer context menu or Command Palette, and (2) clipboard-based conversion using a webview to capture rich content from Word. Uses Mammoth for DOCX→HTML parsing with image extraction, and Turndown for HTML→Markdown conversion.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 18+ (VS Code extension host)  
**Primary Dependencies**: mammoth (DOCX→HTML), turndown (HTML→Markdown), @vscode/vsce (packaging)  
**Storage**: File system only (workspace files for output, no database)  
**Testing**: Mocha + @vscode/test-electron (VS Code extension testing), Jest for unit tests  
**Target Platform**: VS Code 1.85+ (cross-platform: Windows, macOS, Linux)  
**Project Type**: Single VS Code extension project  
**Performance Goals**: <30s for 50-page document, <10s for clipboard paste, non-blocking UI  
**Constraints**: Pure Node.js/TypeScript (no native binaries), MIT-compatible dependencies only  
**Scale/Scope**: Single-user local extension, documents up to 100+ pages

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution template not customized for this project. Applying standard best practices:

| Gate | Status | Notes |
|------|--------|-------|
| Test-First Development | ✅ PASS | Unit tests for conversion logic, integration tests for commands |
| Modular Architecture | ✅ PASS | Conversion engine separate from VS Code integration |
| MIT-Compatible Licensing | ✅ PASS | mammoth (BSD-2), turndown (MIT) are compatible |
| No Blocking Operations | ✅ PASS | Async/await throughout, progress notifications |

## Project Structure

### Documentation (this feature)

```text
specs/001-docx-markdown-converter/
├── plan.md              # This file
├── research.md          # Phase 0: Library evaluation & patterns
├── data-model.md        # Phase 1: TypeScript interfaces
├── quickstart.md        # Phase 1: Developer setup guide
├── contracts/           # Phase 1: API contracts
│   └── settings.schema.json
└── tasks.md             # Phase 2: Implementation tasks (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── extension.ts              # VS Code extension entry point, command registration
├── commands/
│   ├── convertDocx.ts        # DOCX file conversion command handler
│   └── pasteAsMarkdown.ts    # Clipboard paste command handler
├── conversion/
│   ├── index.ts              # Unified conversion pipeline
│   ├── docxParser.ts         # Mammoth wrapper for DOCX→HTML + image extraction
│   ├── htmlToMarkdown.ts     # Turndown wrapper for HTML→Markdown
│   └── imageExtractor.ts     # Image processing and file naming
├── webview/
│   └── clipboardCapture.ts   # Webview panel management
├── config/
│   └── settings.ts           # VS Code settings accessor
├── utils/
│   ├── fileSystem.ts         # Async file operations, path utilities
│   └── logging.ts            # Output channel wrapper
└── types/
    └── index.ts              # Shared TypeScript interfaces

test/
├── unit/
│   └── conversion/
│       ├── docxParser.test.ts
│       ├── htmlToMarkdown.test.ts
│       └── imageExtractor.test.ts
├── integration/
│   ├── commands.test.ts      # End-to-end command tests
│   └── webview.test.ts       # Webview interaction tests
└── fixtures/
    ├── sample.docx           # Test document with various elements
    ├── with-images.docx      # Document with embedded images
    └── large-document.docx   # 100+ page stress test

media/
└── clipboard.html            # Webview HTML for paste capture

.vscode/
├── launch.json               # Extension debugging configuration
└── tasks.json                # Build tasks
```

**Structure Decision**: Standard VS Code extension layout with clear separation between:
- `src/commands/` - VS Code command handlers (thin layer)
- `src/conversion/` - Core conversion logic (framework-agnostic, testable)
- `src/webview/` - Clipboard capture UI
- `src/config/` - Settings management

## Complexity Tracking

No constitution violations. Design follows standard VS Code extension patterns with intentional simplicity:

| Decision | Rationale |
|----------|-----------|
| Single conversion pipeline | Both DOCX and clipboard feed into same HTML→Markdown path |
| Webview for clipboard | Required workaround for VS Code clipboard API limitation |
| File-based output only | No in-memory caching needed for this use case |
