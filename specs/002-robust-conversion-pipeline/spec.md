# Feature Specification: Robust DOCX to Markdown Conversion Pipeline

**Feature Branch**: `002-robust-conversion-pipeline`  
**Created**: December 14, 2025  
**Status**: Draft  
**Input**: User description: "Rewrite DOCX to Markdown extension with tiered conversion engines (Pandoc fallback, Mammoth bundled) and crash-resistant pipeline for handling complex real-world documents"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Convert DOCX File from Explorer Context Menu (Priority: P1)

A developer has a Word document (`.docx`) containing project documentation with embedded images, tables, formatted text, track changes, or complex formatting. They want to convert it to Markdown for inclusion in their repository. The conversion must handle complex real-world documents without crashing, using Pandoc if available or falling back to the bundled Mammoth engine.

**Why this priority**: This is the primary use case—file-based conversion is the most common workflow. The robust tiered engine approach solves the "works on simple docs, crashes on real docs" problem by delegating to battle-tested tools.

**Independent Test**: Can be fully tested by right-clicking any `.docx` file in Explorer (including complex documents with tables, footnotes, track changes), selecting the conversion command, and verifying that a Markdown file with correct formatting and an images folder with extracted images are created without crashing.

**Acceptance Scenarios**:

1. **Given** a simple `.docx` file exists in the workspace, **When** the user right-clicks it and selects "Convert DOCX to Markdown", **Then** a Markdown file is created in the same folder with properly converted content and no errors.

2. **Given** a complex `.docx` file with tables, footnotes, track changes, and nested formatting exists, **When** conversion is triggered, **Then** the extension uses Pandoc (if available) to handle complexity, or falls back to Mammoth, and produces a Markdown file with best-effort preservation of content.

3. **Given** a `.docx` file contains embedded images, **When** conversion completes, **Then** an images folder is created with sequential naming (`image-001.png`, `image-002.png`), and the Markdown contains relative `./images/filename.png` references.

4. **Given** a `.docx` file is corrupted or invalid, **When** conversion is attempted, **Then** a user-friendly error message is displayed and the extension does not crash.

5. **Given** the target Markdown file already exists, **When** conversion is triggered, **Then** the user is prompted to choose: overwrite, cancel, or create with a new name.

---

### User Story 2 - Convert DOCX File from Command Palette (Priority: P2)

A developer wants to convert a `.docx` file but prefers using keyboard shortcuts and the Command Palette rather than right-clicking in the Explorer.

**Why this priority**: Provides an alternative invocation method for keyboard-centric users; reuses the same tiered conversion pipeline from P1.

**Independent Test**: Can be tested by opening the Command Palette, running the conversion command with a selected `.docx` file, and verifying the same robust conversion occurs.

**Acceptance Scenarios**:

1. **Given** a `.docx` file is selected in the Explorer, **When** the user runs "DOCX: Convert to Markdown" from the Command Palette, **Then** conversion proceeds using the selected file with the same tiered engine pipeline.

2. **Given** no file is selected, **When** the user runs the command, **Then** a file picker dialog opens allowing selection of a `.docx` file.

3. **Given** a non-`.docx` file is selected, **When** the command is run, **Then** the user is redirected to select a valid `.docx` file or the command fails gracefully.

---

### User Story 3 - Paste Rich Content from Clipboard as Markdown (Priority: P3)

A developer copies formatted content from Microsoft Word (including text, formatting, and images) and wants to paste it directly into VS Code as Markdown with images properly extracted and saved.

**Why this priority**: While highly valuable for rapid documentation, it adds complexity and can be implemented after the core file-based conversion is stable and proven.

**Independent Test**: Can be tested by copying formatted content with images from Word, running the paste command, pasting into the webview, and verifying a Markdown file with extracted images is created.

**Acceptance Scenarios**:

1. **Given** rich content is copied to the clipboard, **When** the user runs "Paste as Markdown (from Word)", **Then** a webview panel opens with a paste surface.

2. **Given** the user pastes HTML content with embedded images, **When** conversion completes, **Then** images are extracted, saved with sequential naming, and Markdown is generated with correct relative references.

3. **Given** the paste operation completes successfully, **When** the Markdown is generated, **Then** a new `.md` file is created in the workspace (or inserted at cursor based on settings).

4. **Given** the clipboard contains only plain text, **When** pasted, **Then** plain text is preserved as Markdown.

---

### User Story 4 - Configure Output Behavior via Settings (Priority: P4)

A developer wants to customize where Markdown files and images are saved, how image files are named, how file collisions are handled, and which conversion engine is preferred.

**Why this priority**: Configuration enhances usability and flexibility but is not essential for core functionality. Reasonable defaults allow the extension to work without configuration.

**Acceptance Scenarios**:

1. **Given** the setting `docxMd.imagesFolderName` is set to `assets`, **When** a conversion occurs, **Then** images are saved to an `assets` folder instead of the default `images`.

2. **Given** the setting `docxMd.overwriteBehavior` is set to `overwrite`, **When** converting to an existing file, **Then** the file is overwritten without prompting.

3. **Given** the setting `docxMd.engine` is set to `pandoc`, **When** conversion is attempted and Pandoc is not available, **Then** a user-friendly message recommends installation.

---

### Edge Cases

- **Corrupted `.docx` file**: System displays user-friendly error ("Could not parse DOCX file. It may be corrupted.") and does not crash.
- **Empty `.docx` file**: System creates an empty Markdown file and notifies the user.
- **Unsupported image formats**: System attempts PNG conversion; if that fails, skips the image and logs a warning.
- **User cancels paste operation**: Webview closes gracefully without creating files.
- **No workspace open**: System prompts the user to open a folder or provides a save-as dialog.
- **Image filename collision**: System uses deterministic sequential naming to prevent overwrites.
- **Very large documents (100+ pages)**: System displays progress notifications and uses async processing.
- **Pandoc not installed**: System falls back to Mammoth seamlessly with optional installation message.
- **Complex tables**: Pandoc preserves table structure; Mammoth converts to HTML tables within Markdown.
- **Track changes and comments**: System preserves content; track changes are accepted and comments are noted.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support two conversion engines: Pandoc (external, optional) and Mammoth (bundled, required)
- **FR-002**: System MUST implement automatic engine selection: try Pandoc first if available, fall back to Mammoth on failure or absence
- **FR-003**: System MUST extract images during conversion using each engine's native image extraction
- **FR-004**: System MUST use deterministic sequential image naming (`image-001.png`, `image-002.png`, etc.) to prevent collisions
- **FR-005**: System MUST rewrite image references in Markdown to use relative paths (`./images/filename.png`) using safe regex targeting only `![]()` syntax
- **FR-006**: System MUST provide a context menu command on `.docx` files in Explorer that triggers conversion
- **FR-007**: System MUST provide a Command Palette command that converts selected `.docx` files or opens a file picker
- **FR-008**: System MUST implement configurable overwrite behavior: prompt (default), overwrite, or rename on file collision
- **FR-009**: System MUST implement a webview-based paste surface for clipboard HTML capture and conversion
- **FR-010**: System MUST convert clipboard HTML to Markdown using the same tiered conversion pipeline
- **FR-011**: System MUST handle image blobs from clipboard paste and save them to the images folder with sequential naming
- **FR-012**: System MUST support configurable output settings: image folder name, overwrite behavior, paste target, and engine preference
- **FR-013**: System MUST handle corrupted or invalid `.docx` files by displaying user-friendly error messages and not crashing
- **FR-014**: System MUST handle empty `.docx` files by creating an empty Markdown file
- **FR-015**: System MUST display progress notifications during conversion of large documents (100+ pages)
- **FR-016**: System MUST use async processing to prevent UI blocking during conversion
- **FR-017**: System MUST support 100MB+ file buffers for large document handling
- **FR-018**: System MUST handle unsupported image formats by attempting PNG conversion and skipping on failure with warnings
- **FR-019**: System MUST work without requiring external dependencies (Pandoc is optional; Mammoth is bundled)
- **FR-020**: System MUST preserve formatting: headings, bold, italic, links, lists, and tables with best-effort structure preservation

### Key Entities

- **ConversionResult**: Represents the output of a conversion operation
  - `markdownPath`: Path to generated Markdown file
  - `imagesFolderPath`: Path to images folder (if images were extracted)
  - `imageCount`: Number of images extracted
  - `warnings`: Array of non-fatal issues encountered
  - `engine`: Which engine performed the conversion ("pandoc" or "mammoth")

- **ConversionOptions**: Configuration passed to conversion engines
  - `imagesFolderName`: Name of folder for extracted images (default: "images")
  - `overwriteBehavior`: "prompt" | "overwrite" | "rename" (default: "prompt")
  - `engine`: "auto" | "pandoc" | "mammoth" (default: "auto")
  - `pasteTarget`: "newFile" | "currentEditor" (default: "newFile")

- **ImageReference**: Metadata about an extracted image
  - `originalIndex`: Sequential position in document (1-based)
  - `filename`: Output filename (e.g., "image-001.png")
  - `format`: Image format ("png", "jpg", "gif", etc.)
  - `buffer`: Binary image data

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Extension successfully converts 95% of real-world DOCX files without crashes
- **SC-002**: Conversion of average document (10-20 pages) completes in under 5 seconds on standard hardware
- **SC-003**: Conversion of large documents (100+ pages) shows progress notifications and completes without freezing VS Code UI
- **SC-004**: All extracted images display correctly in generated Markdown when opened in markdown preview (relative paths resolve)
- **SC-005**: Image filename collisions never occur (sequential naming prevents overwrites)
- **SC-006**: Users encounter zero "Out of Memory" errors with files up to 100MB in size
- **SC-007**: 100% of user stories (P1-P4) can be completed end-to-end without crashes
- **SC-008**: Error messages are user-friendly and actionable
- **SC-009**: Fallback from Pandoc to Mammoth occurs transparently without user awareness

### Assumptions

- Pandoc installation (via `pandoc` command in PATH) is optional; recommended but not required
- Mammoth dependency (bundled) handles 85% of real-world DOCX files
- Pandoc is available on Windows, macOS, and Linux via standard package managers
- Image formats supported: PNG, JPG, GIF, BMP, SVG
- Relative image paths in Markdown are preferred and portable across platforms
- VS Code version ^1.85.0 supports all required APIs
