/**
 * Command handler for pasting rich content from clipboard as Markdown
 */
import * as vscode from 'vscode';
import { ClipboardPayload, ConversionOptions } from '../types';
import { ClipboardCapturePanel } from '../webview/clipboardCapture';
import { htmlToMarkdown } from '../conversion/htmlToMarkdown';
import { processClipboardImages, writeImages } from '../conversion/imageExtractor';
import { getSettings, resolveImagesFolderName } from '../config/settings';
import {
  writeFile,
  joinPath,
  hasWorkspaceFolder,
  ensureWorkspaceFolder,
  getWorkspaceFolder,
  exists,
  getUniquePath,
  getUniqueFolderPath,
} from '../utils/fileSystem';
import { info, error as logError, debug } from '../utils/logging';

/**
 * Handles the 'docxMarkdownConverter.pasteAsMarkdown' command.
 * Opens a webview for capturing clipboard content and converts it to Markdown.
 *
 * @param extensionUri Extension URI for resource loading
 */
export async function handlePasteAsMarkdown(extensionUri: vscode.Uri): Promise<void> {
  try {
    // Ensure workspace folder is open
    if (!hasWorkspaceFolder()) {
      const opened = await ensureWorkspaceFolder();
      if (!opened) {
        return; // User cancelled
      }
    }

    debug('Opening clipboard capture panel');

    // Create/show the webview panel
    const panel = ClipboardCapturePanel.createOrShow(extensionUri);

    // Handle paste data
    panel.onPaste((payload: ClipboardPayload) => {
      processClipboardPaste(payload, panel).catch((err) => {
        logError('Failed to process clipboard paste', err);
        panel.postMessage({
          type: 'error',
          message: err instanceof Error ? err.message : 'Conversion failed',
        });
      });
    });

    // Handle cancel (panel closed)
    panel.onCancel(() => {
      debug('Clipboard capture cancelled by user');
    });
  } catch (err) {
    logError('Failed to open clipboard capture', err);
    void vscode.window.showErrorMessage(
      `Failed to open clipboard capture: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
}

/**
 * Processes clipboard paste data and creates the Markdown file.
 * @param payload Clipboard data from webview
 * @param panel Webview panel for status updates
 */
async function processClipboardPaste(
  payload: ClipboardPayload,
  panel: ClipboardCapturePanel
): Promise<void> {
  const settings = getSettings();

  debug('Processing clipboard paste', {
    hasHtml: !!payload.html,
    imageCount: payload.images.length,
    hasRichContent: payload.hasRichContent,
  });

  // Handle plain text paste (no HTML)
  if (!payload.hasRichContent && !payload.html) {
    await handlePlainTextPaste(payload, settings);
    panel.postMessage({ type: 'success', message: 'Text inserted!' });
    panel.close();
    return;
  }

  // Determine output location based on settings
  if (settings.pasteTarget === 'currentEditor') {
    await insertIntoCurrentEditor(payload, settings);
    panel.postMessage({ type: 'success', message: 'Content inserted!' });
    panel.close();
    return;
  }

  // Create new file
  await createNewMarkdownFile(payload, settings);
  panel.postMessage({ type: 'success', message: 'Markdown file created!' });
  panel.close();
}

/**
 * Handles plain text paste - inserts directly without conversion.
 */
async function handlePlainTextPaste(
  payload: ClipboardPayload,
  settings: ConversionOptions
): Promise<void> {
  const editor = vscode.window.activeTextEditor;

  if (settings.pasteTarget === 'currentEditor' && editor) {
    // Insert plain text at cursor
    await editor.edit((editBuilder) => {
      editBuilder.insert(editor.selection.active, payload.html || '');
    });
    info('Plain text inserted into current editor');
  } else {
    // Create new file with plain text
    const doc = await vscode.workspace.openTextDocument({
      content: payload.html || '',
      language: 'markdown',
    });
    await vscode.window.showTextDocument(doc);
    info('Plain text inserted into new document');
  }
}

/**
 * Inserts converted Markdown into the current editor at cursor position.
 */
async function insertIntoCurrentEditor(
  payload: ClipboardPayload,
  settings: ConversionOptions
): Promise<void> {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    // No active editor, fall back to new file
    await createNewMarkdownFile(payload, settings);
    return;
  }

  // Process images if any
  let html = payload.html;
  if (payload.images.length > 0) {
    const docPath = editor.document.uri.fsPath;
    const docDir = docPath.substring(0, docPath.lastIndexOf('/'));
    const docName = editor.document.fileName.replace(/\.[^/.]+$/, '').split('/').pop() || 'paste';
    const imagesFolderName = resolveImagesFolderName(settings.imagesFolderName, docName);
    const imagesFolderPath = joinPath(docDir, imagesFolderName);

    const { images, html: updatedHtml } = processClipboardImages(
      html,
      payload.images,
      imagesFolderName,
      settings.imageFileNamePattern
    );

    html = updatedHtml;

    // Write images to disk
    await writeImages(images, imagesFolderPath);
    info(`Wrote ${images.length} images to ${imagesFolderPath}`);
  }

  // Convert HTML to Markdown
  const markdown = htmlToMarkdown(html);

  // Insert at cursor
  await editor.edit((editBuilder) => {
    editBuilder.insert(editor.selection.active, markdown);
  });

  info('Markdown inserted into current editor');
}

/**
 * Creates a new Markdown file with the converted content.
 */
async function createNewMarkdownFile(
  payload: ClipboardPayload,
  settings: ConversionOptions
): Promise<void> {
  const workspaceFolder = getWorkspaceFolder();
  const workspacePath = workspaceFolder.uri.fsPath;

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const baseName = `paste-${timestamp}`;
  const imagesFolderName = resolveImagesFolderName(settings.imagesFolderName, baseName);
  let imagesFolderPath = joinPath(workspacePath, imagesFolderName);
  // Avoid folder collisions — append -1, -2, etc. if needed
  imagesFolderPath = await getUniqueFolderPath(imagesFolderPath);

  // Determine markdown file path
  let markdownPath = joinPath(workspacePath, `${baseName}.md`);
  if (await exists(markdownPath)) {
    markdownPath = await getUniquePath(joinPath(workspacePath, baseName), '.md');
  }

  // Process images
  let html = payload.html;
  if (payload.images.length > 0) {
    const { images, html: updatedHtml } = processClipboardImages(
      html,
      payload.images,
      imagesFolderName,
      settings.imageFileNamePattern
    );

    html = updatedHtml;

    // Write images to disk
    await writeImages(images, imagesFolderPath);
    info(`Wrote ${images.length} images to ${imagesFolderPath}`);
  }

  // Convert HTML to Markdown
  const markdown = htmlToMarkdown(html);

  // Write markdown file
  await writeFile(markdownPath, markdown);
  info(`Created markdown file: ${markdownPath}`);

  // Open the new file if configured
  if (settings.openAfterConversion) {
    const doc = await vscode.workspace.openTextDocument(markdownPath);
    await vscode.window.showTextDocument(doc);
  }

  // Show notification
  if (settings.showNotifications) {
    const imageText = payload.images.length > 0 
      ? ` with ${payload.images.length} image${payload.images.length > 1 ? 's' : ''}`
      : '';
    void vscode.window.showInformationMessage(
      `Created ${baseName}.md${imageText}`
    );
  }
}
