# Case Study Page — Build Spec

> A living document. This is the actionable implementation spec for the `/case-study` page in this app. Content facts come from `C:\My Web Projects\upravnik-platform\docs\case-study.md` ("doc #1") — this document does not author new prose; every content-bearing section below references the doc #1 section it pulls from. Sections here are numbered to match doc #1's sections 2–17 **1:1** so future updates are mechanical: when doc #1 changes, find the matching section number here and refresh only what it references.

---

## Route & File Placement

- **Route:** new `app/(public)/case-study/page.tsx` — a new route group, following the exact pattern already used by `(auth)`: **no `layout.tsx`, no `AuthGuard`, no `AppShell`**. Confirmed by inspection: `app/(auth)/` contains only a `login/` folder and no layout file of its own, inheriting only the root `app/layout.tsx` (fonts, `ThemeProvider`, `QueryProvider`, `AuthProvider`). `(public)/case-study` should do the same, since the audience (recruiters) will not be logged in and must not be redirected by an `AuthGuard`.
- **Components:** page-local components live in `components/case-study/`, matching the existing convention of `components/resident/`, `components/upravnik/`, `components/guards/`, `components/providers/` (feature components are not co-located under `app/`).
- **Do not** add this under `(resident)`, `(upravnik)`, or `(super-admin)` — all three wrap their children in `AuthGuard`, which would make the page unreachable for a logged-out visitor.

## Component Inventory Constraint

`components/ui/` currently contains exactly: `avatar`, `badge`, `button`, `card`, `dialog`, `dropdown-menu`, `input`, `label`, `scroll-area`, `separator`, `sheet`, `skeleton`, `table`, `textarea`. **No accordion, tabs, alert, or chart/timeline primitive exists.** This spec deliberately composes the page from the existing set only — it does not require any new shadcn install. Where a semantically-better primitive would help (see the callout treatment below), it's flagged as an optional one-off addition to raise with the user rather than assumed.

## Design Tokens Available (from `app/globals.css`)

Use these exact CSS custom properties — do not hardcode hex/oklch values:

- **Brand/pine:** `--color-pine-50` … `--color-pine-950` (11 steps) — backend-associated content and primary brand accents (`--primary` already aliases `--pine-600`).
- **Stone:** `--color-stone-0` … `--color-stone-950` (13 steps, includes `stone-150`) — neutral surfaces, text, borders.
- **Amber:** `--color-amber-50` … `--color-amber-900` — forum/warning-adjacent content; also the existing `--warning`/`--type-forum` semantic aliases.
- **Sky:** `--color-sky-100/200/500/700` — chat-associated content (`--type-chat`).
- **Violet:** `--color-violet-100/200/500/700` — docs-associated content (`--type-docs`).
- **Green / Red:** `--color-green-*` / `--color-red-*` — success/danger semantics (`--success`, `--danger`).
- **Fonts:** `--font-sans` (Hanken Grotesk, prose/UI text), `--font-mono` (JetBrains Mono, numerals/stats/timestamps — use for the stat-tile numbers below).
- **Radius/shadow scale:** `--radius-xs` … `--radius-2xl`, `--shadow-xs` … `--shadow-xl` — reuse rather than inventing new values.

---

## Page Sections

### Hero — pulls doc #1 §2 + §3

- Elevator pitch as the headline/subhead.
- A row of `Badge` chips for the top-level stack tags (NestJS 11, Prisma 7, PostgreSQL, Next.js 16, React 19, Socket.IO) — repurpose the existing color-coded badge variant system as tech-tags rather than inventing a new tag component.
- **Placeholder asset needed:** hero screenshot or mockup of the running app. Until available, reserve the layout space with a `Skeleton` block sized to the eventual image.

### Problem & Domain Story — pulls doc #1 §4

- Two-column layout: prose on one side, a simple nested list on the other rendering the `Platform → Complex → Building → Unit → Account` hierarchy, styled with `Separator` between tiers and `pine`/`stone` tokens for depth — no diagram library is available, so this is text/CSS, not an image.
- **Optional placeholder:** a real ERD/hierarchy diagram image would be a nice upgrade later; the section works fine without one.

### Architecture Overview — pulls doc #1 §5

- Two `Card`s side by side, "Backend" and "Frontend," each listing its stack as a `Badge` list. Use `pine` tones for the Backend card and `sky`/`violet` tones for the Frontend card, establishing a color convention that should stay consistent for the rest of the page (backend content = pine-toned, frontend content = sky/violet-toned).

### Data Model & Authorization Story — pulls doc #1 §6

- A vertical stepper of stacked `Card`s for the six schema layers (Identity → Structure → Membership → Content → Interaction → System).
- The three-layer authorization evolution (SystemAdminGuard → RolesGuard → inline service-level checks) as a short numbered list or three small cards in sequence.
- **Honesty callout here:** the `RolesGuard` inconsistent-wiring gap (doc #1 §6/§15) needs a visually distinct treatment — an `amber`-bordered `Card` used as a lightweight callout box. No dedicated "Alert" component exists in `components/ui/`; this spec assembles the callout from `Card` + amber tokens. **Optional:** adding a shadcn `alert` primitive would be more semantically correct — worth raising with the user before or during implementation if a real Alert component is preferred over a hand-rolled Card variant. Whichever treatment is chosen, reuse the same pattern for every other honesty-callout on the page (see the Honest Gaps section below) so they're visually consistent.

### Sophisticated Business Logic Spotlight — pulls doc #1 §7

- Two feature `Card`s (Ticket read-tracking + notification fan-out; Transactional bulk-provisioning), each with a "read more" `Dialog` for the longer explanation rather than cramming full prose into the card — reuses the existing `Dialog` primitive instead of adding an accordion dependency.

### Engineering Process & Discipline — pulls doc #1 §8

- A small stat row (Postman collection line count, migration count) styled as stat tiles: `Card` + large `font-mono` numeral, to visually separate "hard numbers" from surrounding prose. This can double up with the by-the-numbers stat strip below if page length runs long — implementer's call.

### Frontend Architecture & Standout Feature (Bulk Wizard) — pulls doc #1 §9 + §10

- This is the best candidate for real visual evidence in the whole page.
- **Placeholder assets needed:** screenshots or a short screen-recording/GIF of all three wizard steps (Scope → Buildings → Review) and the live ASCII-tree preview. Until captured, use `Skeleton` blocks sized to the eventual screenshots so the layout is correct and swapping in real media later is a one-line change, not a layout rewrite.

### Feature Inventory Grid — pulls doc #1 §11

- A grid of small `Card`s or a single `Table` (both primitives exist — pick based on final visual density preference), one entry per feature (auth, activity feed, announcements, forum, tickets, unit directory), each tagged with a `Badge` reading "Shipped" in a `pine`/green tone.

### Design System Showcase — pulls doc #1 §12

- **Make this section self-referential.** Render live color swatches by reading the actual CSS custom properties (`--color-pine-500`, `--color-stone-300`, etc.) directly — small colored blocks with the token name printed underneath in `font-mono` — rather than hardcoding hex values anywhere. Include a short font sample of Hanken Grotesk and JetBrains Mono side by side.
- This is an intentional device: the page itself becomes a live demo of the design system it's describing. Call this out in a short caption so it doesn't read as accidental.

### Engineering War Story — pulls doc #1 §13

- A single narrative `Card`. No special components needed — this is prose-only.

### Scope & Deliberate Deferrals — pulls doc #1 §14

- A `Badge` list styled in a neutral `stone` "Planned" variant, visually distinct from the "Shipped" badges in the Feature Inventory grid above — reuse one consistent badge-variant system for both "Shipped" and "Planned" states across the whole page.

### Honest Gaps & Tradeoffs — pulls doc #1 §15

- Use the exact same callout treatment established in the Data Model & Authorization section above (amber-bordered `Card`, or a shadcn `alert` if that gets added) — one item per gap, each short and specific, not buried in a wall of text. This section should be easy to visually locate, since it's the section most likely to earn credibility with a technical reviewer.

### Build Timeline & Velocity — pulls doc #1 §16

- A vertical timeline assembled from stacked `Card`s connected by `Separator` — no dedicated timeline primitive exists in `components/ui/`, so this is composed from existing primitives, not a new dependency. Cross-repo: interleave backend migration milestones and frontend commit milestones on one shared timeline.

### By-The-Numbers Stat Strip — pulls doc #1 §17

- A horizontal row of stat tiles (same `Card` + `font-mono` numeral pattern as the Engineering Process section). Recommend placing this **near the top of the page** (e.g., directly under the Hero) since recruiters skim — but the implementer can move it to a closing summary if the final page reads better that way.

### Footer / Contact CTA — not sourced from doc #1

- Links to both repos (`upravnik-platform`, `upravnik-platform-frontend`).
- **Needs a separate content stub not present in doc #1 at all:** the candidate's own contact info, resume link, and/or LinkedIn/GitHub profile links. Doc #1 is intentionally scoped to the project only, not the candidate — don't go looking for this in doc #1; it must be supplied directly when building this section.

---

## Placeholder-Asset Checklist

- [ ] Hero screenshot or mockup of the running app.
- [ ] Super-admin bulk-provisioning wizard screenshots or short screen-recording/GIF (all 3 steps + the live ASCII tree preview).
- [ ] Optional: an ERD/domain-hierarchy diagram image (the page works fine with the styled nested-list fallback if this never gets made).
- [ ] Optional: a ticket-system screenshot showing unread badges/notification UI.
- [ ] Candidate's own contact/resume/GitHub links for the footer CTA — not derivable from doc #1.

## Note on Missing Primitives

`components/ui/` has no accordion, tabs, alert, or chart/timeline component today. This spec deliberately avoids requiring any new shadcn install by composing `Card` / `Badge` / `Separator` / `Dialog` / `Skeleton` instead. The one place a dedicated primitive would genuinely improve semantics is the honesty-callout treatment (Data Model & Authorization section, Honest Gaps & Tradeoffs section) — adding a shadcn `alert` component there is a reasonable, low-risk one-off addition if preferred over the hand-rolled `Card` variant described above.
