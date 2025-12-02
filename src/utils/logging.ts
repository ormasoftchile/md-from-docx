/**
 * Logging utility with VS Code Output Channel
 */
import * as vscode from 'vscode';

let outputChannel: vscode.OutputChannel | undefined;

/**
 * Gets or creates the extension's output channel for logging.
 */
export function getOutputChannel(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('DOCX Markdown Converter');
  }
  return outputChannel;
}

/**
 * Log levels for structured logging.
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/**
 * Logs a message to the output channel with timestamp and level.
 */
export function log(level: LogLevel, message: string, ...args: unknown[]): void {
  const channel = getOutputChannel();
  const timestamp = new Date().toISOString();
  const formattedArgs = args.length > 0 ? ` ${JSON.stringify(args)}` : '';
  channel.appendLine(`[${timestamp}] [${level}] ${message}${formattedArgs}`);
}

/**
 * Log a debug message.
 */
export function debug(message: string, ...args: unknown[]): void {
  log(LogLevel.DEBUG, message, ...args);
}

/**
 * Log an info message.
 */
export function info(message: string, ...args: unknown[]): void {
  log(LogLevel.INFO, message, ...args);
}

/**
 * Log a warning message.
 */
export function warn(message: string, ...args: unknown[]): void {
  log(LogLevel.WARN, message, ...args);
}

/**
 * Log an error message.
 */
export function error(message: string, ...args: unknown[]): void {
  log(LogLevel.ERROR, message, ...args);
}

/**
 * Shows the output channel to the user.
 */
export function showOutput(): void {
  getOutputChannel().show();
}

/**
 * Disposes the output channel. Call this in extension deactivation.
 */
export function disposeOutputChannel(): void {
  if (outputChannel) {
    outputChannel.dispose();
    outputChannel = undefined;
  }
}
