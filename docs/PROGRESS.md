# Progress

## Done
- **Phase 0: Specifications, Architecture & Database Design**:
  - Created `docs/PLAN.md` with complete architecture, folder structure, calculation engine formulas, offline sync protocol, and phase roadmaps.
  - Defined strict TypeScript types for all 12 entities and engine interfaces.
  - Created `supabase/migration.sql` with schema, composite indexes on `(user_id, updated_at)`, and RLS policies.
- **Phase 1: Project Scaffolding, Pure Calculation Engine & Presets**:
  - Scaffolded Vite + React + TypeScript + Tailwind CSS + Vitest project with configurable base path (`/spirit/`).
  - Moved types into `src/types/index.ts`.
  - Implemented pure TypeScript calculation engine in `src/engine/` (zero React imports) covering attendance formulas, safe bunks, must-attend, projections, what-if simulations, SGPA/CGPA with backlog/repeat resolution, annual divisions, and required end-sem solver.
  - Created data presets in `src/presets/` for Indian degree programs and grading schemes with approximation notices.
- **Phase 2: Local Storage (Dexie), Onboarding, One-Tap Attendance & Home Dashboard**:
  - Integrated local-first storage using **Dexie.js** (`spirit_db` in IndexedDB) supporting all 12 entities with zero login required.
  - Built Zod validation schemas in `src/db/schemas.ts` and type-safe repositories in `src/db/repositories/`.
  - Built Onboarding Wizard (`OnboardingWizard.tsx`): 5-step wizard (Degree preset selection, Program & term details, Subject builder, Timetable setup, Attendance threshold selector) with a 1-tap "Skip & Load Demo" option.
  - Subject management: View, add, edit, and delete courses with credits, types, colors, threshold overrides, and leave rules.
  - One-tap attendance marking: Today's classes section on the Home dashboard and quick buttons (+Present, -Absent, Cancelled) on subject cards.
  - Per-subject attendance cards: Attendance percentage, status badge with accessible icon and text (never color alone), safe-bunks / must-attend counter, and conducted tally.
  - Bottom tab bar: 5 tabs (Home, Attendance, Timetable, Grades, More) using `HashRouter` with touch-friendly 48px+ targets.
  - Home dashboard: Overall attendance card, danger subject alerts, and today's schedule with one-tap status toggling.
  - Full test suite passing (8 test files, 57 tests) and verified clean production build (`tsc && vite build`).

## Remaining
- **Phase 3**: What-If Simulator Modal & Timetable Grid with Swap-Days & Holiday Management.
- **Phase 4**: Per-Subject Calendar View & Past Attendance Logs Editing.
- **Phase 5**: Grades, Assessment Components (Best-of-N / Drop-Lowest), SGPA/CGPA Dashboard & Required Marks Solver UI.
- **Phase 6**: Tasks & Exams Tracker, PDF/Print Attendance Report, Offline PWA Manifest/Worker, and Supabase Cloud Sync with 6-digit OTP & Google Auth.

## Known Issues
- None.
