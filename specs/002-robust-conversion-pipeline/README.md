# Branch: 002-robust-conversion-pipeline

**Status**: Ready for Implementation  
**Created**: December 14, 2025  
**Base**: Commits on top of `main` (v1.0.2)

## Overview

Complete specification and task breakdown for rewriting the DOCX to Markdown extension with a **crash-resistant, tiered conversion pipeline** that solves the "works on simple docs, crashes on real docs" problem.

**Key Insight**: User requirement is NO external dependencies (specifically NO Pandoc). Solution uses Mammoth (bundled) with graceful degradation on errors.

## What's in This Branch

### Documentation (857 lines total)

1. **spec.md** (166 lines) - Complete feature specification
   - 4 prioritized user stories (P1-P4) with acceptance scenarios
   - 20 functional requirements mapped to stories
   - 10 explicit edge cases with handling strategies
   - 9 measurable success criteria (95% success rate, <5s conversion, etc.)
   - 3 key entities (ConversionResult, ConversionOptions, ImageReference)

2. **plan.md** (201 lines) - Implementation plan
   - 6 phases: Setup → Architecture → Engines → Commands → Features → Testing
   - Technical context (TypeScript 5.x, Node.js 22.x, Mammoth, Turndown)
   - Complete source code structure with file paths
   - Key design decisions with rationale
   - Phase sequencing and dependencies

3. **tasks.md** (490 lines) - Task breakdown into 65 actionable tasks
   - Phase 1 (T001-T006): Setup - 6 tasks
   - Phase 2 (T007-T014): Foundation - 14 BLOCKING tasks
   - Phase 3 (T015-T022): P1 User Story - 8 tasks (Explorer context menu)
   - Phase 4 (T023-T027): P2 User Story - 5 tasks (Command Palette)
   - Phase 5 (T028-T036): P3 User Story - 9 tasks (Clipboard paste)
   - Phase 6 (T037-T044): P4 User Story - 8 tasks (Settings)
   - Phase 7 (T045-T065): Testing & Polish - 21 tasks
   - **Each task includes**: file paths, acceptance criteria, dependencies

4. **checklists/requirements.md** - Quality validation checklist

## Key Architecture Decisions

### ❌ NO External Processes
- Removed Pandoc dependency per user requirement
- Uses Mammoth (bundled) + Turndown (npm dependency)
- All processing happens in-process (Node.js)

### ✅ Graceful Error Handling
- **Never crash**: Returns partial results + warnings instead
- Handles corrupted/empty/invalid DOCX files with user-friendly messages
- Large files (100+ pages) show progress and don't freeze UI

### ✅ Deterministic Image Extraction
- Sequential naming: `image-001.png`, `image-002.png` (prevents collisions)
- Extracted during conversion, not post-processing
- Supports both file-based and clipboard-based workflows

### ✅ Safe Reference Rewriting
- Regex-only targeting Markdown `![]()` syntax
- No naive string replacement that caused crashes in v1
- Cross-platform path handling (Windows/macOS/Linux)

## Implementation Timeline

| Phase | Tasks | Week | Deliverable |
|-------|-------|------|-------------|
| 1-2 | 20 | Week 1 | Core foundation ready |
| 3 | 8 | Week 2 | **MVP**: Explorer conversion working |
| 4-5 | 14 | Week 3 | Full feature set (P1-P4) |
| 6-7 | 21 | Week 4 | Testing + production release v2.0.0 |

## Ready for Implementation

✅ **Specification complete** - All mandatory sections filled, no [NEEDS CLARIFICATION] markers  
✅ **Plan documented** - Phases, file structure, constraints all defined  
✅ **Tasks actionable** - 65 tasks with file paths and acceptance criteria  
✅ **Quality validated** - Spec/plan/tasks all pass quality gates  

## How to Start

1. Check out this branch (if not already checked out)
   ```bash
   git checkout 002-robust-conversion-pipeline
   ```

2. Review the specification to understand requirements
   ```bash
   cat specs/002-robust-conversion-pipeline/spec.md
   ```

3. Review the implementation plan for architecture details
   ```bash
   cat specs/002-robust-conversion-pipeline/plan.md
   ```

4. Start with Phase 1 setup tasks (T001-T006)
   ```bash
   cat specs/002-robust-conversion-pipeline/tasks.md | head -50
   ```

5. Create source directories as first implementation step
   ```bash
   mkdir -p src/conversion src/types src/commands src/webview src/utils
   ```

## Success Metrics

When implementation is complete, validate these outcomes:

- **SC-001**: Convert 95% of real-world DOCX files without crashes
- **SC-002**: Average document (10-20 pages) converts in <5 seconds  
- **SC-003**: Large documents (100+ pages) show progress, complete <30s
- **SC-004**: All extracted images display correctly in Markdown preview
- **SC-005**: Image collisions never occur (sequential naming)
- **SC-006**: Zero "Out of Memory" errors with files up to 100MB
- **SC-007**: 100% of user stories (P1-P4) completable without crashes
- **SC-008**: Error messages are user-friendly, not stack traces
- **SC-009**: No external dependencies required

## Files to Create During Implementation

| Path | Phase | Purpose |
|------|-------|---------|
| `src/types/index.ts` | 2 | Shared TypeScript interfaces |
| `src/conversion/mammothEngine.ts` | 2 | DOCX→HTML conversion |
| `src/conversion/htmlToMarkdown.ts` | 2 | HTML→Markdown with Turndown |
| `src/conversion/imageHandler.ts` | 2 | Image extraction + naming |
| `src/conversion/pathRewriter.ts` | 2 | Safe reference rewriting |
| `src/conversion/conversionOrchestrator.ts` | 2 | Main orchestrator |
| `src/commands/convertDocx.ts` | 3 | Explorer + Command Palette |
| `src/commands/pasteAsMarkdown.ts` | 5 | Webview paste handler |
| `src/utils/errorHandler.ts` | 3 | User-friendly errors |
| `src/utils/progress.ts` | 3 | Progress notifications |
| `src/utils/fileSystem.ts` | 3 | File operations |
| `src/webview/pastePanel.ts` | 5 | Webview controller |

## Notes

- This is a complete **rewrite** of the conversion engine, not a patch
- The UI layer (commands, extension.ts) is mostly reused from v1
- Can be deployed as v2.0.0 (major version bump for rewrite)
- Has clear fallback: old v1 still available if issues found
- All 65 tasks can be tracked and marked as complete during implementation

---

**Branch Owner**: Automated Spec-Kit Workflow  
**PR Target**: Will create PR against `main` after implementation complete  
**Review Required**: Architecture decision review recommended before Phase 1 start
