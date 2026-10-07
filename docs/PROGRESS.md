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
  - Built Onboarding Wizard (`OnboardingWizard.tsx`) with 1-tap "Skip & Load Demo" option.
  - Subject management: View, add, edit, and delete courses with credits, types, colors, threshold overrides, and leave rules.
  - One-tap attendance marking on today's classes and per-subject cards.
  - Per-subject attendance cards with percentage, status badges (icon + text), safe bunks / must-attend counter, and conducted tally.
- **Phase 2b: Responsive Layout Pass (Every Screen Size 320px–1920px)**:
  - Built reusable responsive layout building blocks:
    - `AppShell`: Handles left sidebar on desktop (`lg:flex` at $\ge 1024\text{px}$) vs bottom navigation on mobile/tablet (`lg:hidden` at $< 1024\text{px}$).
    - `PageContainer`: Responsive maximum width container with sensible padding from phone to ultra-wide displays (`sm:max-w-3xl`, `lg:max-w-6xl`, `2xl:max-w-7xl`).
    - `ResponsiveGrid`: Clean multi-column grids for dashboards, subjects, and timetable slots.
    - `ResponsiveDialog`: Bottom-sheet modal on phones ($< 640\text{px}$), centered backdrop dialog on tablet/desktop ($\ge 640\text{px}$).
    - `Sidebar`: Desktop navigation with logo, active pills, term subtitle, theme switcher, and offline indicator.
  - Fixed Today's Class Cards:
    - Time display rendered strictly on ONE line (`09:00 - 09:55`, `whitespace-nowrap`).
    - Present/Absent/Cancelled buttons placed below class details on narrow mobile screens and beside it on wider displays.
  - Enhanced desktop interactions: hover transitions, `focus-visible` accessibility rings, keyboard navigation, and touch targets $\ge 40\text{px}-44\text{px}$ on phones.
  - Added "Responsive rules" subsection to `docs/SPEC.md` (Section 5).
  - All 57 unit tests pass and clean production build verified.
- **Specification Update: Local-Only Architecture (`spec-local-only`)**:
  - Transitioned specification strictly to local-only architecture: no backend, no accounts, no sign-in, and no data leaving the user's device.
  - Section 2 updated: data lives only in IndexedDB (Dexie).
  - Section 3 updated: client-generated UUIDs, `created_at`, `updated_at`, and `deleted_at` retained for potential future sync, but `user_id` requirement removed.
  - Section 5 ("More") updated: removed sign in/out; added Backup and Restore (JSON export/import, CSV export) with "last backed up" status.
  - Section 6 replaced: Storage & Privacy rules defined (`navigator.storage.persist()`, periodic backup reminders, iOS PWA install-to-home-screen guidance).
  - Section 7 updated: cloud sync and accounts added to "out of scope for now".
  - Section 9 updated: removed rule about Supabase migration; phases must NOT create or update `supabase/migration.sql`.
  - Moved `supabase/` directory to `docs/archive/supabase/` and marked unused.
- **Phase 3 (Part A): Timetable & Manual Control**:
  - **Weekly Timetable Editor**: Added, edited, duplicated, deleted slots with course, weekday, start/end time, room, faculty, component type, and slot weight (e.g. 2 or 3 for multi-hour labs).
  - **Overlap Detection**: Pure TypeScript overlap engine detects time clashes on the same weekday, displaying real-time warning banners while allowing them for elective batches and parallel lab sections.
  - **Timetable Versions**: Added `timetable_version` with `effective_from` dates. Creating a new version clones current slots so past attendance and past schedules are preserved without retroactive rewrites.
  - **One-Off Date Overrides**: Added `timetable_override` supporting 4 single-day adjustment actions without altering recurring schedules: cancel class, substitute subject, add extra lecture, and reschedule class.
  - **Holidays & Academic Calendar**: Added single-day holidays, date-range holidays (e.g. vacation weeks), swap days (following another weekday's timetable on a date), and bulk pasting holiday parser supporting ISO & DD/MM/YYYY formats. Holidays automatically exclude that day's classes from "conducted".
  - **Term & Timings Settings**: Built full semester configuration modal for term start/end dates, term attendance threshold, working days selector (Mon-Sat, Sunday optional), custom period timings editor (named periods, breaks, lunch), and per-subject threshold overrides.
  - **Calculation Engine**: Extended `/src/engine/timetable.ts` with 18 unit tests covering slot weights, version transitions, overlap warnings, date range expansions, swap days, and term edge cases (75 passing tests total).
  - **Schema Updates**: Added `timetable_version`, `timetable_override`, and enhanced `term`, `course`, `timetable_slot`, `calendar_event`, `attendance_record` across `docs/SPEC.md`, `src/types/index.ts`, `src/db/schemas.ts`, and `docs/archive/supabase/migration.sql`.

## Remaining
- **Phase 3 (Part B)**: Date-picker day view, Unmarked classes & "Catch up" screen, Opening balances (attended/conducted before tracking started), Per-subject month calendar & term heatmap, Projections per subject (best/worst case & must attend), What-If planner & "Can I skip tomorrow?" card on Home.
- **Phase 4**: Per-Subject Calendar View & Past Attendance Logs Editing.
- **Phase 5**: Grades, Assessment Components (Best-of-N / Drop-Lowest), SGPA/CGPA Dashboard & Required Marks Solver UI.
- **Phase 6**: Tasks & Exams Tracker, PDF/Print Attendance Report, Backup & Restore (JSON/CSV) with persistent storage & reminders, and Offline PWA Manifest/Worker.

## Known Issues
- None.


