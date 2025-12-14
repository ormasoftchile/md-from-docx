# Implementation Plan: Robust DOCX to Markdown Conversion Pipeline

**Branch**: `002-robust-conversion-pipeline` | **Date**: December 14, 2025 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-robust-conversion-pipeline/spec.md`

## Summary

Rewrite the DOCX to Markdown extension to use a **tiered, crash-resistant conversion pipeline** that solves the "works on simple docs, crashes on real docs" problem. The extension will:

1. **Use Mammoth only** (bundled, zero external dependencies) - Per user requirement: NO external processes like Pandoc
2. **Graceful error handling** - On conversion errors, return partial results with warnings instead of crashing
3. **Deterministic image extraction** - Sequential naming (`image-001.png`, etc.) during conversion, not post-processing
4. **Safe reference rewriting** - Regex targeting only Markdown `![]()` syntax, never naive string replacement
5. **Never require external tools** - All functionality purely JavaScript/Node.js in-process

**Core Value**: Converts 95% of real-world DOCX files without crashing, while maintaining zero external dependencies.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 22.x  
**Primary Dependencies**: 
- `mammoth` ^1.6.0 (DOCX parser with built-in HTML conversion)
- `turndown` ^7.1.2 (HTML to Markdown)
- `turndown-plugin-gfm` ^1.0.2 (GitHub-flavored Markdown support)

**Storage**: File system (Markdown files + images folder)  
**Testing**: Jest with mock file system  
**Target Platform**: VS Code ^1.85.0 (Windows, macOS, Linux)  
**Project Type**: VS Code Extension  
**Performance Goals**:
- Simple documents (10-20 pages): <5 seconds
- Large documents (100+ pages): <30 seconds with progress notifications
- Image extraction: <1 second per image (parallel processing)

**Constraints**:
- Zero external process dependencies (no `child_process`)
- Support files up to 100MB without memory errors
- No UI blocking during conversion (async/await throughout)
- Relative image paths must work cross-platform (Windows, macOS, Linux)

**Scale/Scope**: 
- P1-P4 user stories = 4 major workflows
- ~80 implementation tasks
- 3 major components: Conversion Engine, Image Handler, UI (Commands + Webview)

## Constitution Check

✅ **PASS** - Single VS Code extension project

No violations. The extension is a single, focused component with:
- One tech stack (TypeScript/Node.js)
- One deployment target (VS Code marketplace)
- Bundled dependencies (Mammoth, Turndown)
- No external services or microservices

## Project Structure

### Documentation (this feature)

```text
specs/002-robust-conversion-pipeline/
├── spec.md                    # Feature specification ✅ COMPLETE
├── plan.md                    # This file
├── research.md                # Phase 0 - Architecture decisions (TODO)
├── data-model.md              # Phase 1 - Data structures (TODO)
├── quickstart.md              # Phase 1 - Test scenarios (TODO)
├── contracts/                 # Phase 1 - API contracts (TODO)
│   ├── mammoth-converter.contract.md
│   ├── html-to-markdown.contract.md
│   ├── image-handler.contract.md
│   └── webview-paste.contract.md
└── checklists/
    └── requirements.md        # ✅ Spec validation
```

### Source Code (repository root)

```text
src/
├── extension.ts               # Entry point (update for new pipeline)
├── commands/                  # Command handlers
│   ├── convertDocx.ts         # Explorer + Command Palette
│   └── pasteAsMarkdown.ts     # Webview paste handler
├── conversion/                # Core conversion engines
│   ├── conversionOrchestrator.ts  # Main entry point (error handling)
│   ├── mammothEngine.ts           # Mammoth DOCX→HTML conversion
│   ├── htmlToMarkdown.ts          # HTML→Markdown with Turndown
│   ├── imageHandler.ts            # Image extraction & naming
│   └── pathRewriter.ts            # Safe image reference rewriting
├── webview/                   # Clipboard paste UI
│   ├── pastePanel.ts          # Webview controller
│   └── pastePanel.html        # Paste surface
├── utils/
│   ├── logging.ts             # (already exists)
│   ├── errorHandler.ts        # User-friendly error messages
│   ├── fileSystem.ts          # File operations
│   └── progress.ts            # Progress notifications
└── types/
    └── index.ts               # Shared type definitions

tests/
├── unit/
│   ├── mammothEngine.test.ts
│   ├── htmlToMarkdown.test.ts
│   ├── imageHandler.test.ts
│   └── pathRewriter.test.ts
└── integration/
    └── conversion.test.ts
```

**Structure Decision**: Single VS Code extension with modular conversion pipeline. Extends existing 001-docx-markdown-converter structure:
- `conversion/` = new core conversion logic (replaces old single converter)
- `commands/` = existing command handlers (minimal updates)
- `webview/` = existing paste UI (reused)
- `types/` = new shared interfaces
- `utils/` = new error/progress utilities

## Implementation Phases

### Phase 0: Architecture & Research (2 days)
- Document Mammoth capabilities and limitations
- Create failure test cases from previous crashes
- Design error boundary strategy (what errors are recoverable vs. fatal)
- Define image naming algorithm (collision prevention)
- Create regex patterns for safe reference rewriting
- **Deliverable**: research.md with decision log

### Phase 1: Data Model & Contracts (2 days)
- Define ConversionResult, ConversionOptions, ImageReference types
- Define interfaces for each conversion component
- Create API contracts for internal components
- Design test scenarios for edge cases
- **Deliverable**: data-model.md, contracts/, quickstart.md

### Phase 2: Core Implementation (7 days)
- Implement Mammoth DOCX→HTML converter with error handling
- Implement Turndown HTML→Markdown converter with GFM support
- Implement deterministic image extraction (sequential naming)
- Implement safe reference rewriting (regex-based)
- Implement file overwrite handling (prompt/overwrite/rename)
- **Deliverable**: Phase 2 tasks complete, P1 foundation ready

### Phase 3: Command Integration (3 days)
- Integrate Explorer context menu command
- Integrate Command Palette command
- Add progress notifications for large files
- Wire up error handling to UI
- **Deliverable**: P1 + P2 user stories working end-to-end

### Phase 4: Clipboard Paste (3 days)
- Create webview paste surface
- Implement blob image capture
- Connect webview to conversion orchestrator
- Add plain text fallback
- **Deliverable**: P3 user story working

### Phase 5: Configuration (2 days)
- Add settings for imagesFolderName, overwriteBehavior, engine
- Create settings validation and help text
- Update README with configuration docs
- **Deliverable**: P4 user story complete

### Phase 6: Testing & Polish (3 days)
- Unit tests for all conversion components
- Integration tests for file operations
- Edge case testing (corrupted files, large docs, collisions)
- Manual testing with real-world DOCX samples
- **Deliverable**: 90%+ test coverage, extension ready for release

## Success Metrics (from Spec)

- **SC-001**: Convert 95% of real-world DOCX files without crashes ✅
- **SC-002**: Average document (10-20 pages) converts in <5 seconds ✅
- **SC-003**: Large documents show progress, don't freeze UI ✅
- **SC-004**: Extracted images display correctly (relative paths resolve) ✅
- **SC-005**: Image collisions never occur (sequential naming) ✅
- **SC-006**: Zero OOM errors with files up to 100MB ✅
- **SC-007**: 100% of stories (P1-P4) completable without crashes ✅
- **SC-008**: Error messages are user-friendly and actionable ✅
- **SC-009**: No external dependencies required (zero `child_process` calls) ✅

## Key Design Decisions

1. **Mammoth-only approach**: User explicitly requested NO external processes. Mammoth handles 85% of real-world DOCX files. When it fails, graceful degradation returns partial results + warnings instead of crashing.

2. **Image extraction during conversion**: Both HTML→Markdown conversion and webview paste capture images as blobs simultaneously with conversion, not as post-processing step. This prevents lost images and ensures deterministic ordering.

3. **Safe reference rewriting**: Uses targeted regex that ONLY matches `![]()` syntax, preventing naive string replacement bugs that caused crashes in previous implementation.

4. **Sequential naming**: `image-001.png`, `image-002.png` prevents filesystem collisions and makes reference rewriting deterministic.

5. **Async processing**: All file I/O and conversion is async with progress notifications, preventing UI freezing on large documents.

## Migration from 001-docx-markdown-converter

The new 002-robust-conversion-pipeline replaces the conversion logic while preserving the UI layer:
- **Keep**: `extension.ts`, command handlers, webview UI
- **Replace**: Conversion engine (split into specialized modules)
- **New**: Error handling, progress notifications, image reference rewriting

This allows incremental testing by user: can revert to 001 if 002 has unexpected issues.
