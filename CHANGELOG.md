# [1.1.0](https://github.com/ormasoftchile/md-from-docx/compare/v1.0.2...v1.1.0) (2025-12-03)


### Bug Fixes

* include images folder in vsix package ([f7cb280](https://github.com/ormasoftchile/md-from-docx/commit/f7cb2809ca776d8003bc58f6416d238984b10a92))


### Features

* add extension logo ([3140cf0](https://github.com/ormasoftchile/md-from-docx/commit/3140cf0278233c49cf70afe47bf0ba081a6363e5))

## [1.0.2](https://github.com/ormasoftchile/md-from-docx/compare/v1.0.1...v1.0.2) (2025-12-03)


### Bug Fixes

* correct publisher to focus-space ([b2cd912](https://github.com/ormasoftchile/md-from-docx/commit/b2cd912677e6622f633da7db6c7575dd51859dda))

# 1.0.0 (2025-12-03)


### Bug Fixes

* allow security audit to continue on error (dependency vulnerabilities) ([ae0660d](https://github.com/ormasoftchile/md-from-docx/commit/ae0660d580be4126785f1b6d0f5963e6dceea232))
* ESLint prefer-const and Jest passWithNoTests ([d4a02c5](https://github.com/ormasoftchile/md-from-docx/commit/d4a02c555a7a99caa3aa662b0898076b4600d4f5))
* remove duplicate continue-on-error ([6972775](https://github.com/ormasoftchile/md-from-docx/commit/6972775c4cbb3ff0aceea93fccaaf4cc409d0d8c))
* update all Node.js versions to 22.x (required by semantic-release 25.x) ([7343f34](https://github.com/ormasoftchile/md-from-docx/commit/7343f34248d81731349714abeea3665ad9686ed2))
* update dependencies to resolve all security vulnerabilities ([a06e6d5](https://github.com/ormasoftchile/md-from-docx/commit/a06e6d5a0d62930b70eec9047de6e854223315cb))
* update Node.js version to 20.x (required by semantic-release deps) ([9823b07](https://github.com/ormasoftchile/md-from-docx/commit/9823b0723d8de83c1da5a3e996a477197828e512))


### Features

* initial implementation of DOCX to Markdown converter ([b697ece](https://github.com/ormasoftchile/md-from-docx/commit/b697ece88588ca5c1e257c3220a4219c656b14eb))

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
