# Progress

## Done
- **Phase 0: Specifications, Architecture & Database Design**:
  - Created `docs/PLAN.md` with complete architecture, folder structure, calculation engine formulas, offline sync protocol, and phase roadmaps.
  - Defined strict TypeScript types for all 12 entities and engine interfaces.
  - Created `supabase/migration.sql` with schema, composite indexes on `(user_id, updated_at)`, and RLS policies.
- **Phase 1: Project Scaffolding, Pure Calculation Engine & Presets**:
  - Scaffolded Vite + React + TypeScript + Tailwind CSS + Vitest project with configurable base path (`/spirit/`).
  - Moved types into `src/types/index.ts`.
  - Implemented pure TypeScript calculation engine in `src/engine/` with zero React dependencies:
    - `attendance.ts`: attendance %, safe bunks formula, must attend formula, edge cases (conducted = 0, threshold = 100%, medical/duty leave rules).
    - `projection.ts`: best-case, worst-case, needed classes out of remaining, timetable calendar resolution with holidays and swap days.
    - `whatif.ts`: multi-subject skipping simulations for classes and whole dates.
    - `gpa.ts`: credit-weighted SGPA, multi-term CGPA with backlog and repeat handling (replace_old vs keep_best), percentage conversions, configurable rounding.
    - `annual-division.ts`: marks totals, percentage, and division determination with arrear detection for annual system degrees.
    - `marks.ts`: assessment component calculations for normal, best-of-N, and drop-lowest rules.
    - `required-marks.ts`: needed end-sem marks solver to achieve target course percentage with separate minimum end-sem passing rule.
  - Created comprehensive preset data files in `src/presets/` with approximation notices:
    - Grading schemes: UGC 10-Point, AICTE 10-Point, Percentage/Division, US 4.0 Scale, Custom Template.
    - Programs: BTech (Regular & Lateral Sem 3), MTech, BCA, MCA, BSc, MSc, BCom, MCom, BBA, MBA, BA, MA, BArch, BPharm, LLB, MBBS, Diploma, Integrated, Custom.
  - Added full test suite in `src/engine/__tests__/` (7 test files, 48 tests passing).
  - Verified `tsc && vite build` builds cleanly without errors.
  - Placeholder app page in `src/App.tsx`.

## Remaining
- **Phase 2**: Local Storage (Dexie), Zod Validation, Repositories & Import/Export.
- **Phase 3**: Core UI Shell, Mobile Navigation & Onboarding Wizard.
- **Phase 4**: Attendance Tracking & Timetable Screens.
- **Phase 5**: Grades, Assessments & Academic Dashboard.
- **Phase 6**: Tasks, Settings, PDF Report, PWA & Supabase Cloud Sync.

## Known Issues
- None.
