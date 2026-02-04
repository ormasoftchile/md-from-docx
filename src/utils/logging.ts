/**
 * Logging utility with VS Code Output Channel
 * Falls back to console logging when running outside VS Code (e.g., in tests/CI)
 */

// Dynamically import vscode only when available
let vscode: typeof import('vscode') | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
  vscode = require('vscode');
} catch {
  // Running outside VS Code (tests, CI, etc.)
  vscode = undefined;
}

interface OutputChannel {
  appendLine(message: string): void;
  show(): void;
  dispose(): void;
}

let outputChannel: OutputChannel | undefined;

/**
 * Console-based fallback output channel for non-VS Code environments
 */
const consoleChannel: OutputChannel = {
  appendLine(message: string): void {
    console.log(message);
  },
  show(): void {
    // No-op for console
  },
  dispose(): void {
    // No-op for console
  },
};

/**
 * Gets or creates the extension's output channel for logging.
 * Returns a console-based channel when running outside VS Code.
 */
export function getOutputChannel(): OutputChannel {
  if (!outputChannel) {
    if (vscode?.window) {
      outputChannel = vscode.window.createOutputChannel('DOCX Markdown Converter');
    } else {
      outputChannel = consoleChannel;
    }
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
