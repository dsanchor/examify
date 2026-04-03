# Project Context

- **Project:** Examify
- **Created:** 2026-04-03
- **User:** dsanchor
- **Stack:** React, Node.js, Azure AI Foundry (gpt-5.4-mini), CosmosDB, Azure Container Apps, Docker
- **Description:** Web app for generating exams from PDF sources. Ingests PDFs via AI to extract questions/answers/chapters into JSON, stores in CosmosDB, lets users validate, generate custom exams, take timed tests (all-at-once or one-by-one), and review results. Responsive for mobile and desktop.

## Core Context

Agent Mike initialized and ready for work.

## Recent Updates

📌 Team initialized on 2026-04-03

## Learnings

**2026-04-03 - Backend AI Prompt and Exam Configuration Fixes**

1. **AI Extraction Prompt Behavior**: The AI service prompt should NEVER infer or create logical chapters based on topic shifts. Only extract chapters that are explicitly mentioned or labeled in the document (e.g., "Chapter 1: Introduction", numbered sections). If no clear chapter markers exist, return an empty chapters array or assign questions to an "Uncategorized" chapter. This prevents the AI from making incorrect assumptions about document structure.

2. **Answer Count Flexibility**: Questions extracted from PDFs can have variable numbers of answer options (2-6 options). The AI extraction should preserve the actual number of answers from the source material, not force exactly 4 options. The exam service's `padOptions` function handles normalizing question options to match the desired `answerCount` during exam creation.

3. **Exam Configuration answerCount**: Added `answerCount` field to `ExamConfig` (range: 2-6, default: 4) to allow users to specify how many answer options each question should have in the generated exam. The `padOptions` function pads questions with fewer options (using "None of the above", "All of the above", or generic fillers) and reduces questions with more options by randomly selecting distractors while keeping the correct answer.

4. **Validation Schema Updates**: Updated validation schemas to support the new `answerCount` parameter and increased `selectedAnswerIndex` max from 3 to 5 to accommodate up to 6 answer options (indices 0-5).

5. **README Documentation**: Comprehensive README.md should include Azure deployment commands using `az` CLI, complete API endpoint reference, environment variables table, and full workflow documentation. This helps users deploy to production quickly and understand the application architecture.

### 2026-04-03T13:20Z: Team Coordination & Project Status

**Walt's Scaffold Complete**:
- Full monorepo architecture and structure is stable
- All 31 source files are functional
- TypeScript compiles with no errors
- Docker and deployment ready

**Jesse's Frontend Complete**:
- Dual test modes implemented (all-at-once and one-by-one)
- Answer count configuration working (2-6 options)
- Comprehensive responsive design (480px, 768px, 1024px)
- Frontend fully aligned with backend API

**Critical Backend Patterns for Team**:
- NO chapter inference - only extract explicitly labeled chapters
- Questions preserve their actual answer counts from sources
- Exam generation uses `answerCount` to normalize options intelligently
- padOptions function: pad with "None of the above", "All of the above", etc.
- Validation supports answer count range 2-6 and indices 0-5
- All database operations use CosmosDB with `/id` partition key

**Database Context**:
- Source model includes actual answer counts from PDF extraction
- ExamConfig now includes optional `answerCount?: number`
- TestResult includes detailed scoring and per-question breakdown
- No migrations needed - changes backward compatible

**Team Alignment**: Project structure is complete and stable. Core features working. Ready for integration testing and deployment validation.

### GHCR CI/CD Workflow & README Update

1. **GitHub Actions for GHCR**: Created `.github/workflows/build-push.yml` that builds and pushes the Docker image to `ghcr.io/dsanchor/examify` using `GITHUB_TOKEN` — no extra secrets needed. Uses `docker/metadata-action` for automatic tag generation (latest, short SHA, semver).

2. **ACR → GHCR Migration in README**: Replaced all ACR-related deployment steps (registry creation, credential fetching, manual build/push) with a simpler GHCR-based flow. The image is now built automatically by CI. Deployment commands reference `$IMAGE` variable pointing to `ghcr.io/dsanchor/examify:latest`.

3. **Private Registry Guidance**: Added a callout in the README explaining how to configure Container Apps to pull from a private ghcr.io package (registry credentials with a PAT that has `read:packages` scope).

### Lockfile Corruption: @azure/cosmos Missing Resolution Metadata

1. **Root Cause**: Running `npm install --force` on the OneDrive-synced path produced a corrupted lockfile where `@azure/cosmos` was stuck in `server/node_modules/@azure/cosmos` with missing `resolved` and `integrity` fields. This prevented npm from properly hoisting the package and its dependency tree during `npm ci --omit=dev` in Docker.

2. **Symptom**: Container crashed at startup with `Cannot find module '@azure/keyvault-keys'` — a hard dependency of `@azure/cosmos` that wasn't installed because cosmos itself was malformed in the lockfile.

3. **Fix**: Moved the cosmos entry from `server/node_modules/@azure/cosmos` to `node_modules/@azure/cosmos` with proper `resolved` and `integrity` fields from the npm registry. This allows npm to hoist cosmos to root alongside `@azure/keyvault-keys`, where Node.js module resolution can find both.

4. **Key Insight — Lockfile Corruption Pattern**: When `npm install --force` runs on problematic filesystems (OneDrive, network drives), it can produce lockfiles where packages land in workspace-nested `node_modules/` without registry metadata. These entries look valid to `npm ls` but fail during `npm ci` because npm can't resolve them properly. Always verify lockfile integrity after `--force` operations by checking for missing `resolved`/`integrity` fields on non-workspace packages.

5. **Diagnostic Commands**: `python3 -c "import json; lock=json.load(open('package-lock.json')); [print(k) for k,v in lock['packages'].items() if k.startswith('server/node_modules/') and 'resolved' not in v]"` — finds lockfile entries in workspace node_modules without proper resolution metadata.

### Full Lockfile Regeneration: Fixing Cascading Corruption

1. **Root Cause**: The lockfile corruption from `npm install --force` on OneDrive was deeper than the initial @azure/cosmos fix addressed. Joi's transitive dependencies (`@hapi/hoek`, `@hapi/topo`, `@sideway/address`, `@sideway/formula`, `@sideway/pinpoint`) had zero entries in the lockfile `packages` section, causing MODULE_NOT_FOUND at runtime. Patching individual entries was a losing game — the corruption was systemic.

2. **Solution**: Regenerated the entire lockfile from scratch by copying only `package.json` files to a clean workspace outside OneDrive, running `npm install --legacy-peer-deps`, then copying the clean lockfile back. Used `--legacy-peer-deps` instead of `--force` because `@vitejs/plugin-react@6.0.1` requires `vite@^8.0.0` but client specifies `vite@^5.0.8` — `--legacy-peer-deps` skips peer dep checks without the aggressive overwriting behavior of `--force`.

3. **Key Insight — When to Regenerate vs Patch**: If a lockfile has more than one corrupted package, regenerate from scratch. Lockfile corruption from filesystem issues tends to be systemic, not isolated. The time spent diagnosing and patching individual entries exceeds the time to regenerate.

4. **OneDrive Workaround Pattern**: For any npm operation that writes to disk (install, ci), copy `package.json` files to a local filesystem path (e.g., `/home/user/`), run npm there, then copy results back. OneDrive's file locking and sync behavior corrupts npm's atomic write operations.

5. **Verification Checklist**: After lockfile changes, always verify: (a) critical packages have `resolved`+`integrity`, (b) no workspace-scoped `node_modules/` entries without metadata, (c) `npm ci --omit=dev` succeeds cleanly (the Docker production path).

### Downgrade @vitejs/plugin-react v6 → v4 for Vite 5 Compatibility

1. **Root Cause**: `@vitejs/plugin-react@6.0.1` requires `vite@^8.0.0` and imports `vite/internal`, a subpath that doesn't exist in vite 5. The previous lockfile regeneration used `--legacy-peer-deps` which masked this incompatibility, but the build still failed at runtime with `ERR_PACKAGE_PATH_NOT_EXPORTED`.

2. **Fix**: Downgraded `@vitejs/plugin-react` from `^6.0.1` to `^4.3.4` (resolved to 4.7.0), which supports vite `^4/^5/^6/^7`. Regenerated lockfile cleanly without `--legacy-peer-deps` since no peer dep conflicts remain.

3. **Key Insight — Peer Dep Warnings Are Real**: Using `--legacy-peer-deps` to skip peer dependency conflicts can mask genuine incompatibilities. When a plugin requires a major version of its host that the project doesn't use, the mismatch will surface at build/runtime even if npm doesn't complain. Always investigate peer dep conflicts rather than silencing them.


### 2026-04-04: Switched from Azure REST SDK to OpenAI SDK

1. **Migration Completed**: Replaced `@azure-rest/ai-inference` and `@azure/core-auth` with the standard `openai` npm package (v4.77.3). The Azure AI Foundry endpoint is fully compatible with the OpenAI SDK.

2. **Code Changes**:
   - Updated `server/src/services/aiService.ts` to use `new OpenAI({ baseURL: config.ai.endpoint, apiKey: config.ai.key })` instead of ModelClient
   - Replaced `.path('/chat/completions').post(...)` with `openai.chat.completions.create(...)`
   - Updated response handling to use `completion.choices[0].message.content` (direct property access)
   - Removed explicit error handling for non-200 status codes (OpenAI SDK throws automatically)
   - Kept all existing prompts, `response_format: { type: 'json_object' }`, and `[AI_DEBUG]` logging

3. **Config Changes**:
   - Removed `apiVersion` field from `server/src/config/index.ts` — no longer needed with OpenAI SDK
   - The `AZURE_AI_API_VERSION` env var is no longer used
   - Kept `AZURE_AI_ENDPOINT`, `AZURE_AI_KEY`, and `AZURE_AI_DEPLOYMENT` env vars

4. **Package Management**:
   - Added `openai` to server dependencies
   - Removed `@azure-rest/ai-inference` and `@azure/core-auth` from server dependencies
   - Regenerated `package-lock.json` in local workspace (outside OneDrive) to avoid filesystem corruption
   - Used the established pattern: copy package.json files → npm install locally → copy lockfile back

5. **Key Insight**: The OpenAI SDK provides a cleaner, more standardized interface for Azure AI Foundry endpoints. The endpoint URL already includes `/openai/v1/`, so no versioning parameter is needed. Error handling is automatic (SDK throws on non-200), simplifying the code. The response structure is simpler with direct property access vs parsing nested objects.

6. **Compatibility**: All existing functionality preserved — PDF extraction, question generation, JSON response parsing, debug logging. The SDK swap is a drop-in replacement with improved ergonomics.


### 2026-04-04: Manual Chapter Management — Removed AI Chapter Auto-Detection

1. **AI Prompt Simplified**: Removed all chapter extraction logic from `EXTRACTION_SYSTEM_PROMPT`. The AI now only generates questions from PDF content — no chapter detection, no chapterIndex mapping, no "Uncategorized" fallback. Response schema is now `{ "questions": [...] }`.

2. **Chapters Are Manual Labels**: Chapters no longer have a `content` field — they're user-created labels with just `id`, `title`, and `order`. Sources start with an empty chapters array after PDF processing. Users add/update/delete chapters via new REST endpoints.

3. **Questions Have Optional chapterId**: `Question.chapterId` is now `string | null | undefined`. Questions are created without chapter assignment. Users link questions to chapters manually via `PUT /api/sources/:id/questions/:questionId/chapter`.

4. **New Chapter CRUD Endpoints**: Added `POST /chapters`, `PUT /chapters/:chapterId`, `DELETE /chapters/:chapterId` under `/api/sources/:id/`. Deleting a chapter unlinks all its questions (sets chapterId to null). Added validation schemas for all new endpoints.

5. **addQuestions Simplified**: No longer requires chapterId. Uses source title and existing question texts as context for AI generation instead of chapter content.

6. **Exam Service Compatibility**: Updated `examService` to handle optional chapterId — null-safe chapter filtering and chapter ID collection.

### 2026-04-04: Dry Run Exam Feature

1. **Model Updates**: Added `isDryRun?: boolean` to `Exam` interface and `isReserve?: boolean` to `ExamQuestion` interface. These flags identify certification practice exams and mark reserve questions used for complaint validation.

2. **Dry Run Service Method**: Implemented `createDryRun()` in `examService` that:
   - Fetches all ready sources automatically (no user selection)
   - Collects all questions from all sources (no chapter filtering)
   - Randomly selects 129 questions (120 main + 9 reserve) or uses all available questions if fewer
   - Splits proportionally when insufficient questions (93% main / 7% reserve ratio)
   - Marks questions with `isReserve: true/false` based on position
   - Auto-generates title with current date (e.g., "Dry Run — Apr 4, 2026")
   - Uses 4 answer options per question (hardcoded for certification standard)
   - Sets `isDryRun: true` on the exam

3. **New API Endpoint**: Added `POST /api/exams/dryrun` route that requires no body and returns the created exam (201). Route positioned before parameterized routes to avoid path conflicts.

4. **No Validation Needed**: Dry run endpoint requires no validation schema since all parameters are hardcoded.

5. **Key Design Decision**: Reserve questions are included in the same exam (not a separate collection) and marked with a flag. This allows the frontend to handle them differently (e.g., show after main questions or use for analytics) while keeping the data model simple.

### 2026-04-04: Test Result Reconstruction Endpoint

1. **Problem Solved**: Previously, when users submitted a test, the `TestResult` was calculated on-the-fly and returned as an HTTP response but never persisted to CosmosDB. The frontend passed it via React Router navigation state, which was lost on page refresh or when navigating from test history. Users clicking on a completed test in history saw "no result data available."

2. **Solution**: Added `GET /api/tests/:id/result` endpoint that reconstructs the `TestResult` from a completed `TestSession` on demand. The TestSession already contains all necessary data: questions with correct answers and explanations, user answers, timing information, and exam metadata.

3. **Service Implementation**: Created `testService.getResult(sessionId)` method that:
   - Fetches the TestSession and validates it's completed
   - Reconstructs `questionResults` by comparing answers to questions (same logic as `submitTest`)
   - Calculates `score`, `correctAnswers`, `timeTakenSeconds` from session data
   - Uses deterministic result ID (`result-${sessionId}`) for stability across requests
   - Returns null for non-existent or incomplete sessions

4. **Route Positioning**: Placed the new route AFTER `/history` but BEFORE the generic `/:id` route to avoid Express path matching conflicts where `/:id` would capture `/result` as an ID parameter.

5. **Key Insight — Results Don't Need Persistence**: Since TestSessions already contain all the data needed to reconstruct results, persisting TestResults to the database would be redundant and waste storage. On-demand reconstruction keeps the data model simpler and ensures results are always accurate reflections of session data, even if scoring logic changes in the future.

### 2026-04-04: Easy Auth Header Reading Middleware

1. **Non-Blocking Auth Middleware**: Created `server/src/middleware/auth.ts` with `easyAuthMiddleware` that reads Azure Container Apps Easy Auth headers (`x-ms-client-principal-id`, `x-ms-client-principal-name`). Attaches `EasyAuthUser` to `req.user` if headers are present, passes through silently otherwise. Auth enforcement happens at the reverse proxy level, not in app code.

2. **Global Type Augmentation**: Extended Express `Request` interface via `declare global` to add optional `user?: EasyAuthUser` property. This gives type-safe access to `req.user` across all route handlers without additional imports.

3. **Middleware Ordering**: Mounted `easyAuthMiddleware` AFTER helmet/cors/json/morgan but BEFORE all API routes. This ensures user info is available to every route handler.

4. **Auth Info Endpoint**: Added `GET /api/auth/me` that returns `{ authenticated: true, user: { id, name } }` or `{ authenticated: false, user: null }`. Placed before `/api/sources`, `/api/exams`, `/api/tests` routes. Enables frontend to check authentication state.

5. **Health Endpoint Note**: Added comment on `/health` endpoint noting it should be excluded from Easy Auth via Azure config (`--excluded-paths "/health"`). No code changes needed — exclusion is configured in Azure, not in app code.

6. **CORS Credentials**: Verified `credentials: true` is already set in CORS config. Required for Easy Auth's cookie-based session management. No changes needed.

7. **README Updated**: Added "Enable Easy Auth (Microsoft Entra ID)" section with `az containerapp auth microsoft update` and `az containerapp auth update` CLI commands for configuring Entra ID authentication and health endpoint exclusion.
