# Bolt.new build prompt — 1CG Estimating Platform (Task Tracker + CRM)

Copy everything below the line into Bolt.new. Attach `Glazing Task Tracker.dc.html`
(the HTML prototype) and `BidBoard.dc.html` as reference files.

---

Build a production web app called **1CG Estimating Platform** for a glass, glazing and
cladding (Division 08) subcontractor. I have a working HTML prototype (attached) — treat it
as the functional and visual spec and match it closely. I already have a **Bid Board** app
running on Bolt; this new app must read from and write to the same data, so plan the schema
around one shared database rather than two.

## Stack
- React + TypeScript + Vite, React Router.
- Supabase (Postgres + Auth + Row Level Security + Storage) for data, login and file uploads.
- No component library — plain CSS/inline styles. Do not introduce Tailwind's default look,
  Material, Chakra, shadcn, etc. The visual system below is strict.

## Visual system (must follow exactly — do not restyle)
Flat, architectural, Swiss-modernist. Everything flush left. Nothing floats.
- Type: **Archivo** for headings and body (Google Fonts, weights 400/500/600/700/800).
- Tokens: background `#f3f2f2`, ink `#201e1d`, single accent `#ec3013`, plus neutral and
  accent ramps (100–900) generated in OKLCH off those. White `#fff` only as text on accent.
- **Border radius is 0 everywhere.** No rounded corners, no pills, no soft shadows.
- Structure comes from rules, not whitespace: 2px ink rules between major sections, 1px
  divider rules between rows, visible modular grids of equal-width cells.
- Buttons: solid accent fill for the primary action, 1px ink outline for secondary,
  labels flush left, uppercase, letter-spacing ~.06–.12em, 10–13px, 600 weight.
- Labels/metadata: uppercase, 11–12px, letter-spacing .12em, neutral-600.
- Numbers/KPIs: 24–40px, weight 800, heading font.
- Status semantics (the only non-mono colors): green `oklch(0.58 0.12 150)` = good,
  amber `oklch(0.72 0.15 78)` = awaiting, accent red = needs work / overdue.
- Hover states tint with accent-100 or neutral-100; focus ring `2px solid #ec3013`,
  offset 2px. Never leave the browser-default blue focus ring.
- Minimum body text 12px; do not shrink metadata below 10.5px.

## Auth and org permissions
Email + password via Supabase Auth, restricted to `@glass1st.net` addresses, with a real
forgot-password email reset (the prototype fakes the code — implement properly).

Seed these users (`profiles` table: id, name, email, role, kind, manager_id):

| Name | Email | Role | Kind | Reports to |
|---|---|---|---|---|
| Paul Dustin | PaulDustin@Glass1st.net | VP of PreCon | exec | — |
| Blake Nicholson | BlakeNicholson@Glass1st.net | Estimating Manager | manager | Paul |
| Luis Woo | LuisWoo@Glass1st.net | Estimating Manager | manager | Paul |
| Chris Hollingsworth | ChrisHollingsworth@Glass1st.net | MP Estimating Manager | manager | Paul |
| Allen Poole | AllenPoole@Glass1st.net | Estimator | estimator | Blake |
| Nico Goenaga | NicolasGoenaga@Glass1st.net | Estimator | estimator | Blake |
| Eric Lunsford | EricLunsford@Glass1st.net | Estimator | estimator | Luis |
| Tim Hamilton | TimHamilton@Glass1st.net | Estimator | estimator | Luis |
| Tim Prewett | timprewett@glass1st.net | Cladding Estimator | estimator | Chris |
| Ray Herring | RayHerring@Glass1st.net | Estimating Director | estimator | Chris |

Enforce with RLS, not just UI:
- **exec** — sees every manager and estimator in the management tab.
- **manager** — sees only their own direct reports.
- **estimator** — sees only their own tasks, their own capacity, and only the projects they
  are assigned to. They may create tasks only for themselves.
- **CRM is open to everyone** in the estimating group (read + write).

## Integration with the existing Bid Board
The prototype reads accepted, assigned bids out of `localStorage['glass1st-bidboard-v2']`.
Replace that with the shared Postgres `projects` table the Bid Board writes to. A bid appears
in this app as soon as it is **accepted and assigned**. Fields consumed: id, name, GC(s), bid
due date, drawings/level, location, scope, assignees, assigned_at, logged_at, plan-room /
original ITB URL. Keep the "OPEN ORIGINAL ITB" button pointed at that URL. Do not scrape plan
rooms (BuildingConnected/Procore/SmartBid block it).

## Auto-scheduled tasks (core rule)
When a project arrives assigned, create exactly four tasks for the assigned estimator,
skipping weekends (roll Sat/Sun to the nearest weekday), idempotent per project:
1. **Send out intro email** — 1 h, assignment date + 1 day.
2. **Takeoff + RFQs out** — 6 h, assignment date + 2 days.
3. **Assemble + review estimate sheet** — 2 h, bid due date − 1 day.
4. **Finalize proposal + estimate** — 4 h, bid due date.

## Screens to build (match the prototype)
**Shell:** two app tabs — TASK TRACKER and CRM. Header: brand "1CG / TASK TRACKER", signed-in
name + role, SIGN OUT.

**Task tracker nav:** My day · Management overview (managers/exec only) · Calendar · Capacity · Projects.

- **My day** — two layouts (FOCUS / COLUMNS).
  - Right rail: **IN FOCUS** — every active assigned project as a one-line row with a
    green/amber/red status light, one-word status and a short reason; the row expands to show
    detail; selecting one drives the rest of the page. Below it **MY WEEK** — 5 weekday bars
    of planned hours; hovering a day drops down that day's schedule with hours.
  - Main: selected project header (status dot, name, ref, bid due, open hours, OPEN PROJECT,
    ADD TASK) then that project's tasks as a large list — title, status/owner/hours, latest
    note, notes button, due date. Empty state when the user has no assigned bids.
  - COLUMNS = the same project's tasks in To-Do / In Progress / Awaiting Response / Complete.
- **Management overview** — one column per direct report (exec: everyone, managers included).
  Each column: open count, status mix bar, then that person's projects as minimized rows with
  a status light, **click to expand** (never hover-expand — it fights scrolling) revealing
  their tasks, each with a "Note from <manager>…" field that posts into the task thread
  attributed to the manager. Also a TEAM CALENDAR layout: week/month grid filtered by team
  member with an "ADD TO MY CALENDAR" .ics export.
- **Calendar** — the signed-in user's own schedule, week and month views, ◀ TODAY ▶ stepping,
  hours per day, tasks as chips.
- **Capacity** — planned hours per weekday against an 8 h/day target; managers see their
  reports, estimators see only themselves.
- **Projects** — left rail of active projects (each with **+ NOTE** and **CLOSE OUT**, close-out
  behind an "are you sure" confirm that moves the project to the CRM marked Closed). Detail:
  OPEN ORIGINAL ITB / ADD TASK / SEE PROJECT FLOW; facts row (drawings, logged, assigned, bid
  due); tasks as a full-width list where each row has WIP / WAITING / DONE buttons of equal
  width; a **PROJECT NOTES** panel with tag chips (SPEC, GC CALL, RFI, PRICING, REMINDER),
  one-tap snippet starters, and notes rendered in a ruled tag/date/body layout. PROJECT FLOW
  shows the upcoming dates and lead times for the assigned work.
- **Task panel** (slide-over) — status segs, scope note, full note thread, add note,
  **RAISE AN ISSUE TO BLAKE** (issue goes to that estimator's manager, sets the task to
  Awaiting Response, notifies the manager with a header alert and an issues tray where they
  can reply — the reply posts back into the task thread), and ◀ PREV / NEXT ▶ stepping through
  the job's tasks.
- **Quick add** in the sidebar: NEW TASK (with an optional first note) and **QUICK NOTE**
  (job picker, note tags, snippet chips, and browser speech-to-text dictation).

**CRM**
- **Overview (entry page, fills the viewport):** total priced work, Feeling Good value, Sold
  value, Lost value; under them average GP, hit rate, projects won, projects lost; a quarter
  block (this quarter, last quarter, goal, progress bar, amount to go) and a year-to-date
  block (sold YTD, yearly goal, ahead/behind pace); and two full-height cards — top company
  sold to (by value) and company we bid the most. Quarter and yearly goals are configurable.
- **Follow-ups page** (BD): every follow-up sorted by date, overdue flagged, filterable by BD,
  each row showing project, stage, GC, the note and the GC contact with click-to-email and
  click-to-call, plus MARK DONE.
- **List:** four KPI blocks — Active Projects · Glass, Active Projects · ACM, Glass Due This
  Week, ACM Due This Week (add a real trade flag: `glass` | `acm` per project instead of
  keyword-guessing scope text). Filters: search, stage, business development manager.
- **Record:** tabs PROJECT INFO · PRICING & REVISIONS · FOLLOW-UP.
  - Stages: **Bidding** (derived — set automatically whenever any estimator has an open task
    on the job; not manually pickable), Feeling Good, Neutral, At Risk, Sold, Lost, No bid.
    A manual stage always overrides the derived one.
  - PRICING & REVISIONS: revision history with price, cost, GP% and timestamp; proposal
    upload lives here — a file is **saved to storage immediately on upload and stamped with
    the submitted date**; parsing it autofills the sell price, the project scope on PROJECT
    INFO, and the revision draft. Because a proposal has no cost, prompt for the cost and
    refuse to log a revision without it so every revision carries a real GP.
  - FOLLOW-UP: set a follow-up date plus what to chase; it appears on the BD follow-ups page.
  - Business development managers assignable: **Danielle, Jaramie, John**.

## Behaviour details worth keeping
- All dates are real dates; weekday grids never show tasks from other weeks, and every view
  (calendar, capacity, project flow, CRM list) must agree on the same date for the same record.
- Weekend dates roll to weekdays for scheduled work.
- Overdue = an actionable (not awaiting) task dated today or earlier.
- Status lights: red = actionable work due today/overdue or bid due within 2 days;
  amber = blocked on someone outside; green = scheduled, nothing due yet.
- Notes are append-only with author and timestamp; manager notes are labelled as such.

Deliver it as a real multi-user app: migrations + RLS policies, seeded profiles, and the
Bid Board reading/writing the same `projects` table.
