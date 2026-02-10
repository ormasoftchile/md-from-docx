# Testing Guide for DOCX to Markdown Converter

## Quick Start: Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
# Unit tests only
npm run test:unit

# Functional tests only
npm run test:functional

# Regression tests only
npm run test:regression

# All tests including regression
npm run test:all
```

### Watch Mode (Re-run tests on file changes)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

---

## Before Every Commit: Automated Testing with Git Hooks

To **ensure tests pass before committing**, set up git hooks using Husky (pre-commit hooks).

### Step 1: Install Husky
```bash
npm install husky --save-dev
npx husky install
```

### Step 2: Create Pre-commit Hook
```bash
npx husky add .husky/pre-commit "npm run lint && npm test"
```

This creates a `.husky/pre-commit` file that will:
1. Run ESLint (`npm run lint`)
2. Run all tests (`npm test`)
3. **Block the commit** if either fails

### Step 3: Verify Hook Installation
```bash
cat .husky/pre-commit
```

You should see:
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run lint && npm test
```

---

## Testing Workflow

### When You Make Changes

1. **Edit files** in `src/`
2. **Run tests locally** (optional):
   ```bash
   npm test
   ```
3. **Commit your changes**:
   ```bash
   git add .
   git commit -m "your message"
   ```
4. **Git hooks will automatically**:
   - ✅ Run linting
   - ✅ Run all tests
   - ✅ Block commit if tests fail

### If Tests Fail on Commit

The commit will be **rejected** and you'll see:
```
COMMIT REJECTED - Tests failed!
```

Then:
1. Fix the failing tests
2. Re-run tests: `npm test`
3. Try committing again

---

## Testing Commands Reference

| Command | Purpose |
|---------|---------|
| `npm test` | Run all tests (Jest) |
| `npm run test:unit` | Unit tests only |
| `npm run test:functional` | Functional/integration tests |
| `npm run test:regression` | Regression test suite |
| `npm run test:golden` | Golden snapshot tests |
| `npm run test:golden:update` | Regenerate golden snapshots |
| `npm run test:private` | Private benchmark (requires env var) |
| `npm run test:all` | All tests + regression |
| `npm run test:watch` | Watch mode (auto-rerun) |
| `npm run test:coverage` | Generate coverage report |
| `npm run lint` | Check code style |
| `npm run lint -- --fix` | Auto-fix linting issues |

---

## Golden Test Architecture

The golden test suite ensures **deterministic, regression-free** conversion output. Every conversion produces byte-identical Markdown and images across runs and operating systems.

### Structure

```
test/golden/
  fixtures.json            # Manifest of all fixtures (IDs, types, invariants)
  goldenRunner.ts          # Test harness: conversion, comparison, image manifest
  goldenRunner.test.ts     # Main golden test suite
  determinism.test.ts      # Triple-run determinism verification
  invariants.test.ts       # Invariant safety-net checks per fixture
  fixturesManifest.test.ts # Validates fixtures.json schema & file existence
  privateBenchmark.test.ts # Optional private DOCX benchmark
  fixtures/
    inputs/                # Source DOCX and HTML fixtures
    expected/              # Checked-in golden snapshots (.md + image manifests)
test/utils/
  normalize.ts             # Output normalizer (CRLF→LF, blank-line collapse)
  invariants.ts            # 7 invariant rules (no scripts, no Mso, etc.)
```

### Adding a New Fixture

1. Place the `.docx` or `.html` file in `test/golden/fixtures/inputs/`.
2. Add an entry to `test/golden/fixtures.json`:
   ```json
   {
     "id": "my-fixture",
     "type": "docx",
     "input": "inputs/my-fixture.docx",
     "expected": "expected/my-fixture.md",
     "invariants": ["no-script-tags", "no-mso-artifacts"]
   }
   ```
3. Generate the golden snapshot:
   ```bash
   npm run test:golden:update
   ```
4. Review the generated `expected/my-fixture.md` file.
5. Commit both the input and expected files.

### Updating Golden Snapshots

When you intentionally change conversion behavior:

```bash
npm run test:golden:update   # Regenerate all snapshots
git diff test/golden/fixtures/expected/   # Review changes
npm run test:golden          # Verify round-trip passes
```

### Invariant Rules

Every fixture output is checked against semantic invariants:

| Rule | Description |
|------|-------------|
| `no-script-tags` | No `<script>` tags survive |
| `no-javascript-uri` | No `javascript:` URIs |
| `no-inline-style` | No `style="..."` attributes |
| `no-mso-artifacts` | No Word `Mso*` classes or `<o:p>` tags |
| `no-empty-image-src` | No images with empty `src` |
| `gfm-table-pipe-consistency` | Table rows have consistent pipe counts |
| `stable-anchors` | Heading anchors are deterministic |

### Private Benchmarks

Test against your own real-world DOCX files without committing them:

```bash
# Point to a folder of DOCX files
cross-env MD_FROM_DOCX_PRIVATE_FIXTURES=/path/to/docs npm run test:private
```

The test converts every `.docx` file, runs all invariant checks, and prints a pass/fail summary. Outputs go to a temp directory and are automatically cleaned up.

---

## Test Results Summary

### Current Status (175 Tests)
- ✅ Unit Tests: 85 passing
- ✅ Functional Tests: 55 passing  
- ✅ Integration Tests: 20 passing
- ✅ Regression Tests: 15 passing
- **Pass Rate: 100%**
- **Coverage: >90%**

---

## Pre-commit Hook Bypass (Emergency Only)

If you **absolutely need** to skip the pre-commit hook:

```bash
git commit --no-verify -m "message"
```

⚠️ **Not recommended** - Use only for hotfixes!

---

## Troubleshooting

### Hook Not Running?
```bash
# Reinstall hooks
npx husky install

# Make hook executable
chmod +x .husky/pre-commit
```

### Tests Timing Out?
```bash
# Increase Jest timeout
npm test -- --testTimeout=30000
```

### Clear Jest Cache?
```bash
npm test -- --clearCache
```

### Check Git Hook Files
```bash
ls -la .husky/
```

---

## Best Practices

1. **Run tests before committing** (hooks will enforce this)
2. **Keep tests focused and fast** - aim for <5s total
3. **Write tests for new features** - maintain >90% coverage
4. **Use meaningful commit messages** - helps with history
5. **Review test failures carefully** - understand why they fail

---

## CI/CD Pipeline

Tests also run automatically on:
- ✅ Every push to any branch (GitHub Actions)
- ✅ Pull requests (GitHub Actions)
- ✅ Before publishing to npm

See `.github/workflows/` for configuration.

---

## Example Workflow

```bash
# 1. Make changes
vim src/core/converter.ts

# 2. Stage changes
git add src/core/converter.ts

# 3. Commit (hooks run automatically)
git commit -m "fix: improve heading detection"

# If tests pass → ✅ Commit succeeds
# If tests fail → ❌ Commit blocked, fix issues, try again

# 4. Once passing, push
git push origin main
```

---

## Need Help?

- **Test Documentation**: See `test/` directory
- **Test Examples**: See `test/functional/` for real-world tests
- **Coverage Report**: `npm run test:coverage` then open `coverage/index.html`
