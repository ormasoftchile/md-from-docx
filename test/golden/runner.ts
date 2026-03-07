#!/usr/bin/env node
/**
 * Golden Test Runner
 * Compares conversion output against approved "golden" reference files
 */
import * as fs from 'fs';
import * as path from 'path';
import { convertDocxToMarkdown, convertHtmlToMarkdown, StandaloneConversionResult } from '../../src/cli/standalone';

const GOLDEN_DIR = __dirname;

interface TestCaseMeta {
  description?: string;
  source?: 'Word Online' | 'Word Desktop' | 'LibreOffice' | 'Google Docs';
  knownIssues?: string[];
  skipReason?: string | null;
  imageCount?: number;
  tags?: string[];
  tolerance?: {
    ignoreWhitespace?: boolean;
    ignoreImagePaths?: boolean;
  };
}

interface TestResult {
  name: string;
  passed: boolean;
  skipped: boolean;
  error?: string;
  diff?: DiffResult;
  duration: number;
}

interface DiffResult {
  expectedLines: number;
  actualLines: number;
  addedLines: number;
  removedLines: number;
  changedLines: number;
  details: string[];
}

/**
 * Discover all test cases in the golden directory
 */
function discoverTestCases(): string[] {
  const entries = fs.readdirSync(GOLDEN_DIR, { withFileTypes: true });
  return entries
    .filter(e => e.isDirectory() && !e.name.startsWith('.'))
    .map(e => e.name)
    .sort();
}

/**
 * Load test case metadata
 */
function loadMeta(casePath: string): TestCaseMeta {
  const metaPath = path.join(casePath, 'meta.json');
  if (fs.existsSync(metaPath)) {
    return JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  }
  return {};
}

/**
 * Normalize markdown for comparison
 */
function normalizeMarkdown(md: string, options?: { ignoreWhitespace?: boolean; ignoreImagePaths?: boolean }): string {
  let normalized = md;
  
  if (options?.ignoreWhitespace) {
    // Normalize line endings
    normalized = normalized.replace(/\r\n/g, '\n');
    // Collapse multiple blank lines to one
    normalized = normalized.replace(/\n{3,}/g, '\n\n');
    // Trim trailing whitespace from lines
    normalized = normalized.replace(/[ \t]+$/gm, '');
    // Trim leading/trailing whitespace from document
    normalized = normalized.trim();
  }

  if (options?.ignoreImagePaths) {
    // Normalize image paths to just filename
    normalized = normalized.replace(/!\[([^\]]*)\]\([^)]+\/([^)]+)\)/g, '![$1]($2)');
  }

  return normalized;
}

/**
 * Compute diff between expected and actual
 */
function computeDiff(expected: string, actual: string): DiffResult {
  const expectedLines = expected.split('\n');
  const actualLines = actual.split('\n');
  
  const details: string[] = [];
  let addedLines = 0;
  let removedLines = 0;
  let changedLines = 0;

  // Simple line-by-line comparison
  const maxLines = Math.max(expectedLines.length, actualLines.length);
  
  for (let i = 0; i < maxLines; i++) {
    const exp = expectedLines[i];
    const act = actualLines[i];
    
    if (exp === undefined) {
      addedLines++;
      if (details.length < 20) {
        details.push(`+${i + 1}: ${act?.substring(0, 80)}`);
      }
    } else if (act === undefined) {
      removedLines++;
      if (details.length < 20) {
        details.push(`-${i + 1}: ${exp?.substring(0, 80)}`);
      }
    } else if (exp !== act) {
      changedLines++;
      if (details.length < 20) {
        details.push(`~${i + 1}:`);
        details.push(`  expected: ${exp.substring(0, 60)}`);
        details.push(`  actual:   ${act.substring(0, 60)}`);
      }
    }
  }

  if (details.length >= 20) {
    details.push(`... and more differences`);
  }

  return {
    expectedLines: expectedLines.length,
    actualLines: actualLines.length,
    addedLines,
    removedLines,
    changedLines,
    details,
  };
}

/**
 * Run a single test case
 */
async function runTestCase(caseName: string): Promise<TestResult> {
  const startTime = Date.now();
  const casePath = path.join(GOLDEN_DIR, caseName);
  
  // Load metadata
  const meta = loadMeta(casePath);
  
  if (meta.skipReason) {
    return {
      name: caseName,
      passed: true,
      skipped: true,
      duration: Date.now() - startTime,
    };
  }

  // Find input file
  const docxPath = path.join(casePath, 'input.docx');
  const htmlPath = path.join(casePath, 'input.html');
  const expectedPath = path.join(casePath, 'expected.md');

  if (!fs.existsSync(expectedPath)) {
    return {
      name: caseName,
      passed: false,
      skipped: false,
      error: 'Missing expected.md - run with --update to generate',
      duration: Date.now() - startTime,
    };
  }

  try {
    let result: StandaloneConversionResult;

    if (fs.existsSync(docxPath)) {
      result = await convertDocxToMarkdown(docxPath);
    } else if (fs.existsSync(htmlPath)) {
      const html = fs.readFileSync(htmlPath, 'utf-8');
      result = convertHtmlToMarkdown(html);
    } else {
      return {
        name: caseName,
        passed: false,
        skipped: false,
        error: 'No input.docx or input.html found',
        duration: Date.now() - startTime,
      };
    }

    // Load expected output
    const expected = fs.readFileSync(expectedPath, 'utf-8');

    // Normalize both for comparison
    const tolerance = meta.tolerance || { ignoreWhitespace: true };
    const normalizedExpected = normalizeMarkdown(expected, tolerance);
    const normalizedActual = normalizeMarkdown(result.markdown, tolerance);

    if (normalizedExpected === normalizedActual) {
      return {
        name: caseName,
        passed: true,
        skipped: false,
        duration: Date.now() - startTime,
      };
    }

    // Compute diff for failure report
    const diff = computeDiff(normalizedExpected, normalizedActual);

    return {
      name: caseName,
      passed: false,
      skipped: false,
      diff,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      name: caseName,
      passed: false,
      skipped: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Update expected output for a test case
 */
async function updateTestCase(caseName: string): Promise<void> {
  const casePath = path.join(GOLDEN_DIR, caseName);
  const docxPath = path.join(casePath, 'input.docx');
  const htmlPath = path.join(casePath, 'input.html');
  const expectedPath = path.join(casePath, 'expected.md');

  let result: StandaloneConversionResult;

  if (fs.existsSync(docxPath)) {
    result = await convertDocxToMarkdown(docxPath);
  } else if (fs.existsSync(htmlPath)) {
    const html = fs.readFileSync(htmlPath, 'utf-8');
    result = convertHtmlToMarkdown(html);
  } else {
    throw new Error(`No input file found in ${casePath}`);
  }

  fs.writeFileSync(expectedPath, result.markdown);
  console.log(`✅ Updated ${expectedPath}`);
  console.log(`   ${result.markdown.split('\n').length} lines`);
  console.log(`   ${result.imageCount} images`);
}

/**
 * Add a new test case from a DOCX file
 */
async function addTestCase(docxPath: string, name: string): Promise<void> {
  const casePath = path.join(GOLDEN_DIR, name);
  
  if (fs.existsSync(casePath)) {
    throw new Error(`Test case already exists: ${name}`);
  }

  fs.mkdirSync(casePath, { recursive: true });
  
  // Copy input file
  const inputPath = path.join(casePath, 'input.docx');
  fs.copyFileSync(docxPath, inputPath);

  // Generate expected output
  const result = await convertDocxToMarkdown(docxPath);
  fs.writeFileSync(path.join(casePath, 'expected.md'), result.markdown);

  // Create meta.json
  const meta: TestCaseMeta = {
    description: `Imported from ${path.basename(docxPath)}`,
    imageCount: result.imageCount,
    tags: [],
  };
  fs.writeFileSync(path.join(casePath, 'meta.json'), JSON.stringify(meta, null, 2));

  console.log(`✅ Created test case: ${name}`);
  console.log(`   Input: ${inputPath}`);
  console.log(`   Expected: ${result.markdown.split('\n').length} lines`);
  console.log(`   Images: ${result.imageCount}`);
  console.log(`\n⚠️  Review expected.md and edit if needed before committing!`);
}

/**
 * Print test results
 */
function printResults(results: TestResult[]): void {
  const passed = results.filter(r => r.passed && !r.skipped);
  const failed = results.filter(r => !r.passed && !r.skipped);
  const skipped = results.filter(r => r.skipped);

  console.log('\n' + '='.repeat(60));
  console.log('GOLDEN TEST RESULTS');
  console.log('='.repeat(60));

  for (const result of results) {
    const icon = result.skipped ? '⏭️ ' : result.passed ? '✅' : '❌';
    const time = `(${result.duration}ms)`;
    console.log(`${icon} ${result.name} ${time}`);
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    
    if (result.diff) {
      console.log(`   Expected: ${result.diff.expectedLines} lines`);
      console.log(`   Actual: ${result.diff.actualLines} lines`);
      console.log(`   Changes: +${result.diff.addedLines} -${result.diff.removedLines} ~${result.diff.changedLines}`);
      if (result.diff.details.length > 0) {
        console.log('   Diff:');
        result.diff.details.forEach(d => console.log(`     ${d}`));
      }
    }
  }

  console.log('\n' + '-'.repeat(60));
  console.log(`Total: ${results.length} | ✅ ${passed.length} | ❌ ${failed.length} | ⏭️  ${skipped.length}`);
  console.log('-'.repeat(60));
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Golden Test Runner

Usage:
  npx ts-node test/golden/runner.ts [options]

Commands:
  (default)              Run all golden tests
  --update <case>        Update expected.md for a case
  --add <file> <name>    Add a new test case from a DOCX file
  --list                 List all test cases

Options:
  --case <name>          Run only specific case(s), comma-separated
  --verbose, -v          Show detailed output
  --help, -h             Show this help

Examples:
  npx ts-node test/golden/runner.ts
  npx ts-node test/golden/runner.ts --case basic-headings
  npx ts-node test/golden/runner.ts --update basic-headings
  npx ts-node test/golden/runner.ts --add ./sample.docx my-new-case
`);
    process.exit(0);
  }

  // Handle --list
  if (args.includes('--list')) {
    const cases = discoverTestCases();
    console.log('Golden test cases:');
    cases.forEach(c => {
      const meta = loadMeta(path.join(GOLDEN_DIR, c));
      const status = meta.skipReason ? ' (skipped)' : '';
      const desc = meta.description ? ` - ${meta.description}` : '';
      console.log(`  ${c}${status}${desc}`);
    });
    process.exit(0);
  }

  // Handle --add
  const addIdx = args.indexOf('--add');
  if (addIdx !== -1) {
    const docxPath = args[addIdx + 1];
    const name = args[addIdx + 2];
    if (!docxPath || !name) {
      console.error('Usage: --add <docx-file> <case-name>');
      process.exit(1);
    }
    await addTestCase(docxPath, name);
    process.exit(0);
  }

  // Handle --update
  const updateIdx = args.indexOf('--update');
  if (updateIdx !== -1) {
    const caseName = args[updateIdx + 1];
    if (!caseName) {
      console.error('Usage: --update <case-name>');
      process.exit(1);
    }
    await updateTestCase(caseName);
    process.exit(0);
  }

  // Run tests
  let casesToRun = discoverTestCases();
  
  // Filter by --case if specified
  const caseIdx = args.indexOf('--case');
  if (caseIdx !== -1) {
    const filter = args[caseIdx + 1]?.split(',') || [];
    casesToRun = casesToRun.filter(c => filter.some(f => c.includes(f)));
  }

  if (casesToRun.length === 0) {
    console.log('No test cases found. Add some with --add or create manually.');
    console.log('See test/golden/README.md for instructions.');
    process.exit(0);
  }

  console.log(`Running ${casesToRun.length} golden test(s)...\n`);

  const results: TestResult[] = [];
  for (const caseName of casesToRun) {
    const result = await runTestCase(caseName);
    results.push(result);
  }

  printResults(results);

  // Exit with error code if any failed
  const failed = results.filter(r => !r.passed && !r.skipped);
  process.exit(failed.length > 0 ? 1 : 0);
}

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

export { runTestCase, updateTestCase, addTestCase, discoverTestCases };
