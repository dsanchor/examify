# Project Context

- **Project:** Examify
- **Created:** 2026-04-03
- **User:** dsanchor
- **Stack:** React, Node.js, Azure AI Foundry (gpt-5.4-mini), CosmosDB, Azure Container Apps, Docker
- **Description:** Web app for generating exams from PDF sources. Ingests PDFs via AI to extract questions/answers/chapters into JSON, stores in CosmosDB, lets users validate, generate custom exams, take timed tests (all-at-once or one-by-one), and review results. Responsive for mobile and desktop.

## Core Context

Agent Hank initialized and ready for work.

## Recent Updates

📌 Team initialized on 2026-04-03

## Learnings

Initial setup complete.

### stripOptionLabel tests — 2026-07-27

- **Test file**: `server/src/services/__tests__/aiService.stripOptionLabel.test.ts`
- **Framework**: Jest (`"test": "jest"` in `server/package.json`), but jest and ts-jest are **not** in devDependencies and are not installed. Tests cannot run until Mike installs them.
- **Helper status**: `stripOptionLabel` does not exist in `aiService.ts` yet. Tests import it by name; they will compile and pass once Mike exports it.
- **Key edge cases documented**:
  - STRIPS: `a)`, `A)`, `b.`, `(c)`, `A.`, `1)`, `1.`, `(2)`, `12)`, `a-`, `a:` — all trim trailing whitespace after label.
  - MUST NOT strip bare letter + space: `A pesar de todo`, `B importante...` — no punctuation after letter means it's not a label.
  - Empty-guard: if stripping leaves empty string (e.g. `c)` alone), return the original.
  - Inner accented characters and `✓` marks are preserved verbatim.
  - Empty string and whitespace-only strings are returned unchanged.

### 2026-07-27: stripOptionLabel Test Suite Completion

**File**: `server/src/services/__tests__/aiService.stripOptionLabel.test.ts`

Delivered comprehensive test suite with 19+ test cases covering all edge cases:

**STRIPS**:
- Basic labels: `a)`, `A)`, `b.`, `B.`, `c-`, `C-`, `d:`, `D:`
- Parentheses: `(a)`, `(A)`, `(2)`, `(12)`
- Mixed: `1)`, `(1)`, `12)`, `(12)`
- Accented text preserved: `español) El texto` → `El texto` ✓
- Checkmarks preserved: `a) ✓ Correct` → `✓ Correct` ✓

**MUST NOT STRIP**:
- Bare letter + space: `A pesar de todo` (no punctuation after A)
- Decimals: `3.5 millones` (lookahead `(?!\d)` protects)
- Single label with no text: `c)` alone → return original

**Status**: Jest/ts-jest missing from devDependencies (Decision #18 — Mike to install). Tests compile but cannot execute until dependencies added.

**Test Count**: 19+ cases covering regex edge cases, empty strings, whitespace handling, accented characters, and checkmarks.

**Next Step**: After jest install, run `npm test` to validate all cases pass.
