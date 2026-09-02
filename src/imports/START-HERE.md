# 1CG Estimating Platform — Bolt handoff

Everything Bolt needs is in this folder. Follow the steps in order; do not skip the
one-screen-at-a-time part — that is what stops the drift you saw.

## What's here
- `1CG Estimating Platform.html` — the finished app, single file, works offline. **This is the
  source of truth for look and behaviour.**
- `1cg-theme.css` — the real token sheet (colors, ramps, type, spacing). Bolt links this as-is.
- `screens-1.png` … `screens-4.png` — every screen, labelled, in build order.
- `ui.tsx`, `1cg-base.css` — the design system as code (see Part B).
- Part C below — the full written spec (data model, permissions, auto-task rules, CRM).

---

## STEP 1 — Upload
In your Bolt project, attach all four items above (`screens-1..4.png`).

## STEP 2 — Paste this message

> Stop redesigning. I am attaching the finished app as a single HTML file
> (`1CG Estimating Platform.html`), its token sheet (`1cg-theme.css`), a screenshot of every
> screen (`screens-1..4.png`), and the written spec (`02-full-spec.md`).
>
> Port the HTML file **verbatim** into React + TypeScript + Supabase:
> - Link `1cg-theme.css` unmodified. No Tailwind, no component library, no CSS reset that
>   changes type sizes.
> - Convert the existing markup 1:1 into components and **copy every inline style string
>   character-for-character**. Do not consolidate, tidy, round a number, or change any font
>   size, padding, border width, letter-spacing or color.
> - Radius 0 everywhere. 2px section rules, 1px row rules. Uppercase labels keep their exact
>   letter-spacing. Button labels stay flush left.
> - The only thing you may change is the data layer: swap in-memory/localStorage state for
>   Supabase, and the demo auth for Supabase Auth.
>
> Build **one screen at a time in this order**, and after each screen post a screenshot beside
> the matching image in `screens-1..4.png` // ` and fix every difference before starting the next:
> 01 login · 02 management overview · 03 team calendar · 04 my day (focus) · 05 my day
> (columns) · 06 calendar · 07 capacity · 08 projects · 09 project flow · 10 project tasks ·
> 11 task panel · 12 CRM overview · 13 CRM follow-ups · 14 CRM list · 15–17 CRM record tabs ·
> 18–19 permission-limited views.
>
> Read `02-full-spec.md` for the data model, the org/permission rules, the auto-scheduled task
> rules and the CRM logic. Do not invent behaviour that is not in the file or the spec.

## STEP 3 — Correct drift with these exact phrases
Paste whichever applies, every time it happens:
- "You changed a style value. Revert to the exact value in the attached HTML."
- "No new colors. Only tokens from `1cg-theme.css`, plus the three status colors:
  green `oklch(0.58 0.12 150)`, amber `oklch(0.72 0.15 78)`, red `var(--color-accent)`."
- "No rounded corners. No shadows other than `--shadow-sm/md/lg`. No gradients. Lucide icons only."
- "You skipped a behaviour. Re-read the acceptance list below and implement it."

## STEP 4 — Acceptance list (test each after the matching screen)
1. Assigning a project auto-creates four tasks: intro email 1 h (assign +1), takeoff/RFQs 6 h
   (assign +2), estimate sheet 2 h (due −1), finalize proposal 4 h (due). Weekends roll to
   weekdays. Never duplicates.
2. Exec sees everyone; a manager sees only their direct reports; an estimator sees only their
   own tasks, capacity and assigned projects, and can only create tasks for themselves.
   (Compare against `18-estimator-limited-view.png` and `19-manager-limited-view.png`.)
3. Management overview rows expand on **click**, never on hover.
4. CRM stage "Bidding" is derived — set whenever an estimator has an open task on the job; a
   manually chosen stage always wins.
5. A proposal is saved on upload with its submitted date; reading it fills the sell price and
   the project scope; a revision cannot be logged without a cost.
6. Calendar, capacity, project flow and the CRM all show the same date for the same record.
7. Follow-ups set on a CRM record appear on the BD follow-ups page with the GC contact,
   click-to-email and click-to-call.

## STEP 5 — Two things the prototype fakes
- **Password reset** — the prototype shows the code on screen. Bolt must send a real email
  through Supabase Auth.
- **Glass vs ACM** — the prototype guesses from scope text. Add a real `trade` field
  (`glass` | `acm`) on the project record, set on the bid board.

## Test logins (after Bolt seeds the profiles)
- `PaulDustin@Glass1st.net` — sees everyone
- `BlakeNicholson@Glass1st.net` — sees Allen + Nico only
- `timprewett@glass1st.net` — estimator, sees only his own work


---

# PART B — Design system as code


Instead of describing the look, give Bolt the styling **as code**. Three files:

| File | What it is |
|---|---|
| `1cg-theme.css` | The token sheet — colors, 100–900 ramps, fonts, spacing, shadows. Never edit. |
| `1cg-base.css` | Global resets + interaction states (focus ring, hovers, radius 0, links, selection). |
| `ui.tsx` | React primitives every screen is built from: `Button`, `Seg`, `Chip`, `StatusLight`, `KpiStrip`, `ListRow`, `Field`, `PageHeader`, `Rule`, plus the `T` type scale and `STATUS` colors. |

## Message to paste in Bolt

> Use the attached design system as code — do not write your own styles.
>
> 1. Copy `1cg-theme.css`, `1cg-base.css` and `ui.tsx` into `src/design/`.
> 2. In `main.tsx`, import `1cg-theme.css` then `1cg-base.css`, in that order. Add the Archivo
>    Google Font (weights 400–800). Do not install Tailwind, MUI, Chakra, shadcn, DaisyUI or
>    any other UI kit, and do not add another CSS reset.
> 3. Build every screen out of the primitives in `ui.tsx` and the `T` type scale. For layout
>    use plain `div`s with CSS grid/flex and `gap`, divided by `Rule` — equal-width cells,
>    2px rules between sections, 1px rules between rows.
> 4. Colors come only from `var(--color-*)` tokens plus the three `STATUS` values in `ui.tsx`
>    (green = good, amber = awaiting, red = urgent/overdue). No other colors, no gradients.
> 5. Radius stays 0. Shadows only `var(--shadow-sm|md|lg)`. Icons only Lucide.
> 6. If a primitive does not exist for something, extend `ui.tsx` — never introduce a library
>    component or a one-off hex.
>
> Match the attached screenshots in `screens/` exactly; the HTML file
> `1CG Estimating Platform.html` is the source of truth for anything ambiguous.

## Quick reference for Bolt

```tsx
import { Button, Seg, Chip, StatusLight, KpiStrip, ListRow, Field, PageHeader, Rule, T, STATUS } from '../design/ui';

<PageHeader kicker="1CG · SALES" title="CRM OVERVIEW"
  actions={<><Button variant="secondary" size="sm">FOLLOW-UPS · 3</Button><Button>OPEN THE CRM LIST →</Button></>} />

<KpiStrip items={[
  { label: 'TOTAL PRICED WORK', value: '$5.25M', note: '4 priced of 6 projects' },
  { label: 'FEELING GOOD', value: '$862K', note: '1 project in play', color: 'var(--color-accent-700)' },
]} />

<Seg value={task.status} onChange={setStatus} width={84}
  options={[{ value: 'wip', label: 'WIP' }, { value: 'waiting', label: 'WAITING' }, { value: 'done', label: 'DONE' }]} />

<ListRow status="awaiting" onClick={open} right={<StatusSegs task={task} />}>
  <span style={{ font: '600 13.5px/1.3 var(--font-body)' }}>{task.title}</span>
  <span style={T.micro}>{task.status} · {task.due} · {task.hours}h · {task.owner}</span>
</ListRow>

<Field label="FOLLOW-UP DATE"><input type="date" style={inputStyle} /></Field>
```

## Non-negotiables (repeat verbatim when Bolt drifts)
- Radius 0 everywhere.
- Labels uppercase, 11–12px, letter-spacing .12–.14em, `--color-neutral-600`.
- KPI numbers 24–40px, weight 800, heading font.
- Button labels flush left, uppercase, 600 weight.
- Accent red is for the primary action, urgent status and small emphasis only — the app is
  mostly ink on a light ground.
- Structure is drawn with rules, not whitespace or cards.


---

# PART C — Full spec


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
