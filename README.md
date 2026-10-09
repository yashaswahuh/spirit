# Spirit 🎓

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Vibe Coded](https://img.shields.io/badge/Vibe%20Coded-with%20AI%20✨-blueviolet)](https://github.com/yashaswahuh/spirit)
[![Version](https://img.shields.io/badge/release-v1.0.0-blue)](https://github.com/yashaswahuh/spirit/releases/latest)
[![Android APK](https://img.shields.io/badge/Download%20APK-spirit--v1.apk-success?logo=android&logoColor=white)](https://github.com/yashaswahuh/spirit/releases/latest)
[![Live Web App](https://img.shields.io/badge/Live%20Web%20App-Online-emerald)](https://yashaswahuh.is-a.dev/spirit/)
[![Mirror Web App](https://img.shields.io/badge/Backup%20Mirror-GitHub%20Pages-blue)](https://yashaswahuh.github.io/spirit/)

> **Fast, private, local-first academic tracker and attendance companion for university students.**

Spirit runs entirely on your device. Zero accounts, no tracking, no external database, and zero latency. Built for students who want a reliable, offline-capable dashboard for attendance tracking, weekly timetables, exam deadlines, and grade calculation.

| Quick Links | |
| :--- | :--- |
| 🌐 **Live Web App (Primary)** | [yashaswahuh.is-a.dev/spirit/](https://yashaswahuh.is-a.dev/spirit/) |
| 🔄 **Live Web App (Backup Mirror)** | [yashaswahuh.github.io/spirit/](https://yashaswahuh.github.io/spirit/) |
| 📱 **Download Android APK** | [`spirit-v1.apk` on GitHub Releases](https://github.com/yashaswahuh/spirit/releases/latest) |
| 📖 **User Manual** | [Complete How-To-Use Guide & Manual](docs/USER_GUIDE.md) |
| 📄 **Open Source License** | [MIT License](LICENSE) |

---

## 🌟 Key Features

- **100% Local-First & Private:** All data is stored in your browser's IndexedDB via Dexie. No cloud servers, no account registration, and no network leaks.
- **One-Tap Attendance Logging:** Quick logging for today's classes with period-weight support (2-hour and 3-hour labs count proportionately).
- **Accurate Mathematical Engine:** Exact attendance math including safe bunks (how many you can skip), must-attend counts (how many you must attend to recover), opening balances for mid-semester onboarding, and approved medical/duty leave rules.
- **What-If Planner & "Can I Skip Tomorrow?":** Instant simulation answering whether skipping classes tomorrow or on specific dates keeps you safely above your threshold.
- **Weekly Timetable & Mid-Semester Versions:** Full timetable manager with period timings, effective-from version history (never rewrites past logs), and one-off date overrides (cancellations, substitutes, extra sessions).
- **Holidays & Calendar Events:** Multi-day holiday ranges, swap days (following another weekday's timetable), and reversible holiday marking.
- **Grades, Marks & GPA Engine:** Supports Indian 10-point scales (CBSE/AICTE/VTU), US 4.0 scales, percentage & division systems, internal/external assessment splits, best-of-$N$ quiz rules, and detention risk checks.
- **PWA & Offline Installation:** Installable on Android, iOS, Windows, macOS, and Linux with full offline caching via Workbox and automatic service worker update prompts.
- **Honest Reminders & .ics Phone Calendar Export:** In-app reminder banners for unmarked classes and deadlines. Native phone calendar sync via standard `.ics` (RFC 5545) export with alarms for Google Calendar and Apple Calendar.
- **Printable Attendance Reports:** Print-ready official attendance breakdown with date range filters, per-subject summaries, and print-optimized CSS.
- **Backup, Restore & Device Transfer:** Versioned JSON backups, CSV spreadsheet exports, mobile Web Share integration, and cross-device migration.

---

## 📐 Calculation Engine & Formulas

### 1. Attendance Percentage
$$\text{Percentage} = \frac{\text{Attended Periods}}{\text{Conducted Periods}} \times 100$$
*(If conducted is 0, percentage is 100.0%)*

### 2. Safe Bunks (Classes that can be safely missed)
$$\text{Safe Bunks} = \max\left(0, \left\lfloor \frac{\text{Attended}}{t} - \text{Conducted} \right\rfloor\right)$$
where $t = \frac{\text{Target Threshold}}{100}$ (e.g., $0.75$ for 75%).

### 3. Must Attend (Classes required to reach target)
$$\text{Must Attend} = \max\left(0, \left\lceil \frac{t \times \text{Conducted} - \text{Attended}}{1 - t} \right\rceil\right)$$

### 4. Opening Balances
Mid-semester onboarded students enter initial attended ($A_0$) and conducted ($C_0$). Cumulative totals are:
$$\text{Attended} = A_0 + \sum \text{Logged Attended}$$
$$\text{Conducted} = C_0 + \sum \text{Logged Conducted}$$

---

## 🛠️ Tech Stack

- **Framework:** React 18 + TypeScript + Vite 5
- **Styling & Layout:** Tailwind CSS (Responsive from 320px mobile to 1920px desktop)
- **Local Database:** Dexie 4 (IndexedDB) with schema versioning and safe migrations
- **PWA & Caching:** `vite-plugin-pwa` with Workbox offline service worker
- **Testing & Quality:** vitest, axe-core automated accessibility audits, jsdom
- **Icons:** lucide-react

---

## ⚡ Performance & Bundle Optimization

Spirit uses route-level and component-level code splitting to guarantee instant load times on mobile networks:

- **Route Splitting:** All top-level screens (`HomeScreen`, `AttendanceScreen`, `TimetableScreen`, `GradesScreen`, `MoreScreen`) are dynamically imported via `React.lazy` and `Suspense`.
- **Lazy Loaded Charts:** Chart components (`SgpaTrendChart`, `AttendanceThresholdChart`, `MarksBreakdownChart`) are isolated chunks loaded only when requested.
- **Vendor Splitting:** Third-party libraries are isolated into dedicated cache chunks:
  - `vendor-react` (~52 kB gzip)
  - `vendor-dexie` (~32 kB gzip)
  - `vendor-zod` (~25 kB gzip)
  - `vendor-icons` (~8 kB gzip)
- **Zero Heavy Chunks:** No JavaScript bundle exceeds 160 kB minified. Initial index payload is under 18 kB gzip.

---

## ♿ Accessibility Standards

- **Keyboard Accessible:** Full navigation and attendance marking operable via keyboard (`Tab`, `Space`, `Enter`).
- **Focus Indicators:** Accessible visible focus rings on all interactive elements via `:focus-visible`.
- **Non-Color Indicators:** Attendance statuses and detention warnings always combine text labels with semantic icons (`CheckCircle2`, `AlertTriangle`), never color alone.
- **Reduced Motion:** Full support for `prefers-reduced-motion` to disable animations for users with vestibular sensitivities.
- **Automated Axe Audits:** Automated `axe-core` tests verify WCAG 2.1 AA compliance in `src/a11y.test.ts`.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18 or 20+
- npm 9+

### Installation & Development
```bash
# Clone the repository
git clone https://github.com/yashaswahuh/spirit.git
cd spirit

# Install dependencies
npm install

# Start local development server
npm run dev

# Run unit and accessibility tests
npm test

# Build for production
npm run build
```

---

## 🚢 Deployment via GitHub Actions

Spirit includes a fully automated GitHub Actions CI/CD workflow (`.github/workflows/deploy.yml`) that tests, builds, and deploys the application directly to GitHub Pages hosting:

### How to Enable Hosting on GitHub:
1. **Push your code to GitHub:**
   ```bash
   git push origin main
   # or
   git push origin phase-6
   ```
2. **Enable GitHub Pages:**
   - In your GitHub repository, go to **Settings** > **Pages** (under the "Code and automation" section).
   - Under **Build and deployment** > **Source**, select **GitHub Actions** (instead of "Deploy from a branch").
3. **Automatic Deployment:**
   - On every push to `main` or `phase-6`, the workflow will automatically run:
     1. All unit tests & axe-core accessibility checks
     2. Production Vite PWA build with service worker generation
     3. Direct deployment to GitHub Pages via `actions/deploy-pages`
   - Your app will be live at: `https://yashaswahuh.is-a.dev/spirit/` (or `https://<username>.github.io/spirit/`)
4. **Manual Dispatch (Optional):**
   - You can also manually trigger a deployment from the **Actions** tab in GitHub by selecting **"Build and Deploy Spirit via GitHub Actions"** and clicking **Run workflow**.

---

## 🔒 Privacy & Safety Guarantee

Spirit does not transmit any student data. There are no tracking scripts, cookies, analytics, or third-party telemetries. All student records remain exclusively on the user's local device. To protect against browser eviction, enable **Persistent Storage** in Settings and periodically export a JSON backup.

---

## 🤖 Proudly Vibe Coded

> **Spirit is vibe coded with AI** ✨
> Built through pair programming with Google DeepMind's agentic AI coding assistant (Antigravity).

Every layer of this application was designed and crafted iteratively:
- Pure TypeScript calculation engines and mathematical formula solvers
- 100% local-first IndexedDB storage architecture with Dexie.js
- Accessible, responsive UI accommodating 320px mobile screens through 1920px desktops
- Native Android Capacitor plugins for local notifications, calendar sharing, and storage permissions
- Over-the-air (OTA) live auto-updates and automated GitHub Actions CI/CD release pipelines
- Comprehensive automated test suite with 170+ vitest and axe-core accessibility tests

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.


