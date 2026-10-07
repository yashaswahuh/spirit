# Spirit: Attendance + Semester Dashboard

## 1. Product
A mobile-first web app (PWA) for college students, built around the INDIAN education system first (Europe/ECTS later, so keep everything data-driven). Core jobs: track attendance per subject and tell the student exactly how many classes they can skip or must attend; manage the timetable; track internal and end-sem marks; compute SGPA/CGPA/percentage; track exams and deadlines.

Must support every program type through configuration, not hardcoding: BTech/BE (incl. lateral entry starting at semester 3), MTech/ME, BSc, MSc, BA, MA, BCom, MCom, BBA, MBA, BCA, MCA, BArch, BPharm, LLB, MBBS and other medical, diploma/polytechnic, integrated programs (5-6 yrs), and "other/custom".

## 2. Tech
- React + TypeScript + Vite + Tailwind, HashRouter, configurable base path (one constant, default /spirit/) for GitHub Pages.
- Local-first: all features work with NO login using IndexedDB (use Dexie). Optional sign-in syncs to Supabase (Postgres + Auth + RLS).
- Pure-TypeScript calculation engine in /src/engine with zero React imports, fully unit tested (vitest).
- zod validation on every save and on import. No service_role key anywhere in the frontend. No analytics/trackers.
- PWA: installable, works offline.
- NEVER scrape or integrate with college ERP/portals.

## 3. Data model (all rows have: id (client-generated UUID), user_id, created_at, updated_at, deleted_at nullable)
- profile: name, region (IN default), theme, accent, default attendance threshold.
- program: degree_type, branch/department, start_year, duration_years, entry_type (regular/lateral), term_system (semester/trimester/annual), grading_scheme_id.
- grading_scheme (JSON, user-editable, with presets): type (point_scale/percentage/division/pass_fail), letter->points map, pass mark, max point (10 or 4 etc.), cgpa_to_percentage rule (multiplier or custom formula), rounding rule. Presets are APPROXIMATIONS: show a notice "Check your university's rules" and let the user edit everything.
- term: program_id, number/name, start_date, end_date, sgpa (computed), status.
- course: term_id, name, code, credits, type (theory/lab/tutorial/project/elective/audit), counts_toward_gpa, attendance_threshold override, color.
- timetable_slot: course_id, weekday, period start/end time, room, component type. Configurable period timings.
- calendar_event: date, type (holiday/exam/swap-day/event), note. Swap day = "follow Monday's timetable on Saturday".
- attendance_record: course_id, date, slot_id nullable, status (present/absent/cancelled/medical/duty_leave/holiday), note. Per-subject rules: whether medical and duty leave count as present (setting).
- assessment_component: course_id, name (CAT1, mid-sem, assignment, lab internal, end-sem...), max_marks, weightage, rule (normal / best_of_N / drop_lowest).
- mark: component_id, obtained_marks.
- grade_result: course_id, letter/points (final), attempt number (supports backlog/arrear, repeat/improvement).
- task: title, type (assignment/exam/other), due_at, course_id nullable, done.

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
- More: tasks and exams, settings (theme, accent, thresholds, period timings), export/import (JSON, CSV), PDF/print attendance report, sign in/out, delete all data.
- Design: clean, friendly, dark and light, large touch targets, empty states, accessible (never color alone), respects prefers-reduced-motion.

### Responsive rules
- **Under 640px (phone)**: Single column, bottom tab bar (`BottomNav`), bottom sheets for dialogs (`ResponsiveDialog`), touch targets >= 44px.
- **640px to 1023px (tablet)**: Two-column responsive grids where useful, content max width approx 900px.
- **1024px and up (desktop/laptop)**: Left sidebar replaces bottom tab bar, content area max width approx 1200px, multi-column dashboard, dialogs render as centered modals.
- **Large screens (1536px+)**: Content centered with sensible max-widths and no stretched cards.
- **Universal compatibility**: All future screens, including tables, the weekly timetable grid, and charts, must be built on the shared layout components (`AppShell`, `PageContainer`, `ResponsiveGrid`, `ResponsiveDialog`) and work seamlessly from 320px to 1920px without horizontal scrolling.

## 6. Backend (Supabase)
- RLS enabled on EVERY table. Policies: select/insert/update/delete only where user_id = auth.uid(). No public access.
- Auth: email OTP (6-digit code entered in-app) and Google sign-in. Do NOT depend on magic-link redirects (HashRouter makes them unreliable).
- Sync: client-generated UUIDs, offline queue, last-write-wins by updated_at, soft deletes. First sign-in offers to upload local data.
- SQL goes in /supabase/migration.sql as a file. NEVER execute it yourself.
- Keep rows compact (free-tier limits).

## 7. Out of scope for now
Europe/ECTS presets (but design grading, terms, and locale as data so they can be added), social features, AI features, college portal integration.

## 8. Conventions
Small components, strict TypeScript, engine separate from UI, tests beside code, commit per phase, keep docs/PROGRESS.md updated.

## 9. Working rules for EVERY phase
- Read docs/SPEC.md and docs/PROGRESS.md first. Read only other files you need. Do not open a browser or take screenshots.
- Implement ONLY the phase I name. Do not start other phases or refactor unrelated code.
- Work on a git branch named phase-N (N = phase number). Never commit to main directly.
- Never run the Supabase migration or any command that changes remote services. Never put real keys in code or commits.
- Before finishing: run the tests and "npm run build" (once the project exists) and fix errors.
- Final report, in this order: (1) files created/changed, (2) test and build results (pass/fail with real output summary), (3) commit made, (4) docs/PROGRESS.md updated with done / remaining / known issues, (5) 3-5 steps for me to test manually, (6) anything you had to guess or could not do.
- If you are running low on usage, stop at a clean point, commit what works, and write the remaining work into docs/PROGRESS.md.
