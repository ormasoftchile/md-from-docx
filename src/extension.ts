/**
 * VS Code Extension Entry Point
 * DOCX to Markdown Converter
 */
import * as vscode from 'vscode';
import { handleConvertDocx } from './commands/convertDocx';
import { handlePasteAsMarkdown } from './commands/pasteAsMarkdown';
import { disposeOutputChannel, info } from './utils/logging';

/**
 * Called when the extension is activated.
 * Activation events are defined in package.json.
 */
export function activate(context: vscode.ExtensionContext): void {
  info('DOCX Markdown Converter extension activating...');

  // Register convert file command (for both context menu and command palette)
  const convertFileCommand = vscode.commands.registerCommand(
    'docxMarkdownConverter.convertFile',
    handleConvertDocx
  );
  context.subscriptions.push(convertFileCommand);

  // Register paste as markdown command
  const pasteAsMarkdownCommand = vscode.commands.registerCommand(
    'docxMarkdownConverter.pasteAsMarkdown',
    () => handlePasteAsMarkdown(context.extensionUri)
  );
  context.subscriptions.push(pasteAsMarkdownCommand);

  // Register output channel for disposal
  context.subscriptions.push({
    dispose: () => disposeOutputChannel(),
  });

  info('DOCX Markdown Converter extension activated');
}

/**
 * Called when the extension is deactivated.
 */
export function deactivate(): void {
  info('DOCX Markdown Converter extension deactivating...');
  disposeOutputChannel();
}
