# Spirit: Implementation Plan & System Architecture

## 1. System Architecture Overview

Spirit is a mobile-first Progressive Web App (PWA) designed specifically for college students, tailored first for the Indian higher education system with data-driven flexibility for international grading (such as European ECTS).

### Architectural Pillars

1. **Local-First by Default (Zero-Login Readiness)**:
   - Primary storage is client-side in browser IndexedDB powered by **Dexie.js**.
   - All core features (attendance tracking, what-if simulator, SGPA/CGPA computation, timetable management, task tracking) work instantaneously without user registration, network connectivity, or external servers.
   - User data is completely private; no analytics, telemetries, or trackers are bundled.

2. **Isolated Pure-TypeScript Calculation Engine (`/src/engine`)**:
   - Zero dependencies on React, UI libraries, or DOM APIs.
   - All academic rules (safe bunks, required attendance, end-sem target marks, SGPA/CGPA conversion, best-of-N assessments) are implemented as pure mathematical functions.
   - Fully unit-tested with Vitest, covering standard cases, boundary limits, and zero-denominator edge cases.

3. **Validation & Integrity (Zod)**:
   - Every entity write (Dexie mutations) and external data intake (JSON/CSV import, Supabase sync) passes strict Zod schema validation.
   - Enforces types, valid timestamps, valid UUID formats, and bounded numerical ranges (credits, percentages, marks).

4. **GitHub Pages & PWA Portability**:
   - Built with Vite, React, and Tailwind CSS.
   - Uses `HashRouter` to prevent 404 routing issues on static hosting environments like GitHub Pages.
   - Configurable base path (constant default: `/spirit/`).
   - Standard Service Worker and web app manifest providing offline installation on iOS, Android, and Desktop browsers.

5. **Optional Cloud Sync & Supabase Backend**:
   - Optional user sign-in via Supabase Auth: 6-digit email OTP (in-app entry, no fragile magic links) and Google OAuth.
   - Client-generated UUIDs across all tables allow local records to be created offline and synchronized later.
   - Strict Row-Level Security (RLS) on every Supabase table: `user_id = auth.uid()`.
   - Never exposes Supabase `service_role` keys on the frontend.
   - Bidirectional sync powered by an offline queue with Last-Write-Wins (LWW) conflict resolution using `updated_at`, alongside soft deletions (`deleted_at`).

---

## 2. Directory & File Structure

```
d:/spirit/
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Pages CI/CD workflow
├── docs/
│   ├── SPEC.md                     # Source of truth specification
│   ├── PROGRESS.md                 # Phase status tracker
│   ├── PLAN.md                     # Architectural plan & phase roadmaps
│   └── types.ts                    # Canonical TypeScript interfaces
├── supabase/
│   └── migration.sql               # PostgreSQL tables, indexes, and RLS policies
├── public/
│   ├── favicon.ico
│   ├── icon-192.png
│   ├── icon-512.png
│   └── manifest.json               # PWA Web App Manifest
├── src/
│   ├── engine/                     # Pure-TS Calculation Engine (Zero React imports)
│   │   ├── attendance.ts           # Attendance %, safe bunks, must attend
│   │   ├── projection.ts           # Best-case/worst-case term attendance projection
│   │   ├── whatif.ts               # What-if skip simulation across subjects
│   │   ├── gpa.ts                  # SGPA, CGPA across terms, backlog/repeat rules
│   │   ├── marks.ts                # Best-of-N, drop lowest, internal aggregation
│   │   ├── required-marks.ts       # Solver for needed end-sem marks to reach target
│   │   ├── grading-presets.ts      # Indian university grading scheme presets (UGC, AICTE, etc.)
│   │   └── __tests__/              # Vitest test suite for all engine modules
│   │       ├── attendance.test.ts
│   │       ├── projection.test.ts
│   │       ├── whatif.test.ts
│   │       ├── gpa.test.ts
│   │       ├── marks.test.ts
│   │       └── required-marks.test.ts
│   ├── db/                         # Local IndexedDB & Storage Layer
│   │   ├── dexie.ts                # Dexie DB schema definitions and instance
│   │   ├── schemas.ts              # Zod schemas for all 12 entities
│   │   ├── repositories/           # Type-safe CRUD repositories
│   │   │   ├── profile.repo.ts
│   │   │   ├── program.repo.ts
│   │   │   ├── grading.repo.ts
│   │   │   ├── term.repo.ts
│   │   │   ├── course.repo.ts
│   │   │   ├── timetable.repo.ts
│   │   │   ├── calendar.repo.ts
│   │   │   ├── attendance.repo.ts
│   │   │   ├── assessment.repo.ts
│   │   │   ├── mark.repo.ts
│   │   │   ├── grade.repo.ts
│   │   │   └── task.repo.ts
│   │   ├── sync/                   # Offline sync engine with Supabase
│   │   │   ├── client.ts           # Supabase client setup (public anon key only)
│   │   │   ├── queue.ts            # IndexedDB offline mutation queue
│   │   │   └── sync-engine.ts      # Delta sync, LWW resolution, soft-deletes
│   │   └── import-export.ts        # JSON and CSV export/import backup helpers
│   ├── context/                    # React Contexts
│   │   ├── ThemeContext.tsx        # Light/Dark/System theme & accent color provider
│   │   ├── AcademicContext.tsx     # Active program, active term, courses state
│   │   └── AuthContext.tsx         # Supabase auth state & sync trigger
│   ├── hooks/                      # Custom React Hooks
│   │   ├── useAttendance.ts        # Live attendance calculations for courses
│   │   ├── useTimetable.ts         # Slots for today (handling swap days and holidays)
│   │   ├── useGrades.ts            # Dynamic SGPA/CGPA calculations
│   │   └── useSync.ts              # Online status, sync progress, pending count
│   ├── components/                 # UI Component Library
│   │   ├── ui/                     # Primitives (Buttons, Badges, Inputs, Dialogs)
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── ProgressBar.tsx
│   │   ├── layout/                 # Layout Shell & Navigation
│   │   │   ├── AppShell.tsx        # Mobile wrapper with max-w-md / desktop centering
│   │   │   ├── BottomNav.tsx       # 5-Tab mobile bottom navigation
│   │   │   └── Header.tsx          # Top bar with term selector & quick status
│   │   ├── attendance/             # Attendance UI components
│   │   │   ├── CourseAttendanceCard.tsx
│   │   │   ├── AttendanceStatusBadge.tsx
│   │   │   ├── SafeBunkCounter.tsx
│   │   │   ├── AttendanceCalendar.tsx
│   │   │   └── WhatIfSimulatorModal.tsx
│   │   ├── timetable/              # Timetable UI components
│   │   │   ├── TodayClassCard.tsx
│   │   │   ├── TimetableGrid.tsx
│   │   │   └── SwapDayBanner.tsx
│   │   ├── grades/                 # Grades & marks components
│   │   │   ├── SgpaCard.tsx
│   │   │   ├── MarksComponentEditor.tsx
│   │   │   ├── RequiredMarksCalculator.tsx
│   │   │   └── SchemeEditorModal.tsx
│   │   └── onboarding/             # Step-by-step onboarding wizard
│   │       ├── StepProgram.tsx
│   │       ├── StepTerm.tsx
│   │       ├── StepCourses.tsx
│   │       ├── StepTimetable.tsx
│   │       └── StepThreshold.tsx
│   ├── screens/                    # Top-level screen views
│   │   ├── OnboardingScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── AttendanceScreen.tsx
│   │   ├── TimetableScreen.tsx
│   │   ├── GradesScreen.tsx
│   │   └── MoreScreen.tsx
│   ├── utils/                      # Helper functions
│   │   ├── date.ts                 # Date formatting & Indian calendar helpers
│   │   ├── uuid.ts                 # Crypto UUID generator
│   │   └── pdf.ts                  # Clean printable attendance report generator
│   ├── App.tsx                     # Routing & Providers
│   ├── main.tsx                    # React DOM entrypoint
│   └── index.css                   # Tailwind CSS root & accessible custom utilities
├── .gitignore
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

---

## 3. Phase Breakdown & Implementation Roadmap

### Phase 1: Engine Foundation & Core Testing
- **Goal**: Establish the project tooling (Vite, React, TypeScript, Tailwind, Vitest) and implement the pure calculation engine with 100% test coverage.
- **Tasks**:
  1. Initialize `package.json`, `tsconfig.json`, `vite.config.ts`, and `vitest.config.ts` without UI code.
  2. Implement pure engine functions in `/src/engine`:
     - `attendance.ts`: Calculate percentage (`attended / conducted * 100`), Safe Bunks formula (`floor(attended/t - conducted)`), and Must Attend formula (`ceil((t*conducted - attended)/(1-t))`), handling edge cases (conducted = 0, threshold = 100%).
     - `projection.ts`: Compute remaining classes from timetable minus holidays; calculate best-case, worst-case, and remaining classes needed.
     - `whatif.ts`: Simulate missing $N$ days/classes and calculate new attendance status across courses.
     - `gpa.ts`: Compute SGPA (`sum(credits * points) / sum(credits)`), CGPA across terms, backlog/repeat grade resolution, percentage formulas.
     - `marks.ts`: Aggregate internal marks with support for normal, `best_of_N`, and `drop_lowest` rules.
     - `required-marks.ts`: Solve for minimum end-sem marks to reach target course grade.
     - `grading-presets.ts`: Built-in Indian university presets (UGC 10-point, AICTE, percentage-based, VTU, Anna University).
  3. Write comprehensive Vitest unit tests in `/src/engine/__tests__`.
  4. Verify all tests pass with zero errors.

### Phase 2: Local Database (Dexie), Zod Validation, Repositories & Import/Export
- **Goal**: Implement the robust local-first database layer and validation logic.
- **Tasks**:
  1. Define Dexie database class in `/src/db/dexie.ts` covering all 12 tables and indexing keys.
  2. Implement Zod validation schemas for all entities in `/src/db/schemas.ts`.
  3. Create type-safe repositories in `/src/db/repositories/` with CRUD methods, auto-populating `id` (crypto UUID), `created_at`, `updated_at`, and soft deletes (`deleted_at`).
  4. Add JSON and CSV export/import utilities with strict validation to prevent corrupted imports.
  5. Add seeding presets for fast onboarding testing.
  6. Unit-test repository operations and validation schemas with Vitest.

### Phase 3: Core UI Framework, Theming & Onboarding Wizard
- **Goal**: Deliver a polished mobile-first application shell and complete onboarding flow.
- **Tasks**:
  1. Setup Tailwind CSS with responsive mobile wrapper (`AppShell.tsx`), dark/light theme toggle, custom accent colors, and accessible contrast ratios.
  2. Implement 5-tab bottom navigation (`BottomNav.tsx`: Home, Attendance, Timetable, Grades, More) using `HashRouter`.
  3. Build the Onboarding Wizard (`OnboardingScreen.tsx`):
     - Step 1: Degree preset selection (BTech, BE, lateral entry, BCA, MCA, MBBS, etc.).
     - Step 2: Program and term setup (term system, dates).
     - Step 3: Course builder (course name, code, credits, type, medical/duty leave toggles).
     - Step 4: Timetable configuration (weekday slots, custom period timings).
     - Step 5: Default attendance threshold (e.g., 75%, 80%, 85%).
  4. Ensure wizard state is skippable, resumable, and safely saved to Dexie.

### Phase 4: Attendance Tracking & Timetable Features
- **Goal**: Realize the primary daily use-cases: fast one-tap attendance logging and timetable views.
- **Tasks**:
  1. **Home Screen**:
     - "Today's Classes" card with instant one-tap logging (Present, Absent, Cancelled).
     - Overall attendance progress ring, subjects in danger (< threshold), and safe-bunk indicators.
     - Swap day notifications (e.g., "Following Monday's schedule today").
     - Quick overview of pending tasks and upcoming exams.
  2. **Attendance Screen**:
     - Subject cards showing attendance percentage, color status (plus accessible icon and text labels: Safe, Danger, Critical), conducted/attended count, safe bunk count, or classes required to attend.
     - Per-subject detailed modal with past log timeline and calendar view.
     - Edit/correct past attendance records.
     - Integrated What-If Planner: slider or day selector to test skipping upcoming days.
  3. **Timetable Screen**:
     - Day view and weekly grid.
     - Support for period timing changes.
     - Calendar event management: add holidays, exam days, and swap days.

### Phase 5: Academic & Grades Engine UI
- **Goal**: Full marks tracking, semester results, and GPA projections.
- **Tasks**:
  1. **Grades Screen**:
     - Term selector and course lists with credit breakdown.
     - Assessment component editor (e.g. CAT1, CAT2, Assignment, End-sem) with weightages and rules (Best-of-N, drop lowest).
     - SGPA display and multi-term CGPA trend chart.
     - Backlog/arrear tracker with repeat attempt history.
  2. **Required Marks Calculator**:
     - Interactive tool: student inputs current internal marks and target grade/percentage; engine calculates required end-sem marks.
  3. **Grading Scheme Editor**:
     - Customizer modal to tweak letter-to-point mappings, pass marks, and CGPA-to-percentage formulas with disclaimer notice.

### Phase 6: Tasks, Settings, Reports, PWA & Supabase Cloud Sync
- **Goal**: Complete all secondary features, offline PWA capabilities, and Supabase cloud synchronization.
- **Tasks**:
  1. **More Screen**:
     - Task manager (assignments, deadlines, exams).
     - App settings (theme, accent color, default attendance threshold).
     - Clean, printer-friendly attendance report (HTML/PDF print stylesheet).
     - Data management: export JSON/CSV backup, import data, reset/clear local data.
  2. **PWA Enhancements**:
     - Manifest configuration, service worker caching, install prompt support.
  3. **Supabase Cloud Sync**:
     - Sign-in UI: 6-digit email OTP and Google Sign-In.
     - Offline queue: changes while offline stored in Dexie and pushed sequentially upon reconnect.
     - Delta sync: fetch records where `updated_at > last_synced_at`.
     - First-time sign-in flow: automatically upload existing local records to user account.

---

## 4. Calculation Formulas & Mathematical Specifications

### Attendance Formulas
Let:
- $A$ = attended classes (including medical/duty leaves if configured to count as present)
- $C$ = conducted classes (excluding cancelled and holidays)
- $t$ = attendance threshold as a fraction, $t \in (0, 1]$ (e.g., $0.75$ for $75\%$)

1. **Current Attendance Percentage**:
   $$P = \begin{cases} 100\% & \text{if } C = 0 \\ \frac{A}{C} \times 100 & \text{if } C > 0 \end{cases}$$

2. **Safe Bunks** (classes that can be skipped while maintaining $P \ge t \times 100$):
   $$\text{Safe Bunks } x = \max\left(0, \left\lfloor \frac{A}{t} - C \right\rfloor\right)$$

3. **Must Attend** (consecutive classes required to recover to $P \ge t \times 100$):
   $$\text{Must Attend } y = \begin{cases}
   0 & \text{if } \frac{A}{C} \ge t \text{ or } C = 0 \\
   \infty & \text{if } t = 1 \text{ and } A < C \\
   \left\lceil \frac{t \cdot C - A}{1 - t} \right\rceil & \text{otherwise}
   \end{cases}$$

### SGPA & CGPA Calculation
1. **SGPA** (Semester Grade Point Average):
   $$\text{SGPA} = \frac{\sum_{i=1}^{k} (\text{Credits}_i \times \text{GradePoints}_i)}{\sum_{i=1}^{k} \text{Credits}_i}$$
   *(Only courses with `counts_toward_gpa = true` are included in the calculation)*.

2. **CGPA** (Cumulative Grade Point Average):
   $$\text{CGPA} = \frac{\sum_{j=1}^{m} \sum_{i=1}^{k_j} (\text{Credits}_{ji} \times \text{GradePoints}_{ji})}{\sum_{j=1}^{m} \sum_{i=1}^{k_j} \text{Credits}_{ji}}$$
   - If a course was repeated (backlog attempt), the chosen policy determines whether to replace the old attempt's points or keep the higher grade points.

3. **CGPA to Percentage Conversion**:
   - Multiplier model: $\text{Percentage} = \text{CGPA} \times M$ (Default AICTE/CBSE: $M = 9.5$).
   - Custom formula model (e.g., VTU: $(\text{CGPA} - 0.75) \times 10$).

---

## 5. Sync Protocol & Conflict Resolution

```
[User Action in UI]
       │
       ▼
[Validate with Zod]
       │
       ▼
[Write to IndexedDB (Dexie)] ──► Immediate UI Update (Local-First)
       │
       ▼
[Append to Offline Sync Queue]
       │
       ├──► (If Online & Authenticated)
       │         │
       │         ▼
       │    [Push to Supabase via RPC / REST]
       │         │
       │         ▼
       │    [On Success: Remove from Queue]
       │
       └──► (If Offline / Network Error)
                 │
                 ▼
            [Retain in Queue, Retry on 'online' event]
```

- **Conflict Resolution**: Last-Write-Wins (LWW) based on client timestamp `updated_at`.
- **Soft Deletes**: Deletions set `deleted_at = now()`. Supabase sync synchronizes soft-deleted records to ensure multi-device deletion consistency.
- **Data Privacy**: Anonymous users never contact Supabase; zero external requests are triggered unless the user explicitly authenticates.
