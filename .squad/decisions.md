# Squad Decisions

## Active Decisions

### 1. Monorepo Architecture with React + Node.js
**Date**: 2026-04-03  
**Status**: ✅ Implemented  
**Decision Maker**: Walt (Architect)

Implemented a monorepo with React frontend (Vite) and Node.js backend (Express), both TypeScript. Azure CosmosDB for data, gpt-5.4-mini for AI extraction, Docker for containerization.

**Rationale**: Unified deployment, shared types, cost-effective, scalable.

---

### 2. AI Chapter Extraction: No Inference
**Date**: 2026-04-03  
**Status**: ✅ Implemented  
**Decision Maker**: Mike (Backend)

AI extraction ONLY extracts explicitly labeled chapters from PDFs. No inferring or creating logical chapters based on topic shifts. Empty array if no clear chapter markers exist.

**Rationale**: Prevents AI hallucination of non-existent document structure. Preserves source data integrity.

**Files Modified**: `server/src/services/aiService.ts`

---

### 3. Answer Count Flexibility (2-6 Options)
**Date**: 2026-04-03  
**Status**: ✅ Implemented  
**Decision Maker**: Mike (Backend)

Added `answerCount?: number` (2-6, default 4) to ExamConfig. Exam generation uses padOptions function to normalize answers. Questions extracted with actual answer counts preserved.

**Rationale**: Supports variable question formats. Padding/truncation happens during exam generation, not extraction.

**Files Modified**: 
- `server/src/models/index.ts`
- `server/src/services/examService.ts`
- `server/src/middleware/validation.ts`

---

### 4. Dual Test Modes: All-at-Once + One-by-One
**Date**: 2026-04-03  
**Status**: ✅ Implemented  
**Decision Maker**: Jesse (Frontend)

Two test-taking modes: 
- **All-at-once**: Traditional exam format, show all questions
- **One-by-one**: Learning mode with immediate feedback per question

Mode selected at test start, locked in for test duration.

**Rationale**: Supports different learning styles. One-by-one provides immediate feedback for learning, all-at-once for formal testing.

**Files Modified**: `client/src/pages/TestStart.tsx`, `client/src/pages/TestTake.tsx`

---

### 5. Mobile-First Responsive Design
**Date**: 2026-04-03  
**Status**: ✅ Implemented  
**Decision Maker**: Jesse (Frontend)

Responsive CSS with breakpoints at 480px (small mobile), 768px (tablet), 1024px (desktop). Single App.css with BEM-like naming and CSS custom properties.

**Rationale**: Works well on all devices. Mobile-first ensures core functionality on smallest screens. Single file keeps overhead low for small project.

**Files Modified**: `client/src/App.css`

---

### 6. GHCR Instead of ACR for Container Images
**Date**: 2026-04-03  
**Status**: ✅ Implemented  
**Decision Maker**: Mike (Backend)

Switched to GitHub Container Registry (ghcr.io) with automated GitHub Actions workflow. Eliminates need for Azure Container Registry resource, uses GITHUB_TOKEN authentication, triggers automatic builds on push to main or version tags.

**Rationale**: 
- No extra Azure resource cost or management overhead
- No extra secrets to rotate (GITHUB_TOKEN auto-rotated)
- Fully automated CI/CD (every push to main/tags builds and pushes)
- Semver + SHA tagging enables reproducible deployments

**Trade-offs**: Requires GitHub PAT with `read:packages` scope if image is private. ACR has tighter Azure IAM integration for production workloads.

**Files Modified**: 
- `.github/workflows/build-push.yml` (new)
- `README.md` (deployment and CI/CD sections)

---

### 7. Full Lockfile Regeneration (Not Surgical Patches)
**Date**: 2026-04-03  
**Status**: ✅ Implemented  
**Decision Maker**: Mike (Backend)

When OneDrive filesystem corruption affected the lockfile, the initial surgical patch of `@azure/cosmos` immediately revealed deeper systemic corruption in joi's transitive dependencies (`@hapi/*`, `@sideway/*`). These had zero entries in the lockfile `packages` section.

**Decision**: Regenerated the entire `package-lock.json` from scratch by copying only `package.json` files to a clean local workspace (outside OneDrive), running `npm install --legacy-peer-deps`, and copying the clean lockfile back. Used `--legacy-peer-deps` instead of `--force` to avoid aggressive overwrites.

**Rationale**: 
- Lockfile corruption from filesystem issues is systemic, not isolated
- Surgical patches are whack-a-mole — fixing one reveals another
- Full regeneration is faster, more reliable, and more maintainable than cascading patch cycles
- Prevents Docker builds from failing due to missing dependencies
- Ensures production images have complete and properly resolved dependency trees

**OneDrive Workaround**: For any npm operation (install, ci), copy `package.json` files to local path, run npm there, copy results back. OneDrive's file locking corrupts npm's atomic writes.

**Warning for Team**: After any lockfile modification, verify: (a) critical packages have `resolved`+`integrity`, (b) no workspace-scoped `node_modules/` entries without metadata, (c) `npm ci --omit=dev` succeeds (the Docker production path).

**Files Modified**: 
- `package-lock.json` — fully regenerated with all transitive deps properly resolved

---

### 8. Downgrade @vitejs/plugin-react to v4
**Date**: 2026-04-03  
**Status**: ✅ Implemented  
**Decision Maker**: Mike (Backend)

@vitejs/plugin-react@6.0.1 requires vite@^8.0.0 as a peer dependency, but the project uses vite@^5.0.8. The v6 package imports from `vite/internal` — a subpath export that doesn't exist in vite 5, causing Docker builds to fail.

**Decision**: Downgrade @vitejs/plugin-react from ^6.0.1 to ^4.3.4 (resolves to 4.7.0). Do NOT upgrade vite to 8.

**Rationale**: 
- plugin-react v4 supports vite ^4/^5/^6/^7 — fully compatible with vite 5
- React 19 works fine with plugin-react v4
- Vite 8 is a major version with breaking changes — not appropriate for a quick fix
- Lockfile regenerated without `--legacy-peer-deps` since no peer dep conflicts remain

**Impact**:
- `client/package.json` — version bump
- `package-lock.json` — regenerated

**Future Note**: If we upgrade vite to 6+, we can revisit upgrading plugin-react to match.

---

### 9. Migrate from Azure REST SDK to OpenAI SDK
**Date**: 2026-04-04  
**Status**: ✅ Implemented  
**Decision Maker**: Mike (Backend)

Migrated the Azure AI Foundry integration from `@azure-rest/ai-inference` + `@azure/core-auth` to the standard `openai` npm package (v4.77.3).

**Rationale**: 
- OpenAI SDK is industry standard with better documentation and maintenance
- Cleaner API surface compared to Azure REST SDK beta
- Azure AI Foundry endpoint fully compatible with OpenAI SDK
- Direct property access and automatic error handling simplify code

**Files Modified**: 
- `server/src/services/aiService.ts` — refactored client init, API calls, response handling
- `server/src/config/index.ts` — removed `apiVersion` field
- `server/package.json` — dependency swap
- `package-lock.json` — regenerated

**Trade-offs**: None — strict improvement in ergonomics and maintenance.

---

### 10. Remove AI Auto-Detection of Chapters
**Date**: 2026-04-03  
**Status**: ✅ Implemented  
**Decision Maker**: Mike (Backend), per user directive (copilot-directive-20260403T211558)

Removed AI chapter auto-detection from PDF processing. Chapters are now manually created by users and serve as organizational labels with no stored content.

**Key Changes**:
- `Chapter` model: Removed `content` field. Now just `{ id, title, order }`
- `Question.chapterId`: Made optional (`string | null | undefined`)
- `EXTRACTION_SYSTEM_PROMPT`: Removed all chapter extraction rules
- `extractFromPdf`: Returns `{ questions }` only, no chapters
- New endpoints: POST/PUT/DELETE chapters, PUT link question to chapter
- `addQuestions` signature simplified: `(sourceId, count)` instead of `(sourceId, chapterId, count)`

**Rationale**: 
- AI-generated chapters were unreliable (hallucination or forced "Uncategorized")
- Manual chapters give users full control over content organization
- Chapters as lightweight labels don't require document re-parsing
- Questions are independent of chapters; linking is optional and reversible

**Files Modified**: 
- `server/src/models/index.ts`
- `server/src/services/aiService.ts`
- `server/src/services/sourceService.ts`
- `server/src/services/examService.ts`
- `server/src/routes/sources.ts`
- `server/src/middleware/validation.ts`

---

### 11. Manual Chapter Management UI
**Date**: 2026-04-04  
**Status**: ✅ Implemented  
**Decision Maker**: Jesse (Frontend)

Replaced the old read-only chapter display with a full manual chapter management UI on the Source Detail page. Users can create, edit, delete chapters, and assign/unassign questions via dropdown.

**Files Modified**: 
- `client/src/types/index.ts`
- `client/src/services/api.ts`
- `client/src/pages/SourceDetail.tsx`
- `client/src/pages/ExamCreate.tsx`
- `client/src/App.css`

**Rationale**: Complements backend chapter CRUD endpoints (Decision #10). Provides accessible UX for manual chapter management.

---

### 12. Dry Run Exam Feature — Backend Implementation
**Date**: 2026-04-04  
**Status**: ✅ Implemented  
**Decision Maker**: Mike (Backend)

Implemented "Dry Run" exam mode for certification practice: automatically draws 120 main + 9 reserve questions from all ready sources.

**Key Features**:
- `isDryRun?: boolean` on Exam model
- `isReserve?: boolean` on ExamQuestion model
- `createDryRun()` service method: auto-selects all ready sources, randomly picks 129 questions, splits proportionally if fewer available
- Always uses 4 answer options
- Auto-generated title: "Dry Run — {date}"
- New endpoint: `POST /api/exams/dryrun` (no body required)

**Rationale**: 
- Reserve questions marked with flag for frontend customization (separate display, complaint validation, analytics)
- All sources by default simulates real certification exams
- Single exam entity simplifies data model
- Proportional split on low question count ensures feature works with limited data

**Files Modified**: 
- `server/src/models/index.ts`
- `server/src/services/examService.ts`
- `server/src/routes/exams.ts`

---

### 13. Dry Run Exam Feature — Frontend UX Design
**Date**: 2026-04-04  
**Status**: ✅ Implemented  
**Decision Maker**: Jesse (Frontend)

Created prominent "Dry Run" section at the top of ExamCreate page with one-click access to certification practice exams. Fixed timer (120 minutes), reserve question indicators, and visual separators for clarity.

**Key UX Choices**:
- Positioned first on page for immediate visibility
- Gradient card with icon for visual hierarchy
- No configuration required — single button click
- Fixed timer (read-only) on TestStart for dry runs
- Visual separators and "(Reserve)" labels distinguish last 9 questions

**Rationale**: 
- Discoverability: Users see dry run immediately upon landing
- Simplicity: Zero configuration reduces friction
- Clarity: Description explains 120+9 questions, 120 minutes
- Consistency: Same navigation as custom exams

**Files Modified**: 
- `client/src/types/index.ts` — Added `isDryRun` and `isReserve` flags
- `client/src/services/api.ts` — Added `createDryRun()` method
- `client/src/pages/ExamCreate.tsx` — Added dry run section
- `client/src/pages/TestStart.tsx` — Preset timer and dry run badge
- `client/src/pages/TestTake.tsx` — Reserve question indicators
- `client/src/App.css` — Styling for dry run components

---

### 14. Test Result Reconstruction Endpoint
**Date**: 2026-04-04  
**Status**: ✅ Implemented  
**Decision Maker**: Mike (Backend)

Added `GET /api/tests/:id/result` endpoint to reconstruct `TestResult` from completed `TestSession` on demand, solving loss of result data on page refresh.

**Solution**: Service method `testService.getResult(sessionId)` reconstructs `TestResult` by:
- Fetching TestSession and validating it's completed
- Comparing user answers to question answers
- Calculating score, correctAnswers, timeTakenSeconds
- Using deterministic result ID (`result-${sessionId}`)

**Rationale**: 
- TestSessions already contain all data needed to reconstruct results
- Persisting TestResults to DB would be redundant and waste storage
- On-demand reconstruction keeps data model simpler
- Results always accurate reflections of session data even if scoring logic changes

**Files Modified**: 
- `server/src/services/testService.ts`
- `server/src/routes/tests.ts`
- `server/src/middleware/validation.ts`

---

### 15. Easy Auth Header Reading Middleware
**Date**: 2026-04-04  
**Status**: ✅ Implemented  
**Decision Maker**: Mike (Backend), requested by dsanchor

Added lightweight, non-blocking Express middleware to read Azure Container Apps Easy Auth headers (`x-ms-client-principal-id`, `x-ms-client-principal-name`) and attach user info to `req.user`.

**Implementation**:
- New file: `server/src/middleware/auth.ts` — `easyAuthMiddleware` + `EasyAuthUser` interface
- Global Express type augmentation: `declare global` extends Request with optional `user?: EasyAuthUser`
- Non-blocking: Requests without headers pass through silently
- New endpoint: `GET /api/auth/me` returns `{ authenticated, user }`

**Rationale**: 
- Separation of concerns: Authentication enforcement at proxy level (Easy Auth config), app only reads identity
- Non-blocking: Keeps local dev working without auth, avoids duplicating proxy-level enforcement
- Simple type augmentation: Every route handler gets typed `req.user` access

**Trade-offs**: No auth enforcement in code — app trusts proxy completely. Intentional by design. If deployed without Easy Auth, all requests are anonymous.

**Files Modified**: 
- `server/src/middleware/auth.ts` (new)
- `server/src/index.ts`
- `README.md`

---

### 16. Verbatim PDF Question Extraction
**Date**: 2026-04-18  
**Status**: ✅ Implemented  
**Decision Maker**: Mike (Backend), per user directive (copilot-directive-20260418T092951)

Updated `EXTRACTION_SYSTEM_PROMPT` to enforce verbatim extraction of questions and answers from PDFs — word for word, no rewriting or paraphrasing.

**Implementation**:
- `EXTRACTION_SYSTEM_PROMPT`: Verbatim-first extraction rules, no generation
- User prompt in `extractFromPdf`: "Extract all existing multiple-choice questions and their answers VERBATIM"
- Empty PDFs return `{ "questions": [] }` instead of fabricating content
- Explanations remain AI-generated (exception — typically absent in PDFs)

**Rationale**: 
- Source fidelity critical: Users trust extracted content matches their PDFs
- Rephrased questions change meaning, difficulty, intent
- User-critical directive overrides previous "generate questions" behavior

**Files Modified**: 
- `server/src/services/aiService.ts`

---

### 17. Strip Leading Option Labels at Ingestion
**Date**: 2026-07-27  
**Status**: ✅ Implemented  
**Decision Maker**: Mike (Backend), requested by dsanchor  
**File**: `server/src/services/aiService.ts`

#### Problem

Answer options were stored WITH their original label prefixes (`a)`, `b)`, `c)`, `A.`, `1)`, `(a)`, etc.) because the extraction prompt said "EXACTLY as written". The React UI also prepended its own positional letter (`A.`, `B.`, …). This caused:

1. **Duplicate labels**: `A. a) Superación…`
2. **Shuffle mismatch** (primary symptom): After shuffle, embedded text labels contradicted each other (e.g., `A. b) …` after shuffle of `b) Superación…`)

#### Decision

Fix at **ingestion** — strip embedded labels when options are mapped from AI output. Do NOT change `examService` shuffle logic or frontend letter-prepend logic.

#### Implementation

**New exported helper**: `stripOptionLabel(text: string): string`
- Regex: `/^(?:\(([A-Za-z]|\d{1,2})\)|([A-Za-z]|\d{1,2})[).\-:])(?!\d)[\s]*/`
- Handles: `a)`, `A)`, `b.`, `B.`, `(a)`, `(A)`, `a-`, `a:`, `1)`, `1.`, `(1)`, `12)` + uppercase
- Safe: Bare letter + space passes through; empty result returns original; `(?!\d)` lookahead protects decimals (`3.5`)

**Applied at**:
- `extractFromPdf`: `options: q.options.map(stripOptionLabel)`
- `generateAdditionalQuestions`: `options: q.options.map(stripOptionLabel)`

**Prompt updated**: Added rule 7 to `EXTRACTION_SYSTEM_PROMPT` instructing AI to extract option text WITHOUT leading labels.

#### Rationale

- Deterministic regex stripping independent of model behavior
- Clean plain-text storage; UI position drives visible letter cleanly, including after shuffle
- No changes to data models, frontend, or exam shuffle logic

#### Known Limitation

Existing CosmosDB data retains old prefixes. Recommended follow-up: one-time normalization script or on-read strip in `testService`.

**Files Modified**: 
- `server/src/services/aiService.ts`

---

### 18. Install Jest for Server-Side Tests
**Date**: 2026-07-27  
**Status**: Proposed  
**Decision Maker**: Hank (Tester)

#### Context

`server/package.json` declares `"test": "jest"` but `jest`, `ts-jest`, and `@types/jest` are absent from `devDependencies` and not installed. The `stripOptionLabel` test suite is complete and waiting at:
```
server/src/services/__tests__/aiService.stripOptionLabel.test.ts
```

#### Proposed Action

Add to `server/package.json` devDependencies:
```json
"@types/jest": "^29",
"jest": "^29",
"ts-jest": "^29"
```

Add jest config at `server/jest.config.ts`:
```ts
import type { Config } from 'jest';
const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
};
export default config;
```

Then `cd server && npm install && npm test` will run the `stripOptionLabel` test suite (19+ cases).

#### Rationale

- Test suite is complete and covers all edge cases
- Jest is the team's declared test runner — setup is a small install
- Without this, QA loop for `stripOptionLabel` cannot close

---

### 19. Sources Page — Fetch All Pages Instead of Paginating UI
**Date**: 2026-07-27  
**Status**: ✅ Implemented  
**Decision Maker**: Jesse (Frontend), requested by dsanchor

#### Problem

`SourcesList.tsx` displayed only the first 20 sources. `GET /sources` endpoint is paginated (`PaginatedResponse<Source>`), and the page called `sourcesApi.list()` once (page 1, pageSize 20), then set `setSources(result.items)` — no further pages fetched.

Discrepancy: `ExamCreate.tsx` uses `GET /exams/sources` (unpaginated, returns ALL ready sources). Users could see sources in exam creation that were invisible on Sources page.

#### Decision

Fetch all pages on load using `hasMore` loop — no new pagination UI needed.

#### Rationale

- **"Show Everything" Pattern**: Matches exam creation UX; users expect complete source list on management page
- **No Pagination UI**: "Load More" button would fragment what should be a complete management list
- **Loop is Correct**: Works whether there are 21 or 500 sources; scales well
- **Safety Cap**: 50 iterations (≤1000 sources at pageSize 20) prevents infinite loops

#### Implementation

`client/src/pages/SourcesList.tsx` — `loadSources()` function:

```ts
const allItems: Source[] = [];
let page = 1;
const MAX_PAGES = 50;
let hasMore = true;
while (hasMore && page <= MAX_PAGES) {
  const result = await sourcesApi.list(page, 20);
  allItems.push(...result.items);
  hasMore = result.hasMore;
  page++;
}
setSources(allItems);
```

**Unchanged**: Loading/error/empty states, delete/edit local mutations, TypeScript types.

#### Notes for Team

- **Mike**: No backend changes. `GET /sources` pagination contract used as intended.
- **Walt**: No architectural change — purely client-side fetch loop.
- If sources exceed ~1000, consider virtual scrolling or server-side filtering.

**Files Modified**: 
- `client/src/pages/SourcesList.tsx`

---

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
