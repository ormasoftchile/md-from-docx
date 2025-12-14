# Tasks: Robust DOCX to Markdown Conversion Pipeline

**Input**: Design documents from `/specs/002-robust-conversion-pipeline/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md)  
**Target**: Full implementation of P1-P4 user stories with 95% crash-free conversion

**Organization**: Tasks grouped by user story (P1-P4) with foundational infrastructure in Phase 2.

---

## Phase 1: Setup (Project Structure & Dependencies)

**Purpose**: Initialize project structure and bundled dependencies (Mammoth, Turndown)

- [ ] T001 Create `src/conversion/` directory for core conversion engines
- [ ] T002 Create `src/types/` directory and `index.ts` with conversion types
- [ ] T003 Create `src/utils/errorHandler.ts` for user-friendly error messages
- [ ] T004 Create `src/utils/progress.ts` for progress notifications
- [ ] T005 Create `src/utils/fileSystem.ts` for file operations (overwrite handling)
- [ ] T006 Update `package.json` with mammoth, turndown, turndown-plugin-gfm dependencies (if not present)

---

## Phase 2: Foundational (Core Conversion Infrastructure)

**Purpose**: Core conversion pipeline that all user stories depend on

**⚠️ CRITICAL**: All Phase 2 tasks must be complete before P1-P4 implementation

### Type Definitions

- [ ] T007 [P] Define `ConversionResult` type in `src/types/index.ts` (markdownPath, imagesFolderPath, imageCount, warnings, engine)
- [ ] T008 [P] Define `ConversionOptions` type in `src/types/index.ts` (imagesFolderName, overwriteBehavior, engine, pasteTarget)
- [ ] T009 [P] Define `ImageReference` type in `src/types/index.ts` (originalIndex, filename, format, buffer)

### Mammoth Engine

- [ ] T010 [P] Implement `src/conversion/mammothEngine.ts` - Mammoth DOCX→HTML conversion with error handling
  - Handle missing/corrupted files with user-friendly errors
  - Extract images during conversion to temp buffer
  - Return HTML string with warnings array

### HTML to Markdown Converter

- [ ] T011 [P] Implement `src/conversion/htmlToMarkdown.ts` - Turndown HTML→Markdown conversion
  - Configure Turndown with GFM plugin for table support
  - Map Turndown hooks to preserve structure (headings, lists, links)
  - Return Markdown string ready for image reference rewriting
  - Handle empty/whitespace-only HTML gracefully

### Image Handler

- [ ] T012 [P] Implement `src/conversion/imageHandler.ts` - Deterministic image extraction and naming
  - Accept image buffers from Mammoth extraction
  - Generate sequential filenames (`image-001.png`, `image-002.png`, etc.)
  - Prevent collisions using unique numbering scheme
  - Handle unsupported formats by attempting PNG conversion
  - Return array of ImageReference objects with original index

### Path Rewriter

- [ ] T013 [P] Implement `src/conversion/pathRewriter.ts` - Safe image reference rewriting
  - Use regex targeting ONLY `![]()` Markdown syntax
  - Map extracted image indices to filenames
  - Rewrite paths to relative format: `./images/image-001.png`
  - Cross-platform path handling (Windows backslash conversion)
  - Preserve markdown structure outside of image references

### Conversion Orchestrator (Main Entry Point)

- [ ] T014 Implement `src/conversion/conversionOrchestrator.ts` - Tiered engine with error handling
  - Accept DOCX file path + ConversionOptions
  - Call Mammoth to convert DOCX to HTML + extract images
  - Call HTML to Markdown converter
  - Call image handler to process extracted images
  - Call path rewriter to update image references
  - Handle errors: return partial results with warnings instead of crashing
  - Return ConversionResult with all metadata

**Checkpoint**: All 14 foundation tasks complete. Core conversion pipeline ready for user story implementation.

---

## Phase 3: User Story 1 - Convert DOCX File from Explorer (Priority: P1) 🎯 MVP

**Goal**: Users can right-click any `.docx` file in Explorer and convert it to Markdown with images extracted and correctly referenced.

**Independent Test**: Right-click a `.docx` file → select "Convert DOCX to Markdown" → verify Markdown file and images folder created in same directory with correct content.

### Implementation for US1

- [ ] T015 [P] [US1] Update `package.json` - Add Explorer context menu for `.docx` files
  - Add `contributes.menus.explorer/context` with resource extension check
  - Command: `docxMd.convertFromExplorer`
  - Title: "Convert DOCX to Markdown"

- [ ] T016 [US1] Implement `src/commands/convertDocx.ts` - convertFromExplorer handler
  - Accept file URI from Explorer context
  - Validate file is `.docx`
  - Read file to check for basic validity
  - Call conversionOrchestrator with default options
  - Handle user cancellation of overwrite prompt
  - Show success notification with file paths
  - Show warnings (if any) in output channel

- [ ] T017 [P] [US1] Implement `src/utils/fileSystem.ts` - File overwrite handling
  - Check if target `.md` file already exists
  - Implement overwrite prompt (prompt/overwrite/rename modes)
  - Generate unique filename on rename (`.md-1`, `.md-2`)
  - Return resolved target path to caller

- [ ] T018 [P] [US1] Implement `src/utils/errorHandler.ts` - User-friendly error messages
  - Parse error types: corrupted DOCX, empty file, unsupported format, filesystem errors
  - Map to user-friendly messages instead of stack traces
  - Include actionable suggestions (e.g., "Check if file is corrupted")
  - Log detailed errors to output channel for debugging

- [ ] T019 [US1] Update `src/extension.ts` - Register convertFromExplorer command
  - Register command in activate() function
  - Pass conversionOrchestrator to handler
  - Ensure command uses correct context binding

- [ ] T020 [P] [US1] Test convertFromExplorer with simple `.docx` file
  - Create test DOCX with basic text + image
  - Verify Markdown generated correctly
  - Verify image extracted to images folder
  - Verify relative paths in Markdown work

- [ ] T021 [P] [US1] Test convertFromExplorer with complex `.docx` file
  - Test with tables, footnotes, nested formatting
  - Verify partial results returned instead of crashing
  - Verify warnings displayed to user

- [ ] T022 [US1] Test overwrite handling
  - Convert same file twice
  - Verify prompt shown first time
  - Verify rename mode creates `-1` suffix

**Checkpoint**: User Story 1 complete. Users can convert DOCX files from Explorer without crashes. MVP feature working.

---

## Phase 4: User Story 2 - Command Palette Conversion (Priority: P2)

**Goal**: Keyboard-centric users can invoke conversion via Command Palette with same reliability as Explorer.

**Independent Test**: Open Command Palette → run "DOCX: Convert to Markdown" → select file → verify same conversion as P1.

### Implementation for US2

- [ ] T023 [P] [US2] Update `package.json` - Add Command Palette command
  - Add `contributes.commands` entry: `docxMd.convertFromPalette`
  - Title: "DOCX: Convert to Markdown"
  - Category: "DOCX"

- [ ] T024 [US2] Implement Command Palette handler in `src/commands/convertDocx.ts`
  - Check if file is currently selected in Explorer
  - If selected: use selected file path
  - If not selected: open file picker filtered to `.docx` files
  - Call same conversionOrchestrator as Explorer handler
  - Reuse overwrite and error handling from P1

- [ ] T025 [P] [US2] Test convertFromPalette with selected file
  - Select `.docx` file in Explorer
  - Run command from palette
  - Verify immediate conversion without file picker

- [ ] T026 [P] [US2] Test convertFromPalette with file picker
  - Deselect any file
  - Run command from palette
  - Verify file picker opens
  - Select `.docx` file
  - Verify conversion proceeds

- [ ] T027 [US2] Test convertFromPalette with non-DOCX file selected
  - Select non-DOCX file
  - Run command from palette
  - Verify file picker opens (instead of crashing)

**Checkpoint**: User Story 2 complete. Both Explorer and Command Palette workflows fully functional.

---

## Phase 5: User Story 3 - Clipboard Paste from Word (Priority: P3)

**Goal**: Users can paste formatted content from Word directly into VS Code as Markdown with images extracted.

**Independent Test**: Copy rich content from Word → run "Paste as Markdown" → paste into webview → verify Markdown file created with extracted images.

### Webview UI

- [ ] T028 [P] [US3] Create `src/webview/pastePanel.ts` - Webview controller
  - Create webview panel when command triggered
  - Set HTML content from `src/webview/pastePanel.html`
  - Listen for paste events from webview
  - Handle image blobs from paste
  - Call conversionOrchestrator with HTML + images

- [ ] T029 [P] [US3] Create/Update `src/webview/pastePanel.html` - Paste surface
  - Create contenteditable div for paste target
  - Capture paste events with `e.clipboardData`
  - Extract `text/html` and image files from paste
  - Send to extension via `vscode.postMessage`
  - Show user-friendly instructions

### Paste Handler

- [ ] T030 [US3] Implement paste command in `src/commands/pasteAsMarkdown.ts`
  - Register `docxMd.pasteFromWord` command
  - Open webview panel with paste surface
  - Listen for paste event from webview
  - Extract HTML and image blobs
  - Call conversionOrchestrator with HTML input
  - Save images to workspace images folder
  - Create or insert Markdown based on `pasteTarget` setting

- [ ] T031 [P] [US3] Handle image blobs from paste
  - Accept base64-encoded or binary image data from webview
  - Decode and save to sequential image filenames
  - Update imageHandler to accept blob buffers
  - Ensure same sequential naming as file-based conversion

- [ ] T032 [P] [US3] Update `package.json` - Add paste command
  - Add `contributes.commands` entry: `docxMd.pasteFromWord`
  - Title: "Paste as Markdown (from Word)"
  - Category: "DOCX"

- [ ] T033 [US3] Update `src/extension.ts` - Register paste command
  - Register pasteFromWord command
  - Pass context (extensionUri for webview resources)

- [ ] T034 [P] [US3] Test paste with rich content from Word
  - Copy formatted text + image from Word
  - Run paste command
  - Paste into webview
  - Verify Markdown created with correct formatting
  - Verify image extracted and referenced

- [ ] T035 [P] [US3] Test paste with plain text only
  - Copy plain text to clipboard
  - Run paste command
  - Paste into webview
  - Verify Markdown created (no crash on missing images)

- [ ] T036 [US3] Test paste cancel/close
  - Open paste webview
  - Close without pasting
  - Verify no files created
  - Verify webview disposed cleanly

**Checkpoint**: User Story 3 complete. Clipboard paste workflow fully functional.

---

## Phase 6: User Story 4 - Configuration Settings (Priority: P4)

**Goal**: Developers can customize output behavior via VS Code settings without configuration complexity.

**Independent Test**: Modify settings → run conversion → verify output respects new configuration.

### Settings

- [ ] T037 [P] [US4] Update `package.json` - Add configuration properties
  - `docxMd.imagesFolderName`: string, default "images"
  - `docxMd.overwriteBehavior`: enum ["prompt", "overwrite", "rename"], default "prompt"
  - `docxMd.engine`: enum ["auto"], default "auto" (Mammoth-only in this version)
  - `docxMd.pasteTarget`: enum ["newFile", "currentEditor"], default "newFile"

- [ ] T038 [P] [US4] Read settings in command handlers
  - Update convertDocx handler to read imagesFolderName and overwriteBehavior
  - Update pasteAsMarkdown handler to read pasteTarget
  - Pass settings as part of ConversionOptions to orchestrator

- [ ] T039 [P] [US4] Implement imagesFolderName configuration
  - Accept custom folder name in ConversionOptions
  - Pass to imageHandler to create folder with custom name
  - Update pathRewriter to use configured folder name in references

- [ ] T040 [P] [US4] Implement overwriteBehavior configuration
  - "prompt" (default): show user prompt (existing behavior)
  - "overwrite": silently overwrite existing files
  - "rename": silently create with unique suffix
  - Update fileSystem utility to handle all three modes

- [ ] T041 [P] [US4] Implement pasteTarget configuration
  - "newFile" (default): create new `.md` file in workspace
  - "currentEditor": insert Markdown at cursor in active editor
  - Update pasteAsMarkdown handler to branch on this setting

- [ ] T042 [US4] Test imagesFolderName setting
  - Set to "assets"
  - Run conversion
  - Verify images saved to `assets/` folder
  - Verify Markdown references use `./assets/`

- [ ] T043 [US4] Test overwriteBehavior setting
  - Test "prompt" mode (default)
  - Test "overwrite" mode (existing file silently replaced)
  - Test "rename" mode (new file created with suffix)

- [ ] T044 [US4] Test pasteTarget setting
  - Test "newFile" mode (creates new file)
  - Test "currentEditor" mode (inserts at cursor)

**Checkpoint**: User Story 4 complete. All configuration options functional.

---

## Phase 7: Testing & Polish

**Purpose**: Comprehensive testing, edge cases, and final release preparation

### Edge Case Testing

- [ ] T045 [P] Test corrupted DOCX file
  - Create invalid/corrupted DOCX
  - Attempt conversion
  - Verify user-friendly error message shown
  - Verify no crash or partial files created

- [ ] T046 [P] Test empty DOCX file
  - Create valid but empty DOCX
  - Convert
  - Verify empty Markdown created
  - Verify user notified

- [ ] T047 [P] Test very large DOCX (100+ pages)
  - Create large test document
  - Convert with progress notifications
  - Verify completion without UI freeze
  - Verify no OOM errors

- [ ] T048 [P] Test image collision handling
  - Create DOCX with many images of same filename
  - Convert
  - Verify sequential naming (`image-001.png`, `image-002.png`, etc.)
  - Verify all images extracted without overwrites

- [ ] T049 [P] Test unsupported image format
  - Create DOCX with unsupported image format
  - Convert
  - Verify warning logged
  - Verify other images extracted successfully
  - Verify Markdown created

- [ ] T050 [P] Test no workspace open
  - Close all folders
  - Attempt file conversion
  - Verify save dialog opens or user-friendly error shown

- [ ] T051 [P] Test relative path correctness
  - Convert DOCX in nested folder
  - Verify Markdown can be moved/opened anywhere
  - Verify image paths still resolve (relative to Markdown file)

### Integration Testing

- [ ] T052 Test full workflow: File conversion → open Markdown → view images
  - Right-click DOCX in Explorer
  - Convert
  - Open generated Markdown
  - Verify images display in preview
  - Verify formatting preserved

- [ ] T053 Test full workflow: Clipboard paste → open Markdown → view images
  - Copy from Word
  - Paste via command
  - Verify Markdown created and opened
  - Verify images display in preview

- [ ] T054 Test parallel conversions
  - Attempt to convert multiple files simultaneously
  - Verify no race conditions or file conflicts
  - Verify each produces correct output

### Performance Testing

- [ ] T055 [P] Measure conversion time for small document (1-5 pages)
  - Should complete in <2 seconds
  - Document benchmark

- [ ] T056 [P] Measure conversion time for medium document (10-20 pages)
  - Should complete in <5 seconds
  - Document benchmark

- [ ] T057 [P] Measure conversion time for large document (100+ pages)
  - Should show progress notifications
  - Should complete in <30 seconds
  - Document benchmark

### Documentation

- [ ] T058 Update `README.md` with feature description
  - Document supported DOCX features (tables, images, formatting)
  - Document image extraction and relative paths
  - Add usage instructions (Explorer, Command Palette, Paste)
  - Add configuration section for P4 settings

- [ ] T059 [P] Create or update `CHANGELOG.md` entry
  - Document major changes from 001 to 002 (tiered engine, crash-free)
  - List bugs fixed from previous implementation

- [ ] T060 Add inline code documentation
  - JSDoc comments for all public functions
  - Type documentation for interfaces
  - Error handling documentation

### Final Validation

- [ ] T061 Run full test suite
  - All unit tests passing
  - All integration tests passing
  - 90%+ code coverage

- [ ] T062 Manual testing with real-world DOCX files
  - Test with 10+ real DOCX documents from users
  - Verify 95% conversion success rate
  - Document any edge cases not caught by test suite

- [ ] T063 Security audit
  - Verify no arbitrary code execution via file paths
  - Verify image filename sanitization
  - Verify no path traversal vulnerabilities

- [ ] T064 Cross-platform testing
  - Test on Windows, macOS, Linux
  - Verify relative paths work on all platforms
  - Verify file encoding handled correctly

- [ ] T065 Prepare release
  - Update version in package.json (from 1.0.2 → 2.0.0 for major rewrite)
  - Create git tag for release
  - Build VSIX for manual testing before marketplace push
  - Verify extension runs on clean VS Code install

**Checkpoint**: All 65 tasks complete. Extension fully tested and ready for marketplace release.

---

## Task Dependencies & Parallel Execution

### Critical Path (Sequential)
T001→T002→T003→T004→T005→T006 (Setup)
→ T007→T008→T009→T010→T011→T012→T013→T014 (Foundation)
→ T015→T016→T017→T018→T019 (P1 Implementation)
→ T023→T024 (P2 Implementation)
→ T028→T029→T030 (P3 Implementation)
→ T037→T038 (P4 Implementation)

### High Parallelization Opportunities
- **Phase 1**: All T001-T006 can run in parallel (independent directories)
- **Phase 2 Types**: T007-T009 can run in parallel (same file, non-conflicting content)
- **Phase 2 Engines**: T010-T013 can run in parallel (independent modules)
- **Phase 3-5 Testing**: All T020-T027, T034-T036, T042-T044 can run in parallel
- **Phase 7 Testing**: All T045-T057 can run in parallel (independent test cases)

### MVP Scope (First Release)
Complete through T027 (P1 + P2 fully working) = **27 tasks**
- Users can convert DOCX files from Explorer and Command Palette
- Core conversion engine stable and crash-free
- Provides immediate value without clipboard or configuration complexity

### Extended Scope (Second Release)
Add T028-T044 (P3 + P4) = **17 additional tasks**
- Clipboard paste workflow
- Configuration options
- Still safe, incremental release after P1/P2 validation

### Full Scope (Release 2.0)
Add T045-T065 (Testing + Polish) = **21 additional tasks**
- Comprehensive edge case coverage
- Real-world DOCX file validation
- Performance benchmarks
- Production-ready release

---

## Implementation Strategy

**Recommended Approach**: 
1. **Week 1**: Complete Phase 1-2 (T001-T014) - Foundation ready
2. **Week 2**: Complete Phase 3 (T015-T022) - MVP ready for internal testing
3. **Week 3**: Complete Phase 4-5 (T023-T044) - Full feature set
4. **Week 4**: Complete Phase 7 (T045-T065) - Testing + Release

**Risk Mitigation**:
- Phase 2 foundation is extensive (14 tasks) but prevents rework later
- Each user story (P1-P4) can be tested independently and incrementally
- Fallback to 001 implementation always available if issues discovered

