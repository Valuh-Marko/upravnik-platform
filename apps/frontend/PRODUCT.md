# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two primary audiences, weighted equally. Each gets its own experience, tuned to its own device and job.

- **Residents** (`RESIDENT`, one `UNIT_ACCOUNT` per apartment, office or commercial unit) in a managed residential building or complex in Serbia. They mostly use a phone. The job is to keep up with the building: what did I miss, what did management announce, what are neighbours discussing, where is that document, and is my request being handled.
- **Upravnici** (`UPRAVNIK`, professional building managers) mostly use a desktop. The job is to run one or many buildings: post announcements, answer and close tickets and threads, manage unit accounts and reset passwords, and keep documents current.
- **Board members** (`BOARD_MEMBER`) extend the upravnik. They hold upravnik-like powers in their building, such as posting and pinning announcements and closing threads.
- **Super admin** (`SUPER_ADMIN`) is the platform operator. They onboard upravnici and provision complexes, buildings and units through the setup wizard.

## Product Purpose

Bring the whole experience of living in a managed building online, for Serbia. Each building gets a private digital space for announcements, a forum, a real-time chat, private tickets to management and a document library. The upravnik gets one place to run every building they manage.

Success looks like this: residents check the app to find out what is happening in their building, and stop relying on paper notices, stairwell boards and scattered phone calls. Upravnici handle requests and communication across all their buildings without losing track.

## Positioning

It is a closed, building-scoped, multi-tenant space, not an open social network or a generic helpdesk. Nobody self-registers. The upravnik creates the accounts and hands credentials to residents in person. The upravnik's view of a building mirrors the resident's view exactly, with admin controls added. Management and residents therefore look at the same space.

## Operating Context

- Hierarchy: Platform → Complex (optional grouping) → Building → Unit → one account per unit.
- Onboarding happens offline. The system generates each unit's password once, shows it to the upravnik, and the upravnik passes it to the tenant by hand. Only the upravnik can reset a password. There is no self-service and no email flow.
- Residents log in with their unit number and password. System users log in with email and password.
- An upravnik moves from the multi-building dashboard into one building's context. Board, forum, chat, documents, tickets and members are then scoped to that building.
- Buildings in a complex share a complex-level forum.

## Capabilities and Constraints

- **Resident destinations:** Početna (activity feed), Oglasna tabla (announcements, pinned items first), Forum (threads and replies), Chat (real-time building chat), Dokumenta (filterable by category), Zahtevi (tickets: private requests to management, with read tracking).
- **Upravnik destinations:** dashboard of assigned buildings, buildings, members (unit accounts), announcements, threads, files, settings.
- **Super admin:** setup wizard (Scope → Buildings → Review) with a live tree preview.
- **Content types:** announcements; threads (General, Maintenance, Complaint, Question; Open/Closed); tickets (General, Maintenance, Complaint, Payment, Request; Open/Closed); documents (Contract, Report, Decision, Other); chat messages; notifications.
- **Rules that are intended behaviour, not bugs:** residents may see neighbours' contact details within their building. Deactivation revokes access but keeps history, and nothing is hard-deleted. The author or staff can close threads and tickets. Replies to closed items are rejected.
- **Language:** the UI is in Serbian, Latin script (for example "Oglasna tabla", "Dokumenta"). Domain terms (upravnik, stanar, zgrada, zahtev) stay in Serbian.
- **Stack:** Next.js 16, React 19, Tailwind 4 with shadcn/ui, TanStack Query and Axios. Chat runs over Socket.IO. The backend is the NestJS API in `apps/backend`.
- **Open decisions:** whether the public case-study page (`docs/case-study-page-spec.md`) will be built. It is secondary to the real product.

## Brand Commitments

- Product name: Profesionalni Upravnik.
- All user-facing copy is in Serbian.

## Evidence on Hand

- No real testimonials, customers, usage numbers, pricing or deployment claims exist yet. Future work must not invent them.
- No logo or brand assets have been committed. `public/` contains only Next.js scaffold icons.
- Product and domain documentation: `upravnik-frontend.md`, `../backend/upravnik-platform.md`. Seed data in the backend provides realistic test content.

## Product Principles

1. **The building is the world.** Every screen answers "which building am I in?", and nothing leaks between buildings.
2. **Same space, more controls.** Management sees what residents see. Admin power adds controls and never creates a separate world.
3. **"What did I miss" first.** Residents arrive to catch up. Recency, unread state and pinned items lead.
4. **Each audience on its own terms.** Residents get a phone-first feed. Upravnici get a desktop-first workspace across many buildings. Neither is a cut-down version of the other.
5. **Trust through closure.** Requests and threads visibly move from open to closed, so residents can see that management responds.
