# Decision: Verbatim PDF Question Extraction

**Date**: 2026-04-18  
**Decision Maker**: Mike (Backend), per user directive  
**Status**: ✅ Implemented

## Context

The `EXTRACTION_SYSTEM_PROMPT` previously instructed the AI to "Generate multiple-choice questions based on the content" and "Create questions that test understanding, not just memorization." This caused the AI to rewrite, rephrase, and paraphrase questions instead of preserving the original wording from the PDF.

## Decision

The PDF extraction AI must extract questions and answers **exactly as they appear in the source document** — verbatim, word for word. No rewriting, rephrasing, paraphrasing, or generating new questions.

- **Questions**: Extracted verbatim from the PDF
- **Answer options**: Extracted verbatim from the PDF
- **Correct answer identification**: AI determines the correct answer index
- **Explanations**: AI-generated (exception to verbatim rule, since explanations rarely exist in source PDFs)
- **No questions found**: Returns empty array `{ "questions": [] }` — does NOT fabricate questions

## Rationale

- Source fidelity is critical — users trust that extracted content matches their PDFs
- Rephrased questions change meaning, difficulty, and intent
- This is a user-critical directive that overrides previous "generate questions" behavior

## Files Modified

- `server/src/services/aiService.ts` — `EXTRACTION_SYSTEM_PROMPT` and user prompt in `extractFromPdf`

## Impact

- Existing sources with AI-generated questions are unaffected (already stored in CosmosDB)
- New PDF uploads will extract verbatim questions going forward
- PDFs without explicit questions will return empty results instead of generated content
- The `generateAdditionalQuestions` method is unchanged — it still generates new questions on demand (that's its explicit purpose)
