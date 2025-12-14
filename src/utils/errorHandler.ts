/**
 * User-friendly error handling for DOCX conversion
 */
import * as vscode from 'vscode';
import { error as logError } from './logging';

/**
 * User-friendly error messages for different error types
 */
export class ConversionError extends Error {
  constructor(
    public userMessage: string,
    public technicalMessage: string,
    public errorCode: string
  ) {
    super(userMessage);
    this.name = 'ConversionError';
  }
}

/**
 * Handle conversion errors and show appropriate user message
 */
export async function handleConversionError(err: unknown): Promise<void> {
  let userMessage = 'An error occurred during conversion';
  let technicalMessage = 'Unknown error';

  if (err instanceof ConversionError) {
    userMessage = err.userMessage;
    technicalMessage = err.technicalMessage;
  } else if (err instanceof Error) {
    technicalMessage = err.message;

    // Map common errors to user-friendly messages
    if (err.message.includes('ENOENT') || err.message.includes('not found')) {
      userMessage = 'File not found. Please check the file path and try again.';
    } else if (err.message.includes('EACCES') || err.message.includes('permission denied')) {
      userMessage = 'Permission denied. Check file permissions and try again.';
    } else if (err.message.includes('corrupted') || err.message.includes('invalid')) {
      userMessage = 'The DOCX file appears to be corrupted or invalid. Please verify the file and try again.';
    } else if (err.message.includes('memory') || err.message.includes('OOM')) {
      userMessage = 'The file is too large to process. Please try a smaller document.';
    } else {
      userMessage = `Conversion failed: ${err.message}`;
    }
  } else if (typeof err === 'string') {
    technicalMessage = err;
    userMessage = `Conversion failed: ${err}`;
  }

  // Log technical details
  logError(`[${technicalMessage}]`, { userMessage });

  // Show user-friendly error
  await vscode.window.showErrorMessage(userMessage);
}

/**
 * Throw a user-friendly conversion error
 */
export function throwConversionError(
  userMessage: string,
  technicalMessage: string,
  errorCode: string = 'UNKNOWN'
): never {
  throw new ConversionError(userMessage, technicalMessage, errorCode);
}

/**
 * Safely validate DOCX file before processing
 */
export async function validateDocxFile(filePath: string): Promise<void> {
  const fs = await import('fs').then((m) => m.promises);

  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      throwConversionError(
        'The selected item is not a file',
        `Path is not a file: ${filePath}`,
        'NOT_A_FILE'
      );
    }
    if (!filePath.toLowerCase().endsWith('.docx')) {
      throwConversionError(
        'Please select a valid .docx file',
        `File extension is not .docx: ${filePath}`,
        'INVALID_EXTENSION'
      );
    }
  } catch (err) {
    if (err instanceof ConversionError) {
      throw err;
    }
    throwConversionError(
      'Could not access the file. Please check permissions and try again.',
      `File validation failed: ${err instanceof Error ? err.message : String(err)}`,
      'FILE_ACCESS_ERROR'
    );
  }
}
