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

