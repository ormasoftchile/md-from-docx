# Data Model: DOCX to Markdown Converter

**Feature**: 001-docx-markdown-converter  
**Date**: December 2, 2025  
**Phase**: 1 - Design

## Core Entities

### ConversionResult

The output of any conversion operation (DOCX file or clipboard).

```typescript
interface ConversionResult {
  /** The generated Markdown content */
  markdown: string;
  
  /** Array of extracted images with their data */
  images: ImageAsset[];
  
  /** Warnings encountered during conversion (non-fatal issues) */
  warnings: string[];
}
```

### ImageAsset

Represents an extracted image ready to be written to disk.

```typescript
interface ImageAsset {
  /** Binary data of the image */
  buffer: Buffer;
  
  /** Original format from source (e.g., 'png', 'jpeg', 'gif', 'emf', 'wmf') */
  originalFormat: string;
  
  /** Target format for output file (e.g., 'png', 'jpeg') */
  outputFormat: 'png' | 'jpeg' | 'gif';
  
  /** Generated filename (e.g., 'image-001.png') */
  filename: string;
  
  /** Relative path from markdown file to image (e.g., './my-doc_images/image-001.png') */
  relativePath: string;
}
```

### ConversionOptions

User-configurable options controlling conversion behavior.

```typescript
interface ConversionOptions {
  /** Strategy for output folder placement */
  outputFolderStrategy: 'sameFolder' | 'subFolder';
  
  /** Name pattern for images folder (supports {docname} placeholder) */
  imagesFolderName: string;
  
  /** Pattern for image filenames (supports {index} placeholder) */
  imageFileNamePattern: string;
  
  /** How to handle existing files */
  overwriteBehavior: 'prompt' | 'overwrite' | 'skip' | 'rename';
  
  /** Where to put pasted content from clipboard */
  pasteTarget: 'newFile' | 'currentEditor';
}
```

### ConversionSource

Represents the input source for conversion.

```typescript
type ConversionSource = 
  | { type: 'docx'; filePath: string }
  | { type: 'clipboard'; html: string; images: ClipboardImage[] };

interface ClipboardImage {
  /** Base64-encoded image data (from data URI) */
  dataUri: string;
  
  /** Original index in the HTML content */
  index: number;
}
```

### ClipboardPayload

Data received from the webview after paste operation.

```typescript
interface ClipboardPayload {
  /** HTML content from clipboard */
  html: string;
  
  /** Array of image data URIs extracted from clipboard */
  images: string[];
  
  /** Whether the paste contained any rich content */
  hasRichContent: boolean;
}
```

### OutputPaths

Resolved file system paths for output files.

```typescript
interface OutputPaths {
  /** Absolute path to the output markdown file */
  markdownPath: string;
  
  /** Absolute path to the images folder */
  imagesFolderPath: string;
  
  /** Base directory for relative path calculation */
  baseDir: string;
}
```

## Extension State

### ExtensionState

Minimal runtime state for the extension.

```typescript
interface ExtensionState {
  /** VS Code output channel for logging */
  outputChannel: vscode.OutputChannel;
  
  /** Currently active clipboard webview panel (if any) */
  clipboardPanel: vscode.WebviewPanel | undefined;
}
```

## Relationships

```
┌─────────────────────┐
│  ConversionSource   │
│  (docx | clipboard) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐     ┌─────────────────────┐
│  ConversionOptions  │────▶│    OutputPaths      │
│  (user settings)    │     │  (resolved paths)   │
└─────────────────────┘     └──────────┬──────────┘
                                       │
           ┌───────────────────────────┘
           ▼
┌─────────────────────┐
│  ConversionResult   │
│  - markdown: string │
│  - images: Asset[]  │
│  - warnings: string │
└─────────────────────┘
           │
           ▼
┌─────────────────────┐
│   File System       │
│   - .md file        │
│   - images folder   │
│   - image files     │
└─────────────────────┘
```

## Validation Rules

### ConversionOptions
- `imagesFolderName` must not contain path separators or invalid filename characters
- `imageFileNamePattern` must contain `{index}` placeholder
- `outputFolderStrategy` defaults to `'sameFolder'`
- `overwriteBehavior` defaults to `'prompt'`
- `pasteTarget` defaults to `'newFile'`

### ImageAsset
- `buffer` must not be empty
- `filename` must be unique within the images folder
- `outputFormat` must be a web-compatible format (png, jpeg, gif)
- EMF/WMF formats from Windows documents are converted to PNG

### OutputPaths
- `markdownPath` must be an absolute path with `.md` extension
- `imagesFolderPath` must be an absolute path
- Parent directories must exist or be creatable
