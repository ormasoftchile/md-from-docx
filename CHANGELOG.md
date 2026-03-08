# 1.0.0 (2026-03-08)


### Bug Fixes

* add fallback HTML table to GFM markdown converter ([e235cb5](https://github.com/ormasoftchile/md-from-docx/commit/e235cb562443bd08cb72e8efe3e146e16458ab34))
* allow security audit to continue on error (dependency vulnerabilities) ([ef372f1](https://github.com/ormasoftchile/md-from-docx/commit/ef372f1eda88eda5ad791e6f500d318d904c121e))
* **ci:** skip sampleRepro test when private sample.txt absent, gitignore sample data ([4f3dd0c](https://github.com/ormasoftchile/md-from-docx/commit/4f3dd0c2bdbb4cb5dc98d54a2078bc74ba975d8d))
* convert Word Online HTML to pure markdown tables instead of inline HTML ([4cd40fb](https://github.com/ormasoftchile/md-from-docx/commit/4cd40fb52382593f33334faef30478eff63d8022))
* correct publisher to focus-space ([aeaa9ce](https://github.com/ormasoftchile/md-from-docx/commit/aeaa9ce57fac620db6aef85eeeb7fdfb95dbf69e))
* detect and fix heading levels from Word numbering patterns ([cd9bd29](https://github.com/ormasoftchile/md-from-docx/commit/cd9bd29153118b9ae4ef5a6431df15dfef33953a))
* ESLint prefer-const and Jest passWithNoTests ([533a9f9](https://github.com/ormasoftchile/md-from-docx/commit/533a9f90b89a8448627e62c2ec0232472bc460e0))
* handle existing tags in version bump workflow ([a2b63bc](https://github.com/ormasoftchile/md-from-docx/commit/a2b63bc7700652a7a07dee03db503642c1150c50))
* include images folder in vsix package ([7f576b7](https://github.com/ormasoftchile/md-from-docx/commit/7f576b70dca179b485a11b1e9d48db9e038d6265))
* **lint:** add type annotations to fix ESLint errors ([541a535](https://github.com/ormasoftchile/md-from-docx/commit/541a535d4921368463c6da126946930da3c60a08))
* Loop/Teams citations render as proper links, strip code-preview toolbar chrome ([adebc48](https://github.com/ormasoftchile/md-from-docx/commit/adebc4813be96a6b2eb0b8a66e0cf4698659f0b7))
* Loop/Teams insight cards - inline icons with headings and decode HTML entities ([d3eca7d](https://github.com/ormasoftchile/md-from-docx/commit/d3eca7d2ce0e83c7a12a2ec715a6aeb3ea5163cc))
* make deploy step non-blocking [skip ci] ([06e0d2c](https://github.com/ormasoftchile/md-from-docx/commit/06e0d2cc6c6b9bd3bfeca178358bedb7d294eef7))
* normalize line endings from Word Online and clipboard HTML ([ba32859](https://github.com/ormasoftchile/md-from-docx/commit/ba32859d4d7c70883a6f2c9f444af5b1a8cbb6df))
* preserve heading levels from HTML tags in Word Online ([73dfeb5](https://github.com/ormasoftchile/md-from-docx/commit/73dfeb5843197da6075c0862b7513d88db0a430f))
* preserve Word embedded images and VML content during conversion ([db666bf](https://github.com/ormasoftchile/md-from-docx/commit/db666bf08f3b8d0bbe48736276c531cc33ab0d50))
* remove duplicate continue-on-error ([0afe9a9](https://github.com/ormasoftchile/md-from-docx/commit/0afe9a93d5652f25132ec897749c16891ef1d052))
* remove table of contents and aggressive blank line cleanup ([e44e9c0](https://github.com/ormasoftchile/md-from-docx/commit/e44e9c01e5917000019202edb2e5eb351966e7bf))
* strip markdown attribute from tables, repair multi-line GFM rows ([2711248](https://github.com/ormasoftchile/md-from-docx/commit/27112486fe484c6ea0c0a74d4fef91fd3884f889))
* update all Node.js versions to 22.x (required by semantic-release 25.x) ([8774075](https://github.com/ormasoftchile/md-from-docx/commit/8774075197cabcfb9b6b170db65f5b4c465ff7b2))
* update dependencies to resolve all security vulnerabilities ([a886c5c](https://github.com/ormasoftchile/md-from-docx/commit/a886c5cbc1a7690fc25d132ab148a08f936f964a))
* update Node.js version to 20.x (required by semantic-release deps) ([6ffcafb](https://github.com/ormasoftchile/md-from-docx/commit/6ffcafbe0abda990e9c58d6168e4c02a51e902c7))


### Features

* add comprehensive testing guide and pre-commit git hooks ([a280203](https://github.com/ormasoftchile/md-from-docx/commit/a28020344264302e0017857807a895a6a09ea50c))
* add extension logo ([3f81945](https://github.com/ormasoftchile/md-from-docx/commit/3f819455d12649821c92d1001daaed6bff398bbb))
* golden test suite, deterministic output & Loop table fix [version:minor] ([#4](https://github.com/ormasoftchile/md-from-docx/issues/4)) ([8aa3518](https://github.com/ormasoftchile/md-from-docx/commit/8aa3518635ac4d3c6c128627bc8ec5868eee41d2)), closes [#_Toc](https://github.com/ormasoftchile/md-from-docx/issues/_Toc) [#_heading](https://github.com/ormasoftchile/md-from-docx/issues/_heading)
* initial implementation of DOCX to Markdown converter ([8830262](https://github.com/ormasoftchile/md-from-docx/commit/8830262eb8e362311cdddf44a2929a1ef44a4bdf))
* initial release of DOCX Markdown Converter ([aa3404c](https://github.com/ormasoftchile/md-from-docx/commit/aa3404c712ff6a5728579bb73d993e38e26ba7a0))
* **loop:** extract content from iframe srcdoc for TL;DR cards ([12bd03c](https://github.com/ormasoftchile/md-from-docx/commit/12bd03c571f0707ccc677ed4ae853ae50e99aa0d))
* Phase 1-7 implementation - Complete robust DOCX to Markdown conversion ([45ebc89](https://github.com/ormasoftchile/md-from-docx/commit/45ebc89867c5434d1c3ff253596e53bd489bcfc8))
* support Loop/Teams metric cards and improve SVG handling ([#2](https://github.com/ormasoftchile/md-from-docx/issues/2)) ([7542203](https://github.com/ormasoftchile/md-from-docx/commit/75422037d56fd934c2fb4d29758375b9577038a4))

## [1.3.4](https://github.com/ormasoftchile/md-from-docx/compare/v1.3.3...v1.3.4) (2026-02-06)


### Bug Fixes

* **ci:** skip sampleRepro test when private sample.txt absent, gitignore sample data ([390bb08](https://github.com/ormasoftchile/md-from-docx/commit/390bb08886a7ee72bd9e12a39209bfef2c4c6c8c))
* Loop/Teams citations render as proper links, strip code-preview toolbar chrome ([af45cff](https://github.com/ormasoftchile/md-from-docx/commit/af45cff9c7dbf1a83ed5abf9071d209a6c9f2d48))
* strip markdown attribute from tables, repair multi-line GFM rows ([19a2e4a](https://github.com/ormasoftchile/md-from-docx/commit/19a2e4a8c67ce0436066c436e3873e86471baf35))

# [1.3.0](https://github.com/ormasoftchile/md-from-docx/compare/v1.2.0...v1.3.0) (2026-02-04)


### Features

* **loop:** extract content from iframe srcdoc for TL;DR cards ([c3acd80](https://github.com/ormasoftchile/md-from-docx/commit/c3acd80b0ac1e13101cce3e17914873ba6758c4b))

# [1.2.0](https://github.com/ormasoftchile/md-from-docx/compare/v1.1.9...v1.2.0) (2026-02-04)


### Bug Fixes

* **lint:** add type annotations to fix ESLint errors ([1bf8978](https://github.com/ormasoftchile/md-from-docx/commit/1bf8978baec93071cb22b961fa4415ed091285c6))
* preserve Word embedded images and VML content during conversion ([baf6966](https://github.com/ormasoftchile/md-from-docx/commit/baf6966e79a99f1f87e63eaa9df70a69e68a7498))


### Features

* support Loop/Teams metric cards and improve SVG handling ([#2](https://github.com/ormasoftchile/md-from-docx/issues/2)) ([cdffbde](https://github.com/ormasoftchile/md-from-docx/commit/cdffbde22f9eda088f88eba861f397c7cfb7d7a7))

## [1.1.9](https://github.com/ormasoftchile/md-from-docx/compare/v1.1.8...v1.1.9) (2026-02-04)


### Bug Fixes

* make deploy step non-blocking [skip ci] ([5185fdf](https://github.com/ormasoftchile/md-from-docx/commit/5185fdf74de5c5cfd1b26d60acf7bc5887045850))

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
