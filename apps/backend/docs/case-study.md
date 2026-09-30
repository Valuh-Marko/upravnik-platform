# Upravnik Platform — Case Study Brief

> A living document. This is the single source of truth for the recruiter-facing case study covering both the backend (`upravnik-platform`) and frontend (`upravnik-platform-frontend`) repositories. It is written so a different AI agent — with zero prior context on this project — can build or update the case-study showcase page from this document alone, without needing to ask clarifying questions.

---

## 1. Document Purpose & Update Contract

**Audience & tone.** This document is written for **recruiters and hiring managers** evaluating engineering ability, not for prospective clients. Every section should read like an honest senior-engineer walkthrough: what was built, what tradeoffs were made and why, what's deliberately deferred, and what's a genuine gap. Never adopt a sales/marketing voice ("book a demo," "revolutionize your building"). The goal is to demonstrate judgment, not to sell a product.

**This document produces a companion build spec.** The actionable page-implementation plan lives at `C:\My Web Projects\upravnik-platform-frontend\docs\case-study-page-spec.md` ("doc #2"). Doc #2's sections are numbered to mirror this document's sections 2–17 **1:1**.

**Update contract — follow this whenever a fact in this document changes** (a new feature ships, a gap closes, scope changes, a new metric is available):

1. **Update here first.** This document is the source of truth; never edit the showcase page's copy directly without reflecting the change here.
2. **Propagate mechanically.** After updating a section here, re-open doc #2, find the section with the matching number/heading, and refresh only the copy/data it references — do not change doc #2's component structure unless the change genuinely requires a new visual section (e.g., an entirely new flagship feature).
3. **Don't erase growth — relocate it.** When a gap listed in §15 (Honest Gaps & Tradeoffs) gets resolved (e.g., `RolesGuard` becomes consistently wired, a test suite ships, chat goes live), do not simply delete the callout. Move it into the relevant feature section as a short "this used to be a known gap — here's how it was resolved" note. The growth story is part of the value.
4. **Never fabricate.** If you need a fact to complete an update and can't find it, write `[NEEDS VERIFICATION: <what's missing>]` inline rather than guessing. A wrong number is worse than a visible placeholder.

---

## 2. Elevator Pitch

Upravnik Platform is a full-stack, role-based property-management system for residential buildings in Serbia. It digitizes the relationship between building managers ("upravnik"), elected board members, and residents — replacing informal WhatsApp groups and paper notices with a structured, closed, multi-tenant platform for announcements, community forums, private support tickets, real-time chat, and document sharing. It's a solo-built project spanning a NestJS/Prisma/PostgreSQL API and a Next.js/React frontend, designed and built end-to-end — data model, authorization, business logic, and UI — by one engineer.

---

## 3. Project Snapshot / Metadata

| | Backend | Frontend |
|---|---|---|
| Repo | `upravnik-platform` | `upravnik-platform-frontend` |
| Stack | NestJS 11, Prisma 7, PostgreSQL 16 | Next.js 16 (canary), React 19, TypeScript |
| Commits | 5 (but 3 more schema migrations exist beyond the last commit — see §16) | 4 |
| Status | Actively developed, pre-1.0 | Actively developed, pre-1.0 |

- **Domain model:** 17 Prisma models, 10 enums, 6 migrations.
- **API surface:** 46 HTTP endpoints across 13 feature modules, plus a Socket.IO chat gateway.
- **API contract discipline:** a 1,210-line Postman collection kept in lockstep with every endpoint change (see §8).
- This is a **solo-developer project**: one person designed the domain model, wrote the authorization logic, built the API, and built the entire frontend — a useful frame for evaluating scope and velocity, not a team output.

---

## 4. The Problem & Product Story

Residential buildings in Serbia — especially larger complexes made up of multiple connected blocks ("lamele") — are typically managed informally: a building manager (upravnik) posts notices on a physical board, residents complain via a WhatsApp group, and there's no durable record of who asked for what or when a maintenance issue was actually resolved.

Upravnik Platform models this world as a strict hierarchy:

```
Platform → Complex (optional) → Building → Unit → Account
```

- A **Complex** is an optional grouping of buildings that share something (a courtyard, a parking structure, a shared boiler room) — not every building belongs to one.
- A **Building** always belongs to at most one Complex, and owns its own units, announcements, documents, forum threads, tickets, and chat.
- A **Unit** (apartment, office, or commercial space) belongs to exactly one Building and can be linked to **at most one account** — enforced at the database level, not just in application logic.
- **Accounts are never self-registered.** There is no public sign-up flow. An UPRAVNIK provisions every resident account and hands out the generated credentials. This is a deliberate design choice reflecting the real-world process: a building manager already knows who lives where, and a closed system avoids the trust and verification problems a public registration flow would introduce.

This closed, hierarchical model is the foundation everything else in the system builds on — every authorization decision in the backend ultimately traces back to "which Building(s) is this user a member of, and with what role."

---

## 5. System Architecture Overview

**Backend:** NestJS 11 + Prisma 7 (using the newer driver-adapter pattern — `@prisma/adapter-pg` wired manually against `pg`, not the legacy connection-string-only client) + PostgreSQL 16 (Dockerized) + JWT auth via `passport-jwt` + a Socket.IO gateway for building-scoped chat + full Swagger documentation at `/api/docs` + a global `ValidationPipe` with `whitelist`/`forbidNonWhitelisted` rejecting any request field not explicitly declared on a DTO.

**Frontend:** Next.js 16 (canary) + React 19 + TypeScript (strict mode) using the App Router with route groups, TanStack React Query v5 as the sole server-state layer, a hand-written Axios client, and shadcn/ui on top of Tailwind CSS v4's CSS-first theming.

Worth calling out directly: **building on Next.js 16 canary and React 19 was a deliberate choice**, not an accident of "npm create latest." It signals comfort working against an unstable, still-shifting API surface rather than waiting for a fully stabilized LTS release — a real tradeoff (occasional breaking changes, thinner community documentation) taken in exchange for the newest App Router and React Server Component capabilities.

**Domain layering (backend schema, organized deliberately by the author into six explicit layers):**

1. **Identity** — `User`: a single table for every human in the system regardless of type (admin, upravnik, board member, resident).
2. **Structure** — `Complex`, `Building`, `Unit`: the physical hierarchy described in §4.
3. **Membership** — `BuildingMember`: the RBAC join table binding a `User` to a `Building` with a `Role`, enforced to one role per building per user via a composite unique constraint.
4. **Content** — `Announcement`, `Document`: building-scoped, low-interaction content.
5. **Interaction** — `Thread`/`ThreadReply` (public forum), `Ticket`/`TicketReply`/`TicketRead` (private support tickets), `ComplexThread`/`ComplexThreadReply` (cross-building forum), `ChatMessage`: everything with back-and-forth conversation.
6. **System** — `AuditLog`, `Notification`: cross-cutting system concerns.

---

## 6. Backend Deep-Dive: Data Model & Authorization

**Roles and account types.** Two orthogonal concepts: `AccountType` (`SYSTEM_USER` for staff, `UNIT_ACCOUNT` for residents tied to a specific unit) and `Role` (`UPRAVNIK`, `BOARD_MEMBER`, `RESIDENT` — building-scoped) plus a separate platform-level `SystemRole` (`SUPER_ADMIN`, orthogonal to building roles). A `BuildingMember` row is the join between a `User` and a `Building`, carrying the `Role`; a database-level unique constraint on `(buildingId, userId)` guarantees a user can hold exactly one role per building.

**Authorization is deny-by-default.** Every HTTP handler declares exactly one access policy — `@Public()`, `@AnyUser()`, `@SuperAdmin()`, `@InBuilding(...roles)` or `@InComplex(...roles)` — and two global guards enforce it: `JwtAuthGuard` (token + reload of the user, so disabled accounts and tokens issued before a password reset get `401`) and `AccessGuard` (resolves the caller's role for the route's building or complex and attaches it to the request). A startup check refuses to boot the app if any handler has no policy, or if a building/complex-scoped route lacks the `:buildingId`/`:complexId` param the guard reads. A single `AccessService` is the only code that turns a user plus a building or complex into a role, and both HTTP and the WebSocket chat use it. Row-level rules that a role check can't express — a resident sees only *their own* tickets, the author or staff may close a thread, nobody may reply to a CLOSED item — live as plain functions in one `policies.ts` file. A global exception filter maps Prisma not-found/conflict errors to `404`/`409` instead of `500`. Full description: `docs/authorization-overview.md`.

**How it got here — the evolution is worth explaining rather than hiding.** Authorization originally grew in three layers: a `SystemAdminGuard` for platform operations, a `RolesGuard` + `@Roles(...)` decorator for building roles, and inline service-level checks (four near-duplicate "what is the caller's role here" helpers) in the modules that needed ownership rules. *This used to be a known gap:* guards were attached per controller, several `@Roles(...)` annotations were for a while inert metadata without the guard behind them, and two endpoints (ticket creation, unit-account password reset) ended up missing checks entirely. Rather than patching each endpoint, the default was inverted — a route is now denied unless it declares who may call it — and the whole change is backed by an authorization e2e suite (actor × endpoint matrix, ticket privacy, password-reset scope, deactivation, login throttling, WebSocket auth). The plan and its findings are kept in `docs/authorization-hardening-plan.md`.

**The most interesting single authorization computation in the codebase** is complex-level access (`AccessService.resolveComplexRole`): since a Complex spans multiple Buildings, and a user might be a `RESIDENT` in one building of the complex but a `BOARD_MEMBER` in another, the caller's role in the complex is their *highest* active role across every building they belong to within it (precedence `UPRAVNIK > BOARD_MEMBER > RESIDENT`), and the request is refused with `403` only if the caller has no active membership in any building of the complex at all.

---

## 7. Backend Deep-Dive: Most Sophisticated Business Logic

**Ticket read-tracking and notification fan-out** (`tickets/tickets.service.ts`) is the densest business logic in the codebase:

- Viewing a ticket automatically upserts a `TicketRead` row (composite primary key `[ticketId, userId]`) with the current timestamp; replying marks it read for the replier. "Unread" is computed cheaply by comparing the ticket's `updatedAt` against the caller's `lastReadAt` — no separate read-state machine, just a timestamp comparison, which is a deliberately lightweight way to back an unread-badge UI feature.
- Every ticket event triggers a notification fan-out: creating a ticket notifies all active staff (`UPRAVNIK`/`BOARD_MEMBER`) in the building; a resident's reply re-notifies staff; a staff reply notifies only the original ticket author. This is the one concrete place in the codebase where a domain event automatically produces a notification — the `notifications` module itself is otherwise a thin CRUD layer with no triggers of its own.
- Notification copy is written directly in Serbian (`'Nov tiket otvoren'`, `'Odgovor na vaš tiket'`) — the localization isn't just a translation layer bolted on later, it's baked into the service logic from the start, matching the product's actual Serbian-market audience.

**Transactional bulk-provisioning** (`setup/setup.service.ts`, `POST /setup/bulk`) wraps an entire "create a complex, then N buildings, then each building's units" operation inside a single `prisma.$transaction`, guaranteeing all-or-nothing atomicity for what would otherwise be a failure-prone multi-step admin operation. This endpoint exists specifically to back a frontend super-admin bulk-creation wizard (see §10) — a good example of backend and frontend being designed together as one feature rather than the API trailing the UI.

---

## 8. Backend Deep-Dive: Engineering Process & Discipline

**API-contract discipline.** Every endpoint addition or change is mirrored in a 1,210-line Postman collection (`postman/upravnik-platform.postman_collection.json`) containing full request/response examples, role requirements, and error cases — enforced by a documented internal convention in `CLAUDE.md` ("Skill: Endpoint Sync") that requires the collection be updated as part of any endpoint change, written explicitly so "a frontend agent can implement the full integration without asking questions." A running `postman/CHANGES.md` changelog captures every API-shape change chronologically (e.g., a `PATCH .../announcements/:id` replacing older dedicated pin/unpin endpoints, the addition of cross-building "my X" feeds, the full ticket-system rollout, the complex-forum rollout). This changelog is itself a readable narrative of the API's evolution.

**Design docs as first-class artifacts.** `upravnik-platform.md` is a self-maintained living document covering the project's mission, the account/role model, an ERD in prose, a layered request-flow diagram (Auth Guard → Role Guard → Controller → Service → DB → Notifications → Response), and an explicit build-order roadmap. `docs/fe-bulk-create.md` is a complete backend-to-frontend handoff spec for the bulk-provisioning wizard (page layout, CSV schema, state machine, API contract) — evidence that handoff documentation is treated as a real deliverable, not an afterthought.

**The real build order (from migration timestamps, not commit messages — see §16):** initial schema → `SUPER_ADMIN` split out as a platform-level role distinct from building roles → operational metadata (`Unit.residentCount`) → private ticket system → ticket read-receipts → cross-building complex forum. This is a coherent progression: establish the rigid multi-tenant/RBAC foundation first, then layer increasingly product-driven features on top.

---

## 9. Frontend Deep-Dive: Application Architecture

The frontend is split into role-gated experiences using Next.js App Router **route groups** — `(auth)`, `(resident)`, `(upravnik)`, `(super-admin)` — each wrapped (except `(auth)`) by an `AuthGuard` component that accepts `requiredAccountType`/`requiredRoles` props and redirects on mismatch, and by a shared `AppShell` that adapts its navigation to the current user's role/account type. Role-based rendering goes well beyond the route level: nav items, action buttons (pin/unpin, close ticket), and badges are conditionally rendered throughout based on `role`/`accountType`, and a single route like `/tickets` renders an entirely different component tree (`UpravnikView` vs. `ResidentView`) purely based on who's logged in.

**Server-state approach:** TanStack React Query v5 is the only server-state layer (no Redux/Zustand). Data fetching is a hand-written, resource-by-resource pattern: one Axios wrapper module per backend resource (`lib/api/tickets.ts`, `lib/api/announcements.ts`, ...) and one matching React Query hook module per resource (`hooks/useTickets.ts`, ...), manually kept in sync against the backend's Postman collection rather than generated from an OpenAPI spec. This is a deliberate speed-over-safety tradeoff: faster to iterate early on, at the cost of manual drift risk between frontend types and the actual API shape as the backend evolves.

---

## 10. Frontend Deep-Dive: Standout Feature — Super-Admin Bulk Provisioning Wizard

The single most elaborate feature in the frontend, and the one that most clearly demonstrates backend/frontend co-design (it exists specifically to drive the transactional `POST /setup/bulk` endpoint from §7):

- A **3-step wizard** (Scope → Buildings → Review) with a visual step indicator, letting a super-admin choose between provisioning a single building, multiple standalone buildings, or a full Complex.
- Each building supports **two unit-entry modes**: auto-generate (floors × units-per-floor, with a choice of numbering pattern — `floor-unit` like "1-1, 1-2" vs. `sequential` like "101, 102" — and a default unit type), or fully manual entry.
- A **CSV import mode** with a custom parser that validates required columns, auto-detects whether the CSV describes a single building, multiple buildings, or a full complex, and surfaces row-level validation errors before submission is allowed.
- A **live ASCII-tree preview** component, rendered in monospace with tree connectors (`├──`/`└──`), reflecting the in-progress form state in real time as complex → buildings → units, collapsing to "…and N more units" beyond the first several.
- The entire structure is submitted as one call to the transactional bulk-create endpoint, then the admin is redirected straight into the newly created building list.

---

## 11. Frontend Deep-Dive: Fully Implemented Feature Inventory

- **JWT authentication** with route guards and role/account-type-aware redirects.
- **Merged activity feed** (`/home`) — client-side merge of announcements and forum threads into one chronologically sorted feed, with pinned items pulled into a separate section.
- **Announcements** with pin/unpin (staff-only), pinned-first ordering throughout.
- **Nested forum threads** — both per-building and, for buildings that belong to a Complex, a cross-building "complex forum" with author attribution showing which specific building/unit the poster belongs to. Complex-forum replies use an optimistic cache update (`queryClient.setQueryData`) rather than waiting for a refetch, for instant feedback.
- **Private ticketing system** — full create/list/detail/reply/close flow for both residents and staff, with unread-state badges surfaced in the sidebar, mobile nav, and ticket rows.
- **Unit/resident directory** — a per-building grid of units showing occupancy status, and a unit-detail page showing that unit's own threads and tickets.

---

## 12. Frontend Deep-Dive: Design System

The UI runs on shadcn/ui (the "base-vega" style) over Tailwind CSS v4's CSS-first `@theme` configuration — but the actual color system is custom, not the shadcn default: a "pine" (teal, brand) ramp and a "stone" (warm neutral) ramp, each with 11–13 OKLCH-defined steps, plus amber/sky/violet/green/red accent ramps used for a consistent content-type and category coding system across the app (pine = board/announcements, amber = forum, sky = chat, violet = docs). Typography is Hanken Grotesk for UI text and JetBrains Mono for numeric/timestamp data (unit numbers, dates, counts) — a small but deliberate detail that gives tabular data a distinct visual register from prose. This is a genuinely custom design system built for this product, not an out-of-the-box theme.

---

## 13. Engineering War Story

During the feature push that shipped the ticket system, category-color coding, and the super-admin wizard in one dense commit (see §16), a real bug surfaced in the building-navigation sidebar: the expand/collapse state for the currently active building was resetting on every re-render, making it impossible to manually toggle between buildings in the sidebar tree. The fix tracked the previously-active building ID in local state and only reset the expand/collapse state when that ID actually changed — a small, concrete example of diagnosing a re-render-driven state bug and fixing it with a targeted "previous value" tracking pattern rather than a broader rewrite.

---

## 14. Scope, Sequencing & Deliberate Deferrals

Several features are clearly labeled "under construction" in the UI rather than faked or silently missing — a sign of deliberate sequencing, not incomplete awareness of the gap:

- **Real-time chat.** The backend has a fully working Socket.IO gateway (JWT-authenticated on connect, room-per-building, persists and broadcasts messages), but the frontend has no chat UI and no websocket client dependency installed at all — the page renders a plain "coming soon" placeholder. This reflects a conscious choice to ship the support-ticket and admin-provisioning systems first and defer real-time messaging.
- **Document management** beyond a metadata list — no upload UI, no inline preview; the current documents page is a simple external-link list.
- **Upravnik dashboard widgets** (pinned content, personal to-dos, sticky notes, activity feed) — currently a labeled roadmap card list rather than live functionality.
- **Settings and cross-building "members" aggregate view** — placeholders, not yet built.

---

## 15. Honest Gaps & Tradeoffs

These are presented the way an honest reviewer would present them — not softened into "deliberate sequencing" language, because they're genuinely open items rather than features simply not yet started:

- **`AuditLog` is schema-only.** The model is fully migrated (`entityType`, `entityId`, `action`, `performedBy`, JSON `snapshot`) but no service in the codebase currently writes to it — a deliberate "System layer" placeholder per the project's own build-order roadmap, not yet implemented.
- **Minimal automated test coverage outside authorization.** The backend now has an authorization e2e suite against a dedicated test database, plus unit tests for the access layer (see §6), but business logic beyond access control has no tests yet, and the frontend has no test framework configured at all. Framed honestly: auth and RBAC are covered, broader coverage is a next milestone, not a claimed feature.
- **Chat history has no REST endpoint.** `ChatService.getHistory()` exists and works, but nothing exposes it over HTTP — a resident refreshing a (hypothetical) chat page would have no way to fetch prior messages yet.
- **The frontend's own living design doc lags shipped code.** `upravnik-frontend.md` doesn't mention the ticket system, the super-admin wizard, or the complex forum, even though all three are fully implemented — a real, self-aware example of documentation drift, and part of the reason this case-study document exists as a fresher, more accurate summary.

---

## 16. Build Timeline & Velocity Narrative

**Backend** — 5 git commits, but the Prisma migration timeline reveals more granular, more recent work than the commit log alone shows:

| Migration | Milestone |
|---|---|
| `init` | Core schema: users, complexes, buildings, units, membership, announcements, documents, threads, chat, audit logs, notifications |
| `add-system-role-to-user` | `SUPER_ADMIN` split out as a platform-level role distinct from building roles |
| `add-resident-count-to-unit` | Operational metadata addition |
| `add_tickets` | Private ticket system (matches the last git commit) |
| `add_ticket_reads` | Unread-badge read-tracking — postdates the last commit |
| `add_complex_threads` | Cross-building complex forum — postdates the last commit |

**Frontend** — 4 git commits, compressed into essentially two working sessions:

1. Raw `create-next-app` scaffold.
2. One large "scaffold full-stack frontend" commit laying down nearly the entire app in one pass: all three role-gated route groups, the core pages (many as placeholders), the full component library, and the Axios/React Query data layer.
3. Five days later, one dense commit — **63 files changed, +3,597/−716 lines** — that shipped the entire private ticket system end-to-end, introduced the category-color-coding system, fixed the sidebar re-render bug (§13), added the mobile account sheet, and built the entire super-admin bulk-provisioning wizard including CSV import and live tree preview.

---

## 17. Metrics / By-The-Numbers Appendix

| Metric | Value |
|---|---|
| Prisma models | 17 |
| Prisma enums | 10 |
| Database migrations | 6 |
| HTTP endpoints | 46 |
| Feature modules (backend `src/`) | 13, plus a Socket.IO gateway |
| Postman collection size | 1,210 lines |
| Role-gated frontend route groups | 3 (`resident`, `upravnik`, `super-admin`) + 1 public (`auth`) |
| Roles | 4 (`SUPER_ADMIN`, `UPRAVNIK`, `BOARD_MEMBER`, `RESIDENT`) |
| Largest single commit | 63 files changed, +3,597/−716 lines (frontend, ticket system + wizard) |
| Backend commits | 5 |
| Frontend commits | 4 |

---

## 18. Terminology Glossary

- **Upravnik** — Serbian for "building manager" / property manager; the staff role that administers a building day-to-day.
- **Complex** ("kompleks") — an optional grouping of multiple buildings that share physical infrastructure (parking, courtyard, boiler room).
- **Lamela** — colloquial Serbian term for one block/wing of a larger residential complex; used in seed data to name individual buildings within a complex (e.g., "Lamela 1").
- **Unit** — an individual apartment, office, or commercial space within a building; the atomic thing an account can be linked to.
- **BuildingMember** — the database join record binding a user to a specific building with a specific role; the backbone of the RBAC model.
- **SYSTEM_USER vs. UNIT_ACCOUNT** — the two account types: `SYSTEM_USER` is staff (upravnik, board member, or super admin) not tied to a specific unit; `UNIT_ACCOUNT` is a resident account tied to exactly one unit.
