# Skill: Strip Leading Option Labels from MCQ Answer Text

**Category**: Data Cleaning / AI Extraction  
**Language**: TypeScript / JavaScript  
**Context**: Multiple-choice question ingestion pipelines

---

## Problem Pattern

When extracting multiple-choice questions from PDFs or documents, AI models often include the original label prefix (e.g. `a)`, `B.`, `(1)`) in each answer option's text, even when instructed not to. If the UI independently prepends a positional letter/number for display, this produces double labels (`A. a) …`). Worse, if options are shuffled after storage, the embedded label no longer matches the display position, producing contradictory output (`A. c) …`).

---

## Solution Pattern

Strip leading labels at the point of ingestion (not display), so stored options are always clean plain text. The UI then drives the visible label cleanly.

---

## Reusable Helper

```ts
```ts
/**
 * Strips a single leading option-label prefix from an answer option string.
 * Handles: a) A) b. B. (a) (A) a- a: 1) 1. (1) 12) and uppercase equivalents.
 * A bare letter followed only by a space ("A pesar de...") is NOT stripped.
 * The (?!\d) lookahead prevents "3.5 millones..." from matching "3." as a label.
 * Returns original text unchanged if stripping would produce an empty string.
 */
export function stripOptionLabel(text: string): string {
  const stripped = text.replace(
    /^(?:\(([A-Za-z]|\d{1,2})\)|([A-Za-z]|\d{1,2})[).\-:])(?!\d)[\s]*/,
    ''
  );
  return stripped.length > 0 ? stripped : text;
}
```

### What it strips

| Input | Output |
|-------|--------|
| `a) Superación personal` | `Superación personal` |
| `B. Foo` | `Foo` |
| `(3) Bar` | `Bar` |
| `1) First option` | `First option` |
| `12. Something` | `Something` |
| `(A) Option text` | `Option text` |
| `a- dash prefix` | `dash prefix` |
| `a: colon prefix` | `colon prefix` |
| `3.5 millones de euros` | `3.5 millones de euros` (decimal — unchanged) |

### What it does NOT strip

| Input | Reason |
|-------|--------|
| `A pesar de todo` | bare letter + space — not a label separator |
| `c)` | stripping yields empty — returns original |

---

## Usage

Apply at ingestion, not at display:

```ts
options: q.options.map(stripOptionLabel)
```

---

## Prompt Guidance (Complementary)

Add to your extraction system prompt to reduce reliance on the regex:

> "For each answer option, extract ONLY THE TEXT of the option — do NOT include any leading label prefix such as `a)`, `b)`, `A.`, `B.`, `(a)`, `(1)`, `1.`, `2)`, etc. Extract the option content that follows the label, verbatim, without the label itself."

The regex is the safety net; the prompt change reduces the frequency of labels appearing in extracted data.

---

## Existing-Data Caveat

If documents were already ingested before this fix was applied, stored options may still have embedded labels. Fix options:
1. **Re-ingest** affected sources
2. **One-time migration**: iterate all stored questions, apply `stripOptionLabel` to each option, write back
3. **On-read strip**: apply `stripOptionLabel` in the service layer when assembling exams/tests (transparent, no migration needed, slightly wasteful at runtime)
