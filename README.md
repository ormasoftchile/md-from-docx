# DOCX to Markdown Converter

A VS Code extension that converts Microsoft Word documents (.docx) to Markdown with automatic image extraction.

## Features

### 🔄 Convert DOCX Files

Right-click any `.docx` file in the Explorer and select **"DOCX: Convert to Markdown"** to:

- Convert the document to clean Markdown format
- Extract embedded images to a dedicated folder
- Preserve headings, paragraphs, lists, tables, bold, italic, and links

### 📋 Paste from Word

Use the **"Paste as Markdown (from Word)"** command to:

- Open a paste capture panel
- Paste rich content copied from Word (or any rich text source)
- Convert to Markdown with images saved automatically

### ⚙️ Customizable Settings

Configure the extension behavior through VS Code settings:

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

1. Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
2. Type **"DOCX: Convert to Markdown"**
3. If no file is selected, a file picker will open

### Paste from Clipboard

1. Copy content from Microsoft Word
2. Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
3. Type **"Paste as Markdown (from Word)"**
4. Paste into the webview panel
5. Click **"Convert to Markdown"**

## Requirements

- VS Code 1.85.0 or later
- No external dependencies required

## Supported Content

The extension handles:

- ✅ Headings (H1-H6)
- ✅ Paragraphs
- ✅ Bold, italic, underline
- ✅ Ordered and unordered lists
- ✅ Tables (GitHub Flavored Markdown)
- ✅ Links
- ✅ Images (PNG, JPEG, GIF)
- ✅ Strikethrough

### Known Limitations

- Complex table formatting may be simplified
- EMF/WMF images from Windows are converted to PNG
- Some advanced Word features (comments, track changes) are ignored

## Examples

### Before (Word Document)

A Word document with:
- Formatted text
- Embedded images
- Tables

### After (Markdown + Images)

```
document_name.md          # Clean Markdown file
document_name_images/     # Extracted images
  ├── image-001.png
  ├── image-002.jpeg
  └── image-003.png
```

## Extension Settings

Access settings via:
- `Code > Preferences > Settings` (macOS)
- `File > Preferences > Settings` (Windows/Linux)
- Search for "DOCX Markdown Converter"

## Release Notes

### 0.1.0

- Initial release
- DOCX to Markdown conversion
- Image extraction
- Clipboard paste support
- Customizable output settings

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

This extension is licensed under the [MIT License](LICENSE).

## Credits

Built with:
- [mammoth](https://github.com/mwilliamson/mammoth.js) - DOCX to HTML conversion (BSD-2-Clause)
- [turndown](https://github.com/mixmark-io/turndown) - HTML to Markdown conversion (MIT)
- [turndown-plugin-gfm](https://github.com/mixmark-io/turndown-plugin-gfm) - GFM support (MIT)
