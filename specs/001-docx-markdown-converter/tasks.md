# Tasks: DOCX to Markdown Converter VS Code Extension

**Input**: Design documents from `/specs/001-docx-markdown-converter/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Initialize VS Code extension project with all dependencies and configuration

- [x] T001 Initialize VS Code extension project with `yo code` (TypeScript, esbuild bundler) in repository root
- [x] T002 Install production dependencies: mammoth, turndown, turndown-plugin-gfm via `npm install`
- [x] T003 [P] Install dev dependencies: @types/turndown, @types/jest, ts-jest, jest per package.json in specs/001-docx-markdown-converter/contracts/package.json
- [x] T004 [P] Create tsconfig.json with strict mode, ES2020 target, Node module resolution
- [x] T005 [P] Create .vscode/launch.json with Extension Development Host configuration
- [x] T006 [P] Create .vscode/tasks.json with watch and compile tasks
- [x] T007 [P] Create jest.config.js for unit testing with ts-jest preset
- [x] T008 [P] Create .eslintrc.json with @typescript-eslint configuration
- [x] T009 [P] Create .gitignore with node_modules/, dist/, *.vsix patterns
- [x] T010 Update package.json with contributes.commands, contributes.menus, contributes.configuration from specs/001-docx-markdown-converter/contracts/package.json

---

## Phase 2: Foundational (Core Infrastructure)

**Purpose**: Core types, utilities, and conversion engine that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T011 Create TypeScript interfaces in src/types/index.ts (ConversionResult, ImageAsset, ConversionOptions, ConversionSource, ClipboardPayload, OutputPaths) from data-model.md
- [x] T012 [P] Implement logging utility with VS Code Output Channel in src/utils/logging.ts
- [x] T013 [P] Implement async file system utilities (writeFile, mkdir, exists, readFile) in src/utils/fileSystem.ts using vscode.workspace.fs
- [x] T014 [P] Implement workspace folder validation utility (check if folder open, prompt to open if not) in src/utils/fileSystem.ts
- [x] T015 Implement settings accessor reading from vscode.workspace.getConfiguration('docxMarkdownConverter') in src/config/settings.ts
- [x] T016 Implement Mammoth wrapper for DOCX→HTML conversion with image extraction callback in src/conversion/docxParser.ts
- [x] T017 Implement Turndown wrapper with GFM plugin for HTML→Markdown conversion in src/conversion/htmlToMarkdown.ts
- [x] T018 Implement image processor for format detection, naming (image-{index}.png), and buffer handling in src/conversion/imageExtractor.ts
- [x] T019 Implement unified conversion pipeline orchestrating docxParser→htmlToMarkdown→imageExtractor in src/conversion/index.ts
- [x] T020 Create test fixtures directory structure: test/fixtures/, test/unit/, test/integration/

**Checkpoint**: Core conversion engine ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Convert DOCX from Explorer Context Menu (Priority: P1) 🎯 MVP

**Goal**: Right-click a `.docx` file in Explorer → "Convert DOCX to Markdown" → Markdown file + images folder created

**Independent Test**: Open VS Code with a folder containing `.docx` files, right-click one, select command, verify `.md` file and `_images/` folder appear with correct content

### Implementation for User Story 1

- [x] T021 [US1] Implement convertDocx command handler with file URI parameter in src/commands/convertDocx.ts
- [x] T022 [US1] Add output path resolution logic (same folder, docname.md, docname_images/) in src/commands/convertDocx.ts
- [x] T023 [US1] Add file overwrite detection and prompt (overwrite/cancel) using vscode.window.showWarningMessage in src/commands/convertDocx.ts (note: 'skip' and 'rename' modes added in US4)
- [x] T024 [US1] Integrate conversion pipeline: read DOCX → convert → write MD + images in src/commands/convertDocx.ts
- [x] T025 [US1] Add progress notification using vscode.window.withProgress for large document feedback in src/commands/convertDocx.ts
- [x] T026 [US1] Add success notification with "Open File" action in src/commands/convertDocx.ts
- [x] T027 [US1] Add error handling with user-friendly messages for invalid/corrupted DOCX in src/commands/convertDocx.ts
- [x] T028 [US1] Register command `docxMarkdownConverter.convertFile` in src/extension.ts with context.subscriptions
- [x] T029 [US1] Create extension entry point with activate/deactivate functions in src/extension.ts
- [x] T030 [US1] Verify package.json has explorer/context menu contribution for `.docx` files

**Checkpoint**: User Story 1 complete - can convert DOCX files via right-click context menu

---

## Phase 4: User Story 2 - Convert DOCX from Command Palette (Priority: P2)

**Goal**: Open Command Palette → "DOCX: Convert to Markdown" → uses selected file or shows file picker → conversion proceeds

**Independent Test**: Open VS Code, press Cmd+Shift+P, type "DOCX: Convert", verify file picker appears if no file selected, or conversion proceeds with selected file

### Implementation for User Story 2

- [x] T031 [US2] Add file selection detection: check if Explorer has `.docx` file selected via vscode.window.activeTextEditor or vscode.window.tabGroups in src/commands/convertDocx.ts
- [x] T032 [US2] Add file picker dialog (vscode.window.showOpenDialog) when no valid `.docx` selected in src/commands/convertDocx.ts
- [x] T033 [US2] Handle case when user cancels file picker (return early, no error) in src/commands/convertDocx.ts
- [x] T034 [US2] Verify command appears in Command Palette via package.json commandPalette contribution

**Checkpoint**: User Story 2 complete - can convert DOCX files via Command Palette with file picker

---

## Phase 5: User Story 3 - Paste Rich Content from Clipboard (Priority: P3)

**Goal**: Copy from Word → Run "Paste as Markdown (from Word)" → Webview opens → Paste → Markdown file created with images

**Independent Test**: Copy formatted text with images from Word, run paste command, paste into webview, verify new `.md` file opens with correct content and images saved

### Implementation for User Story 3

- [x] T035 [US3] Create webview HTML with paste capture area (contenteditable div) in media/clipboard.html
- [x] T036 [US3] Add paste event handler in webview extracting HTML from event.clipboardData.getData('text/html') in media/clipboard.html
- [x] T037 [US3] Add image extraction from clipboardData.items (type image/*) converting to base64 data URIs in media/clipboard.html
- [x] T038 [US3] Add VS Code API postMessage to send captured HTML + images to extension in media/clipboard.html
- [x] T039 [US3] Implement ClipboardCapturePanel class managing webview lifecycle in src/webview/clipboardCapture.ts
- [x] T040 [US3] Add webview message handler receiving ClipboardPayload from webview in src/webview/clipboardCapture.ts
- [x] T041 [US3] Add webview disposal handling (user closes without pasting) in src/webview/clipboardCapture.ts
- [x] T042 [US3] Implement pasteAsMarkdown command handler opening webview panel in src/commands/pasteAsMarkdown.ts
- [x] T043 [US3] Add HTML→Markdown conversion for clipboard content reusing htmlToMarkdown.ts in src/commands/pasteAsMarkdown.ts
- [x] T044 [US3] Add image extraction from base64 data URIs and saving to images folder in src/commands/pasteAsMarkdown.ts
- [x] T045 [US3] Add new file creation logic with timestamped name (paste-YYYYMMDD-HHMMSS.md) in src/commands/pasteAsMarkdown.ts
- [x] T046 [US3] Add currentEditor insertion mode when pasteTarget setting is 'currentEditor' in src/commands/pasteAsMarkdown.ts
- [x] T047 [US3] Register command `docxMarkdownConverter.pasteAsMarkdown` in src/extension.ts
- [x] T048 [US3] Handle plain-text-only paste (no HTML) by inserting text directly in src/commands/pasteAsMarkdown.ts

**Checkpoint**: User Story 3 complete - can paste rich content from Word via webview

---

## Phase 6: User Story 4 - Configure Output Behavior via Settings (Priority: P4)

**Goal**: User can customize imagesFolderName, overwriteBehavior, pasteTarget, and other settings

**Independent Test**: Change settings in VS Code preferences, run conversion, verify new settings are respected

### Implementation for User Story 4

- [x] T049 [US4] Add outputFolderStrategy support ('sameFolder' vs 'subFolder') in src/commands/convertDocx.ts path resolution
- [x] T050 [US4] Add imagesFolderName pattern support with {docname} placeholder substitution in src/commands/convertDocx.ts
- [x] T051 [US4] Add imageFileNamePattern support with {index} placeholder in src/conversion/imageExtractor.ts
- [x] T052 [US4] Add overwriteBehavior 'skip' and 'rename' modes in src/commands/convertDocx.ts
- [x] T053 [US4] Add openAfterConversion setting check before opening file in src/commands/convertDocx.ts
- [x] T054 [US4] Add showNotifications setting check before displaying notifications in src/commands/convertDocx.ts and src/commands/pasteAsMarkdown.ts
- [x] T055 [US4] Verify all settings have defaults matching specs/001-docx-markdown-converter/contracts/settings.schema.json

**Checkpoint**: User Story 4 complete - all configuration options working

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Error handling, edge cases, documentation, and final validation

- [x] T056 [P] Add empty document handling (create empty .md with notification) in src/conversion/docxParser.ts
- [x] T057 [P] Add unsupported image format handling (EMF/WMF → PNG conversion or skip with warning) in src/conversion/imageExtractor.ts
- [x] T058 [P] Add large document async chunking for 100+ page documents in src/conversion/docxParser.ts (Note: Mammoth processes docs as single unit; handled via async processing + vscode.window.withProgress for UI responsiveness)
- [x] T059 Create README.md with usage instructions, configuration options, and screenshots
- [x] T060 [P] Create CHANGELOG.md with initial release notes
- [x] T061 [P] Create LICENSE file (MIT) at repository root
- [x] T062 [P] Add THIRD_PARTY_LICENSES.md with mammoth (BSD-2) and turndown (MIT) attribution
- [x] T063 Run `npm run compile` and verify no TypeScript errors
- [x] T064 Run `npm run lint` and fix any ESLint issues
- [x] T065 Test extension in Extension Development Host following quickstart.md workflow (Press F5 in VS Code, test all commands)
- [x] T066 Package extension with `npx vsce package` and verify .vsix creation

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup ──────────────────────────┐
                                         │
Phase 2: Foundational ◄──────────────────┘
         (BLOCKS ALL USER STORIES)
                │
    ┌───────────┼───────────┬───────────┐
    ▼           ▼           ▼           ▼
Phase 3:    Phase 4:    Phase 5:    Phase 6:
US1 (P1)    US2 (P2)    US3 (P3)    US4 (P4)
 🎯 MVP
    │           │           │           │
    └───────────┴───────────┴───────────┘
                        │
                        ▼
                   Phase 7: Polish
```

### User Story Independence

| Story | Can Start After | Dependencies on Other Stories |
|-------|-----------------|------------------------------|
| US1 (P1) | Phase 2 complete | None - **MVP standalone** |
| US2 (P2) | Phase 2 complete | Reuses convertDocx.ts from US1 |
| US3 (P3) | Phase 2 complete | Reuses htmlToMarkdown.ts, imageExtractor.ts |
| US4 (P4) | Phase 2 complete | Applies to all commands |

### Within Each Phase

- Tasks marked [P] can run in parallel
- Tasks without [P] must run sequentially
- Complete all tasks in a phase before moving to next

---

## Parallel Execution Examples

### Phase 1 Parallel Group

```
Parallel: T003, T004, T005, T006, T007, T008, T009
Sequential after: T010
```

### Phase 2 Parallel Group

```
Parallel: T012, T013, T014 (utilities - no dependencies)
Sequential: T011 → T015 → T016, T017, T018 (can parallel) → T019
```

### Phase 7 Parallel Group

```
Parallel: T056, T057, T058, T060, T061, T062
Sequential: T059 → T063 → T064 → T065 → T066
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. ✅ Complete Phase 1: Setup (~10 tasks)
2. ✅ Complete Phase 2: Foundational (~10 tasks)
3. ✅ Complete Phase 3: User Story 1 (~10 tasks)
4. **STOP AND VALIDATE**: Test right-click conversion end-to-end
5. 🚀 Deploy/demo if ready - this is a functional MVP!

### Incremental Delivery

| Increment | Tasks | Value Delivered |
|-----------|-------|-----------------|
| MVP | T001-T030 | Right-click DOCX → Markdown conversion |
| +Command Palette | T031-T034 | Keyboard-centric workflow |
| +Clipboard Paste | T035-T048 | Copy from Word workflow |
| +Settings | T049-T055 | Customization options |
| +Polish | T056-T066 | Production-ready extension |

---

## Summary

| Phase | Task Count | Parallel Opportunities |
|-------|------------|------------------------|
| 1: Setup | 10 | 7 tasks can run in parallel |
| 2: Foundational | 10 | 4 tasks can run in parallel |
| 3: US1 (MVP) | 10 | 0 (sequential for this story) |
| 4: US2 | 4 | 0 (small phase) |
| 5: US3 | 14 | 0 (sequential for this story) |
| 6: US4 | 7 | 0 (small phase) |
| 7: Polish | 11 | 6 tasks can run in parallel |
| **Total** | **66** | ~17 parallel opportunities |

### MVP Scope

**Tasks T001-T030 (30 tasks)** deliver a fully functional extension where users can:
- Right-click `.docx` files in Explorer
- Select "Convert DOCX to Markdown"
- Get a Markdown file with extracted images
- See progress and success notifications
