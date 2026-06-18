<div align="center">

# Ganguram Salary &amp; Attendance Tracker

**A premium internal payroll, attendance and staff-management system for Ganguram Sweets** — a Kolkata sweets house, *since 1885*.

Salary tracking is the core. Attendance is intelligent and future-ready. Everything is built to feel like a modern finance/admin dashboard — not a basic attendance app or an Excel sheet.

`Brand indigo #49488D` · `White #FFFFFF` · `Accent coral #EA5454`

</div>

---

## Table of contents

1. [Product purpose](#product-purpose)
2. [Modules](#modules)
3. [Salary logic](#salary-logic)
4. [Attendance logic](#attendance-logic)
5. [Tiffin / food allowance logic](#tiffin--food-allowance-logic)
6. [Custom payroll formula builder](#custom-payroll-formula-builder)
7. [Advance money tracker](#advance-money-tracker)
8. [Payment tracking &amp; received confirmation](#payment-tracking--received-confirmation)
9. [Employee login portal](#employee-login-portal)
10. [Reports](#reports)
11. [Tech stack &amp; architecture](#tech-stack--architecture)
12. [Repository &amp; branch structure](#repository--branch-structure)
13. [Setup instructions](#setup-instructions)
14. [Design system](#design-system)

---

## Product purpose

Ganguram runs payroll monthly across multiple branches. This product gives the owner/manager a single, calm, professional control panel to:

- Maintain a complete **Employee Master** (the backbone of the whole system).
- Capture **attendance** per branch, per day — with a roadmap for QR, GPS+selfie, biometric and offline-sync capture.
- Calculate **salary** with configurable policy (fixed 30-day vs actual calendar-day), intelligent **paid-leave** rules, and a safe **custom-formula** engine for bonuses, penalties, overtime and more.
- Track **tiffin / food allowance** as a company-paid CTC on top of salary — never a deduction.
- Keep an **advance ledger** per employee and a permanent, receipt-backed **payment history** with employee-side **received confirmation**.
- Give every employee a **self-service login portal** to view their own attendance, salary, advances, tiffin, receipts, leave and slips, and to confirm payments / request leave.
- Generate and export the full suite of payroll **reports**.

The voice is plain, calm and operational. Numbers use the **₹ symbol with Indian digit grouping** (₹14,82,500), rendered in a tabular monospace so columns align. Statuses are short and literal — *Paid · Pending · Confirmed · Approved · Rejected · Eligible · Not eligible · Deductible · Locked*.

---

## Modules

| # | Module | What it does |
|---|--------|--------------|
| 1 | **Dashboard** | KPIs (net payable, present today, pending approvals, tiffin CTC), payroll trend, payroll-run progress, branch summary, approvals queue. |
| 2 | **Employee Master** | The backbone. Full profile, branch, role, joining date, salary, calculation basis, paid-leave &amp; 3-month eligibility, active/resigned status, tiffin setup, advance ledger, payment history, documents and login access — in a 7-tab employee detail. |
| 3 | **Branch Management** | Locations, managers, staff counts and per-branch policy foundations. |
| 4 | **Attendance** | Monthly mark grid (Present / Absent / Half / Leave / Off) + intelligent capture-methods roadmap and live punches. |
| 5 | **Salary** | Smart payroll table with gross, worked days, leave used/free, deduction, tiffin CTC, net payable and approval status. |
| 6 | **Salary Slip** | Printable, brand-headed salary slip with earnings &amp; deductions breakdown and net payable. |
| 7 | **Formula Builder** | Build custom payroll blocks from clickable variable &amp; operator chips, with a safe backend evaluator and live preview. |
| 8 | **Reports** | The full report catalogue with Excel / PDF export foundations. |
| 9 | **Tiffin / Food Allowance** | Company-paid CTC with custom labels &amp; amounts, half-day rules, separate tracking and reporting. |
| 10 | **Advance Money Tracker** | Per-employee advance ledger with amount, date, method, notes, reference, receipt upload, adjustment status and remaining balance. |
| 11 | **Payment History / Confirmation** | Permanent, receipt-backed payment ledger with *Pending confirmation · Confirmed by employee · Disputed* states. |
| 12 | **Employee Login Portal** | Self-service foundation: attendance, salary/advance/tiffin history, receipts, leave status, slips, pending confirmations and notices. |

---

## Salary logic

Every employee has a **monthly salary**. The **calculation basis is configurable**:

1. **Fixed 30-day policy** — daily salary = `monthly_salary / 30`.
2. **Actual calendar-day policy** — daily salary = `monthly_salary / days_in_month`.

> **Joining month:** a new employee's first month **always** uses actual calendar-day logic, regardless of the configured basis.

### Paid-leave rules

- **First 3 months:** no free leave. **Every** absent/leave day is deducted.
- **After eligibility:** **4 free / paid leave days per month**. These are **strictly monthly and never carried forward**.
- **All** off / leave / absence draws from the **same 4-day bucket**.
- If total leave days exceed 4, **only the days above 4 are deducted**.

**Eligibility for the 4 free leaves — all three must pass:**

1. Tenure **≥ 3 months** in the company.
2. **≥ 15 worked days** in the running month (**exactly 15 counts** as eligible).
3. **Not resigned mid-month** (status is active).

If the employee is **not eligible**, every leave/absent day is deductible.

### Worked example

> ₹10,000 salary · fixed 30-day policy · daily salary **₹333.33** · 7 leave days
> → eligible, so `7 − 4 = 3` deductible days
> → deduction `3 × ₹333.33 =` **−₹999.99**

This logic lives in reusable service functions (see [architecture](#tech-stack--architecture)), not hardcoded in UI components.

---

## Attendance logic

- Attendance is captured per branch, per day, with five marks: **Present (P) · Absent (A) · Half-day (H) · Paid leave (L) · Week-off (O)**.
- **Worked days** count present days plus 0.5 per half-day.
- The monthly grid feeds directly into salary calculation (worked days, leave used) and tiffin (tiffin days).
- **Future-ready capture roadmap:** QR check-in (Live), GPS + selfie (Beta), biometric (Planned), offline sync (Planned), and manager approval (Live). The data model is designed so these can be layered in later.

### Leave request flow

Employees request leave from their portal; admin/manager approves or rejects. Paid vs unpaid is **auto-calculated**:

- The first **4 eligible** leave days are **paid / free**.
- Leave **above 4** becomes **unpaid / deductible**.
- If the employee is **not eligible**, **all** leave days are deductible.

---

## Tiffin / food allowance logic

- Tiffin is **never a deduction**. It is a **separate company-paid CTC** amount paid **on top of** salary.
- It is taken **daily** by employees at their respective branches.
- Admin defines **custom labels and amounts**, e.g. *Breakfast ₹60* and *Lunch / Dinner ₹100*. Amounts are fully variable and customisable.
- Tiffin is **separately trackable and reportable**.
- **No tiffin** is paid on **paid-leave days**.
- **Half-day tiffin eligibility** is configurable per employee.

---

## Custom payroll formula builder

Admin can create custom salary blocks: **Bonus · Extra Payment · Incentive · Penalty · Adjustment · Advance Deduction · Overtime · Festival Bonus · Tiffin Allowance · Damage Deduction · Manual Correction**.

Each block carries:

- **Custom label**
- **Type** — earning, deduction, allowance (CTC) or info-only
- **Formula**
- **Display text** (how it appears on the slip)
- **Active / inactive** status
- **Month applicability**
- **Employee scope** — defaults to **all employees**, with options for *selected employees*, *selected branches* or *selected roles/designations*.

### Safe formula variables

The builder exposes only these approved backend variables:

```
days_present        days_absent           days_half
paid_leave_allowed  paid_leave_used       paid_leave_unused
days_absent_deductible
monthly_salary      daily_salary          tiffin_total
overtime_hours      advance_amount        bonus_amount
salary_payable      total_earnings        total_deductions
final_payable
```

### Builder UI &amp; safety

- Variables are shown as **clickable chips**; operators `+ − × ÷ % ( )` are **clickable buttons**.
- Clicking a chip or operator **inserts it** into the formula editor.
- **No unsafe code execution.** Only **approved variables, numbers and operators** are accepted.
- Formulas are parsed and **evaluated safely in the service layer** (a tokeniser + shunting-yard evaluator), never with `eval` or `Function` on arbitrary input.

---

## Advance money tracker

Each employee has an **advance ledger**. Admin can record advances with:

- **Amount**, **date**, **payment method**, **notes**
- Optional **receipt / reference number**
- Optional **image / PDF upload**
- **Adjustment status** against salary
- **Remaining advance balance** (outstanding, recoverable against upcoming salary)

---

## Payment tracking &amp; received confirmation

When **salary, advance, bonus, tiffin/food allowance or any other payment** is made, admin marks it as paid with:

- **Payment method:** Cash · UPI · Bank Transfer · Cheque · Other
- **Payment date**
- **Reference / transaction number**
- **Notes**
- Optional **image / PDF receipt upload**

The employee receives a **payment notification** and can **accept / confirm receipt**. Admin sees each payment as:

- **Pending confirmation**
- **Confirmed by employee**
- **Disputed / issue raised**

Every payment becomes part of a **permanent, employee-wise payment ledger** with receipts and confirmation status.

---

## Employee login portal

The foundation for employee self-service access. Once enabled per employee, they can view:

- Attendance · Salary history · Advance history · Tiffin / food allowance history
- Payment receipts · Leave status · Salary slips
- Pending payment confirmations · Company notices

Employees can **confirm payments** and **request leave** from their own login.

---

## Reports

- Monthly salary sheet
- Branch-wise salary report
- Employee-wise salary history
- Tiffin / food allowance report
- Paid leave report
- Unused leave payable report
- Advance / loan / deduction report
- Final payroll summary
- Cash / bank / UPI payment report
- Excel / PDF export foundation
- Printable salary slip

---

## Tech stack &amp; architecture

- **React + TypeScript + Vite** for a fast, modern SPA.
- **Tailwind CSS**, themed against the Ganguram design tokens (CSS custom properties are the single source of truth, consumed by both Tailwind utilities and component styles).
- **React Router** for sidebar-driven navigation.
- The **Ganguram Payroll Design System** is the visual source of truth — ported tokens (colours, typography, spacing, elevation), reusable primitives (Button, Card, Badge, Avatar, Chip, ProgressBar, Tabs, Icon, Input, Select, Switch, Checkbox, StatCard, IconButton) and full screens.

### Project layout (on the `initial-setup` branch)

```
src/
  components/ui/      Reusable design-system primitives (typed React)
  components/layout/  App shell — sidebar, topbar
  pages/              One file per module/screen
  pages/portal/       Employee login portal foundation
  services/           Payroll logic — NOT hardcoded in UI
    salary.ts           Daily salary, leave deduction, net payable, basis logic
    eligibility.ts      3-month + 15-worked-day + not-resigned eligibility
    leave.ts            Paid vs unpaid leave split
    tiffin.ts           Tiffin CTC totals
    formula.ts          Safe tokeniser + shunting-yard formula evaluator
    variables.ts        Approved payroll variables
    format.ts           ₹ Indian-grouping currency + number formatting
  data/               Sample seed data (branches, employees, formula blocks)
  types/              Shared TypeScript domain types
  styles/             Ported design tokens + global CSS
  assets/             Logos and the Gauri mascot
```

> **Payroll logic is intentionally separated** into `src/services/` so it can be unit-tested and later moved behind a backend. The structure is kept **future-ready for Firebase / Supabase / a custom backend** — data access is centralised in `src/data/` so it can be swapped for live queries. **No real secrets, API keys or credentials** are included.

### Mascot — Gauri

Gauri (the folded-hands cow mascot) is kept **restrained and premium**: welcome moments, onboarding completion, salary-paid confirmation and friendly empty states only. She does **not** appear inside serious payroll, deduction, attendance or approval screens.

---

## Repository &amp; branch structure

- **`main`** — this README and project documentation. Feature work does **not** continue on `main`.
- **`initial-setup`** — the full implemented application (design system, screens, payroll services and seed data).

---

## Setup instructions

> The runnable application lives on the **`initial-setup`** branch.

```bash
# 1. Clone and switch to the app branch
git clone https://github.com/pixfortech/attendance-payroll.git
cd attendance-payroll
git checkout initial-setup

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
# open the printed local URL (default http://localhost:5173)

# 4. Production build / preview
npm run build
npm run preview
```

The app ships with **sample seed data** for Ganguram branches and employees, so it is **immediately demoable** — open the dashboard and click through the sidebar.

---

## Firebase (Admin auth &amp; Firestore)

The **Admin Portal** is secured by **Firebase Authentication (email/password)**. The Employee and Manager portals keep their **local/demo PIN login** for now — no Firebase users are created for them, and **no PIN is ever stored in Firestore**.

When the Firebase env vars are absent, the app runs in **demo mode** (local seed data + `localStorage`), so it works out of the box. Once configured, Firestore is the source of truth for **branches**, **employees** and all **operational payroll data** (attendance, salary, advances, payments, tiffin, notifications, audit) — see [§6](#6-operational-data-phase-2). `localStorage` is only the demo/offline fallback; the local demo seed is never pushed up, so existing Firestore data is never overwritten.

### 1. Configure the web app

Copy `.env.example` → `.env` and fill in your Firebase web config (Project settings → General → SDK setup). The web config is **public client config**, not a secret:

```bash
cp .env.example .env
# then edit .env:
VITE_FIREBASE_API_KEY=…
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=…
VITE_FIREBASE_APP_ID=…
VITE_MASTER_ADMIN_UID=<the UID of your Master Admin user>
```

### 2. Create the Master Admin

In **Firebase console → Authentication → Users**, add a user with **Email/Password** (Sign-in method must be enabled). Copy its **UID**.

### 3. Firestore security rules

Keep it simple for now — only the Master Admin UID may read/write. Paste this into **Firestore → Rules** (also in [`firestore.rules`](./firestore.rules)), replacing `MASTER_ADMIN_UID`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null
        && request.auth.uid == "MASTER_ADMIN_UID";
    }
  }
}
```

### 4. Use it

- The app is **login-first**: the root URL redirects to **`/login`** when no session exists. Pick a role — **Admin** goes to Firebase email/password sign-in (`/admin-login` when configured), **Manager/Employee** use the local/demo PIN flow. After login you're routed to the matching dashboard, and the session lasts a configurable window (default 12h) before expiring back to login.
- **Add/edit employees and branches** write through to Firestore (`employees` and `branches` collections, keyed by id). **Import CSV/XLSX** (Employee Master → Import, Branch Management → Import) bulk-writes too.
- If Firestore access is blocked by rules or unreachable, a clear error toast is shown and the app falls back to local data. **Settings → Data &amp; sync** shows the live status and your UID.
- Managers/Employees sign in from **`/login`** (role + demo PIN) — unchanged.

### 5. CSV / XLSX import (branches & employees)

Import is **preview-first** with validation, then merge-by-code (no duplicates).

- **Order matters: import branches first, then employees.** Employees map to branches by `branchCode`; if a code is unknown, the row is a **blocking error** ("import branches first").
- **Stable IDs:** branch doc id = `branchCode`, employee doc id = `employeeCode`. Re-importing the same code **updates/merges** the record (employee ledgers/attendance are preserved) instead of creating a duplicate — the preview labels these as *Update*.
- **Preview shows** total / valid / warning / error counts and a per-row status before you upload. Only valid + warning rows are uploaded; error rows are skipped.
- **Salary** is stored numeric; a blank salary is kept null and flagged *"Monthly salary missing; update before payroll."* (warning, still importable). **Phone** is kept as a string. **No PIN is imported or stored.**

Expected columns (a template is downloadable from each Import dialog):

```
branches:  branchCode, branchName, addressLine1, addressLine2, landmark, city,
           state, pincode, phone, latitude, longitude, radiusMeters, active
employees: employeeCode, name, mobile, branchCode, branchName, role, designation,
           gender, monthlySalary, joiningDate, status, salaryBasis, latitude,
           longitude, notes
```

### 6. Operational data (Phase 2)

Everything an admin does day-to-day now **persists to Firestore and survives a refresh, cross-device**. The store keeps rendering the same in-memory model, but each mutation **writes through** to a normalised collection, and on admin sign-in the app **hydrates** from Firestore (source of truth) before falling back to `localStorage`.

| Collection | Written when… | Powers |
| --- | --- | --- |
| `attendance` | grid mark, bulk mark, kiosk/QR check-in | month grid + proof queue (reload-safe); dashboard **present today** |
| `salaryRuns` | a salary is approved / paid / held | per-month run progress + counts |
| `salaryEntries` | a salary is approved / paid / held | the **Salary table prefers a frozen entry** over a live recalculation |
| `advances` | record / edit / adjust an advance | advance ledger + remaining balance |
| `advanceAdjustments` | "Adjust against salary" | recovery history (slip shows current-month adjustment) |
| `payments` | record a payment; confirm / dispute | Payments ledger; employee confirmation status |
| `tiffinEntries` | "Mark today's tiffin given" | tiffin log (CTC — **never deducted**) |
| `notifications` | any notify event | the bell, updated **live via `onSnapshot`** |
| `auditLogs` | override / archive / delete / bulk mark | the Audit Log page |

Notes:

- **Source of truth:** on sign-in the app loads these collections and uses them over local state; if Firestore is empty for a collection, the local seed is left untouched (the demo data is never uploaded).
- **Fallback:** if Firestore is blocked by rules or unreachable, a toast is shown and the app keeps working on `localStorage`.
- **Stable ids** mean re-marking a day, re-approving a salary, or re-confirming a payment **updates** the same document instead of duplicating it.
- **Security:** the single Master-Admin rule still gates everything; **no PIN/secret is ever written**. The employee/manager portals stay local/demo until backend token auth lands — `firestore.rules` and `src/lib/firestoreOps.ts` carry `TODO`s sketching the future role-based / custom-claim rules.

> **Not a secret:** the Firebase web API key is safe to ship in the client; access is controlled by the Firestore rules above, not by hiding the key. Real server-side secrets (service accounts) are never placed in this repo.

### 7. Employee / Manager login (Phase 3A — Step 1)

The app is **login-first** and **role-separated** at `/login`:

- **Admin** → Firebase Auth email/password (Master Admin), routes to the admin suite.
- **Manager** → Employee/Manager **ID or mobile**, then a **PIN**, routes to the branch-scoped manager portal.
- **Employee** → Employee **ID or mobile**, then a **PIN**, routes to the self-service portal.

**PIN-first UX:** manager/employee login is a two-step, mobile-first flow — enter ID/mobile → **phone-lock-style PIN keypad** (4/6-digit dots, large number pad, backspace, 6-digit auto-submit, "Forgot PIN? / Reset PIN"). **Password login is a secondary fallback** ("Log in with password instead"); an admin can decide later whether password login stays enabled for staff. To avoid account enumeration, the ID step never reveals whether an account exists — it always advances to PIN entry and fails generically. Admins **Reset PIN / Unlock login** from *Employee Master → Login access* (writes an audit entry).

Routing by role is enforced (`admin → /`, `manager → /manager`, `employee → /portal`); the **manager portal is limited to the manager's assigned branch** and the **employee portal shows only that employee's data**. Sessions expire after a configurable window (default 12h); logout and expiry both return to `/login`, and an expired session shows a "session expired" message.

> ⚠️ **Current limitation (demo PIN):** employee/manager PIN login is **demo/local only** — it matches an existing employee record and checks the PIN **format** (4 or 6 digits, weak PINs blocked, 5-attempt lockout in the UI). **No PIN is stored** anywhere, and **no plain PIN is ever written to Firestore.**
>
> **Why no OTP?** SMS OTP is recurring-cost and operationally heavy, so it's intentionally out of scope.
>
> **Secure backend (planned, Phase 3B)** — the production flow, with `TODO`s already in `src/lib/pinAuth.ts`:
> 1. Employee enters mobile/employeeCode + PIN.
> 2. A Cloud Function verifies the PIN against a **server-side salted hash** (bcrypt/scrypt/argon2) — the plain PIN is never stored or verified on the client.
> 3. The function issues a **Firebase custom token** carrying role + branch claims.
> 4. The client signs in with that token; **Firestore rules** then gate access by `request.auth.uid` + custom claims (admin = full · manager = assigned branch · employee = self). Failed-attempt lockout moves server-side.

#### Admin portal-access controls (Step 2)

From **Employee Master → open a person → Login access**, an admin manages a **Portal access** card with status badges (Active / Login disabled / PIN required / Locked · Employee vs Manager access · Password fallback on/off):

- **Enable / disable** portal login. Enabling a fresh account lands it in **PIN required** (`pinSet = false`); enabling one that already has a PIN lands it **Active**. Disabling blocks login (the login screen shows "Portal access is disabled").
- **Portal role** Employee or Manager. A manager **must be assigned a branch** (a warning shows until then); switching back to Employee clears the branch. The login type must match the role — an employee can't sign in via the Manager option, and vice-versa.
- **Reset PIN** → `pinSet = false`, `loginStatus = pin_required`, `failedAttempts = 0`, `lockedUntil = null` (the user must set a new PIN next login; no PIN is generated or stored). **Unlock** / **Clear attempts** reset the lock counters. **Allow password login** toggles the fallback. **Login note** + **last login** are shown.
- Every change writes an **audit log** entry (employee id/name, action, old → new, by, time) and a **notification** to the affected user.

The PIN login flow honours these states: `loginEnabled`, not `disabled`, not `locked`, role match, `pinSet` (else a "PIN required" message), the 5-attempt lockout, and hides the password fallback when `passwordFallbackAllowed` is false. **All demo/local until the backend above lands — no plain PIN in Firestore; Master-Admin rules unchanged.**

### 8. Navigation & back buttons

A reusable **`BackButton`** (touch-friendly, mobile-first) gives every detail/sub-view a clear way back, so no page is a dead end (also survives refresh / direct URL via a route fallback): **Employee Detail → Employee Master**, **Employee portal sub-sections → Portal home**, **Manager portal sub-sections → Manager home**. The browser Back button keeps working alongside it.

### 9. Attendance capture (Phase 3B)

Daily attendance can be captured several ways; the rules live in one tested place (`src/lib/attendanceCapture.ts`) and everything writes through to Firestore with a localStorage fallback:

| Mode | Notes |
| --- | --- |
| **Manual** (Attendance grid) | Admin sees **All branches** (default), manager only their branch; tap a cell to cycle Present / Absent / Half / Leave / Off — worked days recalculate immediately via the shared calculator. |
| **Bulk** | Mark several employees for a branch/date at once (manager limited to their branch), with a confirm step + audit entry. |
| **QR** | Branch QR carries the branch code. A scan for **another branch** is never silently approved — it goes to the review queue ("QR belongs to another branch"). |
| **GPS / geofence** | Each branch has `latitude/longitude/radius`. Inside the radius → **verified**; outside → **needs_review** (with distance); GPS **denied/unavailable** → **needs_review**, never a hard fail. |
| **Kiosk** | Branch-specific shared-device mode; find yourself by code / mobile / name, confirm, and it stores `branchId/employeeId/source: kiosk/verificationStatus`. No salary/private data is shown. |

**Offline pending-sync** (`src/lib/attendanceSync.ts`): if the device is offline or a Firestore write fails, the action is queued locally ("Saved offline. Will sync when online.") and retried when back online. Writes use **deterministic ids** (`employeeId_date_source`) so retries never double-count. The Attendance page shows an **Online/Offline + pending-count panel** with **Sync now**; failed items keep a retry count + last error.

**Review queue** (Attendance → *Review*): captures anything uncertain (QR mismatch, outside geofence, GPS missing, kiosk uncertain, manager-approval branches). Admin reviews all; a manager reviews **only their branch**. **Approve** marks the employee present (recalculating worked days), **Half day** marks a half, **Reject** keeps it off — all with audit logs + notifications.

**Proof capture** is a **typed placeholder** only (`proofStatus: not_required / uploaded / missing / needs_review`, optional selfie/device/location fields). **No face recognition, biometrics or external biometric devices** are implemented in this phase, and **no Firebase Storage** upload is wired yet.

> **Future plan:** selfie/photo proof via Firebase Storage, optional device biometrics, and external biometric-device integration — all behind the secure backend (custom token + role-based rules). Current Master-Admin Firestore security is unchanged.

### 10. Leaves, payslips & advance adjustment (Phase 3B fix pack)

- **Leaves** is a dedicated menu (`/leaves`): admin sees all requests, a manager their branch, an employee their own (manager/employee via their portals). **Apply leave** uses a **start/end date range** with a **live impact preview** — daily salary, free-leave available, deductible days and the estimated deduction (`src/lib/leaveCalc.ts`). Rules respected: first 3 months (or <15 worked days / resigned) get **no free leave**; otherwise **4 free leaves/month**, no carry-forward; basis-aware daily rate. Approve/reject from the page.
- **Bulk attendance** now supports **select-all**, **single date or a date range**, all mark types (present/absent/half/paid-leave/weekly-off-clear), a **confirmation summary** (branch · employees · dates · mark · total entries) and **quick "today"** buttons (All present / All absent / All half). Worked days recalculate immediately; manager actions stay branch-scoped.
- **Salary & payslip use actual attendance.** The salary table adds **Advance adjusted** and **Advance remaining** columns, plus row actions **View / Download payslip** and **Adjust advance**. The **downloaded payslip is a filled, printable HTML** (`src/lib/payslip.ts`) — Ganguram heading, employee/branch, basis, daily rate, present/half/leave/absent days, free-leave used, deductions, gross, tiffin, **advance adjusted + remaining**, net payable, status and a disclaimer (print → Save as PDF). Frozen/approved salaries are served from the saved salary run.
- **Advance adjustment** is a proper modal: shows net payable, total advance, already-adjusted, remaining and a **suggested amount from the saved repayment terms**, with options (terms / fixed monthly / % of salary / full / custom / skip) and validation (≤ remaining, ≤ net unless admin override, positive). It records a recovery (`recovered`), updates the remaining balance, writes an `advanceAdjustments` record + audit + notification, and the slip shows adjusted-this-month + remaining. Advances are still **created with repayment terms** (full next month / 2 / 3 / 4 months / fixed / custom) and a clearing preview.

All changes write through to Firestore with the localStorage fallback; Master-Admin rules are unchanged; no plain PIN is stored.

### 11. Dates, tenure, resignation, PIN & bulk rules (hotfix)

- **Central date handling** (`src/lib/dates.ts`): dates are stored **internally as ISO `YYYY-MM-DD`** and shown as **`DD/MM/YYYY`**; date inputs use ISO. `parseDate` safely reads ISO, `DD/MM/YYYY`, `DD-MM-YYYY` and human formats — tenure/leave are **never** computed from a display string. (Root cause of the old "Days = 0": a read-only field was uncontrolled; read-only inputs are now controlled so computed values update live.)
- **Leave day count** is **inclusive** (19/06/2026 → 23/06/2026 = **5 days**) and the visible Days field uses the **same** function as the impact preview.
- **Tenure & days worked** are computed from the **parsed joining date** (not the stored `0`): tenure = whole months joining → today (or → resignation); days worked = inclusive joining → today (active) or → ending date (resigned). Eligibility uses this computed tenure, so a `19/04/2024` joiner is correctly past the 3-month threshold.
- **Resignation**: "Mark resigned" opens a confirmation with a **date picker (defaults to today, future blocked)**; it sets `resignedAt`, stops days-worked, applies resignation-month leave logic, and writes an audit log + notification. The profile shows joining date, ending/resigning date, days worked and tenure; joining date is editable via a date picker (ISO).
- **Lock / Unlock label**: an active account shows **Lock**, a locked account shows **Unlock**, a disabled account shows the enable toggle. Lock sets `lockedUntil`; Unlock clears attempts/lock and restores `active`/`pin_required` per `pinSet`.
- **Set / Reset PIN**: admin sets a 4/6-digit PIN (weak PINs blocked, confirm field). **No PIN is stored — plain or hashed — on the client or in Firestore**; only `pinSet` metadata flips. Real hashing + verification is a documented Cloud Function TODO (`setEmployeePin` → salted server-side hash → custom token).
- **Bulk attendance**: admin can pick **all / multiple branches** (manager is locked to their branch); the employee list spans the selected branches with select-all; **dates default to today and future dates are blocked** (capped to today's working day); the confirmation summarises branches · employees · dates · mark · total entries.

---

## Design system

The interface is built from the **Ganguram Payroll Design System**:

- **Identity** — Indigo `#49488D` (primary), Coral `#EA5454` (accent for the single most important action / alerts), white/near-white dashboard base, and cool-slate neutrals with a faint indigo cast.
- **Status hues** — green = paid/present, amber = pending/half-day, blue = approved/paid-leave, coral = rejected/absent.
- **Type** — **Plus Jakarta Sans** for UI, **IBM Plex Mono** with tabular numerals for figures, money, IDs and slip numbers. *(We do not have Ganguram's official font files yet; the font system is isolated so it can be swapped later.)*
- **Surfaces** — soft radii, 1px hairlines, indigo-tinted layered shadows, calm flat backgrounds and quick, functional motion.

> Fonts load from the Google Fonts CDN and can be swapped for self-hosted `@font-face` rules later. Icons are a self-contained Lucide-style stroke set.
