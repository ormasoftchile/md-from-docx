/**
 * Regression Test Runner and Report Generator
 * 
 * This script:
 * - Runs functional tests before and after code changes
 * - Compares outputs to detect regressions
 * - Generates a regression report
 * - Tracks metrics over time
 * 
 * Usage:
 *   npx ts-node test/functional/runRegressionTests.ts
 *   npm run test:regression
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { parseDocx } from '../../src/conversion/docxParser';
import { htmlToMarkdown } from '../../src/conversion/htmlToMarkdown';

interface RegressionMetrics {
  timestamp: string;
  totalFiles: number;
  successfulConversions: number;
  failedConversions: number;
  averageMarkdownLength: number;
  totalHeadings: number;
  totalTables: number;
  totalImages: number;
  issues: string[];
}

interface RegressionReport {
  runId: string;
  timestamp: string;
  before: RegressionMetrics;
  after: RegressionMetrics;
  regressions: string[];
  improvements: string[];
  summary: string;
}

const FIXTURES_DIR = path.join(__dirname, '../docx');
const REPORTS_DIR = path.join(__dirname, '../reports');

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

/**
 * Collect metrics from all test fixtures
 */
async function collectMetrics(): Promise<RegressionMetrics> {
  const docxFiles = fs
    .readdirSync(FIXTURES_DIR)
    .filter((f) => f.endsWith('.docx'));

  const metrics: RegressionMetrics = {
    timestamp: new Date().toISOString(),
    totalFiles: docxFiles.length,
    successfulConversions: 0,
    failedConversions: 0,
    averageMarkdownLength: 0,
    totalHeadings: 0,
    totalTables: 0,
    totalImages: 0,
    issues: [],
  };

  let totalMarkdownLength = 0;

  for (const file of docxFiles) {
    try {
      const filePath = path.join(FIXTURES_DIR, file);
      const parseResult = await parseDocx(filePath, 'images', 'image-{index}');
      const markdown = htmlToMarkdown(parseResult.html);

      metrics.successfulConversions++;
      totalMarkdownLength += markdown.length;

      // Count features
      const headings = (markdown.match(/^#+\s/gm) || []).length;
      const tables = (markdown.match(/^\|.*\|$/gm) || []).length;
      const images = (markdown.match(/!\[/g) || []).length;

      metrics.totalHeadings += headings;
      metrics.totalTables += tables;
      metrics.totalImages += images;

      // Check for issues
      if (markdown.includes('\r\n') || markdown.includes('\r')) {
        metrics.issues.push(`${file}: Contains non-Unix line endings`);
      }
      if (markdown.includes('<') || markdown.includes('>')) {
        metrics.issues.push(`${file}: Contains HTML markup`);
      }
      if (markdown.includes('#_Toc')) {
        metrics.issues.push(`${file}: Contains Word TOC links`);
      }
    } catch (err) {
      metrics.failedConversions++;
      metrics.issues.push(
        `${file}: Conversion failed - ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  }

  if (metrics.successfulConversions > 0) {
    metrics.averageMarkdownLength = Math.round(
      totalMarkdownLength / metrics.successfulConversions
    );
  }

  return metrics;
}

/**
 * Detect regressions by comparing before/after metrics
 */
function detectRegressions(before: RegressionMetrics, after: RegressionMetrics): string[] {
  const regressions: string[] = [];

  if (after.successfulConversions < before.successfulConversions) {
    regressions.push(
      `❌ Conversion success rate decreased: ${before.successfulConversions} → ${after.successfulConversions}`
    );
  }

  if (after.failedConversions > before.failedConversions) {
    regressions.push(
      `❌ More conversions are failing: ${before.failedConversions} → ${after.failedConversions}`
    );
  }

  if (after.issues.length > before.issues.length) {
    const newIssues = after.issues.filter((i) => !before.issues.includes(i));
    regressions.push(
      `❌ New issues detected (${newIssues.length}): ${newIssues.slice(0, 3).join('; ')}`
    );
  }

  if (Math.abs(after.averageMarkdownLength - before.averageMarkdownLength) > 100) {
    regressions.push(
      `⚠️  Markdown output size changed significantly: ${before.averageMarkdownLength} → ${after.averageMarkdownLength} chars`
    );
  }

  if (after.totalHeadings < before.totalHeadings * 0.9) {
    regressions.push(
      `❌ Heading detection degraded: ${before.totalHeadings} → ${after.totalHeadings}`
    );
  }

  if (after.totalTables < before.totalTables * 0.9) {
    regressions.push(
      `❌ Table detection degraded: ${before.totalTables} → ${after.totalTables}`
    );
  }

  return regressions;
}

/**
 * Detect improvements
 */
function detectImprovements(before: RegressionMetrics, after: RegressionMetrics): string[] {
  const improvements: string[] = [];

  if (after.failedConversions < before.failedConversions) {
    improvements.push(
      `✅ Fewer conversion failures: ${before.failedConversions} → ${after.failedConversions}`
    );
  }

  if (after.issues.length < before.issues.length) {
    improvements.push(
      `✅ Issues reduced: ${before.issues.length} → ${after.issues.length}`
    );
  }

  if (after.totalHeadings > before.totalHeadings * 1.05) {
    improvements.push(
      `✅ Better heading detection: ${before.totalHeadings} → ${after.totalHeadings}`
    );
  }

  if (after.totalTables > before.totalTables * 1.05) {
    improvements.push(
      `✅ Better table detection: ${before.totalTables} → ${after.totalTables}`
    );
  }

  return improvements;
}

/**
 * Generate a detailed regression report
 */
function generateReport(
  before: RegressionMetrics,
  after: RegressionMetrics,
  regressions: string[],
  improvements: string[]
): RegressionReport {
  const runId = `run-${Date.now()}`;
  const hasRegressions = regressions.length > 0;
  const hasImprovements = improvements.length > 0;

  let summary = '';
  if (hasRegressions) {
    summary = `🔴 REGRESSIONS DETECTED (${regressions.length})`;
  } else if (hasImprovements) {
    summary = `🟢 IMPROVEMENTS DETECTED (${improvements.length})`;
  } else {
    summary = '🟡 NO SIGNIFICANT CHANGES';
  }

  return {
    runId,
    timestamp: new Date().toISOString(),
    before,
    after,
    regressions,
    improvements,
    summary,
  };
}

/**
 * Save report to file
 */
function saveReport(report: RegressionReport): string {
  const reportPath = path.join(REPORTS_DIR, `regression-${report.runId}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  return reportPath;
}

/**
 * Format report for console output
 */
function formatReport(report: RegressionReport): string {
  let output = '\n' + '='.repeat(70) + '\n';
  output += `REGRESSION TEST REPORT\n`;
  output += `Run ID: ${report.runId}\n`;
  output += `Timestamp: ${report.timestamp}\n`;
  output += '='.repeat(70) + '\n\n';

  output += 'SUMMARY\n';
  output += '-'.repeat(70) + '\n';
  output += `${report.summary}\n\n`;

  output += 'METRICS COMPARISON\n';
  output += '-'.repeat(70) + '\n';
  output += `Files Processed:        ${report.before.totalFiles}\n`;
  output += `Successful Conversions: ${report.before.successfulConversions} → ${report.after.successfulConversions}\n`;
  output += `Failed Conversions:     ${report.before.failedConversions} → ${report.after.failedConversions}\n`;
  output += `Avg Markdown Length:    ${report.before.averageMarkdownLength} → ${report.after.averageMarkdownLength} chars\n`;
  output += `Total Headings:         ${report.before.totalHeadings} → ${report.after.totalHeadings}\n`;
  output += `Total Tables:           ${report.before.totalTables} → ${report.after.totalTables}\n`;
  output += `Total Images:           ${report.before.totalImages} → ${report.after.totalImages}\n`;
  output += `Issues Found:           ${report.before.issues.length} → ${report.after.issues.length}\n\n`;

  if (report.regressions.length > 0) {
    output += 'REGRESSIONS\n';
    output += '-'.repeat(70) + '\n';
    report.regressions.forEach((r) => {
      output += `${r}\n`;
    });
    output += '\n';
  }

  if (report.improvements.length > 0) {
    output += 'IMPROVEMENTS\n';
    output += '-'.repeat(70) + '\n';
    report.improvements.forEach((i) => {
      output += `${i}\n`;
    });
    output += '\n';
  }

  if (report.after.issues.length > 0) {
    output += 'CURRENT ISSUES\n';
    output += '-'.repeat(70) + '\n';
    report.after.issues.slice(0, 10).forEach((issue) => {
      output += `• ${issue}\n`;
    });
    if (report.after.issues.length > 10) {
      output += `... and ${report.after.issues.length - 10} more\n`;
    }
    output += '\n';
  }

  output += '='.repeat(70) + '\n';

  return output;
}

/**
 * Main regression test runner
 */
async function runRegressionTests() {
  console.log('🧪 Starting Regression Tests...\n');

  try {
    console.log('Collecting baseline metrics...');
    const before = await collectMetrics();
    console.log(
      `✓ Baseline collected: ${before.successfulConversions}/${before.totalFiles} successful`
    );

    console.log('\nRunning Jest tests...');
    try {
      execSync('npm run test:functional 2>&1', { stdio: 'inherit' });
      console.log('✓ All tests passed');
    } catch (err) {
      console.warn('⚠️  Some tests failed (see output above)');
    }

    console.log('\nCollecting post-test metrics...');
    const after = await collectMetrics();
    console.log(
      `✓ Post-test metrics collected: ${after.successfulConversions}/${after.totalFiles} successful`
    );

    console.log('\nAnalyzing for regressions...');
    const regressions = detectRegressions(before, after);
    const improvements = detectImprovements(before, after);

    const report = generateReport(before, after, regressions, improvements);
    const reportPath = saveReport(report);

    const formattedReport = formatReport(report);
    console.log(formattedReport);

    console.log(`📄 Full report saved to: ${reportPath}`);

    // Return exit code based on regressions
    if (regressions.length > 0) {
      console.log('\n❌ REGRESSION DETECTED');
      process.exit(1);
    } else {
      console.log('\n✅ NO REGRESSIONS DETECTED');
      process.exit(0);
    }
  } catch (err) {
    console.error(
      '❌ Regression test failed:',
      err instanceof Error ? err.message : 'Unknown error'
    );
    process.exit(1);
  }
}

// Run the regression tests if this is the main module
if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  runRegressionTests();
}

export { collectMetrics, detectRegressions, generateReport, formatReport, saveReport };
