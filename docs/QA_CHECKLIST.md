# Spirit QA Checklist & Manual Test Plan 📋

This checklist covers manual verification of all Spirit capabilities across phone (320px–639px), tablet (640px–1023px), and desktop/laptop (1024px–1920px).

---

## 1. Onboarding & First-Time Setup

| Test ID | Test Case | Expected Behavior | Mobile (<640px) | Tablet (640–1023px) | Desktop (≥1024px) |
|---|---|---|---|---|---|
| ONB-01 | Fresh Launch | Onboarding wizard opens automatically when no profile exists. | Pass | Pass | Pass |
| ONB-02 | Preset Selection | Choosing an Indian 10-point BTech / 4.0 scale loads appropriate default terms and threshold. | Pass | Pass | Pass |
| ONB-03 | Course Customization | Can add, rename, adjust credits, and change colors of initial courses. | Pass | Pass | Pass |
| ONB-04 | Skip & Load Demo Data | Clicking "Skip & Load Demo" seeds sample subjects, timetable, and logs, tagging them with `is_demo: true`. | Pass | Pass | Pass |
| ONB-05 | Persistence | Refreshing the page keeps all created entities in IndexedDB with zero loss. | Pass | Pass | Pass |

---

## 2. Responsive Layout & Navigation

| Test ID | Test Case | Expected Behavior | Mobile (<640px) | Tablet (640–1023px) | Desktop (≥1024px) |
|---|---|---|---|---|---|
| LAY-01 | Shell Navigation | Mobile renders fixed bottom tab bar; Desktop renders fixed left sidebar with logo & nav links. | Bottom Nav | Compact Rail/Bottom | Left Sidebar |
| LAY-02 | Dashboard Columns | Desktop renders multi-column grid (Attendance hero + today classes on left, health & tasks on right). | 1 Column | 2 Columns | 12-col Grid (7+5) |
| LAY-03 | Dialog Presentation | Dialogs appear as slide-up bottom sheets on mobile, centered modals on tablet/desktop. | Bottom Sheet | Centered Modal | Centered Modal |
| LAY-04 | Ultra-Wide Layout | On 1920px+ displays, content is centered with max-width constraints (no stretched cards). | N/A | N/A | Centered `max-w-7xl` |
| LAY-05 | Touch Target Sizes | All interactive buttons and taps have a minimum touch target of 44×44px or padding. | Pass | Pass | Pass |

---

## 3. Today's Classes & One-Tap Attendance

| Test ID | Test Case | Expected Behavior | Status |
|---|---|---|---|
| ATT-01 | Time Display Formatting | Class timings display on a single line (`09:00 - 09:55`) with no unwanted wrapping. | Pass |
| ATT-02 | One-Tap Present Logging | Tapping "Present" marks session as attended, updates percentage, and highlights button. | Pass |
| ATT-03 | One-Tap Absent Logging | Tapping "Absent" marks session as missed, reduces safe bunks, updates must-attend count. | Pass |
| ATT-04 | Cancelled Class Handling | Tapping "Cancelled" excludes class from conducted count; percentage remains unchanged. | Pass |
| ATT-05 | Multi-Period Lab Weight | A 2-hour lab configured with weight 2 increases conducted by 2 and attended by 2 on present. | Pass |
| ATT-06 | Holiday Day Notification | If today is a holiday, schedule shows holiday banner with note and excludes classes. | Pass |
| ATT-07 | Revert Holiday Option | If a day was marked as holiday by mistake, clicking "Revert Holiday" restores regular schedule. | Pass |

---

## 4. Calculations, "Can I Skip Tomorrow?", and What-If

| Test ID | Test Case | Expected Behavior | Status |
|---|---|---|---|
| CALC-01 | Safe Bunks Formula | Computes $\lfloor A / t - C \rfloor$. Displays integer number of classes student can miss safely. | Pass |
| CALC-02 | Must-Attend Formula | Computes $\lceil (t \cdot C - A) / (1 - t) \rceil$. Displays consecutive classes required to reach $t$. | Pass |
| CALC-03 | Opening Balances | Opening balance attended and conducted are included in cumulative totals accurately. | Pass |
| CALC-04 | Can I Skip Tomorrow? | Evaluates tomorrow's classes; displays safe badge if all stay $\ge t$, or warning if any drops below. | Pass |
| CALC-05 | What-If Simulator | Selecting future dates/subjects simulates resulting percentage without altering real database logs. | Pass |

---

## 5. Weekly Timetable & Period Management

| Test ID | Test Case | Expected Behavior | Status |
|---|---|---|---|
| TIME-01 | Add Timetable Slot | Can add slot with weekday, start/end time, room, faculty, type, and weight. | Pass |
| TIME-02 | Overlapping Slot Warning | Shows yellow warning banner if times overlap, but permits saving for elective batches. | Pass |
| TIME-03 | Effective-From Versions | Creating a mid-semester version with effective date preserves past attendance records intact. | Pass |
| TIME-04 | One-Off Overrides | Can cancel, substitute, or add extra classes for a specific date without modifying base timetable. | Pass |
| TIME-05 | Swap Days | Setting swap day follows specified weekday's timetable for that calendar date. | Pass |
| TIME-06 | Period Timings Editor | Can customize standard bell timings in Settings; reflects on slot time presets. | Pass |

---

## 6. Grades, Assessments & GPA

| Test ID | Test Case | Expected Behavior | Status |
|---|---|---|---|
| GRD-01 | Assessment Components | Can add components with rules: normal, best-of-$N$, drop-lowest, and weightages. | Pass |
| GRD-02 | Best-of-$N$ Calculation | Best $N$ quiz scores are automatically selected and weighted in internal total. | Pass |
| GRD-03 | Minimum Pass Rule | Flags detention risk if internal marks are below course minimum eligibility threshold. | Pass |
| GRD-04 | Grading Schemes | Supports 10-point, 4.0, and Percentage/Division systems; computes SGPA and CGPA. | Pass |
| GRD-05 | Non-Credit / Audit Courses | Courses marked as audit are excluded from SGPA and CGPA point totals. | Pass |

---

## 7. Attendance Reports & Printing

| Test ID | Test Case | Expected Behavior | Status |
|---|---|---|---|
| REP-01 | Date Range Filter | Filters attendance records between selected start date and end date accurately. | Pass |
| REP-02 | Subject Selection Pills | Can include or exclude specific courses from the generated report table. | Pass |
| REP-03 | Print Layout (`Ctrl+P`) | Hides navigation bar, action buttons, and backdrops; outputs clean black-and-white table. | Pass |
| REP-04 | Detailed Breakdown | Displays conducted, attended, absent, medical/duty leaves, %, safe bunks, and status. | Pass |

---

## 8. Reminders, Notifications & .ics Sync

| Test ID | Test Case | Expected Behavior | Status |
|---|---|---|---|
| NOT-01 | Honest Scope Note | Clearly explains in UI that browser alerts trigger only when Spirit is open or active. | Pass |
| NOT-02 | Browser Alert Permission | Requesting browser permission triggers native browser notification prompt. | Pass |
| NOT-03 | Test Notification | Dispatches immediate browser notification alert with Spirit icon when granted. | Pass |
| NOT-04 | Timetable .ics Export | Exports valid RFC 5545 `.ics` file with recurring `RRULE` and 15-minute `VALARM` events. | Pass |
| NOT-05 | Deadlines .ics Export | Exports `.ics` file for exams/tasks with 1-day and 2-hour alarm reminders. | Pass |
| NOT-06 | Web Share Fallback | On mobile uses native share sheet (`navigator.share`); on desktop falls back to direct download. | Pass |

---

## 9. Local Data Safety & Storage

| Test ID | Test Case | Expected Behavior | Status |
|---|---|---|---|
| SAF-01 | Persistent Storage | Requesting persistence invokes `navigator.storage.persist()` and shows quota usage. | Pass |
| SAF-02 | JSON Backup Export | Exports full database into versioned JSON file including schema version metadata. | Pass |
| SAF-03 | JSON Backup Import | Imports JSON file with validation; offers choice to merge (newer wins) or replace. | Pass |
| SAF-04 | CSV Spreadsheet Export | Exports attendance logs and marks into clean CSV files compatible with Excel/Sheets. | Pass |
| SAF-05 | Backup Reminder Banner | Displays dismissible banner when unbacked changes or days exceed configured thresholds. | Pass |
| SAF-06 | Demo Mode Banner & Clear | Shows top banner when demo data is loaded; clicking "Clear Demo" wipes sample records only. | Pass |
| SAF-07 | Delete All Data | Requires typing confirmation text (`DELETE`) before wiping local IndexedDB tables. | Pass |

---

## 10. Accessibility (a11y) & Performance

| Test ID | Test Case | Expected Behavior | Status |
|---|---|---|---|
| ACC-01 | Keyboard Navigation | Can navigate tabs, mark attendance, and operate dialogs using `Tab`, `Space`, and `Enter`. | Pass |
| ACC-02 | Focus Ring Visibility | Focused elements display a visible outline (`:focus-visible`). | Pass |
| ACC-03 | Icon Button Labels | All icon buttons have semantic `aria-label` or accessible names. | Pass |
| ACC-04 | Color Blindness / Status | Safe / Danger statuses always couple icons (`CheckCircle2` / `AlertTriangle`) with text labels. | Pass |
| ACC-05 | Reduced Motion | Users with `prefers-reduced-motion` enabled experience zero layout transitions/animations. | Pass |
| ACC-06 | Automated Axe Audit | `vitest` automated axe-core audit passes with 0 violations across all screens. | Pass |
| PERF-01 | Route Code Splitting | Routes load on demand via `React.lazy` with bundle chunks under 160 kB. | Pass |
| PERF-02 | Offline PWA | Disconnecting network allows full offline navigation, attendance logging, and calculation. | Pass |

