# Golden Output Testing

This directory contains golden test cases for validating the DOCX to Markdown conversion.

## How It Works

1. Each subdirectory is a test case
2. Each case contains:
   - `input.docx` - The source Word document
   - `expected.md` - The approved "golden" markdown output
   - `meta.json` - Optional metadata (description, known issues, etc.)

## Adding a New Test Case

```bash
# Option 1: Use the CLI
npm run golden:add path/to/document.docx "descriptive-name"

# Option 2: Manual
mkdir test/golden/my-case
cp document.docx test/golden/my-case/input.docx
npm run golden:update my-case   # Generate expected.md for review
# Review the output, edit if needed, commit
```

## Running Tests

```bash
# Run all golden tests
npm run golden:test

# Run specific case
npm run golden:test -- --case table-with-merged-cells

# Update expected output for a case (after reviewing!)
npm run golden:update my-case
```

## Test Case Structure

```
test/golden/
├── 001-basic-headings/
│   ├── input.docx
│   ├── expected.md
│   └── meta.json
├── 002-tables/
│   ├── input.docx
│   ├── expected.md
│   └── meta.json
└── 003-complex-lists/
    ├── input.docx
    ├── expected.md
    └── meta.json
```

## Meta.json Format

```json
{
  "description": "Tests basic heading conversion H1-H6",
  "source": "Word Online",
  "knownIssues": [],
  "skipReason": null,
  "imageCount": 0,
  "tags": ["headings", "basic"]
}
```

## Diff Options

When a test fails, you'll see:
- Line-by-line diff of expected vs actual
- Option to update the golden output
- Structural metrics comparison
