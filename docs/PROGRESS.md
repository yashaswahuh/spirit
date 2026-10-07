# Progress

## Done
- **Phase 0: Specifications, Architecture & Database Design**:
  - Created `docs/PLAN.md` with complete mobile-first architecture, detailed folder structure, mathematical calculation formulas, offline sync protocol, and Phase 1-6 implementation roadmaps.
  - Created `docs/types.ts` defining strict TypeScript models for all 12 entities (Profile, Program, GradingScheme, Term, Course, TimetableSlot, CalendarEvent, AttendanceRecord, AssessmentComponent, Mark, GradeResult, Task) and domain calculation types.
  - Created `supabase/migration.sql` with all 12 tables, composite indexes on `(user_id, updated_at)` for delta sync, and Row-Level Security (RLS) policies enforcing `user_id = auth.uid()` on all operations.

## Remaining
- **Phase 1**: Project Scaffolding & Pure-TS Calculation Engine (Vite, React, Tailwind, Vitest unit test suite for attendance, safe bunks, must attend, SGPA/CGPA, what-if, required marks).
- **Phase 2**: Local Storage (Dexie), Zod Validation, Repositories & Import/Export.
- **Phase 3**: Core UI Shell, Mobile Navigation & Onboarding Wizard.
- **Phase 4**: Attendance Tracking & Timetable Screens.
- **Phase 5**: Grades, Assessments & Academic Dashboard.
- **Phase 6**: Tasks, Settings, PDF Report, PWA & Supabase Cloud Sync.

## Known Issues
- None.
