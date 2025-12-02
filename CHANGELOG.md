# Changelog

All notable changes to the "DOCX to Markdown Converter" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-12-02

### Added

- **DOCX File Conversion**: Convert Word documents to Markdown via Explorer context menu or Command Palette
- **Image Extraction**: Automatically extract embedded images to a dedicated folder
- **Clipboard Paste**: Paste rich content from Word via a dedicated webview panel
- **GFM Table Support**: Tables are converted to GitHub Flavored Markdown format
- **Customizable Settings**:
  - `outputFolderStrategy`: Choose between same folder or subfolder output
  - `imagesFolderName`: Customize the images folder name pattern
  - `imageFileNamePattern`: Customize image filename pattern
  - `overwriteBehavior`: Control how existing files are handled
  - `pasteTarget`: Choose between new file or current editor for paste
  - `openAfterConversion`: Auto-open generated files
  - `showNotifications`: Toggle success/error notifications
- **Progress Notifications**: Visual feedback during conversion
- **Error Handling**: User-friendly error messages with actionable suggestions

### Technical

- Built with TypeScript 5.x
- Uses mammoth for DOCX parsing
- Uses turndown with GFM plugin for Markdown conversion
- Bundled with esbuild for fast loading
- Minimum VS Code version: 1.85.0

## [Unreleased]

### Planned

- Batch conversion of multiple files
- Custom Turndown rules configuration
- Markdown preview integration
- Conversion history and undo
