# Spirit: Attendance + Semester Dashboard

## 1. Product
A mobile-first web app (PWA) for college students, built around the INDIAN education system first (Europe/ECTS later, so keep everything data-driven). Core jobs: track attendance per subject and tell the student exactly how many classes they can skip or must attend; manage the timetable; track internal and end-sem marks; compute SGPA/CGPA/percentage; track exams and deadlines.

Must support every program type through configuration, not hardcoding: BTech/BE (incl. lateral entry starting at semester 3), MTech/ME, BSc, MSc, BA, MA, BCom, MCom, BBA, MBA, BCA, MCA, BArch, BPharm, LLB, MBBS and other medical, diploma/polytechnic, integrated programs (5-6 yrs), and "other/custom".

## 2. Tech
- React + TypeScript + Vite + Tailwind, HashRouter, configurable base path (one constant, default /spirit/) for GitHub Pages.
- Local-only: data lives only in IndexedDB (Dexie) on the user's device. No backend, no accounts, no login.
- Pure-TypeScript calculation engine in /src/engine with zero React imports, fully unit tested (vitest).
- zod validation on every save and on import. No analytics/trackers.
- PWA: installable, works offline.
- NEVER scrape or integrate with college ERP/portals.

## 3. Data model (all rows have: id (client-generated UUID), created_at, updated_at, deleted_at nullable; kept so cloud sync can be added later, no user_id requirement)
- profile: name, region (IN default), theme, accent, default attendance threshold.
- program: degree_type, branch/department, start_year, duration_years, entry_type (regular/lateral), term_system (semester/trimester/annual), grading_scheme_id.
- grading_scheme (JSON, user-editable, with presets): type (point_scale/percentage/division/pass_fail), letter->points map, pass mark, max point (10 or 4 etc.), cgpa_to_percentage rule (multiplier or custom formula), rounding rule, repeat_handling (replace_old/keep_best). Presets are APPROXIMATIONS: show a notice "Check your university's rules" and let the user edit everything.
- term: program_id, number/name, start_date, end_date, sgpa (computed), status, attendance_threshold, working_days, period_timings.
- course: term_id, name, code, credits, type (theory/lab/theory_and_lab/tutorial/project/elective/audit), counts_toward_gpa, attendance_threshold override, color, medical/duty leave rules, initial_attended, initial_conducted, tracking_start_date, min_internal_marks, min_end_sem_marks, pass_marks, grade_band_override, faculty nullable. Integrated theory_and_lab courses allow a single subject entry to represent both lectures and practical labs without duplicate course entries. Entering or editing faculty name anywhere (subject settings or timetable slot) automatically synchronizes across all days and slots for that subject.
- timetable_version: term_id, name, effective_from.
- timetable_slot: course_id, version_id nullable, weekday, start_time, end_time, room, faculty nullable, component_type, weight (periods it counts for, default 1), period_name nullable.
- timetable_override: term_id, date, action (cancel/substitute/extra/reschedule), original_slot_id nullable, course_id, start_time, end_time, room, faculty, component_type, weight, note.
- calendar_event: date, end_date nullable, type (holiday/exam/swap-day/event), swap_target_weekday nullable, note. Swap day = "follow Monday's timetable on Saturday".
- attendance_record: course_id, date, slot_id nullable, status (present/absent/cancelled/medical/duty_leave/holiday), weight (default 1), component_type nullable, override_id nullable, note. Per-subject rules: whether medical and duty leave count as present (setting).
- assessment_component: course_id, name (CAT1, mid-sem, assignment, lab internal, end-sem...), max_marks, weightage, rule (normal / best_of_N / drop_lowest), rule_group nullable, rule_params nullable, is_end_sem, min_pass_marks.
- mark: component_id, obtained_marks (nullable), status (entered/absent/not_held).
- grade_result: course_id, term_id nullable, letter_grade (final, supports special grades AB/I/W/P/F), grade_points nullable, attempt_number (supports backlog/arrear, repeat/improvement), is_passing.
- task: title, type (assignment/quiz/mid_sem/end_sem/exam/project/other), due_at, course_id nullable, done, syllabus, notes, venue.

## 4. Calculation engine (unit-test all, including edge cases)
- attendance% = attended / conducted * 100. Cancelled and holiday are excluded from conducted. Medical/duty follow per-course settings.
- Safe bunks: max x with attended/(conducted+x) >= t, so x = floor(attended/t - conducted), min 0.
- Must attend: min y with (attended+y)/(conducted+y) >= t, so y = ceil((t*conducted - attended)/(1-t)). Handle t = 1 (100%) and conducted = 0.
- Projection: using remaining scheduled classes (timetable minus holidays until term end), compute best case, worst case, and "classes I must still attend" to finish at threshold.
- What-if planner: "if I skip these N days, what happens to each subject?"
- SGPA = sum(credits * grade_points) / sum(credits) for GPA-counting courses. CGPA across terms with backlog and repeat handling (configurable: replace old grade or keep best). Percentage conversion from scheme rule. Rounding configurable.
- Percentage/division mode for annual-system degrees (marks totals, class/division thresholds editable).
- Required end-sem marks to reach a target grade/percentage given internals, weightage, and pass-mark rules (including a separate minimum in the end-sem).
- Best-of-N and drop-lowest assessment rules.

## 5. Screens (mobile-first, bottom tab bar: Home, Attendance, Timetable, Grades, More)
- Onboarding wizard: choose degree preset -> program details and term -> add subjects (credits, type) -> timetable and period timings -> attendance threshold -> done. Skippable, resumable, everything editable later.
- Home: today's classes with one-tap Present/Absent/Cancelled, overall attendance, subjects in danger, safe-bunk counts, upcoming exams and tasks, SGPA/CGPA trend chart.
- Attendance: per-subject cards (percentage, status color PLUS icon and text, safe bunks / must attend), calendar view per subject, edit past records, what-if planner.
- Timetable: weekly grid, today view, swap days, holidays.
- Grades: terms, courses, marks per component, SGPA/CGPA, required-marks calculator, backlog tracker, grading scheme editor.
- More: tasks and exams, settings (theme, accent, thresholds, period timings), Backup and Restore (JSON export/import, CSV export) and a "last backed up" status, PDF/print attendance report, delete all data.
- Design: clean, friendly, dark and light, large touch targets, empty states, accessible (never color alone), respects prefers-reduced-motion.

### Responsive rules
- **Under 640px (phone)**: Single column, bottom tab bar (`BottomNav`), bottom sheets for dialogs (`ResponsiveDialog`), touch targets >= 44px.
- **640px to 1023px (tablet)**: Two-column responsive grids where useful, content max width approx 900px.
- **1024px and up (desktop/laptop)**: Left sidebar replaces bottom tab bar, content area max width approx 1200px, multi-column dashboard, dialogs render as centered modals.
- **Large screens (1536px+)**: Content centered with sensible max-widths and no stretched cards.
- **Universal compatibility**: All future screens, including tables, the weekly timetable grid, and charts, must be built on the shared layout components (`AppShell`, `PageContainer`, `ResponsiveGrid`, `ResponsiveDialog`) and work seamlessly from 320px to 1920px without horizontal scrolling.

## 6. Storage & Privacy
- No backend. No accounts. No data leaves the device.
- Storage-safety rule:
  - Request persistent storage with `navigator.storage.persist()`.
  - Show a backup reminder after a number of days or changes.
  - Show install-to-home-screen guidance (especially for iOS).

## 7. Out of scope for now
Cloud sync and accounts, Europe/ECTS presets (but design grading, terms, and locale as data so they can be added), social features, AI features, college portal integration.

## 8. Conventions
Small components, strict TypeScript, engine separate from UI, tests beside code, commit per phase, keep docs/PROGRESS.md updated.

## 9. Working rules for EVERY phase
- Read docs/SPEC.md and docs/PROGRESS.md first. Read only other files you need. Do not open a browser or take screenshots.
- Implement ONLY the phase I name. Do not start other phases or refactor unrelated code.
- Work on a git branch named phase-N (N = phase number). Never commit to main directly.
- Phases must NOT create or update supabase/migration.sql. Move the existing supabase/ folder to docs/archive/supabase/ and mark it unused.
- Before finishing: run the tests and "npm run build" (once the project exists) and fix errors.
- Final report, in this order: (1) files created/changed, (2) test and build results (pass/fail with real output summary), (3) commit made, (4) docs/PROGRESS.md updated with done / remaining / known issues, (5) 3-5 steps for me to test manually, (6) anything you had to guess or could not do.
- If you are running low on usage, stop at a clean point, commit what works, and write the remaining work into docs/PROGRESS.md.
