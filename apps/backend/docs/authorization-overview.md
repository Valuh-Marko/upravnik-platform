# How authorization works (current state)

Written 2026-09-30 · Scope: `apps/backend` · Paths are relative to `apps/backend/`.

This describes the code **as it is today, before the rework**. For known problems and the fix plan, see [authorization-hardening-plan.md](./authorization-hardening-plan.md). Update or replace this doc once Phase 3 of that plan lands.

---

## Overview

Permissions work at two levels.

**Platform level** lives on `User`:
- `accountType`: `SYSTEM_USER` or `UNIT_ACCOUNT`.
- An optional `systemRole`. Its only value is `SUPER_ADMIN`.

**Building level** lives only on `BuildingMember`:
- The roles are `UPRAVNIK`, `BOARD_MEMBER` and `RESIDENT`.
- There is one membership row per building and user.
- Complexes have no role table. Complex access comes from the user's memberships in the buildings of that complex.

The JWT carries only the platform-level identity. Building roles are looked up in the database on every request.

Checks are enforced in two ways:

1. **Guards attached per controller:** `JwtAuthGuard`, `SystemAdminGuard`, and `RolesGuard` together with `@Roles(...)`.
2. **Hand-written checks inside services:** four near-duplicate helpers that each resolve the caller's role.

Nothing is global. There is no app-wide guard, no exception filter and no central policy layer.

## Key concepts

- **`SUPER_ADMIN`** (`prisma/schema.prisma:16-18`, `User.systemRole`): the platform operator.
  - Every role resolver treats a SUPER_ADMIN as UPRAVNIK of every building.
  - The seed (`prisma/seed.ts:156-162`) is the only way to create one. No API endpoint grants it.
- **`BuildingMember`** (`schema.prisma:162-177`): the only place building roles live.
  - `@@unique([buildingId, userId])`, so a user has at most one role per building.
  - `unitId` is optional and `@unique`.
  - It has an `isActive` flag, but most checks ignore it.
- **`UNIT_ACCOUNT`**: a user linked 1:1 to a `Unit` (`Unit.userId @unique`). Its username is the unit number, which must be unique across the platform.
- **Complex scope**: `Complex → Building.complexId? → Unit`.
  - A complex-forum user is any active member of any building in the complex.
  - Their role there is the highest role they hold across those buildings.
- **`req.user`** is `{ id, username, accountType, systemRole }`.
  - `JwtStrategy.validate()` reloads it from the database on every request.
  - Controllers access it as an untyped `@Request() req: any`.

### Product rules (confirmed)

- Residents **may** see their neighbours' contact details (email, phone) through `GET /buildings/:id` and the units list. This lets people find their neighbours.
- `BOARD_MEMBER` is an extension of the `UPRAVNIK`. For example, a board member may pin or unpin the upravnik's announcements.

## How it works

### Authentication

1. `AuthService.login()` (`src/auth/auth.service.ts:54-73`) checks `isActive` and the bcrypt hash.
2. It signs `{ sub, username, accountType, systemRole }` with HS256.
3. The token is valid for 7 days (`src/auth/auth.module.ts:11-14`). There is no refresh token.
4. On every HTTP request, `JwtStrategy.validate()` (`src/auth/strategies/jwt.strategy.ts:23-35`) reloads the user. It returns 401 if the user is missing or inactive.
5. `/auth/logout` does nothing on the server.

Because of step 4, deactivation and `systemRole` changes take effect immediately over HTTP.

### Guards: the coarse check

Every controller except `AuthController` has `@UseGuards(JwtAuthGuard)` at class level. Class guards run before method guards, so `req.user` is always set before any role guard runs.

**`SystemAdminGuard`** (`src/auth/guards/system-admin.guard.ts`) just checks `systemRole === 'SUPER_ADMIN'`.

**`RolesGuard`** (`src/auth/guards/roles.guard.ts:14-36`) works in four steps:

1. If the route has no `@Roles` metadata, it allows the request.
2. A SUPER_ADMIN is always allowed.
3. It reads `params.buildingId`. If the route has no such parameter, it returns 403.
4. It looks up the `BuildingMember` row and checks that its role is in the required list.

Two things to know about `RolesGuard`:

- It ignores `isActive`.
- It discards the role it found, so services look it up again.

Where each guard is used:

| Guard | Routes |
|---|---|
| `SystemAdminGuard` | `POST /complexes`, `POST /buildings`, `POST /users/system`, `/setup/*` |
| `RolesGuard` + `@Roles(UPRAVNIK)` | `POST /buildings/:buildingId/units`, `POST /users/board-member/:buildingId`, `POST /users/unit/:buildingId`, `POST /users/:buildingId/members/:userId/reset-password` |
| `RolesGuard` + `@Roles(UPRAVNIK, BOARD_MEMBER)` | announcements POST/PATCH, documents POST, `PATCH threads/:id/close` |
| No role guard (service-level checks only) | all GETs, tickets, complex-forum, notifications, the `my-*` controllers |

### Services: the detailed check

Reading data and ownership rules are handled in the services, through one of four helpers:

| Helper | Where | Used by | Non-member gets | Checks `isActive` |
|---|---|---|---|---|
| `requireBuildingMember` | `src/auth/building-membership.util.ts:8-22` | buildings, units, announcements, documents, threads, chat | 403 | no |
| `TicketsService.getCallerRole` | `src/tickets/tickets.service.ts:17-27` | tickets | 500 (`findUniqueOrThrow`) | no |
| `ComplexForumService.getCallerRole` | `src/complex-forum/complex-forum.service.ts:48-66` | complex forum | 403 | yes |
| inline `findFirst` | `src/complexes/complexes.service.ts:26-31` | `GET /complexes/:id` | 403 | no |

Once membership is confirmed, child records are fetched with `findFirstOrThrow({ where: { id, buildingId } })`, or with `{ id, complexId }` for the forum. This ties the `:id` in the URL to its parent, so a valid ID from another building cannot be used.

Ownership rules are applied after the fetch. For example, a RESIDENT sees only their own tickets (`tickets.service.ts:101-105`, `150-152`).

List endpoints (`GET /buildings`, `GET /complexes` and the `my-*` controllers) filter by the caller's memberships in the Prisma `where` clause.

### Input validation

The global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` (`src/main.ts:10-12`) rejects fields the DTOs don't declare. Services spread `...dto` into Prisma, and that is safe only because of this pipe.

Server-controlled fields always come from `req.user` or from the path: `authorId`, `buildingId`, `status`, `role`.

Query parameters have no DTOs.

### WebSocket chat

`ChatGateway` (`src/chat/chat.gateway.ts`) authenticates differently from HTTP:

- `handleConnection` only checks the token's signature and stores its contents as the user.
- It does not reload the user from the database, so `isActive` is never checked and `systemRole` comes from the token.
- The token is checked only when the socket connects.

`join` and `message` call `requireBuildingMember`. If that check fails, the request is silently dropped. Once a socket joins a room, it is never removed from it.

### Flow

```
HTTP:  Bearer JWT → JwtAuthGuard (reloads user, 401 if inactive)
                  → [SystemAdminGuard | RolesGuard(params.buildingId) | none]
                  → service helper (403, or 500 for tickets)
                  → findFirstOrThrow({id, buildingId}) + ownership check
                  → not found → 500 (no exception filter)

WS:    handshake token → jwtService.verify only (no DB reload, checked once)
                       → join/message → requireBuildingMember (failure silently dropped)
                       → socket.join(buildingId), never removed
```

## Where things live

| What | Where |
|---|---|
| Data model | `prisma/schema.prisma` (enums L11-24, `User` L72-102, `BuildingMember` L162-177) |
| First SUPER_ADMIN | `prisma/seed.ts`, `prisma/factories/user.factory.ts` |
| Auth | `src/auth/auth.module.ts`, `auth.service.ts`, `auth.controller.ts`, `strategies/jwt.strategy.ts` |
| Guards and decorator | `src/auth/guards/{jwt-auth,roles,system-admin}.guard.ts`, `src/auth/decorators/roles.decorator.ts` |
| Shared helpers | `src/auth/building-membership.util.ts`, `src/auth/safe-user-select.util.ts` |
| Module-local role resolvers | `src/tickets/tickets.service.ts`, `src/complex-forum/complex-forum.service.ts`, `src/complexes/complexes.service.ts` |
| Account management | `src/users/users.controller.ts`, `src/users/users.service.ts` |
| WebSocket chat | `src/chat/chat.gateway.ts`, `src/chat/chat.service.ts` |
| Global setup | `src/main.ts` (validation pipe, CORS, `api` prefix, Swagger) |
| Tests | none cover authorization yet (see T1 in the plan) |

## What's already good

- Building roles are never put in the JWT; they are resolved from the database on every request.
- `validate()` reloads the user and checks `isActive`, so HTTP access can be revoked immediately.
- Child records are consistently tied to their parent, with `{ id, buildingId }` or `{ id, complexId }`.
- DTOs contain only content fields, and the whitelist ValidationPipe stops clients from setting server-controlled fields.
- Guards run in the correct order, and every `@Roles` has a matching `RolesGuard`.
- `SAFE_USER_SELECT` keeps `passwordHash` out of responses.

The known gaps are listed in [authorization-hardening-plan.md](./authorization-hardening-plan.md).
