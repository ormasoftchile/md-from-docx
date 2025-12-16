# Functional Tests: Comprehensive Regression Detection Suite

This directory contains comprehensive functional tests designed to detect regressions whenever code changes are made to the DOCX to Markdown converter.

## Overview

The functional test suite consists of three main test files:

1. **`regression.test.ts`** - Real-world DOCX file conversion tests using actual test fixtures
2. **`features.test.ts`** - Feature-focused tests for specific conversion capabilities
3. **`runRegressionTests.ts`** - Regression analysis tool with metrics collection and reporting

## Test Files

### regression.test.ts

Validates conversion outputs against real DOCX files and detects:

- **Fixture Consistency**: Tests all .docx files in `/test/docx/`
- **Parse Success**: Verifies DOCX files parse without errors
- **HTML to Markdown Conversion**: Validates HTML → Markdown transformation
- **Consistent Metrics**: Ensures repeated conversions produce identical results
- **Markdown Structure**: Validates proper markdown syntax
- **Image Handling**: Verifies correct image reference extraction
- **Line Ending Normalization**: Detects CRLF/CR issues
- **Reference Comparison**: Compares against expected .md output files
- **Word Online Artifacts**: Detects and removes Word-specific HTML tags
- **Heading Hierarchy**: Validates H1/H2/H3 nesting
- **Table Format**: Ensures GFM table format
- **Known Issue Regression**: Specific tests for previously-fixed issues

#### Key Metrics Tracked

- Markdown output length
- Heading count and hierarchy
- Table count and format
- Image reference count
- Code block count
- List count
- Link count
- Overall markdown structure validity

### features.test.ts

Tests specific conversion features in isolation:

- **Heading Conversion** - H1-H6 hierarchy, special characters, numbered outlines
- **Table Conversion** - HTML tables → GFM format, complex tables, nested formatting
- **Image References** - Path encoding, special characters, alt text preservation
- **Text Formatting** - Bold, italic, strikethrough, code, code blocks
- **Lists** - Ordered/unordered lists, nesting, complex content
- **Links** - Regular hyperlinks, titles, anchors, TOC link removal
- **Line Ending Normalization** - CRLF/CR → LF conversion, mixed line endings
- **Word Online Artifacts** - Namespace tag removal, conditional comments
- **Whitespace Cleanup** - Excessive newlines, leading/trailing whitespace
- **Clipboard Content** - Real-world clipboard HTML conversion
- **Edge Cases** - Empty HTML, whitespace-only, large documents, deeply nested HTML, malformed HTML

### runRegressionTests.ts

Automated regression detection and reporting tool that:

1. Collects baseline metrics from all .docx files
2. Runs the Jest test suite
3. Collects post-test metrics
4. Compares before/after to detect regressions
5. Generates detailed regression reports
6. Saves reports to `/test/reports/`

#### Report Contents

- Conversion success rate changes
- Failure count changes
- Markdown output size changes
- Feature detection changes (headings, tables, images)
- New issues detected
- Improvements made

## Running the Tests

### Run All Tests

```bash
npm run test
```

### Run Only Unit Tests

```bash
npm run test:unit
```

### Run Only Functional Tests

```bash
npm run test:functional
```

### Run Only Regression Analysis

```bash
npm run test:regression
```

This generates a comprehensive report comparing metrics before and after changes.

### Run All Tests + Regression Analysis

```bash
npm run test:all
```

### Watch Mode (Re-run on File Changes)

```bash
npm run test:watch
```

### Generate Coverage Report

```bash
npm run test:coverage
```

## Workflow: Detecting Regressions

### Before Making Changes

1. **Establish baseline:**
   ```bash
   npm run test:regression
   ```
   
   This captures the current state in `/test/reports/regression-*.json`

2. **Review the baseline report** for any pre-existing issues

### Making Code Changes

1. Make your changes to the source code
2. Run the test suite to catch obvious issues:
   ```bash
   npm run test
   ```

### After Changes

1. **Run regression analysis:**
   ```bash
   npm run test:regression
   ```

2. **Compare reports:**
   - Check the new report in `/test/reports/`
   - Look for 🔴 REGRESSIONS or 🟡 NO SIGNIFICANT CHANGES sections
   - If regressions are detected, fix them before committing

3. **Commit only if regression-free:**
   ```bash
   git add .
   git commit -m "feat: [description]"
   ```

## Test Fixtures

All real DOCX files in `/test/docx/` are used as test fixtures:

- `TESIS-RENATOGERMANI.docx` - Large thesis document with complex formatting
- `02 INFORME DE PROYECTO Postula Fácil.docx` - Project report with tables
- `Documentación.docx` - General documentation
- `Correo institucional_como ingresar.docx` - Email/tutorial document
- `Doc2.docx` - Test document

Each fixture has an accompanying `.md` file that shows the expected output.

## Regression Sensitivity

The regression detection uses a **10% tolerance** for metrics to allow for minor variations due to document updates or library behavior changes:

```typescript
tolerance = 0.1 // 10% variance allowed
```

Regressions are flagged when:

- Conversion success rate **decreases**
- More conversions **fail**
- **New issues** are detected
- Feature detection drops **significantly** (>90% of baseline)
- Markdown output size changes **dramatically** (>10%)

## Known Issues Being Monitored

The regression suite specifically tracks previously-fixed issues:

1. **Heading Level Nesting** (v1.1.7)
   - Both H1 and H2 becoming H1 in output
   - Test: `should have fixed heading level nesting`

2. **TOC Links** (v1.1.5)
   - Word's #_Toc anchors appearing in output
   - Test: `should have removed TOC links`

3. **Table Format** (v1.1.2-1.1.4)
   - HTML markup instead of GFM tables
   - Test: `should have proper GFM tables`

4. **Line Ending Normalization** (v1.1.3)
   - CRLF causing "twisted tables" and double-spacing
   - Test: `should have normalized line endings`

## Report Location

Regression reports are saved in: `/test/reports/regression-run-*.json`

Example report structure:

```json
{
  "runId": "run-1701234567890",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "before": {
    "totalFiles": 5,
    "successfulConversions": 5,
    "failedConversions": 0,
    "averageMarkdownLength": 8500,
    "totalHeadings": 45,
    "totalTables": 12,
    "totalImages": 8,
    "issues": []
  },
  "after": {
    "totalFiles": 5,
    "successfulConversions": 5,
    "failedConversions": 0,
    "averageMarkdownLength": 8520,
    "totalHeadings": 45,
    "totalTables": 12,
    "totalImages": 8,
    "issues": []
  },
  "regressions": [],
  "improvements": [],
  "summary": "🟡 NO SIGNIFICANT CHANGES"
}
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Regression Tests
on: [pull_request, push]
jobs:
  regression:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:regression
```

The test suite will exit with code `1` if regressions are detected, causing the CI to fail.

## Troubleshooting

### Tests Failing

1. **Check test output** for specific failures
2. **Run individual test suites** to isolate the issue
3. **Check recent code changes** that might have caused the failure
4. **Review the generated report** in `/test/reports/`

### Metrics Changing Unexpectedly

1. **Update your test fixtures** if the original DOCX files were modified
2. **Regenerate expected .md files** if content legitimately changed:
   ```bash
   npm run compile
   npm run test:functional
   # Check the generated markdown outputs
   ```

### Performance Issues

If tests are running slowly:

1. Reduce the number of DOCX test fixtures (temporarily move some to a backup)
2. Run `test:functional` instead of `test:all`
3. Run `test:watch` with fewer files for development

## Best Practices

1. **Run regression tests before committing** to catch unintended changes
2. **Review reports carefully** - look for 🔴 REGRESSIONS sections
3. **Keep fixtures updated** - if you update a DOCX file, update its expected .md output
4. **Monitor metrics over time** - save reports to track improvements
5. **Use version control** - commit reports alongside code for history
6. **Run full test suite** before publishing versions

## Extending the Tests

To add new regression tests:

1. **Add HTML test cases to `features.test.ts`:**
   ```typescript
   it('should handle [new feature]', () => {
     const html = '<p>Test HTML</p>';
     const markdown = htmlToMarkdown(html);
     expect(markdown).toContain('expected output');
   });
   ```

2. **Add real fixtures to `/test/docx/`:**
   - Add `.docx` file
   - Add expected `.md` output
   - Tests will automatically pick them up

3. **Update metrics tracking in `regression.test.ts`:**
   - Add new metrics to `RegressionBaseline` interface
   - Update `extractMetrics()` function
   - Update comparison logic

## Performance Expectations

- Unit tests: ~2-3 seconds
- Functional tests: ~10-15 seconds (depends on fixture size)
- Regression analysis: ~15-25 seconds
- Full suite (`test:all`): ~30-45 seconds

## Support

For issues or questions about the regression test suite:

1. Check the test output for specific error messages
2. Review recent commits that might have caused changes
3. Run individual tests to isolate the issue
4. Check the generated regression report for metrics changes
