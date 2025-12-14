/**
 * Progress tracking for long-running conversion operations
 */
import * as vscode from 'vscode';
import { info } from './logging';

/**
 * Wraps an async operation with progress notification
 */
export async function withProgress<T>(
  title: string,
  operation: (progress: ProgressReporter) => Promise<T>
): Promise<T> {
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title,
      cancellable: false,
    },
    async (progress, _token) => {
      const reporter = new ProgressReporter(progress, title);

      try {
        return await operation(reporter);
      } finally {
        reporter.done();
      }
    }
  );
}

/**
 * Reports progress updates during conversion
 */
export class ProgressReporter {
  private currentStep = 0;
  private totalSteps: number;
  private startTime = Date.now();

  constructor(
    private progress: vscode.Progress<{ message?: string; increment?: number }>,
    private operationName: string,
    totalSteps: number = 100
  ) {
    this.totalSteps = totalSteps;
    info(`Starting operation: ${operationName}`);
  }

  /**
   * Report progress at a specific step
   */
  report(message: string, step?: number): void {
    if (step !== undefined) {
      this.currentStep = step;
    } else {
      this.currentStep += 1;
    }

    const percentage = Math.min(100, Math.round((this.currentStep / this.totalSteps) * 100));
    this.progress.report({
      message: `${message} (${percentage}%)`,
      increment: Math.max(0, (percentage - (this.currentStep - 1)) * 100 / this.totalSteps),
    });

    info(`${this.operationName}: ${message} (${percentage}%)`);
  }

  /**
   * Mark operation as complete
   */
  done(): void {
    const elapsed = Date.now() - this.startTime;
    info(`Completed operation: ${this.operationName} (${elapsed}ms)`);
  }

  /**
   * Get elapsed time in seconds
   */
  getElapsedSeconds(): number {
    return (Date.now() - this.startTime) / 1000;
  }
}

/**
 * Report conversion progress at specific stages
 */
export const ConversionStages = {
  PARSING: 'Parsing DOCX file',
  EXTRACTING_IMAGES: 'Extracting images',
  CONVERTING_HTML: 'Converting to Markdown',
  WRITING_FILES: 'Writing output files',
  COMPLETE: 'Conversion complete',
} as const;
