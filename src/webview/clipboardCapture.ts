/**
 * Webview panel management for clipboard capture
 */
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ClipboardPayload } from '../types';
import { debug, info, error as logError } from '../utils/logging';

/**
 * Manages the clipboard capture webview panel.
 */
export class ClipboardCapturePanel {
  public static currentPanel: ClipboardCapturePanel | undefined;

  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private disposables: vscode.Disposable[] = [];
  private onPasteCallback?: (payload: ClipboardPayload) => void;
  private onCancelCallback?: () => void;

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this.panel = panel;
    this.extensionUri = extensionUri;

    // Set webview HTML content
    this.panel.webview.html = this.getWebviewContent();

    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage(
      (message: { type: string; payload?: ClipboardPayload }) => {
        this.handleMessage(message);
      },
      null,
      this.disposables
    );

    // Handle panel disposal
    this.panel.onDidDispose(
      () => {
        this.dispose();
        if (this.onCancelCallback) {
          this.onCancelCallback();
        }
      },
      null,
      this.disposables
    );

    debug('ClipboardCapturePanel created');
  }

  /**
   * Creates or shows the clipboard capture panel.
   * @param extensionUri Extension URI for loading resources
   * @returns The panel instance
   */
  public static createOrShow(extensionUri: vscode.Uri): ClipboardCapturePanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : vscode.ViewColumn.One;

    // If panel already exists, show it
    if (ClipboardCapturePanel.currentPanel) {
      ClipboardCapturePanel.currentPanel.panel.reveal(column);
      return ClipboardCapturePanel.currentPanel;
    }

    // Create new panel
    const panel = vscode.window.createWebviewPanel(
      'clipboardCapture',
      'Paste from Word',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
      }
    );

    ClipboardCapturePanel.currentPanel = new ClipboardCapturePanel(panel, extensionUri);
    return ClipboardCapturePanel.currentPanel;
  }

  /**
   * Sets the callback for when paste data is received.
   * @param callback Function to call with clipboard payload
   */
  public onPaste(callback: (payload: ClipboardPayload) => void): void {
    this.onPasteCallback = callback;
  }

  /**
   * Sets the callback for when the panel is closed without pasting.
   * @param callback Function to call when cancelled
   */
  public onCancel(callback: () => void): void {
    this.onCancelCallback = callback;
  }

  /**
   * Sends a message to the webview.
   * @param message Message to send
   */
  public postMessage(message: { type: string; message?: string }): void {
    void this.panel.webview.postMessage(message);
  }

  /**
   * Closes the panel.
   */
  public close(): void {
    this.panel.dispose();
  }

  /**
   * Disposes the panel and cleans up resources.
   */
  public dispose(): void {
    ClipboardCapturePanel.currentPanel = undefined;

    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }

    debug('ClipboardCapturePanel disposed');
  }

  /**
   * Handles messages from the webview.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleMessage(message: { type: string; payload?: any }): void {
    debug('Received message from webview', { type: message.type });

    switch (message.type) {
      case 'paste':
        if (message.payload && this.onPasteCallback) {
          info('Paste data received from webview');
          this.onPasteCallback(message.payload as ClipboardPayload);
        }
        break;

      case 'cancel':
        this.close();
        break;

      default:
        debug('Unknown message type', { type: message.type });
    }
  }

  /**
   * Gets the HTML content for the webview.
   */
  private getWebviewContent(): string {
    // Read the HTML file from media folder
    const htmlPath = path.join(this.extensionUri.fsPath, 'media', 'clipboard.html');
    
    try {
      const html = fs.readFileSync(htmlPath, 'utf-8');
      
      // No need to modify CSP since we're using inline scripts with nonce not required
      // The CSP in the HTML file allows unsafe-inline for this simple use case
      
      return html;
    } catch (err) {
      logError('Failed to load clipboard.html', err);
      return this.getFallbackHtml();
    }
  }

  /**
   * Returns fallback HTML if the main file can't be loaded.
   */
  private getFallbackHtml(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Error</title>
</head>
<body>
  <h1>Error loading clipboard capture</h1>
  <p>Please try again or report this issue.</p>
</body>
</html>`;
  }
}
