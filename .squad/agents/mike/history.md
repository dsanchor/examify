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

