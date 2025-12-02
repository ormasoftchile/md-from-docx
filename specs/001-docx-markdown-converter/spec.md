# Feature Specification: DOCX to Markdown Converter VS Code Extension

**Feature Branch**: `001-docx-markdown-converter`  
**Created**: December 2, 2025  
**Status**: Draft  
**Input**: User description: "VS Code extension to convert DOCX files and clipboard content to Markdown with images"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Convert DOCX File from Explorer Context Menu (Priority: P1)

A developer has a Word document (`.docx`) containing project documentation with embedded images, tables, and formatted text. They want to convert it to Markdown for inclusion in their repository without manually copying content or exporting images.

**Why this priority**: This is the primary use case—file-based conversion is the most common workflow and establishes the core conversion pipeline that other features build upon.

**Independent Test**: Can be fully tested by right-clicking any `.docx` file in Explorer, selecting the conversion command, and verifying that a Markdown file with correct formatting and an images folder with extracted images are created.

**Acceptance Scenarios**:

1. **Given** a `.docx` file exists in the workspace, **When** the user right-clicks it and selects "Convert DOCX to Markdown", **Then** a Markdown file is created in the same folder with properly converted content.

2. **Given** a `.docx` file contains embedded images, **When** conversion completes, **Then** an images folder is created containing all extracted images with unique filenames, and the Markdown contains relative `![]()` references to each.

3. **Given** a `.docx` file contains headings, bold, italic, links, and lists, **When** converted, **Then** the Markdown preserves these formatting elements using standard Markdown syntax.

4. **Given** a `.docx` file contains tables, **When** converted, **Then** tables are rendered in Markdown table syntax (pipe-delimited) with best-effort preservation of structure.

5. **Given** the target Markdown file already exists, **When** conversion is triggered, **Then** the user is prompted to choose: overwrite, cancel, or create with a new name.

---

### User Story 2 - Convert DOCX File from Command Palette (Priority: P2)

A developer wants to convert a `.docx` file but prefers using keyboard shortcuts and the Command Palette rather than right-clicking in the Explorer.

**Why this priority**: Provides an alternative invocation method for keyboard-centric users; reuses the same conversion logic from P1.

**Independent Test**: Can be tested by opening the Command Palette, running the conversion command, and verifying the file picker appears (or uses the selected file) and conversion proceeds correctly.

**Acceptance Scenarios**:

1. **Given** a `.docx` file is selected in the Explorer, **When** the user runs "DOCX: Convert to Markdown" from the Command Palette, **Then** conversion proceeds using the selected file without additional prompts.

2. **Given** no file is selected, **When** the user runs the command, **Then** a file picker dialog opens allowing selection of a `.docx` file.

3. **Given** a non-`.docx` file is selected, **When** the command is run, **Then** the file picker opens to allow selecting a valid `.docx` file.

---

### User Story 3 - Paste Rich Content from Clipboard as Markdown (Priority: P3)

A developer copies content from Microsoft Word (or another rich-text application) containing formatted text and images. They want to paste it directly into their VS Code workspace as Markdown with images properly extracted and saved.

**Why this priority**: This is a distinct workflow requiring webview-based clipboard access. While highly valuable, it adds complexity and can be implemented after the core file-based conversion is stable.

**Independent Test**: Can be tested by copying formatted content with images from Word, running the paste command, pasting into the webview, and verifying a Markdown file with correct content and extracted images is created.

**Acceptance Scenarios**:

1. **Given** rich content is copied to the clipboard, **When** the user runs "Paste as Markdown (from Word)", **Then** a webview panel opens prompting the user to paste.

2. **Given** the user pastes content into the webview, **When** the content contains HTML with embedded images, **Then** images are extracted, saved to the images folder, and Markdown is generated with correct relative references.

3. **Given** the paste operation completes successfully, **When** the Markdown is generated, **Then** a new `.md` file is created and opened in the editor (or content is inserted at cursor, based on settings).

4. **Given** the clipboard contains only plain text, **When** pasted, **Then** the plain text is inserted as-is without image extraction.

---

### User Story 4 - Configure Output Behavior via Settings (Priority: P4)

A developer wants to customize where Markdown files and images are saved, how image files are named, and how file collisions are handled.

**Why this priority**: Configuration enhances usability but is not essential for core functionality. Reasonable defaults allow the extension to work without configuration.

**Independent Test**: Can be tested by modifying VS Code settings and verifying that subsequent conversions respect the new configuration values.

**Acceptance Scenarios**:

1. **Given** the setting `docxMarkdownConverter.imagesFolderName` is set to `assets`, **When** a conversion occurs, **Then** images are saved to an `assets` folder instead of the default.

2. **Given** the setting `docxMarkdownConverter.overwriteBehavior` is set to `overwrite`, **When** converting to an existing file, **Then** the file is overwritten without prompting.

3. **Given** the setting `docxMarkdownConverter.pasteTarget` is set to `currentEditor`, **When** pasting from clipboard, **Then** content is inserted at the cursor position in the active editor.

---

### Edge Cases

- What happens when the `.docx` file is corrupted or invalid? → Display a user-friendly error message indicating the file could not be parsed.
- What happens when the `.docx` file is empty? → Create an empty Markdown file and notify the user.
- What happens when images have unsupported formats? → Attempt conversion to PNG; if that fails, skip the image and log a warning.
- What happens when the user cancels the webview paste before pasting? → Close the webview gracefully without creating any files.
- What happens when the workspace has no folder open? → Prompt the user to open a folder or save the file to a specific location.
- What happens when an image filename collision occurs in the images folder? → Use the uniqueness scheme (e.g., `image-001.png`, `image-002.png`) to avoid overwriting.
- What happens during conversion of a very large document (100+ pages)? → Use progress notifications and ensure async processing to avoid blocking the UI.
- What happens when the clipboard webview is closed without pasting? → Cancel the operation cleanly without side effects.

## Requirements *(mandatory)*

### Functional Requirements

#### Core Conversion Engine

- **FR-001**: Extension MUST convert `.docx` files to Markdown format preserving headings (H1-H6), paragraphs, bold, italic, links, ordered lists, and unordered lists.
- **FR-002**: Extension MUST extract embedded images from `.docx` files and save them as standalone image files (PNG, JPEG, or original format).
- **FR-003**: Extension MUST generate Markdown image references using relative paths from the Markdown file to the images folder.
- **FR-004**: Extension MUST convert tables to Markdown table syntax with best-effort structure preservation.
- **FR-005**: Extension MUST use pure TypeScript/Node.js libraries (Mammoth for DOCX parsing, Turndown for HTML-to-Markdown) bundled with the extension.

#### DOCX File Conversion

- **FR-006**: Extension MUST provide a context menu item "Convert DOCX to Markdown" for `.docx` files in the Explorer.
- **FR-007**: Extension MUST provide a Command Palette command "DOCX: Convert to Markdown" that uses the selected file or prompts for file selection.
- **FR-008**: Extension MUST create the output Markdown file in the same directory as the source `.docx` file by default.
- **FR-009**: Extension MUST create an images folder (default: `<docname>_images/`) for extracted images.
- **FR-010**: Extension MUST use a sequential naming scheme (e.g., `image-001.png`) for extracted images to ensure uniqueness.
- **FR-011**: Extension MUST prompt the user when the output file already exists, offering options to overwrite, rename, or cancel.
- **FR-012**: Extension MUST handle file operations asynchronously to avoid blocking the VS Code UI.

#### Clipboard Conversion

- **FR-013**: Extension MUST provide a Command Palette command "Paste as Markdown (from Word)" for clipboard-based conversion.
- **FR-014**: Extension MUST open a webview panel to capture rich clipboard data (HTML and image blobs) since the standard VS Code clipboard API only provides plain text.
- **FR-015**: Extension MUST convert HTML content from the clipboard to Markdown using the same conversion pipeline as file-based conversion.
- **FR-016**: Extension MUST extract base64-encoded or blob images from clipboard HTML and save them to the images folder.
- **FR-017**: Extension MUST create a new Markdown file or insert content at the cursor based on configuration.

#### Configuration

- **FR-018**: Extension MUST expose settings under the `docxMarkdownConverter` namespace.
- **FR-019**: Extension MUST support configuration for output folder strategy (`sameFolder`, `subFolder`).
- **FR-020**: Extension MUST support configuration for images folder name (default: `<docname>_images` or `images`).
- **FR-021**: Extension MUST support configuration for image filename pattern (default: `image-{index}`).
- **FR-022**: Extension MUST support configuration for paste target behavior (`newFile`, `currentEditor`).
- **FR-023**: Extension MUST support configuration for overwrite behavior (`prompt`, `overwrite`, `skip`, `rename`).

#### Error Handling & UX

- **FR-024**: Extension MUST display user-friendly error messages for invalid or corrupted `.docx` files.
- **FR-025**: Extension MUST display progress notifications during conversion of large documents.
- **FR-026**: Extension MUST display success notifications with the path to generated files upon completion.
- **FR-027**: Extension MUST provide an Output Channel for detailed debug logging.
- **FR-028**: Extension MUST open the generated Markdown file in the editor after successful conversion.

#### Licensing & Dependencies

- **FR-029**: Extension MUST use only MIT-compatible dependencies.
- **FR-030**: Extension MUST NOT bundle GPL-licensed tools; any GPL tool usage (e.g., Pandoc) must be via user-installed external CLI and clearly documented.
- **FR-031**: Extension MUST include appropriate attribution for third-party libraries.

### Key Entities

- **Document**: Represents the source `.docx` file with its path, content, and embedded resources.
- **ConversionResult**: The output of a conversion operation containing Markdown string and an array of extracted images with their binary data and suggested filenames.
- **ImageAsset**: An extracted image with binary buffer, original format, generated filename, and relative path.
- **ConversionOptions**: User-configurable options controlling output location, naming patterns, and collision handling.
- **ClipboardPayload**: Data captured from the webview containing HTML string and array of image data URIs or blobs.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can convert a `.docx` file to Markdown with images in under 30 seconds for documents up to 50 pages.
- **SC-002**: Converted Markdown correctly renders headings, bold, italic, links, lists, and tables when previewed in VS Code's Markdown preview.
- **SC-003**: All embedded images from the source document appear in the generated Markdown with working image links.
- **SC-004**: Users can paste content from Word via the webview workflow and receive a complete Markdown file in under 10 seconds for typical content (1-5 pages).
- **SC-005**: Extension handles 100-page documents without freezing the VS Code UI (progress indicator remains responsive).
- **SC-006**: 95% of conversion attempts complete successfully without requiring user intervention beyond initial command invocation.
- **SC-007**: Users can customize output location and naming patterns through VS Code settings.
- **SC-008**: Error messages clearly indicate what went wrong and suggest corrective action.
