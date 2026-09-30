# How authorization works

Updated 2026-09-30 · Scope: `apps/backend` · Paths are relative to `apps/backend/`.

This describes the design introduced by [authorization-hardening-plan.md](./authorization-hardening-plan.md). The plan also lists what was wrong before and why each change was made.

---

## Overview

Permissions work at two levels.

**Platform level** lives on `User`:
- `accountType`: `SYSTEM_USER` or `UNIT_ACCOUNT`.
- An optional `systemRole`. Its only value is `SUPER_ADMIN`.
- `isActive`: `false` disables the whole account.

**Building level** lives only on `BuildingMember`:
- The roles are `UPRAVNIK`, `BOARD_MEMBER` and `RESIDENT`.
- There is one membership row per building and user.
- `isActive = false` revokes access to that building but keeps the user's history (decision D1).
- Complexes have no role table. Complex access comes from the user's active memberships in the buildings of that complex.

The JWT carries only the platform-level identity. Building roles are looked up in the database on every request.

**Access is denied by default.** Every HTTP handler must declare an access policy with a decorator. Two global guards enforce it, and the app refuses to start if a handler has no policy.

## Key concepts

- **Policy decorators** (`src/auth/access/access.decorators.ts`): exactly one per handler, or on the controller class.

  | Decorator | Who may call |
  |---|---|
  | `@Public()` | anyone, no token (`POST /auth/login` only) |
  | `@AnyUser()` | any logged-in user; the service scopes results to the caller |
  | `@SuperAdmin()` | `systemRole = SUPER_ADMIN` |
  | `@InBuilding(...roles)` | active member of `:buildingId`; with roles, only those roles |
  | `@InComplex(...roles)` | active member of any building in `:complexId`; the highest role across the complex counts |

- **`AccessService`** (`src/auth/access/access.service.ts`) is the only code that turns `(user, buildingId | complexId)` into a role. HTTP and WebSocket both use it.
  - It ignores inactive memberships.
  - A SUPER_ADMIN counts as UPRAVNIK everywhere.
  - `loadUser(id, iat)` returns `null` for a missing or disabled account, or for a token issued before `User.passwordChangedAt`.
- **`AuthUser`** is `{ id, username, accountType, systemRole }`. Handlers receive it with `@CurrentUser()`.
- **`Access`** is `{ role, isSuperAdmin, buildingId? , complexId? }`. It is resolved once by the guard and handed to services with `@CurrentAccess()`. Services never query membership again.
- **Ownership rules** (`src/auth/access/policies.ts`) are plain functions:
  - `isStaff`: an allowlist, `UPRAVNIK | BOARD_MEMBER`. Any other role only sees and manages its own items.
  - `canViewTicket`: tickets are private to their author and the building's staff.
  - `assertCanClose`: the author or staff may close threads, tickets and complex-forum threads (D2).
  - `assertOpen`: a reply to a CLOSED item gets `409` (D3).

### Product rules (confirmed)

- Residents **may** see their neighbours' contact details (email, phone) through `GET /buildings/:id` and the units list. This lets people find their neighbours.
- `BOARD_MEMBER` is an extension of the `UPRAVNIK`. For example, a board member may pin or unpin the upravnik's announcements.

## How it works

### Authentication

1. `AuthService.login()` (`src/auth/auth.service.ts`) checks `isActive` and the bcrypt hash.
   - When the user doesn't exist, it still compares against a dummy hash, so response timing doesn't reveal which usernames exist.
   - `LoginThrottlerGuard` allows 5 attempts per minute per IP + username. The 6th gets `429`.
2. It signs `{ sub, username, accountType, systemRole }` with HS256.
   - The token is valid for 7 days (D4). There is no refresh token.
   - `JWT_SECRET` is validated at startup (`src/config/env.validation.ts`, at least 32 characters). There is no fallback.
3. On every HTTP request, `JwtStrategy.validate()` calls `AccessService.loadUser`, which returns `401` for:
   - a disabled account;
   - a token issued before the user's last password reset.
4. `/auth/logout` does nothing on the server.

### Request pipeline

Global guards are registered in `AuthModule` as `APP_GUARD`s. Order matters: they run in registration order.

1. **`JwtAuthGuard`** (`src/auth/guards/jwt-auth.guard.ts`): skips `@Public()` routes. Otherwise it requires a valid token, or returns `401`.
2. **`AccessGuard`** (`src/auth/access/access.guard.ts`):
   - It reads the route's policy. With no policy, the answer is `403`.
   - For `@InBuilding` / `@InComplex`, it resolves the role through `AccessService` and returns `403` for non-members and wrong roles.
   - This runs **before** any lookup. A non-member therefore gets `403` even for an id that doesn't exist, so ids can't be probed.
   - Finally it attaches `req.access`.
3. The **controller** receives `@CurrentUser()` / `@CurrentAccess()`.
4. The **service** fetches child records scoped to their parent, for example `findFirstOrThrow({ where: { id, buildingId } })`. It then applies the `policies.ts` rules.

`AccessCoverageCheck` (`src/auth/access/access-coverage.check.ts`) runs at bootstrap. It fails startup when:

- any HTTP handler has no policy;
- an `@InBuilding` route has no `:buildingId` in its path;
- an `@InComplex` route has no `:complexId` in its path.

### Errors

| Status | Meaning | Source |
|---|---|---|
| `400` | invalid body or query params, including unknown fields | global `ValidationPipe({ whitelist, forbidNonWhitelisted, transform })` and query DTOs (`src/common/dto/my-list-query.dto.ts`) |
| `401` | no or bad token, disabled account, token issued before password reset | `JwtAuthGuard` / `JwtStrategy` |
| `403` | no policy, not a member, wrong role, or not the owner | `AccessGuard`, `policies.ts` |
| `404` | resource not found in a scope you can access, including malformed ids | `PrismaExceptionFilter`: `P2025` / `P2003` |
| `409` | unique conflict, or a reply to a CLOSED item | `PrismaExceptionFilter`: `P2002`; `assertOpen` |
| `429` | too many login attempts | `LoginThrottlerGuard` |

### Account lifecycle

- **`PATCH /buildings/:buildingId/members/:userId`** `{ isActive }`
  - Called by UPRAVNIK. Only a SUPER_ADMIN may change another UPRAVNIK.
  - Deactivation cuts access to that building immediately and removes the user's sockets from its chat room.
- **`PATCH /users/:id`** `{ isActive }`
  - SUPER_ADMIN only, and not on themselves.
  - Disabling cuts every request (`401`) and disconnects the user's sockets.
- **`POST /users/:buildingId/members/:userId/reset-password`**
  - UPRAVNIK only, and only for active RESIDENT unit accounts of that building. Any other target gets `404`.
  - Generates a 12-character password with `crypto.randomInt`.
  - Sets `passwordChangedAt`, which revokes every older token.
- User creation (system user, board member, unit account) runs in one `prisma.$transaction`.

### WebSocket chat

`ChatGateway` (`src/chat/chat.gateway.ts`, namespace `/chat`):

- **Handshake:** namespace middleware verifies the token and calls `AccessService.loadUser`. A bad token, disabled account or revoked token gets `connect_error` "Unauthorized".
- **Connection:** each socket joins a personal `user:<id>` room and is disconnected when its token expires.
- **Events:** `join` and `message` resolve the building role through `AccessService` on **every** event.
  - Failures arrive on the `exception` event: `Unauthorized`, `Forbidden`, or `{ status: 'error', message: [...] }` for payloads that fail validation (`SendMessageDto`, body 1–2000 chars).
- **Revocation hooks** used by the HTTP services:
  - `leaveBuilding(userId, buildingId)` when a membership is deactivated;
  - `disconnectUser(userId)` when an account is disabled.
- **CORS:** HTTP and socket.io share one allowlist from `CORS_ORIGIN` (`src/app.setup.ts`).

### Flow

```
HTTP:  Bearer JWT → JwtAuthGuard (skips @Public; loadUser → 401 if disabled / revoked)
                  → AccessGuard (policy → AccessService → 403 | req.access)
                  → controller (@CurrentUser, @CurrentAccess)
                  → service: findFirstOrThrow({ id, buildingId }) + policies.ts
                  → Prisma not-found / conflict → PrismaExceptionFilter → 404 / 409

WS:    handshake → verify + loadUser (connect_error if rejected)
                 → join/message → AccessService.resolveBuildingRole on every event
                 → disconnected at token exp, on account disable; removed from room on deactivation
```

## Where things live

| What | Where |
|---|---|
| Data model | `prisma/schema.prisma` (`User.isActive`, `User.passwordChangedAt`, `BuildingMember.isActive`) |
| First SUPER_ADMIN | `prisma/seed.ts`, `prisma/factories/user.factory.ts` |
| Access layer | `src/auth/access/` (decorators, guard, service, coverage check, policies, types) |
| Authentication | `src/auth/auth.module.ts` (global guards, throttler), `auth.service.ts`, `strategies/jwt.strategy.ts`, `guards/jwt-auth.guard.ts`, `guards/login-throttler.guard.ts` |
| Error mapping | `src/common/prisma-exception.filter.ts` |
| Global pipeline | `src/app.setup.ts` (helmet, validation, filter, CORS, WS adapter), shared by `main.ts` and the e2e tests |
| Config validation | `src/config/env.validation.ts` |
| Account management | `src/users/`, `src/buildings/` (member PATCH) |
| WebSocket chat | `src/chat/chat.gateway.ts` |
| Tests | unit: `src/auth/access/*.spec.ts`, `src/config/env.validation.spec.ts`, `src/users/generate-password.spec.ts`; e2e: `test/access.e2e-spec.ts`, `test/accounts.e2e-spec.ts`, `test/chat.e2e-spec.ts` |

## Adding an endpoint

1. Put exactly one policy decorator on the handler. If the route is building- or complex-scoped, the path must contain `:buildingId` / `:complexId`.
2. Take `@CurrentUser()` / `@CurrentAccess()`. Don't write `@Request() req`.
3. In the service, fetch child records with their parent id, and use `policies.ts` for ownership and state rules.
4. Add the endpoint to the matrix in `test/access.e2e-spec.ts`.
5. Update the Postman collection and `postman/CHANGES.md`.

Run the e2e suite from `apps/backend` with `npx jest --config ./test/jest-e2e.json`. It needs the docker Postgres (`npm run db:up`) and uses the `upravnik_test` database, which it creates and migrates automatically.
