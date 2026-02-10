/**
 * VS Code settings accessor for DOCX Markdown Converter configuration
 */
import * as vscode from 'vscode';
import { ConversionOptions, DEFAULT_CONVERSION_OPTIONS } from '../types';

const CONFIG_SECTION = 'docxMarkdownConverter';

/**
 * Gets the current extension configuration merged with defaults.
 * @returns ConversionOptions with all settings
 */
export function getSettings(): ConversionOptions {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);

  return {
    outputFolderStrategy: config.get<'sameFolder' | 'subFolder'>(
      'outputFolderStrategy',
      DEFAULT_CONVERSION_OPTIONS.outputFolderStrategy
    ),
    imagesFolderName: config.get<string>(
      'imagesFolderName',
      DEFAULT_CONVERSION_OPTIONS.imagesFolderName
    ),
    imageFileNamePattern: config.get<string>(
      'imageFileNamePattern',
      DEFAULT_CONVERSION_OPTIONS.imageFileNamePattern
    ),
    overwriteBehavior: config.get<'prompt' | 'overwrite' | 'skip' | 'rename'>(
      'overwriteBehavior',
      DEFAULT_CONVERSION_OPTIONS.overwriteBehavior
    ),
    pasteTarget: config.get<'newFile' | 'currentEditor'>(
      'pasteTarget',
      DEFAULT_CONVERSION_OPTIONS.pasteTarget
    ),
    openAfterConversion: config.get<boolean>(
      'openAfterConversion',
      DEFAULT_CONVERSION_OPTIONS.openAfterConversion
    ),
    showNotifications: config.get<boolean>(
      'showNotifications',
      DEFAULT_CONVERSION_OPTIONS.showNotifications
    ),
    markdownFlavor: mapFlavorSetting(
      config.get<'gfm' | 'commonmark' | 'default'>(
        'markdownFlavor',
        DEFAULT_CONVERSION_OPTIONS.markdownFlavor
      )
    ),
    lineWrapWidth: config.get<number | 'none'>(
      'lineWrapWidth',
      DEFAULT_CONVERSION_OPTIONS.lineWrapWidth
    ),
    headingStrategy: config.get<'infer' | 'preserve'>(
      'headingStrategy',
      DEFAULT_CONVERSION_OPTIONS.headingStrategy
    ),
    imagePathBase: config.get<string | undefined>(
      'imagePathBase',
      DEFAULT_CONVERSION_OPTIONS.imagePathBase
    ),
  };
}

/**
 * Maps the "default" flavor alias to "gfm".
 */
function mapFlavorSetting(value: 'gfm' | 'commonmark' | 'default'): 'gfm' | 'commonmark' | 'default' {
  return value === 'default' ? 'gfm' : value;
}

/**
 * Gets a single setting value.
 * @param key The setting key (without the section prefix)
 * @param defaultValue Default value if setting is not defined
 * @returns The setting value
 */
export function getSetting<T>(key: keyof ConversionOptions, defaultValue: T): T {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  return config.get<T>(key, defaultValue);
}

/**
 * Resolves the images folder name by replacing placeholders.
 * @param pattern The folder name pattern (e.g., '{docname}_images')
 * @param docName The document name (without extension)
 * @returns Resolved folder name
 */
export function resolveImagesFolderName(pattern: string, docName: string): string {
  return pattern.replace('{docname}', docName);
}

/**
 * Resolves the image filename by replacing placeholders.
 * @param pattern The filename pattern (e.g., 'image-{index}')
 * @param index The image index (1-based)
 * @returns Resolved filename (without extension)
 */
export function resolveImageFileName(pattern: string, index: number): string {
  // Pad index to 3 digits for proper sorting (001, 002, etc.)
  const paddedIndex = index.toString().padStart(3, '0');
  return pattern.replace('{index}', paddedIndex);
}
