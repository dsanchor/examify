# Walt's History

## Project: Examify

### Task: Architecture + Full Project Scaffold

**Date**: Initial scaffold
**Requested by**: dsanchor

**Objective**: Design architecture and create full project scaffold for Examify - an AI-powered exam generation web app.

---

## Work Completed

### 1. Architecture Design

Designed a **monorepo architecture** with:
- React + TypeScript frontend (Vite)
- Node.js + Express + TypeScript backend
- Azure CosmosDB for persistence
- Azure AI Foundry (gpt-5.4-mini) for PDF question extraction
- Docker containerization for deployment
- Azure Container Apps as deployment target

### 2. Project Structure Created

```
examify/
├── client/              # React frontend (18 files)
├── server/              # Node.js backend (13 files)
├── Dockerfile           # Multi-stage production build
├── docker-compose.yml   # Local development
├── package.json         # Workspace root
├── .env.example         # Environment template
├── .gitignore           # Git ignore patterns
└── README.md            # Comprehensive documentation
```

### 3. Files Created

**Root Files (7)**:
- `package.json` - Workspace configuration
- `.env.example` - Environment variables template
- `.gitignore` - Ignore patterns
- `Dockerfile` - Multi-stage build
- `docker-compose.yml` - Local dev setup
- `README.md` - Full documentation with Azure deployment

**Server Files (15)**:
- `package.json`, `tsconfig.json` - Configuration
- `src/models/index.ts` - TypeScript data models
- `src/config/index.ts` - Environment configuration
- `src/services/` - 5 service files (cosmos, ai, source, exam, test)
- `src/middleware/` - 2 middleware files (error, validation)
- `src/routes/` - 3 route files (sources, exams, tests)
- `src/index.ts` - Main Express server

**Client Files (20)**:
- `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts` - Configuration
- `src/types/index.ts` - TypeScript interfaces
- `src/services/api.ts` - Axios API client
- `src/hooks/useTimer.ts` - Timer custom hook
- `src/components/Layout.tsx` - Main layout
- `src/pages/` - 10 page components
- `src/App.tsx`, `src/App.css`, `src/main.tsx` - App setup
- `public/index.html` - HTML template

**Squad Documentation (2)**:
- `.squad/decisions/inbox/walt-architecture.md` - Architecture decisions
- `.squad/agents/walt/history.md` - This file

### 4. Key Implementation Details

**Backend Services**:
- **cosmosService**: Full CRUD operations with CosmosDB SDK v4
- **aiService**: PDF text extraction → AI prompt → JSON parsing
- **sourceService**: PDF upload with multer → pdf-parse → AI extraction
- **examService**: Question filtering, shuffling, answer padding logic
- **testService**: Test session management, scoring, result calculation

**AI Extraction**:
- System prompt explicitly instructs NOT to infer chapters
- Validates extracted JSON structure
- Filters invalid questions (< 2 answers, no correct answer)
- Handles AI response parsing errors gracefully

**Exam Generation**:
- Filter by chapters (if specified)
- Random question selection without replacement
- Answer shuffling for each question
- Automatic answer padding with filler options:
  - "None of the above"
  - "All of the above"
  - "Both A and B"
  - "Neither A nor B"
  - "Cannot be determined"
  - "Insufficient information"

**Test Taking**:
- Two modes: all-at-once and one-by-one
- Optional countdown timer with auto-submit
- Answer persistence in CosmosDB
- Detailed result calculation with per-question breakdown

**Frontend Features**:
- Responsive CSS (mobile + desktop)
- React Router for SPA navigation
- Custom timer hook with start/pause/reset
- Typed API client with Axios
- Form validation before submission
- Loading states and error handling

---

## Learnings

### Architectural Patterns

1. **Service Layer Pattern**
   - Keep routes thin (validation + service calls)
   - Business logic in services (testable, reusable)
   - Database operations in dedicated service
   - Location: `server/src/services/`

2. **Shared Types**
   - Define models once in server, mirror in client
   - Ensures API contract consistency
   - Files: `server/src/models/index.ts`, `client/src/types/index.ts`

3. **Multi-Stage Docker Build**
   - Stage 1: Build client (npm run build)
   - Stage 2: Build server (tsc)
   - Stage 3: Production (node + static files)
   - File: `Dockerfile`

4. **Monorepo Workspaces**
   - Single `npm install` at root
   - Run workspace commands: `npm run dev -w server`
   - Shared dependencies in root
   - File: Root `package.json`

5. **Express Async Errors**
   - Use `express-async-errors` for automatic try-catch
   - No need for manual try-catch in routes
   - Centralized error handling in middleware
   - File: `server/src/middleware/errorHandler.ts`

### Technology Choices

1. **Vite over CRA**
   - Faster dev server (ESBuild)
   - Better build performance
   - Native TypeScript support
   - Modern tooling (native ESM)

2. **CosmosDB Partition Strategy**
   - Partition key: `/id` (simple, works for small-medium scale)
   - Alternative: `/userId` (for multi-tenant)
   - Trade-off: Simple vs. scalable
   - Impact: Point reads are efficient

3. **Joi for Validation**
   - Schema-based validation (declarative)
   - Better than manual if/else checks
   - Generates user-friendly error messages
   - File: `server/src/middleware/validation.ts`

4. **Azure AI Foundry**
   - gpt-5.4-mini: Good quality, lower cost
   - Structured prompting for JSON extraction
   - Fallback to JSON regex extraction
   - File: `server/src/services/aiService.ts`

### Best Practices Applied

1. **Environment Configuration**
   - Never commit secrets (use .env, excluded in .gitignore)
   - Validate required env vars on startup
   - Provide .env.example as template
   - File: `server/src/config/index.ts`

2. **TypeScript Strict Mode**
   - Catch errors at compile time
   - Better IDE autocomplete
   - Enforces type safety
   - Files: `tsconfig.json` in server and client

3. **Responsive CSS**
   - Mobile-first approach
   - Media queries for tablet/desktop
   - Flexbox and Grid for layouts
   - File: `client/src/App.css`

4. **Error Handling Hierarchy**
   - AppError for operational errors (4xx, 5xx)
   - Generic Error handler for unexpected errors
   - Development vs. production error details
   - File: `server/src/middleware/errorHandler.ts`

### Key File Paths

**Entry Points**:
- Server: `server/src/index.ts`
- Client: `client/src/main.tsx`

**Core Business Logic**:
- AI Extraction: `server/src/services/aiService.ts`
- Exam Generation: `server/src/services/examService.ts`
- Test Scoring: `server/src/services/testService.ts`

**API Routes**:
- Sources: `server/src/routes/sources.ts`
- Exams: `server/src/routes/exams.ts`
- Tests: `server/src/routes/tests.ts`

**Data Models**:
- Server: `server/src/models/index.ts`
- Client: `client/src/types/index.ts`

**Configuration**:
- Server config: `server/src/config/index.ts`
- Client config: `client/vite.config.ts`
- Environment: `.env.example`

**Deployment**:
- Docker: `Dockerfile`
- Local dev: `docker-compose.yml`
- Azure deployment: Commands in `README.md`

### Patterns to Maintain

1. **Keep routes thin** - only validation and service calls
2. **Business logic in services** - testable, reusable
3. **Validate at API boundary** - use Joi schemas
4. **Type everything** - leverage TypeScript
5. **Handle errors centrally** - middleware pattern
6. **Document deployment** - az CLI commands in README

### Future Considerations

- Add authentication (Azure AD B2C or custom JWT)
- Implement user management and multi-tenancy
- Add question bank features (tags, categories)
- Export functionality (PDF, Word)
- Analytics and reporting
- Offline PWA support

---

## Notes

- All 31 source files created with functional code (not stubs)
- TypeScript compilation passes with no errors
- Responsive CSS covers mobile and desktop
- README includes complete Azure deployment guide
- docker-compose.yml ready for local development
- Architecture supports future scaling (microservices, multi-user)

**Project Status**: ✅ Scaffold Complete & Ready for Development

---

## Team Coordination (2026-04-03T13:20Z)

**Mike's Backend Contributions**:
- Fixed AI extraction to NOT infer chapters (only extract explicit ones)
- Added `answerCount` to ExamConfig (2-6 range, default 4)
- Enhanced `padOptions` function for intelligent padding/truncation
- Updated validation schemas to support answer count range
- Wrote comprehensive README with Azure deployment guide

**Jesse's Frontend Contributions**:
- Implemented dual test modes: all-at-once and one-by-one with immediate feedback
- Added `answerCount` configuration (2-6 options) to exam creation form
- Built comprehensive responsive design (480px, 768px, 1024px breakpoints)
- Mobile-first CSS with BEM-like naming and CSS custom properties
- Created AllAtOnceMode and OneByOneMode components with shared logic

**Project Status Update**: Core features complete. Project structure finalized and stable. All agents aligned on architecture and data flow. Ready for integration testing and deployment validation.

**Critical Context for All Agents**:
- Full monorepo structure is complete and should not be restructured
- Questions preserve actual answer counts from sources
- Exam generation normalizes answers via `answerCount` parameter
- Frontend fully supports both test modes
- UI is responsive across all devices
- No chapter inference in AI extraction (critical business rule)
- All APIs and data models are stable
