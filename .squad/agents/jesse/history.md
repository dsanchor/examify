# Project Context

- **Project:** Examify
- **Created:** 2026-04-03
- **User:** dsanchor
- **Stack:** React, Node.js, Azure AI Foundry (gpt-5.4-mini), CosmosDB, Azure Container Apps, Docker
- **Description:** Web app for generating exams from PDF sources. Ingests PDFs via AI to extract questions/answers/chapters into JSON, stores in CosmosDB, lets users validate, generate custom exams, take timed tests (all-at-once or one-by-one), and review results. Responsive for mobile and desktop.

## Core Context

Agent Jesse initialized and ready for work.

## Recent Updates

📌 Team initialized on 2026-04-03

## Learnings

Initial setup complete.

### 2026-04-03: Test Mode Implementation & Responsive Design

**Test Mode Selection (TestStart.tsx):**
- Added radio button group to select between two test modes: "all-at-once" and "one-by-one"
- Mode is passed via navigation state to TestTake component
- Used controlled radio inputs with clear descriptions for each mode

**Dual-Mode Test Taking (TestTake.tsx):**
- Refactored into two distinct components: `AllAtOnceMode` and `OneByOneMode`
- All-at-once mode: Shows all questions in a scrollable list, submit at end, sticky timer header
- One-by-one mode: Shows one question at a time with "Check Answer" button that reveals correctness, explanation, and highlighted correct/wrong answers before proceeding to next
- Used Set data structure to track which questions have been checked in one-by-one mode
- Both modes preserve auto-save, timer, and answer tracking functionality

**Answer Count Configuration (ExamCreate.tsx):**
- Added `answerCount` input field (range 2-6, default 4) to control number of answer options per question
- Updated ExamConfig type to include optional `answerCount?: number`
- Field is passed to API when creating exam

**Responsive CSS Enhancements (App.css):**
- Added comprehensive mobile-first responsive design with breakpoints at 480px, 768px, and 1024px
- Radio group styling for test mode selection with hover/checked states
- Question card styling for all-at-once mode
- Feedback box styling for one-by-one mode showing correct/incorrect answers
- Sticky toolbar positioning for timer visibility on all screen sizes
- Mobile optimizations: full-width buttons, stacked layouts, larger touch targets, hidden logo text on small screens
- Tablet optimizations: adjusted grid columns and spacing
- All form controls, buttons, and navigation elements responsive
- Tables scroll horizontally on mobile with touch scrolling

