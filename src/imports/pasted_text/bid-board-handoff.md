# 1CG — Bid Board handoff for Figma

You already have the **Task Tracker** and **CRM** built. This adds the **Bid Board** as a third top-level tab and wires all three together.

---

## 1. Paste this into Figma verbatim

> Add a third top-level tab called **BID BOARD**, placed **first** in the tab bar (order: BID BOARD · TASK TRACKER · CRM). It is the intake screen for the whole platform: every project in the Task Tracker and every deal in the CRM originates as an accepted bid on this board. Match the existing visual language exactly — Archivo, flat white/ink with the single red accent `#ec3013`, zero corner radius, 2px rules between sections, flush-left labels including inside buttons, no shadows, no rounded cards.
>
> The Bid Board screen is, top to bottom:
>
> 1. **Header bar** — "1CG · BIDBOARD" wordmark left, a text view switcher ("Open Bids" / "By Estimator"), a primary red **Upload project** button, and the signed-in user's initials chip and name right.
> 2. **Stat row** — three equal cells divided by 1px rules, 2px rule under the row: AWAITING DECISION, ACCEPTED, DECLINED. Each is an 11px uppercase tracked label over a 34px Archivo 800 number. Accepted number is green `#1f7a4d`, Declined is the red accent, Awaiting is ink.
> 3. **Filter row** — "Projects out for bid" as an h1, then a segmented filter (All / Awaiting / Accepted / Declined) and a search field reading "Search GC, scope or location".
> 4. **Project cards** in a 3-column grid. Each card leads with a square site-photo slot (a drop target with a PASTE PHOTO affordance) carrying a status tag in its top-left corner — green for ACCEPTED, red for DECLINED, ink for AWAITING. Below the photo: GC name in small red caps ("GC TO BE CONFIRMED" when unset), project name as the card title, then bid date, drawing level (e.g. "100% CD"), location, scope, plan-room link, an internal notes line, and assignee chips. Awaiting cards show **ACCEPT** (primary red) and **DECLINE** (secondary); accepted cards show their assignees and a REASSIGN action; declined cards show the decline reason in muted ink.
> 5. **No footer bar.**
>
> Four modals, all 2px-ruled, square-cornered, over a dim backdrop:
>
> - **Assign** — opens on ACCEPT. Multi-select list of the 11 team members with role and current load, a "notify by email" toggle, and a CONFIRM ACCEPT button. Accepting is what pushes the project into the Task Tracker.
> - **Decline** — reason dropdown (Capacity / Scope outside our trade / Schedule conflict / Location too far / GC relationship or terms / Other) plus a free note.
> - **Upload project (add / edit)** — fields: project name, one or more GC + bid-date pairs, drawing level, scope, location, plan-room URL, project info, internal notes. Also accepts a pasted ITB email body and parses those fields out of it.
> - **Confirm delete.**
>
> "By Estimator" view: the same projects regrouped under each team member as a data table (project, GC, bid date, scope), with a per-person project count and next bid date.

---

## 2. Data model

One `bid_projects` record is the seed for everything downstream.

| Field | Type | Notes |
| --- | --- | --- |
| id | string | |
| name | string | project name |
| gc | string | general contractor |
| bidDate | date | GC's bid due date |
| level | string | drawing level: `100% CD`, `90% CD`, `75% DD`, `50% DD`, `100% CD + Add. 3`, `N/A` |
| location | string | city, state |
| scope | string | e.g. "Curtain wall & storefront" |
| planRoom | url | |
| info | text | scope narrative from the ITB |
| notes | text | internal note |
| status | enum | `pending` · `accepted` · `declined` |
| assignees | string[] | team member names |
| declineReason | string | set only when declined |
| notified | boolean | assignment email sent |

Team (name · role) — use these exact 11 people:

Ray Herring · Estimating Director · Paul Dustin · VP of PreCon · Blake Nicholson · Estimating Manager · Luis Woo · Estimating Manager · Chris Hollingsworth · MP Estimating Manager · Allen Poole, Nico Goenaga, Eric Lunsford, Tim Hamilton · Estimators · Lucas Braswell, Justin Campana · Project Developers.

---

## 3. Integration — the three tabs share one record

**Bid Board → Task Tracker.** Accepting a bid and assigning it creates a Task Tracker **project** immediately. Field mapping:

- name → project name, `gc` → client, `scope` → scope, `bidDate` → bid due, `level` → drawings stage, `location` → location, `assignees[0]` → estimator of record.
- It also generates four dated tasks off the bid date, each owned by the assigned estimator:
  1. **Intro email to GC** — bid date minus 14 days (or +1 day from assignment, whichever is later)
  2. **Takeoff + RFQs out** — assignment +2 days
  3. **Estimate sheet** — bid date minus 1 day
  4. **Finalize and submit** — bid date
- Declining creates nothing. The record stays on the board with its reason for the win/loss history.

**Bid Board → CRM.** The same accepted record appears as a CRM deal with stage derived, not typed: an accepted bid with no submitted price is stage **Bidding**. `gc` becomes the CRM account, `level` becomes the document stage, and the BD owner is set on the CRM side.

**Task Tracker → Bid Board.** Closing the "Finalize and submit" task marks the board record submitted. Escalated issues on a bid's tasks surface on the manager's board view.

**One source of truth.** Do not duplicate the project record per tab — all three tabs read and write the same row. Assignee changes on the board must move the tasks and the deal owner with them.

---

## 4. Screens to attach

Attach `bolt-handoff/screens-1.png` … `screens-4.png` — the existing 19-screen contact sheets for the tracker and CRM, which set the visual language Figma has to match.

For the board itself, take your own captures from the running prototype (BID BOARD tab): the board with a mix of awaiting / accepted / declined cards, the assign modal open, the decline modal open, the upload-project form, and the By Estimator view. Five images is enough. The board renders from your own saved data, so your captures will show real projects rather than samples.

Tell Figma to build **one screen at a time** and check each against the matching screenshot before moving on.

## 5. Design tokens

Accent `#ec3013` · ground `#f3f2f2` · ink `#201e1d` · positive `#1f7a4d` · type Archivo 400/500/600/700/800 · radius `0` everywhere · dividers 1px between cells, 2px between sections · spacing on a 4px base (common values 12 / 16 / 20 / 24 / 28px).
