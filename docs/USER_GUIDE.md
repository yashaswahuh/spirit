# Spirit — Complete User Guide & Manual 🎓

> **A fast, private, 100% local-first academic tracker and attendance companion for university students.**

---

## Table of Contents
1. [Introduction & The Local-First Guarantee](#1-introduction--the-local-first-guarantee)
2. [First-Time Setup & Onboarding](#2-first-time-setup--onboarding)
3. [Daily Attendance Tracking](#3-daily-attendance-tracking)
4. [Smart Decision Making: Safe Bunks & What-If](#4-smart-decision-making-safe-bunks--what-if)
5. [Weekly Timetable & Schedule Management](#5-weekly-timetable--schedule-management)
6. [Timetable File Upload & Auto-Recognition](#6-timetable-file-upload--auto-recognition)
7. [Academic Calendar: Holidays, Swap Days & Saturday Rules](#7-academic-calendar-holidays-swap-days--saturday-rules)
8. [Marks, Assessments & GPA Engine](#8-marks-assessments--gpa-engine)
9. [Tasks, Exams & Deadlines](#9-tasks-exams--deadlines)
10. [Phone Calendar Alarms (.ics Export)](#10-phone-calendar-alarms-ics-export)
11. [Data Safety, Backup & Device Transfer](#11-data-safety-backup--device-transfer)
12. [Personalization & PWA Installation](#12-personalization--pwa-installation)

---

## 1. Introduction & The Local-First Guarantee

Spirit is designed specifically for students who want a fast, distraction-free companion for university life that never requires signing into an account, never displays ads, and never sends private data to any remote server.

### The Local-First Philosophy
- **Zero Logins:** No passwords, Google sign-in, or email verification required. Open Spirit and begin tracking immediately.
- **100% On-Device:** All data is stored in your web browser's IndexedDB engine via Dexie.
- **Works Offline:** Once loaded or installed as a PWA, Spirit functions without any internet connection.
- **Zero Latency:** Queries execute instantly with zero network round-trips.
- **Your Data Belongs to You:** Export versioned JSON backups or CSV spreadsheets at any time.

---

## 2. First-Time Setup & Onboarding

When you open Spirit for the first time, the **Onboarding Wizard** guides you through a quick 4-step setup:

### Step 1: Student Profile & Attendance Goal
1. Enter your name, degree program (e.g. B.Tech, B.Sc, BCA, M.Sc), and department.
2. Select your starting semester (e.g. Semester 4).
3. Set your **Target Attendance Threshold** (commonly 75% or 85%).
   > **Tip:** Spirit uses this percentage to calculate **Safe Bunks** and **Must-Attend** recovery numbers.

### Step 2: Degree Program & Grading Scheme
Choose your university's grading scale:
- **Indian 10-Point Scale (CBSE/AICTE/VTU):** 10 (O/S), 9 (A+), 8 (A), 7 (B+), 6 (B), 5 (C), 4 (P), 0 (F).
- **US 4.0 Scale:** 4.0 (A), 3.0 (B), 2.0 (C), 1.0 (D), 0.0 (F).
- **Percentage & Division System:** Distinction ($\ge 75\%$), 1st Division ($\ge 60\%$), 2nd Division ($\ge 50\%$).

### Step 3: Add Your Semester Courses
- Define your subjects with code (e.g. `CS501`), name, credits, and component type (*Theory, Lab, Theory + Lab (Integrated), Tutorial, Project, Elective, Audit*).
- **Integrated Theory + Lab Subjects:** In Indian colleges, many subjects (e.g., *Data Structures*, *Database Management Systems*, *Microprocessors*) feature both classroom theory lectures and lab practicals under a single course code. Select **Theory + Practical / Lab (Integrated)** so you do not have to create separate duplicate subjects! Spirit tracks total combined attendance for semester rules while providing separate Theory vs Lab breakdown tallies.
- Click the **Color Picker Swatch** to assign distinct custom colors to every subject.
- Non-credit audit courses can be marked as **Audit** so they do not impact your GPA.

### Step 4: Mid-Semester Start (Opening Balance)
If you start using Spirit in the middle of a semester, you do not need to back-log weeks of past classes!
1. Check your college portal for total attended and conducted classes to date.
2. Enter them into **Opening Balance**:
   - `Attended Before Tracking` ($A_0$)
   - `Conducted Before Tracking` ($C_0$)
   - `Tracking Start Date`: Today's date.
3. Spirit will seamlessly combine your opening balance with new logged sessions:
   $$\text{Attended} = A_0 + \sum \text{Logged Attended}$$
   $$\text{Conducted} = C_0 + \sum \text{Logged Conducted}$$

---

## 3. Daily Attendance Tracking

### The Home Dashboard
Every day, Spirit automatically checks your weekly timetable and displays today's schedule at the top of the **Home Screen**:
- **One-Tap Marking:** Tap **Present**, **Absent**, or **Cancelled** for each class.
- **Period Weights:** Labs spanning 2 or 3 hours count as 2 or 3 conducted periods automatically.
- **Tapping Active Status Clears It:** Made a mistake? Tap the active button again to reset it back to unmarked.
- **Undo Toast:** A temporary undo banner appears after every action.

### Approved Leave Rules
University attendance policies often treat excused absences differently:
- **Medical Leave:** Set whether approved medical certificates count toward attended attendance.
- **Duty / College Leave:** When representing your college in sports, hackathons, or cultural fests, flag duty leaves as present.
- Configure leave policies globally in Settings or override per course in `SubjectModal`.

### Catch-Up on Unmarked Classes
If you missed logging attendance for previous days:
1. An orange banner appears on the Home Screen indicating: *"You have N unmarked classes from past days"*.
2. Tap **Catch Up** to open the catch-up modal.
3. Log individual classes or use bulk buttons: **All Present**, **All Absent**, or **All Cancelled**.

### Day Picker Calendar View
Navigate to the **Attendance** tab and tap the calendar icon to open the **Day Picker**:
- Jump to any past date to review or edit past logs.
- Bulk actions: **Mark All Present**, **Mark All Absent**, or **Mark Whole Day Holiday**.

---

## 4. Smart Decision Making: Safe Bunks & What-If

Spirit includes a pure mathematical calculation engine that tells you exactly where you stand.

### 1. Safe Bunks (Classes You Can Miss)
Safe bunks is the number of upcoming consecutive periods you can miss without dropping below your target percentage $t$:
$$\text{Safe Bunks} = \max\left(0, \left\lfloor \frac{\text{Attended}}{t} - \text{Conducted} \right\rfloor\right)$$

*Example:* If you attended 32 out of 40 classes ($80\%$) and your threshold is $75\%$, your safe bunks count is:
$$\lfloor 32 / 0.75 - 40 \rfloor = \lfloor 42.67 - 40 \rfloor = 2 \text{ classes}$$

### 2. Must Attend (Classes Needed to Recover)
If your attendance drops below your threshold, Must Attend calculates how many consecutive classes you must attend to climb back into the safe zone:
$$\text{Must Attend} = \max\left(0, \left\lceil \frac{t \times \text{Conducted} - \text{Attended}}{1 - t} \right\rceil\right)$$

*Example:* If you attended 18 out of 30 classes ($60\%$) and need $75\%$:
$$\lceil (0.75 \times 30 - 18) / (1 - 0.75) \rceil = \lceil (22.5 - 18) / 0.25 \rceil = 18 \text{ classes}$$

### 3. "Can I Skip Tomorrow?" Card
Right on your Home Dashboard, Spirit checks tomorrow's timetable against your current attendance and tells you:
- **"Safe to skip all"** if all tomorrow's classes remain above threshold.
- **"Attend [Subject]"** if skipping a particular lecture or lab will push you into detention risk.

### 4. What-If Simulator
Tap **What-If Planner** on the Attendance screen to simulate hypothetical absences:
1. **Specific Dates Mode:** Pick upcoming dates you plan to take off (e.g. an extended weekend or family function).
2. **Recurring Weekdays Mode:** Simulate skipping a particular weekday (e.g. "What happens if I skip every Friday until the end of term?").
3. **N Consecutive Days Mode:** See the exact percentage drop if you miss the next 3, 5, or 7 days.
Spirit provides an instant breakdown of your new projected percentage for every subject.

### 5. Official Printable Attendance Report
Need to verify your attendance with your faculty advisor or college portal?
1. Tap **Export Report** on the Attendance screen.
2. Select a date range or filter by specific subjects.
3. Tap **Print / Save as PDF** to generate an official formatted report with complete statistics.

---

## 5. Weekly Timetable & Schedule Management

The **Timetable** tab provides a complete view of your weekly routine:
- **Weekly Schedule Grid:** View your daily classes organized by period and time.
- **Class Details:** Displays course code, subject name, time range (`09:00 - 09:55`), room number, and faculty name.
- **Integrated Theory + Lab Slots:** When scheduling a class for an integrated subject, Spirit provides a 1-tap quick selector:
  - `[ 📘 Theory Lecture ]`: Automatically sets component to Theory and default weight to 1 period.
  - `[ 🧪 Lab Practical ]`: Automatically sets component to Lab and default weight to 2 periods.
- **Subject-Wide Professor / Faculty Synchronization:** When adding or editing a professor/teacher name (e.g. "Dr. A. Sharma") on any timetable slot or in subject settings, Spirit automatically saves it to the subject and applies it across all other days and slots for that course. You only ever need to type your professor's name once!
- **Overlap Detection:** If you have parallel elective slots or simultaneous lab batches, Spirit warns you of the overlap while allowing both slots to exist.

### Bell Schedule & Period Timings
1. Tap **Settings (Gear Icon)** &rarr; **Period Timings** or visit `MoreScreen`.
2. Define period names, start times, and end times.
3. Mark break intervals and lunch periods.
4. **Smart Quick Timings Sync**:
   - When tapping **Add Slot**, Spirit checks existing classes on that day and **automatically pre-selects the next unscheduled period** (e.g., auto-filling Period 2 if Period 1 is already in use). You never need to type times manually unless your college holds a class at an unusual time!
   - 1-tap Quick Timings grid allows selecting any standard period instantly.
   - For multi-period labs (2 or 3 periods), end times automatically extend across consecutive periods.
   - Manual start and end time inputs remain accessible anytime via a quick toggle.

### One-Off Date Overrides
Need to change the schedule for a single date without permanently modifying your weekly routine?
1. On the Timetable screen, tap **One-Off Override**.
2. Choose from 4 actions:
   - **Cancel Class:** Faculty is on leave; removes the slot from conducted tally.
   - **Substitute Class:** Another course takes over the period.
   - **Add Extra Class:** Schedule an extra lecture on a specific date.
   - **Reschedule Class:** Move a lecture to another period or date.

### Mid-Semester Timetable Versions
When your college publishes a revised timetable mid-semester:
1. Tap **Versions** in the Timetable screen.
2. Tap **New Version** and select **Effective From Date** (e.g., October 15th).
3. Spirit clones your current timetable into the new version.
4. Modify slots in the new version. Past dates and historical attendance logs are **never modified or rewritten**.

---

## 6. Timetable File Upload & Auto-Recognition

Instead of typing your timetable slot-by-slot, Spirit can recognize and import your college timetable automatically:
1. Tap **Upload Timetable** in the Timetable tab.
2. **Upload or Paste:** Drag-and-drop a `.csv`, `.tsv`, `.txt`, or `.json` file, or paste your timetable text directly.
3. **Matrix & List Formats Supported:**
   - Grid/matrix timetables (Days as rows, Period times as columns).
   - List formats (`Monday, 09:00-10:00, CS501, Operating Systems, Room 301`).
4. **Intelligent Theory + Lab Grouping:**
   - If your timetable contains both theory periods (e.g., *Data Structures*) and practical sessions (e.g., *Data Structures Lab* or *DSA Lab*), Spirit automatically groups them under a single unified course marked **Theory + Practical / Lab**.
   - No duplicate dummy courses are created.
5. **Live Preview:**
   - Spirit automatically extracts subjects, course codes, period timings, and rooms.
   - Any new subjects are recognized and created automatically.
   - Click the **Color Dot** next to any detected course to customize its color right in the preview.
6. Tap **Import to My Timetable** to populate your semester schedule in seconds!

---

## 7. Academic Calendar: Holidays, Swap Days & Saturday Rules

Keep your academic calendar aligned with your university's official holiday list:

### 1. Holidays & Vacations
- **Single-Day Holidays:** Mark public holidays, institutional off-days, and festivals.
- **Date Range Holidays:** Add semester breaks, Diwali break, or winter vacations.
- **Paste Holidays:** Paste holiday lists in bulk in DD/MM/YYYY or ISO format.
- *Classes on holidays are automatically excluded from the "conducted" tally.*

### 2. Alternate Saturday Rules
Many colleges observe alternate Saturdays off:
- **All Working Saturdays**
- **2nd Saturday Off**
- **2nd & 4th Saturday Off**
- **All Saturdays Off**
Configure this in `Term Settings` or the `Semester Switcher`. Spirit automatically identifies odd vs even Saturdays and adjusts schedules accordingly.

### 3. Swap Days
Universities often hold classes on a Saturday following a Wednesday timetable:
- Tap **Add Event** &rarr; Select **Swap Day**.
- Choose the date and select which weekday's timetable to follow.
- Spirit will display the swapped timetable for that specific day.

---

## 8. Marks, Assessments & GPA Engine

The **Grades** tab tracks your academic performance and projects your SGPA/CGPA:

### 1. Course Assessment Components
Edit components per course with flexible structures:
- **Component Types:** Mid-Semesters, Quizzes, Lab Internals, Assignments, End-Semester Exam.
- **Weightage & Max Marks:** Fully customizable (e.g., 40% Internal + 60% External).
- **Rules:**
  - `Normal`: Direct percentage contribution.
  - `Best of N`: e.g., Best 2 out of 3 Mid-Semester exams.
  - `Drop Lowest`: Drop lowest quiz score.

### 2. Eligibility & Detention Warnings
- **Minimum Criteria:** Set minimum internal marks required to be eligible for the end-sem exam.
- **Detention Warning:** If your attendance is below threshold, Spirit displays an amber **At Risk of Detention** badge on that course.

### 3. Target End-Sem Score Solver
- Open **Required Marks Solver** on any course.
- Enter your desired letter grade (e.g., `A` or `O`).
- Spirit calculates the exact minimum score you must score on the final End-Sem exam to achieve that grade.

### 4. What-If Grade Simulator
- Simulate hypothetical grades for ongoing courses to see how your SGPA and overall CGPA respond before final semester results are announced.

### 5. Transition to Next Semester
When a semester ends:
1. Open the **Semester Switcher** or tap **Start Next Semester**.
2. Spirit archives the completed semester, locks final grades into your cumulative CGPA history, and prepares a fresh semester.

---

## 9. Tasks, Exams & Deadlines

Stay ahead of upcoming deadlines in the **Deadlines & Tasks** tracker:
- **Categories:** Assignments, Mid-Sem Exams, End-Sem Exams, Projects, Lab Submissions.
- **Urgency Badges:** Clear color-coded badges (`Due Today`, `Due Tomorrow`, `In 3 Days`, `Overdue`).
- **One-Tap Completion:** Mark tasks done with instant visual feedback.
- **Editable:** Edit due dates, titles, and subject links at any time.

---

## 10. Phone Calendar Alarms (.ics Export)

Because Spirit is 100% local-first and has no remote servers, background push notifications cannot wake up a phone when the browser is terminated. Spirit solves this elegantly using standard **RFC 5545 `.ics` iCalendar exports**:

1. Open **Settings & More** &rarr; **Reminders & Sync**.
2. Tap **Timetable (.ics)**:
   - Generates a calendar subscription file with recurring weekly classes and a built-in **15-minute alarm** for each class.
3. Tap **Exams (.ics)**:
   - Generates events for all upcoming exams and assignment deadlines with **1-day** and **2-hour alarms**.
4. Open the downloaded `.ics` file in **Google Calendar**, **Apple Calendar**, or **Microsoft Outlook**:
   - Native device notifications and sound alarms will now ring on your phone even when Spirit and your browser are closed!

---

## 11. Data Safety, Backup & Device Transfer

Because Spirit stores data exclusively in your browser, keeping backups ensures your data is protected against browser cache clearing.

### 1. Request Persistent Storage
In **Settings & More** &rarr; **Storage Safety**:
- Tap **Request Persistent Storage**.
- This instructs Chrome, Safari, or Firefox to protect Spirit's IndexedDB storage from automatic eviction during low disk space.

### 2. Manual Backup (JSON & CSV)
- Tap **Backup & Export**:
  - **Full JSON Backup:** Complete snapshot of your profile, courses, attendance history, timetable slots, marks, and tasks.
  - **CSV Export:** Spreadsheets for easy viewing in Excel or Google Sheets.
- On mobile devices, tap **Share Backup** to send your backup directly to Google Drive, iCloud, WhatsApp, or email.

### 3. Restore Data (Smart Merge vs Replace)
When restoring from a JSON backup file:
- **Smart Merge (Recommended):** Compares records and merges data; newer timestamps win. Safe and additive.
- **Clean Replace:** Wipes current data and restores the exact state from the backup file.

### 4. Automated Backup Reminders
- Choose your preferred reminder schedule: **Daily (1 Day)** or **Weekly (7 Days)**.
- Spirit will display a dismissible reminder banner whenever new changes have accumulated without a backup.

### 5. Transfer to Another Device
To move your data from phone to laptop (or old phone to new phone):
1. On Device A: Go to `MoreScreen` &rarr; Tap **Transfer to Another Device** &rarr; **Export Backup File**.
2. Send the `.json` file to Device B (via AirDrop, Drive, or messaging).
3. On Device B: Open Spirit &rarr; Tap **Transfer to Another Device** &rarr; **Select File to Import** &rarr; Choose **Replace**.

---

## 12. Personalization & PWA Installation

### Theme & Accent Colors
In **Settings & More**:
- **Theme Mode:** Toggle between **Light**, **Dark**, or **System Auto** (matches your device's day/night schedule).
- **Dynamic Accent Colors:** Choose from 6 vibrant accent palettes:
  - 🟣 **Indigo** (Default)
  - 🟢 **Emerald**
  - 🟣 **Violet**
  - 🔴 **Rose**
  - 🟠 **Amber**
  - 🔵 **Cyan**
  - *Accent colors update instantly across buttons, badges, rings, active navigation tabs, and scrollbars site-wide.*
- **Custom Course Color Picker:** Pick from 17 curated course swatches, use your OS color picker, or paste exact `#RRGGBB` hex codes.

### Install as a PWA (Home Screen App)
Installing Spirit gives you full-screen mode, persistent storage protection, and offline reliability:
- **Android / Chrome / Edge:** Tap the **Install Spirit** button in the header or in settings, or select *Install App* in your browser menu.
- **iOS / Safari:** Tap the **Share button** (square with up-arrow) &rarr; Scroll down &rarr; Tap **Add to Home Screen**.

---

*Spirit is open, private, and built for students. Have a great semester!* 🎓

