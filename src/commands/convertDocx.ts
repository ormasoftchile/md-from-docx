/**
 * Command handler for converting DOCX files to Markdown
 * Handles both Explorer context menu and Command Palette invocations
 */
import * as vscode from 'vscode';
import { ConversionSource, OutputPaths } from '../types';
import { convert, resolveOutputPaths, writeConversionResult } from '../conversion';
import { getSettings } from '../config/settings';
import { exists, basename, hasWorkspaceFolder, ensureWorkspaceFolder, getUniquePath } from '../utils/fileSystem';
import { info, error as logError, debug, showOutput } from '../utils/logging';

/**
 * Handles the 'docxMarkdownConverter.convertFile' command.
 * Can be invoked from:
 * 1. Explorer context menu (receives file URI directly, or array for multi-select)
 * 2. Command Palette (may need to show file picker)
 *
 * @param fileUri Optional file URI from context menu
 * @param fileUris Optional array of file URIs for multi-select
 */
export async function handleConvertDocx(fileUri?: vscode.Uri, fileUris?: vscode.Uri[]): Promise<void> {
  try {
    // Ensure workspace folder is open
    if (!hasWorkspaceFolder()) {
      const opened = await ensureWorkspaceFolder();
      if (!opened) {
        return; // User cancelled
      }
    }

    // Multi-select batch conversion
    if (fileUris && fileUris.length > 1) {
      await handleBatchConversion(fileUris);
      return;
    }

    // Single file conversion
    const docxUri = fileUri ?? (await selectDocxFile());
    if (!docxUri) {
      return; // User cancelled file picker
    }

    await convertSingleFile(docxUri);
  } catch (err) {
    logError('Conversion failed', err);
    const message = err instanceof Error ? err.message : 'Unknown error occurred';
    void vscode.window.showErrorMessage(`DOCX conversion failed: ${message}`);
    showOutput();
  }
}

/**
 * Converts a single DOCX file to Markdown.
 * @param docxUri URI of the DOCX file to convert
 */
async function convertSingleFile(docxUri: vscode.Uri): Promise<void> {
  const docxPath = docxUri.fsPath;
  debug(`Converting file: ${docxPath}`);

  // Validate file exists and is .docx
  if (!docxPath.toLowerCase().endsWith('.docx')) {
    void vscode.window.showErrorMessage('Selected file is not a .docx file.');
    return;
  }

  if (!(await exists(docxPath))) {
    void vscode.window.showErrorMessage(`File not found: ${docxPath}`);
    return;
  }

  // Get settings
  const settings = getSettings();
  const docName = basename(docxPath, '.docx');

  // Resolve output paths
  const outputPaths = resolveOutputPaths(docxPath, docName, settings);

  // Check for existing files and handle overwrite
  const shouldProceed = await handleOverwriteCheck(outputPaths, settings.overwriteBehavior);
  if (!shouldProceed) {
    return; // User cancelled or skipped
  }

  // Perform conversion with progress
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Converting ${docName}.docx to Markdown...`,
      cancellable: false,
    },
    async (progress) => {
      progress.report({ increment: 10, message: 'Reading DOCX file...' });

      const source: ConversionSource = { type: 'docx', filePath: docxPath };

      progress.report({ increment: 40, message: 'Converting to Markdown...' });

      const result = await convert(source, settings);

      progress.report({ increment: 30, message: 'Writing files...' });

      await writeConversionResult(result, outputPaths);

      progress.report({ increment: 20, message: 'Done!' });

      // Log result
      info(`Converted ${docName}.docx: ${result.images.length} images, ${result.warnings.length} warnings`);

      // Show result notification
      if (settings.showNotifications) {
        await showSuccessNotification(outputPaths, result.images.length, result.warnings);
      }

      // Open the markdown file if configured
      if (settings.openAfterConversion) {
        const doc = await vscode.workspace.openTextDocument(outputPaths.markdownPath);
        await vscode.window.showTextDocument(doc);
      }
    }
  );
}

/**
 * Handles batch conversion of multiple DOCX files.
 * Each file is converted independently; one failure doesn't block others.
 * @param fileUris Array of file URIs to convert
 */
async function handleBatchConversion(fileUris: vscode.Uri[]): Promise<void> {
  // Filter to only .docx files
  const docxUris = fileUris.filter(uri => uri.fsPath.toLowerCase().endsWith('.docx'));

  if (docxUris.length === 0) {
    void vscode.window.showWarningMessage('No .docx files found in selection.');
    return;
  }

  const settings = getSettings();
  let succeeded = 0;
  let failed = 0;
  const errors: string[] = [];

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Batch converting DOCX files...',
      cancellable: true,
    },
    async (progress, token) => {
      for (let i = 0; i < docxUris.length; i++) {
        if (token.isCancellationRequested) {
          info(`Batch conversion cancelled after ${i} of ${docxUris.length} files`);
          break;
        }

        const uri = docxUris[i];
        const docName = basename(uri.fsPath, '.docx');

        progress.report({
          increment: (100 / docxUris.length),
          message: `Converting ${i + 1} of ${docxUris.length}: ${docName}.docx`,
        });

        try {
          const docxPath = uri.fsPath;

          if (!(await exists(docxPath))) {
            throw new Error(`File not found: ${docxPath}`);
          }

          const outputPaths = resolveOutputPaths(docxPath, docName, settings);
          const source: ConversionSource = { type: 'docx', filePath: docxPath };
          const result = await convert(source, settings);
          await writeConversionResult(result, outputPaths);

          info(`Batch: converted ${docName}.docx (${result.images.length} images)`);
          succeeded++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          logError(`Batch: failed to convert ${docName}.docx`, err);
          errors.push(`${docName}: ${msg}`);
          failed++;
        }
      }
    }
  );

  // Show summary
  const summary = `Batch conversion complete: ${succeeded} succeeded, ${failed} failed out of ${docxUris.length}`;
  info(summary);

  if (failed > 0) {
    const detail = errors.join('\n');
    void vscode.window.showWarningMessage(`${summary}\n\nErrors:\n${detail}`);
  } else if (settings.showNotifications) {
    void vscode.window.showInformationMessage(summary);
  }
}

/**
 * Shows a file picker dialog for selecting a DOCX file.
 * @returns Selected file URI or undefined if cancelled
 */
async function selectDocxFile(): Promise<vscode.Uri | undefined> {
  const result = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    filters: {
      'Word Documents': ['docx'],
    },
    title: 'Select DOCX file to convert',
  });

  return result?.[0];
}

/**
 * Checks for existing output files and handles based on overwrite behavior.
 * @param outputPaths Output paths to check
 * @param behavior Overwrite behavior setting
 * @returns True if conversion should proceed, false to abort
 */
async function handleOverwriteCheck(
  outputPaths: OutputPaths,
  behavior: 'prompt' | 'overwrite' | 'skip' | 'rename'
): Promise<boolean | OutputPaths> {
  const mdExists = await exists(outputPaths.markdownPath);

  if (!mdExists) {
    return true; // No conflict, proceed
  }

  switch (behavior) {
    case 'overwrite':
      debug('Overwriting existing file');
      return true;

    case 'skip':
      debug('Skipping due to existing file');
      void vscode.window.showInformationMessage(
        `Skipped: ${basename(outputPaths.markdownPath)} already exists.`
      );
      return false;

    case 'rename': {
      // Generate unique filename
      const basePath = outputPaths.markdownPath.replace(/\.md$/, '');
      const newPath = await getUniquePath(basePath, '.md');
      debug(`Renaming to: ${newPath}`);
      outputPaths.markdownPath = newPath;
      return true;
    }

    case 'prompt':
    default: {
      // Show warning dialog (overwrite/cancel in US1, skip/rename added in US4)
      const action = await vscode.window.showWarningMessage(
        `File "${basename(outputPaths.markdownPath)}" already exists.`,
        { modal: true },
        'Overwrite',
        'Cancel'
      );

      if (action === 'Overwrite') {
        return true;
      }
      return false; // Cancel
    }
  }
}

/**
 * Shows a success notification with optional actions.
 * @param outputPaths Output paths for action handling
 * @param imageCount Number of images extracted
 * @param warnings Any warnings from conversion
 */
async function showSuccessNotification(
  outputPaths: OutputPaths,
  imageCount: number,
  warnings: string[]
): Promise<void> {
  const imageText = imageCount > 0 ? ` with ${imageCount} image${imageCount > 1 ? 's' : ''}` : '';
  const warningText = warnings.length > 0 ? ` (${warnings.length} warning${warnings.length > 1 ? 's' : ''})` : '';

  const message = `Successfully converted to Markdown${imageText}${warningText}`;

  const action = await vscode.window.showInformationMessage(
    message,
    'Open File',
    'Open Folder',
    'View Logs'
  );

  switch (action) {
    case 'Open File': {
      const doc = await vscode.workspace.openTextDocument(outputPaths.markdownPath);
      await vscode.window.showTextDocument(doc);
      break;
    }
    case 'Open Folder': {
      await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outputPaths.baseDir));
      break;
    }
    case 'View Logs':
      showOutput();
      break;
  }
}
