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

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
