# 1CG — Team Connection + Resources handoff for Figma Make

Figma already has the Bid Board, Task Tracker and CRM. This adds **two new sidebar views inside the Task Tracker**: `Team Connection` and `Resources`. Nothing else changes.

Sidebar order after this change — manager login: My day · Management overview · Calendar · Capacity · Projects · **Team Connection** · **Resources**. Estimator login: My day · Calendar · Projects · **Team Connection** · My capacity · **Resources**.

---

## 1. Paste this into Figma Make verbatim

> Add two views to the Task Tracker sidebar, matching the existing visual language exactly — Archivo, flat `#f3f2f2` ground on `#201e1d` ink, single red accent `#ec3013`, zero corner radius, 1px rules between rows and 2px rules between sections, flush-left labels, no shadows, no rounded cards.
>
> **A. TEAM CONNECTION** — internal messaging, two columns: a 290px conversation rail and the thread.
>
> The rail is a flat scrolling list of grouped rows (no search field). Each group has an 11px uppercase tracked header on a light-neutral band, and each row is a 30px square initials avatar, the name, a second line showing the last message (or the role when there is none), a third line of member initials for group chats, and a 6px red dot on the right that appears ONLY when the newest message came from someone else and has not been opened. The selected row inverts to solid ink with light text. Group order, top to bottom:
> 1. **GROUP CHATS** — "Estimating — everyone", "Manager chat", then one channel per estimating manager ("Blake's team", "Luis's team", "Chris's team", "Ray's team"). Manager-chat membership is Ray, Paul, and whoever the signed-in person reports to, so it re-forms per login.
> 2. **YOUR MANAGER** — shown only for estimators, their direct manager alone.
> 3. **YOUR TEAM** — shown only when the signed-in person is a manager: their own estimators.
> 4. One group per manager, headed with that manager's name — e.g. "BLAKE NICHOLSON · TEAM".
> 5. **HEAD MANAGEMENT** — Ray Herring and Paul Dustin, last in the rail, visible to every login. No "pinned" wording anywhere.
>
> The thread column is: a header with a 38px ink initials tile, the name in Archivo 800/18px, a meta line (role and email for a person, "N people · group chat" for a channel), and a right-aligned status tag — red "YOUR MANAGER", neutral "ON YOUR TEAM" or "ESTIMATING", red "GROUP". Then the scrolling message area on a light-neutral ground: own messages right-aligned as solid ink bubbles with light text, others left-aligned on the ground with a 1px rule, each with a small "Name · 3:42 PM" line beneath, max 72% width, square corners. Images and GIFs render inline above the text at 320×220 cover; non-image files render as a named chip with a red square marker and file size. Empty thread shows "NO MESSAGES YET" over one line of guidance.
>
> The composer, under a 2px rule: a row of four quick-message chips (outlined, uppercase); a pending-attachment row of chips with a 30px thumbnail and an × to remove; then ATTACH (outlined, opens a file picker), GIF (outlined; toggles to solid ink when open), the message input, and a solid red SEND. Pasting an image into the input attaches it. The GIF panel is an outlined box holding "ADD A GIF", a link field ("Paste a GIF link"), an ink ADD button, and a 4-column grid of previously sent GIFs for reuse. A helper line reads: paste a screenshot straight into the message box, or drop files with ATTACH.
>
> The sidebar row for Team Connection carries a count badge = number of threads with an unread message from someone else.
>
> **B. RESOURCES** — the shared library, two columns: a 230px category rail headed "RESOURCE LIBRARY" and the content panel. Exactly four categories, no "everything" option, opening on Processes: **Processes · Vendor contacts · Tools · Training**, each row showing its live count, selected row inverted to ink. Every category has its own panel header: the category name in Archivo 800/18px, a one-line hint, a "Search resources" field, and a red ADD RESOURCE button that opens a two-column form (title, category, link, file, "what it is for", SAVE / CANCEL). Each category body is a DIFFERENT layout:
>
> - **Processes** — a flat list of documents. Each row: a 48px ink file-type badge (PDF, or neutral for DOCX), the title, an "OWNER · NAME" line, and a READ button. Hovering the row tints it light-neutral and opens the description in place, indented under the badge. READ opens the document INSIDE the portal, not a new tab: the list is replaced by a 820px reader — "← ALL PROCESSES" back link, kind/owner meta line, title in Archivo 800/28px, the summary, a 2px rule, then numbered sections each with a bold heading and body copy, and a DOWNLOAD button at the foot.
> - **Vendor contacts** — a TRADE dropdown (not chips) with eleven options: All trades, Glass, Storefront & curtain wall, Metal panels, Door hardware, Doors & entrances, Sealants & glazing supplies, Skylights & canopies, Railings & handrail, Louvers & sunshades, Fabrication & finishing — plus a live "N companies" count. Search matches company, trade, description and any rep's name, email or phone. Below: a 300px company list on the left (name plus "trade · N contacts", selected row inverted) and the company profile on the right — name in Archivo 800/22px, trade in red small caps, a description paragraph, a three-cell fact strip between 1px rules (LEAD TIME, QUOTE TURNAROUND, TERMS), then a CONTACTS list where each row is a 34px initials tile, name, role, and right-aligned phone over a red-ink email. When a search returns nothing, show only the empty message — keep the dropdown reachable.
> - **Tools** — a list, each entry a two-column row: left is a red 8px square, the tool name, a small uppercase kind (TAKEOFF SOFTWARE / ESTIMATING SOFTWARE / WORKBOOK / AI), a plain-language explanation, and red-outlined "▶ … TRAINING" chips that jump to the Training category pre-filtered to that software; right is a DOWNLOAD button (downloads, never navigates) over a small file/meta line.
> - **Training** — a card grid, `repeat(auto-fill, minmax(280px, 1fr))` with 1px divider gaps. Each card: a dark 128px thumbnail with a centered play glyph and a duration tag pinned bottom-right, then the type in red small caps, the title, a two-line description, and an ink WATCH button. Above the grid, a filter row of red-fill-when-active chips: All training, Bluebeam, Glazier Studio, Metal panels, AI, Microsoft Excel, Estimating basics.

---

## 2. Data model

**Team Connection.** Messages are stored per conversation key: `ch:<channel>` for a group, or the two person ids sorted and joined with `~` for a direct thread, so both sides read one thread.

| Field | Type | Notes |
| --- | --- | --- |
| conversationKey | string | `ch:all`, `ch:mgrs`, `ch:blake`, or `blake~nico` |
| from | string | person id |
| text | string | may be empty when only an attachment is sent |
| at | timestamp | |
| attachments | array | `{name, size, isImage, url}` — GIFs are `name: 'GIF'` |

Read state is one timestamp per conversation key per person: the dot shows when `lastMessage.from ≠ me` and `lastMessage.at > lastRead`. Opening a conversation writes `lastRead`.

Channels: `ch:all` (everyone), `ch:mgrs` (Ray + Paul + the signed-in person's manager), and `ch:<managerId>` (that manager plus their estimators).

**Roster** — 9 people, exactly these:

| id | name | role | reports to |
| --- | --- | --- | --- |
| paul | Paul Dustin | VP of PreCon | — |
| ray | Ray Herring | Estimating Director (manager) | paul |
| blake | Blake Nicholson | Estimating Manager | ray |
| luis | Luis Woo | Estimating Manager | ray |
| chris | Chris Hollingsworth | MP Estimating Manager | ray |
| eric | Eric Lunsford | Estimator | luis |
| timp | Tim Prewett | Cladding Estimator | chris |
| justin | Justin Campana | Project Developer | ray |
| lucas | Lucas Braswell | Project Developer | ray |

Emails are `FirstLast@Glass1st.net`.

**Resources.** Four record types.

- `process` — `{kind: 'PDF'|'DOCX', title, owner, summary, file, sections: [{heading, body}]}`
- `vendor` — `{name, trade, about, leadTime, quoteTurnaround, terms, contacts: [{name, role, phone, email}]}`
- `tool` — `{name, kind, note, file, meta, training: [trainingType]}`
- `training` — `{type, title, length, description, videoUrl}` where type is one of Bluebeam · Glazier Studio · Metal panels · AI · Microsoft Excel · Estimating basics

User-added resources carry `{title, category, url, fileName, note, addedAt}` and merge into the matching category list.

---

## 3. Integration with what Figma already has

- Both views live **inside the Task Tracker shell** — same top app tabs (BID BOARD · TASK TRACKER), same left sidebar, same header. They are sidebar destinations, not new top-level tabs.
- Team Connection's roster is the same people table that assigns bids on the board and owns tasks in the tracker. One roster, not a copy — changing someone's manager must move them in the chat rail and in the tracker's team scoping together.
- Sidebar badges: Team Connection shows unread threads; Projects shows visible project count; My day shows open tasks. Same badge treatment for all.
- Visibility follows the tracker's existing rule — estimators see their own work, managers see their teams, executives see everything — but Team Connection is deliberately open: anyone can message anyone, and HEAD MANAGEMENT is visible to every login.
- Resources is shared shop-wide with no per-role filtering. Tool → Training deep link sets the Training category and its type filter in one action.

## 4. Screens to capture

From the running prototype, Task Tracker tab: (1) Team Connection on a group chat with messages, an inline image and the composer, (2) Team Connection on a direct thread with the unread dot visible elsewhere in the rail, (3) the GIF panel open, (4) Resources · Processes list with one row hovered, (5) the process reader open, (6) Resources · Vendor contacts with a trade selected and a company profile, (7) Resources · Tools, (8) Resources · Training grid with a filter active. Have Figma build one screen at a time and check each against its screenshot.

## 5. Design tokens

Accent `#ec3013` (hover `#c72a10`) · accent tint `#fde8e4` · ground `#f3f2f2` · ink `#201e1d` · neutral rails `#e8e6e6` / `#d6d3d3` · muted ink `#5c5757` · type Archivo 400/500/600/700/800 · radius `0` everywhere · 1px row rules, 2px section rules · spacing on a 4px base (12 / 14 / 18 / 20 / 24 / 28px).
