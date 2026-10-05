# Upravnik Platform — Case Study Brief

> A living document. This is the single source of truth for the recruiter-facing case study of the `upravnik-platform` Nx monorepo (`apps/backend` + `apps/frontend`). It is written so a different AI agent — with zero prior context on this project — can build or update the case-study showcase page from this document alone, without needing to ask clarifying questions.
>
> Last refreshed: 2026-10-05 (after Finance phases 1–4, PR #2).

---

## 1. Document Purpose & Update Contract

**Audience & tone.** This document is written for **recruiters and hiring managers** evaluating engineering ability, not for prospective clients. Every section should read like an honest senior-engineer walkthrough: what was built, what tradeoffs were made and why, what's deliberately deferred, and what's a genuine gap. Never adopt a sales/marketing voice ("book a demo," "revolutionize your building"). The goal is to demonstrate judgment, not to sell a product. No real customers, users, deployments or usage numbers exist — never imply any.

**This document produces a companion build spec.** The actionable page-implementation plan lives at `apps/frontend/docs/case-study-page-spec.md` ("doc #2"). Doc #2's sections are numbered to mirror this document's sections 2–17 **1:1**.

**Update contract — follow this whenever a fact in this document changes** (a new feature ships, a gap closes, scope changes, a new metric is available):

1. **Update here first.** This document is the source of truth; never edit the showcase page's copy directly without reflecting the change here.
2. **Propagate mechanically.** After updating a section here, re-open doc #2, find the section with the matching number/heading, and refresh only the copy/data it references — do not change doc #2's component structure unless the change genuinely requires a new visual section (e.g., an entirely new flagship feature).
3. **Don't erase growth — relocate it.** When a gap listed in §15 (Honest Gaps & Tradeoffs) gets resolved, do not simply delete the callout. Move it into the relevant feature section as a short "this used to be a known gap — here's how it was resolved" note. The growth story is part of the value.
4. **Never fabricate.** If you need a fact to complete an update and can't find it, write `[NEEDS VERIFICATION: <what's missing>]` inline rather than guessing. A wrong number is worse than a visible placeholder.

---

## 2. Elevator Pitch

Upravnik Platform is a full-stack, role-based property-management system for residential buildings in Serbia. It digitizes the relationship between building managers ("upravnik"), elected board members, and residents — replacing informal WhatsApp groups, paper notices and spreadsheet bookkeeping with a closed, building-scoped, multi-tenant platform for announcements, forums, private support tickets, real-time chat and, since October 2026, the building's money: a transparent ledger, monthly charges, bank-statement import and published financial reports grounded in Serbian housing law. It is a solo-built Nx monorepo — a NestJS/Prisma/PostgreSQL API and a Next.js/React frontend — designed and built end-to-end by one engineer.

---

## 3. Project Snapshot / Metadata

| | Backend (`apps/backend`) | Frontend (`apps/frontend`) |
|---|---|---|
| Stack | NestJS 11, Prisma 7, PostgreSQL 16, Socket.IO | Next.js 16, React 19, TypeScript, TanStack Query v5, Tailwind v4 |
| Repo | One Nx 23 monorepo (npm workspaces); both apps' histories merged in on 2026-09-30 | |
| Commits | 13 (2026-07-08 → 2026-10-05) | |
| Status | Actively developed, pre-1.0 | Actively developed, pre-1.0 |

- **Domain model:** 32 Prisma models, 16 enums, 11 migrations.
- **API surface:** 91 HTTP endpoints across 17 controllers (42 of them in finance), plus 2 Socket.IO event handlers for chat.
- **Tests:** 194 automated test cases in 18 files — 53 backend unit, 132 backend e2e against a real PostgreSQL test database, 9 frontend (`node --test`).
- **API contract discipline:** a 4,112-line Postman collection kept in lockstep with every endpoint change (see §8).
- This is a **solo-developer project**: one person designed the domain model, wrote the authorization logic, built the API, the finance module and the entire frontend — a useful frame for evaluating scope and velocity, not a team output.

---

## 4. The Problem & Product Story

Residential buildings in Serbia — especially larger complexes made up of multiple connected blocks ("lamele") — are typically managed informally: a building manager (upravnik) posts notices on a physical board, residents complain via a WhatsApp group, the money lives in a spreadsheet nobody else sees, and there's no durable record of who asked for what or when a maintenance issue was actually resolved. The *Zakon o stanovanju i održavanju zgrada* nevertheless gives every owner the right to see the building's account balance and its changes (čl. 65) and obliges the upravnik to keep income/expense records and report on them (čl. 50, 53).

Upravnik Platform models this world as a strict hierarchy:

```
Platform → Complex (optional) → Building → Unit → Account
```

- A **Complex** is an optional grouping of buildings that share something (a courtyard, a parking structure, a shared boiler room) — not every building belongs to one.
- A **Building** belongs to at most one Complex, and owns its own units, announcements, documents, forum threads, tickets, chat and finances.
- A **Unit** (apartment, office, or commercial space) belongs to exactly one Building and can be linked to **at most one account** — enforced at the database level. Unit numbers are unique per building (`@@unique([buildingId, unitNumber])`).
- **Accounts are never self-registered.** There is no public sign-up flow. An UPRAVNIK provisions every resident account and hands out the generated credentials. A building manager already knows who lives where, and a closed system avoids the trust and verification problems a public registration flow would introduce.

This closed, hierarchical model is the foundation everything else builds on — every authorization decision ultimately traces back to "which Building(s) is this user a member of, and with what role."

---

## 5. System Architecture Overview

**Monorepo:** Nx 23 over npm workspaces, `apps/backend` + `apps/frontend`. CI runs `nx affected -t lint test build`. A `packages/` directory exists for shared code but is still empty (see §15).

**Backend:** NestJS 11 + Prisma 7 (driver-adapter pattern — `@prisma/adapter-pg` wired manually against `pg`) + PostgreSQL 16 (Dockerized) + JWT auth via `passport-jwt` + a Socket.IO gateway for building-scoped chat + Swagger at `/api/docs` + a global `ValidationPipe` with `whitelist`/`forbidNonWhitelisted`. Environment variables are validated at boot. Files go to S3-compatible storage through the AWS SDK (RustFS in docker-compose for local development).

**Frontend:** Next.js 16 + React 19 + TypeScript (strict) using the App Router with route groups, TanStack React Query v5 as the sole server-state layer, a hand-written Axios client, and shadcn/ui on top of Tailwind CSS v4's CSS-first theming. The project started on a Next.js 16 canary; it now runs on a stable 16.2 release.

**Domain layering (backend schema, organized into explicit layers):**

1. **Identity** — `User`: a single table for every human in the system.
2. **Structure** — `Complex`, `Building`, `Unit`.
3. **Membership** — `BuildingMember`: the RBAC join table binding a `User` to a `Building` with a `Role`.
4. **Content** — `Announcement`, `Document`.
5. **Interaction** — `Thread`/`ThreadReply`, `Ticket`/`TicketReply`/`TicketRead`, `ComplexThread`/`ComplexThreadReply`, `ChatMessage`.
6. **Finance** — 15 models added in October 2026: the finance entity and its bank accounts, categories and suppliers, an immutable transaction ledger, invoices, fee rules and unit charges, bank-statement imports and their lines, budgets, and stored files. [NEEDS VERIFICATION: exact model names if the page lists them individually]
7. **System** — `AuditLog`, `Notification`: cross-cutting concerns.

---

## 6. Backend Deep-Dive: Data Model & Authorization

**Roles and account types.** Two orthogonal concepts: `AccountType` (`SYSTEM_USER` for staff, `UNIT_ACCOUNT` for residents tied to a unit) and `Role` (`UPRAVNIK`, `BOARD_MEMBER`, `RESIDENT` — building-scoped) plus a separate platform-level `SystemRole` (`SUPER_ADMIN`). A database-level unique constraint on `(buildingId, userId)` guarantees one role per building per user.

**Authorization is deny-by-default.** Every HTTP handler declares exactly one access policy — `@Public()`, `@AnyUser()`, `@SuperAdmin()`, `@InBuilding(...roles)` or `@InComplex(...roles)` — and two global guards enforce it: `JwtAuthGuard` (token + reload of the user, so disabled accounts and tokens issued before a password change get `401`, via `passwordChangedAt`) and `AccessGuard` (resolves the caller's role for the route's building or complex). A startup check refuses to boot the app if any handler has no policy, or if a scoped route lacks the `:buildingId`/`:complexId` param the guard reads. A single `AccessService` is the only code that turns a user plus a building or complex into a role, and both HTTP and the WebSocket chat use it. Row-level rules a role check can't express — a resident sees only their own tickets, nobody replies to a CLOSED item — live as plain functions in one `policies.ts`. Login is throttled. A global exception filter maps Prisma not-found/conflict errors to `404`/`409`. Full description: `docs/authorization-overview.md`.

**How it got here — this used to be a known gap.** Authorization originally grew in three layers: a `SystemAdminGuard`, a `RolesGuard` + `@Roles(...)` decorator, and inline service-level checks (four near-duplicate "what is the caller's role here" helpers). Guards were attached per controller, several `@Roles(...)` annotations were for a while inert metadata without the guard behind them, and an audit (`docs/authorization-hardening-plan.md`) found real holes: an upravnik could reset the password of a member of *another* building (S1), a ticket could be opened in a building the caller didn't belong to (S2), generated passwords used `Math.random` (S4), and the JWT secret had a hard-coded fallback (S5). Rather than patching endpoints one by one, the default was inverted — a route is now denied unless it declares who may call it — and every finding got a regression test. The change is backed by a 35-case actor × endpoint e2e matrix plus suites for accounts, chat and setup.

**The most interesting single authorization computation** is complex-level access (`AccessService.resolveComplexRole`): a user might be a `RESIDENT` in one building of a complex and a `BOARD_MEMBER` in another, so the caller's complex role is their *highest* active role across every building they belong to within it (`UPRAVNIK > BOARD_MEMBER > RESIDENT`); `403` only if they have no active membership anywhere in the complex.

---

## 7. Backend Deep-Dive: Most Sophisticated Business Logic

The densest business logic now lives in the finance module — see §13 for the full walkthrough (immutable ledger with storno reversals, idempotent monthly charges under an advisory lock, bank-statement import with deduplication and auto-matching, and period locking by published reports).

**Ticket read-tracking and notification fan-out** (`tickets/tickets.service.ts`):

- Viewing a ticket upserts a `TicketRead` row (composite key `[ticketId, userId]`); replying marks it read for the replier. "Unread" is a timestamp comparison of the ticket's `updatedAt` against the caller's `lastReadAt` — no separate read-state machine.
- Every ticket event fans out notifications: a new ticket notifies all active staff in the building; a resident's reply re-notifies staff; a staff reply notifies only the author. Finance adds its own domain events (charge issued, payment recorded, report published). [NEEDS VERIFICATION: which finance notifications shipped in phases 1–4]
- Notification copy is written directly in Serbian (`'Nov tiket otvoren'`, `'Odgovor na vaš tiket'`) — localization baked into the service logic from the start.

**Transactional bulk-provisioning** (`setup/setup.service.ts`, `POST /setup/bulk`) wraps "create a complex, then N buildings, then each building's units" inside a single `prisma.$transaction` — all-or-nothing — capped at 1,000 units per request. It exists to back the super-admin wizard (see §10).

---

## 8. Backend Deep-Dive: Engineering Process & Discipline

**API-contract discipline.** Every endpoint addition or change is mirrored in a 4,112-line Postman collection (`postman/upravnik-platform.postman_collection.json`) with request/response examples, role requirements and error cases, enforced by a documented convention in `CLAUDE.md` ("Skill: Endpoint Sync") so "a frontend agent can implement the full integration without asking questions." A running `postman/CHANGES.md` changelog captures every API-shape change chronologically and reads as a narrative of the API's evolution.

**Plans before code, critique after.** Large changes start as written plans in the repo — `docs/monorepo-migration-plan.md`, `apps/backend/docs/authorization-hardening-plan.md`, `docs/finance-module-plan.md` (domain rules, a decision table confirmed with the product owner, phased schema and endpoints, tests and verification per phase). After the finance build, the finance tab went through an automated design critique (scored 16/40, then 28/40 after fixes) that produced a 54-item fix plan (`docs/finance-tab-fix-plan.md`, F-01…F-54) — including small but real bugs like a validation regex missing a backslash (F-01).

**Tests.** 194 cases: 53 backend unit tests (access service, policies, env validation, charge maths, finance utilities, CSV parsing, password generation), 132 e2e tests against a dedicated PostgreSQL database (access matrix 35, accounts 9, chat 7, setup 5, finance 30, charges 19, imports 12, reports 15), and 9 frontend tests using Node's built-in runner.

*This used to be a known gap:* until September 2026 the project had no automated tests at all. The authorization rewrite shipped with its e2e suite, and every finance phase shipped with its own.

**The real build order (from migration timestamps — see §16):** initial schema → `SUPER_ADMIN` split out → `Unit.residentCount` → tickets → ticket reads → complex forum → `passwordChangedAt` → unique unit number per building → finance foundation → finance charges → finance import + reports.

---

## 9. Frontend Deep-Dive: Application Architecture

The frontend is split into role-gated experiences using Next.js App Router **route groups** — `(auth)`, `(resident)`, `(upravnik)`, `(super-admin)` — each (except `(auth)`) wrapped by an `AuthGuard` that accepts `requiredAccountType`/`requiredRoles` and redirects on mismatch, and by a shared `AppShell` that adapts its navigation to the current user. Role-based rendering goes beyond routes: nav items, actions and badges are conditional throughout, and a single route like `/tickets` renders a different component tree (`UpravnikView` vs. `ResidentView`) depending on who's logged in.

**Server-state approach:** TanStack React Query v5 is the only server-state layer. One Axios wrapper module per backend resource (`lib/api/*.ts`) and one matching hook module per resource (`hooks/use*.ts`), kept in sync with the Postman collection by hand rather than generated from OpenAPI — a deliberate speed-over-safety tradeoff (see §15).

**Money on the client.** Amounts arrive as decimal strings and are never parsed into JS floats: the frontend does its arithmetic in integer paras with `BigInt`, and `parseMoneyInput` accepts the way people actually type amounts in Serbia ("12.500,50").

---

## 10. Frontend Deep-Dive: Standout Feature — Super-Admin Bulk Provisioning Wizard

The feature that most clearly shows backend/frontend co-design (it drives the transactional `POST /setup/bulk` endpoint from §7):

- A **3-step wizard** — Vrsta (type) → Zgrade i jedinice (buildings and units) → Pregled (review) — for provisioning a single building, several standalone buildings, or a full Complex.
- A **FloorEditor** for each building: units are laid out floor by floor and edited in place, with a generator (floors × units per floor, numbering pattern, default unit type) and a "Dupliraj" action to copy a building's layout to the next one. *This replaced an earlier live ASCII-tree preview,* which showed the structure but couldn't edit it.
- **CSV import** with a downloadable template that opens correctly in Serbian Excel (UTF-8 with BOM, semicolon-separated), a windows-1250 fallback when reading files saved by Excel, and row-level validation errors before submission.
- Duplicate unit numbers are caught in the form and, as a backstop, by the `@@unique([buildingId, unitNumber])` constraint; requests are capped at 1,000 units.
- The whole structure is submitted as one transactional call, then the admin lands in the new building list.

---

## 11. Frontend Deep-Dive: Fully Implemented Feature Inventory

- **JWT authentication** with route guards and role/account-type-aware redirects.
- **Merged activity feed** (`/home`) — announcements and forum threads in one chronological feed, pinned items pulled out.
- **Announcements** with pin/unpin (staff-only).
- **Forum threads** — per-building and a cross-building complex forum with author attribution; complex-forum replies use an optimistic cache update.
- **Private ticketing** — create/list/detail/reply/close for residents and staff, unread badges in the sidebar, mobile nav and rows, and category colours (maintenance, complaint, question, payment).
- **Unit/resident directory** — a per-building unit grid with occupancy, and a unit detail page.
- **Finansije (finance)** — per building: Pregled (overview: balances, budget vs actual, arrears), transactions and invoices with filters, monthly charges, bank-statement import review, budget and published reports; a resident's **Moj stan** view with their own unit ledger and an NBS **IPS QR code** to pay from any Serbian banking app.

---

## 12. Frontend Deep-Dive: Design System

The UI runs on shadcn/ui over Tailwind CSS v4's CSS-first `@theme`, with a custom colour system: a "pine" brand ramp (hue 185; brand = `oklch(52% 0.090 185)`) and a "stone" warm-neutral ramp (hue 75), each defined step by step in OKLCH, plus amber / sky / violet / green / red ramps for content types and status, and four ticket-category hues — moss (125), rose (5), indigo (270), plum (335). Every ramp has a tuned dark-mode counterpart rather than an inverted one. Typography is Hanken Grotesk for UI text and JetBrains Mono for numbers and timestamps (unit numbers, amounts, dates). Radii run from 6 to 28px. Finance deliberately has no colour of its own: it speaks through the status tokens (paid / partial / overdue / reversed), so money reads the same everywhere. Tokens live in `apps/frontend/app/globals.css`.

---

## 13. Backend + Frontend Deep-Dive: Finance (Finansije)

Built in October 2026 as phases 1–4 of `docs/finance-module-plan.md` (PR #2, about +20.5k lines; ~5.5k backend and ~5.9k frontend source lines, the rest tests, docs and Postman). Grounded in the *Zakon o stanovanju* (čl. 50 t.12–13, 53, 63–65): residents may see the account, the upravnik must keep records and report, and fees are split per unit (upkeep + management) and per m² (investment).

- **Immutable ledger.** Transactions are never edited or deleted; a correction is a storno entry linked by `reversesId` (unique, so a transaction can only be reversed once). Invoices are cancelled with a reason, not deleted, and their status (unpaid / partial / paid) is derived, not stored.
- **Money as decimals, end to end.** `Decimal(14,2)` in PostgreSQL, serialized as strings, summed in SQL or `Prisma.Decimal` — never JS floats. The frontend continues in integer paras (§9).
- **Monthly charges.** Fee rules per unit or per m² (with per-unit-type overrides) produce monthly charges. Upravniks can preview, generate and regenerate; a cron job runs at 06:00 on the 1st (Europe/Belgrade). Generation takes a `pg_advisory_xact_lock` per finance entity, so the scheduler and a manual click can't double-charge a building.
- **Bank-statement import.** CSV statements (UTF-8 or windows-1250) are parsed, deduplicated by a hash of the line plus its occurrence count (two identical payments on the same day stay two payments), auto-matched to units by *poziv na broj* (model 97 reference) and to suppliers by account number, reviewed by the upravnik, then committed all-or-nothing.
- **Budget and reports.** Budget vs actual per category; a server-side PDF report (pdfkit) that, once published, **locks the period** — any write dated inside it returns `409` (enforced at 10 call sites).
- **Audit and privacy.** Every finance write records an `AuditLog` row in the same database transaction (24 call sites). Residents see owner payments as "Uplata – stan 12"; payer names and accounts are visible only to staff.
- **Files.** Invoice and report PDFs go to S3-compatible storage; uploads are type-checked by magic bytes, not by extension, and served through 5-minute signed URLs.
- **Access.** Only the UPRAVNIK writes; board members read everything including raw bank data; residents see their own unit and building aggregates — all expressed in the same `@InBuilding(...)` policies as the rest of the API (§6).
- **Not built yet:** Phase 5 (complex-level roll-up), SEF e-invoice import, and an NBS XML statement parser.

*AuditLog used to be a known gap:* the model had been migrated since the first schema but nothing wrote to it. Finance is now its first writer.

---

## 14. Scope, Sequencing & Deliberate Deferrals

Features labelled "under construction" in the UI rather than faked:

- **Real-time chat UI.** The backend gateway is complete and hardened (JWT on connect, building membership checked through `AccessService`, 7 e2e tests), but the frontend still renders a "coming soon" placeholder. Tickets, provisioning and finance were deliberately shipped first.
- **General document upload.** File storage now exists, but only finance uses it; the documents page is still a list of links.
- **Upravnik dashboard widgets**, **settings** and the cross-building **members** view — placeholders.
- **Finance phase 5 and integrations** — complex roll-up, SEF, NBS XML (see §13).

---

## 15. Honest Gaps & Tradeoffs

- **The e2e suite doesn't run in CI.** CI runs `nx affected -t lint test build`; the 132 e2e tests need a PostgreSQL database and are run locally. [NEEDS VERIFICATION: if a CI database service is added, move this to §8 as resolved]
- **Frontend types are maintained by hand.** `packages/` exists in the monorepo but no shared contract package has been extracted yet, so the frontend's API types can drift from the backend's DTOs.
- **Chat history has no REST endpoint.** `ChatService.getHistory()` exists, but nothing exposes it over HTTP.
- **Frontend test coverage is thin.** 9 tests across `lib/format`, `lib/ips` and `lib/validation` (money formatting, the IPS QR payload, input validation); no component or end-to-end browser tests.

---

## 16. Build Timeline & Velocity Narrative

**13 commits, 2026-07-08 → 2026-10-05**, in four bursts:

1. **2026-07-08 — first version** (two separate repos then): the backend with the core schema, RBAC, tickets, forums and chat; the frontend scaffolded in one large commit with all role groups and the data layer.
2. **2026-09-30 — monorepo + trust.** Both repos merged into one Nx workspace with history preserved; the authorization rewrite to deny-by-default with its e2e suite (PR #1).
3. **2026-10-01 — product docs + provisioning.** Product and design documentation, shared UI components, the FloorEditor and CSV import in the super-admin wizard.
4. **2026-10-05 — finance.** Phases 1–4 in PR #2.

| Migration | Milestone |
|---|---|
| `init` | Core schema: users, complexes, buildings, units, membership, announcements, documents, threads, chat, audit logs, notifications |
| `add-system-role-to-user` | `SUPER_ADMIN` as a platform-level role |
| `add-resident-count-to-unit` | Operational metadata |
| `add_tickets` | Private ticket system |
| `add_ticket_reads` | Unread read-tracking |
| `add_complex_threads` | Cross-building complex forum |
| `add_password_changed_at` | Tokens invalidated on password change |
| `unique_unit_number_per_building` | Unit numbers unique per building |
| `finance_foundation` | Ledger, invoices, accounts, files, audit |
| `finance_charges` | Fee rules and monthly charges |
| `finance_import_reports` | Bank-statement import, budgets, reports |

---

## 17. Metrics / By-The-Numbers Appendix

| Metric | Value | Was (2026-07) |
|---|---|---|
| HTTP endpoints | 91 (17 controllers) + 2 Socket.IO handlers | 46 |
| Feature modules (backend) | 16 | 13 |
| Prisma models | 32 | 17 |
| Prisma enums | 16 | 10 |
| Database migrations | 11 | 6 |
| Automated tests | 194 (53 unit, 132 e2e, 9 frontend) | 0 |
| Postman collection size | 4,112 lines | 1,210 |
| Backend source (excl. tests) | ~9,000 lines | [NEEDS VERIFICATION] |
| Backend tests | ~3,100 lines | 0 |
| Frontend source | ~15,800 lines | [NEEDS VERIFICATION] |
| Largest single change | PR #2, Finance phases 1–4, ~+20.5k lines | 63 files, +3,597/−716 |
| Roles | 4 (`SUPER_ADMIN`, `UPRAVNIK`, `BOARD_MEMBER`, `RESIDENT`) | 4 |
| Commits | 13 | 2 + 4 (separate repos) |

---

## 18. Terminology Glossary

- **Upravnik** — Serbian for "building manager"; the staff role that administers a building day-to-day.
- **Complex** ("kompleks") — an optional grouping of buildings that share physical infrastructure.
- **Lamela** — one block/wing of a larger residential complex (e.g., "Lamela 1").
- **Unit** — an apartment, office, or commercial space; the atomic thing an account can be linked to.
- **BuildingMember** — the join record binding a user to a building with a role; the backbone of RBAC.
- **SYSTEM_USER vs. UNIT_ACCOUNT** — staff accounts vs. resident accounts tied to exactly one unit.
- **Stambena zajednica** — the homeowners' association; a legal entity with its own bank account, whose books the finance module keeps.
- **Storno** — a reversal entry that cancels a ledger transaction without editing or deleting it.
- **Poziv na broj** — the payment reference number on a Serbian bank transfer; "model 97" is the checksummed format used to match payments to units.
- **IPS QR** — the National Bank of Serbia's instant-payment QR standard, scannable by any Serbian banking app.
- **Zaduženje** — a monthly charge issued to a unit.
