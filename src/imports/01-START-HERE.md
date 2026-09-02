# 1CG Estimating Platform — Bolt handoff

Everything Bolt needs is in this folder. Follow the steps in order; do not skip the
one-screen-at-a-time part — that is what stops the drift you saw.

## What's here
- `1CG Estimating Platform.html` — the finished app, single file, works offline. **This is the
  source of truth for look and behaviour.**
- `1cg-theme.css` — the real token sheet (colors, ramps, type, spacing). Bolt links this as-is.
- `screens/` — a screenshot of every screen, numbered in build order.
- `02-full-spec.md` — the full written spec (data model, permissions, auto-task rules, CRM).

---

## STEP 1 — Upload
In your Bolt project, attach all four items above (`screens/` as a folder or as individual
images).

## STEP 2 — Paste this message

> Stop redesigning. I am attaching the finished app as a single HTML file
> (`1CG Estimating Platform.html`), its token sheet (`1cg-theme.css`), a screenshot of every
> screen (`screens/`), and the written spec (`02-full-spec.md`).
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
> the matching image in `screens/` and fix every difference before starting the next:
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
