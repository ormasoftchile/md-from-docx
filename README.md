# DOCX to Markdown Converter

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/focus-space.docx-markdown-converter)](https://marketplace.visualstudio.com/items?itemName=focus-space.docx-markdown-converter)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A VS Code extension that converts Microsoft Word documents (.docx) to clean Markdown with automatic image extraction. Also handles rich content pasted from **Word**, **Microsoft Loop**, and **Teams**.

## Features

### 🔄 Convert DOCX Files

Right-click any `.docx` file in the Explorer and select **"DOCX: Convert to Markdown"** to:

- Convert the document to clean, GitHub-Flavored Markdown
- Extract embedded images to a dedicated folder
- Preserve headings, paragraphs, lists, tables, bold, italic, links, and more

### 📋 Paste from Word / Loop / Teams

Use the **"Paste as Markdown (from Word)"** command to:

- Open a clipboard capture webview panel
- Paste rich content copied from Word, Loop, or Teams
- Convert to Markdown with images saved automatically
- Insert into the current editor or a new file

### 🧹 Robust HTML Preprocessing

Content from Microsoft sources often includes proprietary markup. The extension automatically:

- Strips Word namespace tags (`w:*`, `o:*`) and `Mso*` classes/styles
- Removes dangerous tags (`<script>`, `<object>`, `<embed>`, etc.)
- Extracts `<body>` content from full HTML documents
- Decodes double-encoded HTML entities from Loop/Teams
- Cleans up XML processing instructions and namespace declarations

### 📊 Advanced Table Handling

- Converts HTML tables to GitHub-Flavored Markdown (GFM) tables
- Flattens nested tables by extracting inner cell text
- Handles `colspan` by generating the appropriate number of cells
- Normalizes column counts across rows
- Repairs multi-line GFM rows (e.g., `<br>` within cells)

### 🔁 Loop & Teams Content

Special handling for Microsoft Loop and Teams rich content:

- **TL;DR cards** → blockquotes
- **Metric cards** → blockquotes with bold title + value
- **Insight cards** → emoji + bold title blockquotes
- **Citations** (`fai-Citation`) → proper Markdown links
- **FluentUI toolbar chrome** → stripped automatically
- **Iframe `srcdoc` extraction** for embedded Loop components

### 📝 Smart Markdown Generation

- **Heading level repair**: detects Word outline numbering (`1.`, `1.1.`, `1.1.1.`) and adjusts heading levels accordingly; ignores version patterns like `2.0`
- **TOC link cleanup**: strips Word-generated `#_Toc` and `#_heading` anchors
- **Footnote references**: converts `<sup>N</sup>` to `[^N]` footnote syntax
- **Superscript / subscript**: `^text^` and `~text~`
- **Orphan data-URI detection**: replaces leftover inline base64 images with a placeholder
- **Image path encoding**: properly URL-encodes each path segment for Markdown compatibility
- **Whitespace normalization**: collapses excessive blank lines, trims document edges

### ⚙️ Customizable Settings

Configure the extension behavior through VS Code settings (`docxMarkdownConverter.*`):

| Setting | Description | Default |
|---------|-------------|---------|
| `outputFolderStrategy` | Where to place output files (`sameFolder` or `subFolder`) | `sameFolder` |
| `imagesFolderName` | Pattern for images folder name (supports `{docname}`) | `{docname}_images` |
| `imageFileNamePattern` | Pattern for image filenames (supports `{index}`) | `image-{index}` |
| `overwriteBehavior` | How to handle existing files (`prompt`, `overwrite`, `skip`, `rename`) | `prompt` |
| `pasteTarget` | Where to paste content (`newFile` or `currentEditor`) | `newFile` |
| `openAfterConversion` | Automatically open the generated file | `true` |
| `showNotifications` | Show success/error notifications | `true` |

## Usage

### From Explorer Context Menu

1. Right-click a `.docx` file in the Explorer
2. Select **"DOCX: Convert to Markdown"**
3. The Markdown file and images folder will be created alongside the original document

### From Command Palette

1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
2. Type **"DOCX: Convert to Markdown"**
3. If no file is selected, a file picker will open

### Paste from Clipboard

1. Copy content from Microsoft Word, Loop, or Teams
2. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
3. Type **"Paste as Markdown (from Word)"**
4. Paste into the webview panel that opens
5. Click **"Convert to Markdown"**

## Requirements

- VS Code 1.85.0 or later
- No external dependencies required — everything is bundled

## Supported Content

| Element | Status |
|---------|--------|
| Headings (H1–H6) | ✅ Fully supported |
| Paragraphs | ✅ |
| Bold, italic, underline | ✅ |
| Strikethrough | ✅ |
| Superscript / Subscript | ✅ |
| Ordered and unordered lists | ✅ |
| Tables (GFM) | ✅ Including nested & colspan |
| Links | ✅ |
| Images (PNG, JPEG, GIF) | ✅ Auto-extracted |
| Footnote references | ✅ `[^N]` syntax |
| Loop TL;DR / metric / insight cards | ✅ → blockquotes |
| Loop/Teams citations | ✅ → links |
| Code blocks | ✅ Fenced (```) |

### Known Limitations

- EMF/WMF images from Windows are converted to PNG (no vector preservation)
- Advanced Word features (comments, track changes, revisions) are ignored
- Very complex nested table layouts may be simplified
- SVG images are preserved as-is (no rasterization)

## Output Example

```
MyDocument.md               # Clean Markdown file
MyDocument_images/           # Extracted images
  ├── image-001.png
  ├── image-002.jpeg
  └── image-003.png
```

With `outputFolderStrategy: "subFolder"`:

```
MyDocument/
  ├── MyDocument.md
  └── MyDocument_images/
        ├── image-001.png
        └── image-002.jpeg
```

## Development

### Prerequisites

- Node.js 22.x
- npm

### Setup

```bash
git clone https://github.com/ormasoftchile/md-from-docx.git
cd md-from-docx
npm install
```

### Build & Watch

```bash
npm run compile        # One-time build (esbuild)
npm run watch          # Rebuild on changes
```

### Testing

```bash
npm test               # Run all tests (Jest)
npm run test:unit      # Unit tests only
npm run test:functional # Functional tests
npm run test:regression # Regression tests against real DOCX files
npm run test:coverage  # Coverage report

# Golden tests (deterministic output verification)
npm run test:golden          # Run golden snapshot tests
npm run test:golden:update   # Regenerate golden snapshots

# Private benchmarks (local real-world DOCX collection)
cross-env MD_FROM_DOCX_PRIVATE_FIXTURES=/path/to/dir npm run test:private
```

### Packaging & Publishing

```bash
npm run package        # Create .vsix package
npm run deploy         # Publish to VS Code Marketplace
```

Releases are managed with [semantic-release](https://github.com/semantic-release/semantic-release) and auto-published via CI.

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for the full release history.

### Highlights

- **1.3.x** — Loop/Teams citation links, code-preview toolbar stripping, multi-line GFM table repair
- **1.2.0** — Loop/Teams metric & insight card support, improved SVG handling, Word VML preservation
- **1.1.0** — Extension logo, packaging fixes
- **1.0.0** — Initial stable release with DOCX conversion, image extraction, clipboard paste, GFM tables, customizable settings

## Contributing

Contributions are welcome! Please feel free to submit [issues](https://github.com/ormasoftchile/md-from-docx/issues) and pull requests on the [GitHub repository](https://github.com/ormasoftchile/md-from-docx).

## License

This extension is licensed under the [MIT License](LICENSE).

Copyright © 2024–2026 [Ormasoft Chile](https://github.com/ormasoftchile)

## Credits

Built with:

- [mammoth](https://github.com/mwilliamson/mammoth.js) — DOCX to HTML conversion (BSD-2-Clause)
- [turndown](https://github.com/mixmark-io/turndown) — HTML to Markdown conversion (MIT)
- [turndown-plugin-gfm](https://github.com/mixmark-io/turndown-plugin-gfm) — GFM support for tables, strikethrough, and task lists (MIT)
