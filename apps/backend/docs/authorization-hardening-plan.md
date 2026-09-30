# Authorization hardening plan

Status: **implemented** 2026-09-30 (D1–D4 settled the same day) · Written 2026-09-30 · Scope: `apps/backend`

This plan fixes the security bugs and the structural problems in how the backend handles roles and permissions. Each item has an ID so it can be referenced in commits and PRs. The resulting design is described in [authorization-overview.md](./authorization-overview.md).

All paths are relative to `apps/backend/`. Line numbers in §4 point to the code **before** the rework.

### Implementation status

| Items | Status |
|---|---|
| S1–S5, P1–P6, H1–H4, H6–H9, R1, T1 | Done |
| H5 | Done as decided in D4: 7-day tokens kept, revoked on password reset via `User.passwordChangedAt` (H4). No refresh tokens. |
| R2 (change a member's role) | Out of scope, not requested |
| §7 related findings | Open, except that `docs/case-study.md` has been updated |

Differences from the plan:

- **No phased PRs.** The work landed as one change, and the startup coverage check was in *fail* mode from the start.
- **Unit tests.** They cover `AccessService`, `policies.ts`, env validation and password generation. The e2e suites (`test/access.e2e-spec.ts`, `test/accounts.e2e-spec.ts`, `test/chat.e2e-spec.ts`) use their own fixtures in `test/fixtures.ts` instead of `prisma/factories`.
- **`@nestjs/config` is pinned to `^4.0.4`.** Version 12 is ESM-only, targets Nest 12, and breaks Jest.
- **WebSocket errors.** `join`/`message` failures arrive on the socket.io `exception` event, and a rejected handshake gets `connect_error`. There are no ack callbacks.

---

## 1. Why: the problem in one paragraph

Nothing about authorization is global. There is no app-wide guard, no exception filter and no central policy layer. Every endpoint author has to remember to:

- add `@UseGuards(JwtAuthGuard)`;
- pick the right one of four near-duplicate "what is the caller's role here" helpers;
- add ownership checks by hand.

Two endpoints already got this wrong: ticket creation and password reset (S1, S2). The fix is to invert the default. **A route is denied unless it explicitly declares who may call it**, and a single component resolves building/complex membership for HTTP and WebSocket alike.

## 2. Decisions

| ID | Question | Decision |
|---|---|---|
| D0 | May residents see neighbours' contact details (email, phone) via `GET /buildings/:id` and the units list? | **Yes, intended.** Keep as is. |
| D0b | May a BOARD_MEMBER pin/unpin the upravnik's announcements? | **Yes.** BOARD_MEMBER is an extension of the upravnik. Keep as is. |
| D1 | What does `BuildingMember.isActive` / `User.isActive` mean? | **Option A: access revoked, history kept.** Deactivate endpoints added (R1). |
| D2 | Who may close a thread / ticket / complex-forum thread? | **The author or staff**, for all three kinds. |
| D3 | Should replies be accepted on CLOSED threads/tickets? | **No.** Replies to CLOSED items return 409. |
| D4 | Keep 7-day access tokens, or move to short access + refresh tokens? | **Keep 7d**, plus revoke on password reset (H4). No refresh tokens. |

### D1: meaning of `isActive` (decided: Option A)

Today `BuildingMember.isActive` exists but no API ever sets it to `false`, and almost nothing reads it. We need to pick one meaning.

- **Option A (recommended): "access revoked, history kept".**
  - When a resident moves out or a board member steps down, their membership is set `isActive = false` instead of being deleted.
  - Their tickets, threads and messages keep a valid author, but they lose all access to that building immediately.
  - `User.isActive = false` means the whole account is disabled (already enforced on login and HTTP).
  - This matches what the columns look like they were designed for, and it needs no schema change.
- **Option B: "delete means revoke".**
  - Remove the `BuildingMember.isActive` column and hard-delete memberships.
  - This is simpler, but deleting a membership loses the link between the user and the unit/building. That would complicate "former resident" history and audit.

The rework in P1 filters `isActive: true` in the single resolver either way. Choosing A just keeps the column meaningful and later gets endpoints (R1).

---

## 3. Target design

### 3.1 Principles

1. **Deny by default.** Every handler must declare an access policy. A handler without one fails app startup, not at request time.
2. **One resolver.** `AccessService` is the only code that turns `(user, buildingId | complexId)` into a role. The HTTP guard and the WebSocket gateway both use it.
3. **Resolve once, pass it down.** The guard attaches the resolved role to the request. Services receive it and never re-query membership.
4. **Ownership rules are plain functions.** They live in one file (`policies.ts`), so rules like "who can close a ticket" have one source of truth.
   - We deliberately **don't** use CASL: three roles plus a handful of ownership rules don't justify the library.
5. **Predictable errors.**
   - 401: not logged in.
   - 403: not a member, wrong role, or not the owner.
   - 404: resource not found inside a scope you can access.
   - 409: conflict.
   - Never a 500 for an authorization or lookup failure.

### 3.2 Components (new folder `src/auth/access/`)

| File | Responsibility |
|---|---|
| `access.decorators.ts` | `@Public()`, `@AnyUser()`, `@SuperAdmin()`, `@InBuilding(...roles)`, `@InComplex(...roles)`, `@CurrentUser()`, `@CurrentAccess()` |
| `access.service.ts` | `resolveBuildingRole(user, buildingId)` and `resolveComplexRole(user, complexId)`. Filters `isActive: true`. SUPER_ADMIN is treated as UPRAVNIK. Returns `null` for non-members. |
| `access.guard.ts` | Global guard, registered after `JwtAuthGuard`. Reads the policy metadata, calls `AccessService`, throws 403 and attaches `req.access = { role, isSuperAdmin, buildingId? , complexId? }`. |
| `access-coverage.check.ts` | Runs `onApplicationBootstrap` using `DiscoveryService`. It **fails startup** if any handler has zero or more than one policy decorator, or if an `@InBuilding` / `@InComplex` route has no `:buildingId` / `:complexId` in its path. |
| `policies.ts` | Pure functions such as `canViewTicket(access, ticket, userId)`, `canCloseTicket(...)`, `canCloseThread(...)` and `canReply(...)`. |
| `auth-user.ts` | `AuthUser` and `Access` interfaces, replacing `req: any`. |
| `src/common/prisma-exception.filter.ts` | Global filter: `P2025` → 404, `P2002` → 409, `P2003` → 404. |

`JwtAuthGuard` becomes a global `APP_GUARD` that skips handlers marked `@Public()`. `RolesGuard`, `SystemAdminGuard`, `requireBuildingMember`, both `getCallerRole` copies, and the inline check in `ComplexesService.findOne` are deleted at the end of P3.

**Why the route param names matter.** `@InBuilding` reads `:buildingId` and `@InComplex` reads `:complexId`. `GET /buildings/:id` and `GET /complexes/:id` get their param renamed in the controller decorator only (`@Get(':buildingId')`). **The URL does not change.**

### 3.3 What a controller looks like after

```ts
@Controller('buildings/:buildingId/tickets')
export class TicketsController {
  @Post()
  @InBuilding() // any active member
  create(@Param('buildingId') buildingId: string, @CurrentUser() user: AuthUser, @Body() dto: CreateTicketDto) {
    return this.tickets.createTicket(buildingId, user.id, dto);
  }

  @Patch(':id/close')
  @InBuilding()
  close(@Param('buildingId') b: string, @Param('id') id: string, @CurrentUser() user: AuthUser, @CurrentAccess() access: Access) {
    return this.tickets.close(b, id, user.id, access); // service uses policies.canCloseTicket(access, ticket, user.id)
  }
}
```

The policy decorators map onto the routes like this:

- `@Public()`: `POST /auth/login` only.
- `@AnyUser()`: `/auth/me`, `/auth/logout`, the `my-*` controllers, notifications, `GET /buildings` and `GET /complexes` (lists already filtered by `userId`).
- `@SuperAdmin()`: `POST /complexes`, `POST /buildings`, `POST /users/system`, `/setup/*`.
- `@InBuilding(...)`: everything under `/buildings/:buildingId/...` and `/users/.../:buildingId/...`.
- `@InComplex(...)`: everything under `/complexes/:complexId/...`.

### 3.4 Request flow after the rework

```
HTTP: JwtAuthGuard (global, skips @Public; reloads User, 401 if inactive)
      → AccessGuard (global; policy metadata → AccessService → 403 | req.access)
      → controller (@CurrentUser, @CurrentAccess)
      → service (policies.canX(access, resource) → 403; Prisma not-found → filter → 404)

WS:   handshake → reload User via AccessService (401-equivalent disconnect if missing/inactive)
      → join/message → AccessService.resolveBuildingRole → WsException ack on failure
      → disconnect at token exp; re-check membership on each message before broadcast
```

---

## 4. Findings and fixes

Severity key: 🔴 exploitable security bug · 🟠 security weakness · 🟡 structural/pattern.

### Security bugs

#### S1 🔴 Password reset allows account takeover
- **Where:** `src/users/users.service.ts:132-146`. Route: `POST /users/:buildingId/members/:userId/reset-password`, `@Roles(UPRAVNIK)`.
- **Problem:** the service only checks that the target is *some* member of the building, then returns the new plaintext password. An UPRAVNIK of building A can therefore reset:
  - a co-UPRAVNIK's password;
  - a BOARD_MEMBER's password;
  - the password of a SUPER_ADMIN who has a membership row in A.

  They log in as that user and inherit every other building the user manages. The target's existing tokens also stay valid.
- **Fix:** the lookup must require `role: RESIDENT, isActive: true, user: { accountType: UNIT_ACCOUNT }`. Return 404 if the target doesn't match. Combine with H4 (invalidate old tokens on reset).
- **Verify:** e2e tests.
  - An UPRAVNIK resetting a co-UPRAVNIK, a BOARD_MEMBER, or a resident of another building gets 404.
  - An UPRAVNIK resetting their own building's unit account gets 200.

#### S2 🔴 Anyone logged in can create a ticket in any building
- **Where:** `src/tickets/tickets.service.ts:55-70` and `src/tickets/tickets.controller.ts:24-31`.
- **Problem:** `createTicket` never checks membership. Any authenticated user can `POST /buildings/<any-id>/tickets`, and that building's staff are notified with an attacker-chosen title.
- **Fix (hotfix):** resolve the caller's role before creating. After P3 this becomes `@InBuilding()` on the route.
- **Verify:** e2e tests. A non-member gets 403 and no notification rows are created. A member gets 201.

#### S3 🟠 WebSocket chat is weaker than HTTP
- **Where:** `src/chat/chat.gateway.ts:13-78`.
- **Problems:**
  - It stores the raw token payload and never reloads the user. A deactivated user, or a demoted SUPER_ADMIN, keeps access for up to 7 days.
  - The token is checked only on connect, so the socket outlives `exp`.
  - `join` and `message` failures are silently swallowed.
  - A joined socket is never removed from the room.
  - CORS is `origin: '*'`.
  - The `{ buildingId, body }` payload is not validated.
  - Membership checks ignore `isActive`.
- **Fix:**
  1. In `handleConnection`, load the user through `AccessService`, disconnect if missing or inactive, and schedule a disconnect at `exp`.
  2. Check membership with `AccessService` in `join` and `message`, and return an error ack / `WsException` on failure.
  3. Before broadcasting, confirm the sender is still an active member.
  4. When a membership is deactivated (R1), make the affected sockets leave the room.
  5. Validate the payload with a `SendMessageDto` using a `ValidationPipe` on the gateway, with a max length on `body`.
  6. Restrict CORS to the configured frontend origin (H3).
- **Verify:** a socket.io-client e2e test covering a non-member join, an expired token, and a deactivated user.

#### S4 🟠 Generated passwords are weak
- **Where:** `src/users/users.service.ts:148-150`.
- **Problem:** `Math.random().toString(36)` is not cryptographically secure and produces only 8 characters.
- **Fix:** use `crypto.randomInt` over an unambiguous alphabet, 12 or more characters.
- **Verify:** a unit test checking length and alphabet.

#### S5 🟠 The JWT secret falls back to a public default
- **Where:** `src/auth/auth.module.ts:12` and `src/auth/strategies/jwt.strategy.ts:19` (`?? 'change-me'`). The local `.env` value also equals the `.env.example` placeholder.
- **Fix:**
  - Add `@nestjs/config` with a validation schema. The app refuses to start if `JWT_SECRET` is missing or shorter than 32 characters.
  - Read the secret from one place (`ConfigService`) in both files.
  - Rotate the local secret.
- **Verify:** starting without `JWT_SECRET` fails with a clear message.

### Structural and pattern issues (these are the rework)

#### P1 🟡 No deny-by-default: build the access layer
- **Where:** `src/app.module.ts` (no providers) and every controller's `@UseGuards(...)`.
- **Fix:** build everything in §3.2. Register `JwtAuthGuard` and then `AccessGuard` as `APP_GUARD`s in `AuthModule`, **in that order**. Nest runs global guards in registration order.
- **Verify:**
  - A unit test for `AccessService` covering member, inactive member, non-member, SUPER_ADMIN, and highest role in a complex.
  - A boot test showing that a controller missing a decorator fails startup.

#### P2 🟡 No exception filter, so lookup failures become 500s
- **Where:** every `findUniqueOrThrow` / `findFirstOrThrow`. Examples:
  - `tickets.service.ts:23`
  - `users.service.ts:133`
  - `notifications.service.ts:22`
  - all child fetches `{ id, buildingId }`
- **Problem:** this contradicts the 403/404 contract documented in `apps/backend/CLAUDE.md`.
- **Fix:** register a global `PrismaExceptionFilter` (§3.2).
- **Verify:** e2e tests. Another user's notification id returns 404; a wrong ticket id in your own building returns 404.

#### P3 🟡 Four divergent role resolvers: migrate every module onto the access layer
- **Replaces:**
  - `src/auth/building-membership.util.ts` (`requireBuildingMember`)
  - `TicketsService.getCallerRole` (`tickets.service.ts:17-27`)
  - `ComplexForumService.getCallerRole` (`complex-forum.service.ts:48-66`)
  - the inline check in `ComplexesService.findOne` (`complexes.service.ts:26-31`)
  - `RolesGuard` and `SystemAdminGuard`
- **Fix:** migrate one module at a time. Replace `@UseGuards`/`@Roles` with a policy decorator, pass `@CurrentAccess()` into the service, and delete the service-level membership lookup. Suggested order, smallest first:
  1. complexes
  2. buildings
  3. units
  4. documents
  5. announcements
  6. threads
  7. complex-forum
  8. tickets
  9. notifications / my-*
  10. users
  11. setup
  12. auth
- **Delete at the end:** the old guards, the util, and the local `const SUPER_ADMIN = 'SUPER_ADMIN'` copies (8 places).
- **Verify:** the role × endpoint e2e matrix (T1) passes before and after each module. The only differences allowed are the ones listed in "Behaviour changes" below.

#### P4 🟡 Untyped `@Request() req: any` everywhere
- **Fix:** `@CurrentUser(): AuthUser` and `@CurrentAccess(): Access`, done as part of P3 per module.

#### P5 🟡 Ownership rules scattered and inconsistent
- **Where:**
  - thread close is staff-only via `@Roles` (`threads.controller.ts:80-85`);
  - complex-forum close allows staff or the author (`complex-forum.service.ts:155-161`);
  - ticket close allows staff or the author (`tickets.service.ts:222-229`);
  - the RESIDENT-only visibility check (`tickets.service.ts:150-152`) means any future role gets staff visibility by default;
  - no reply endpoint checks for CLOSED.
- **Fix:** move every rule into `policies.ts`. Write the visibility rule as an allowlist ("staff = UPRAVNIK | BOARD_MEMBER, others see own"), not as "if RESIDENT". Then apply decisions D2 and D3.
  - **Proposal D2:** the author or staff may close all three kinds.
  - **Proposal D3:** replies to CLOSED items return 409.
- **Verify:** unit tests on `policies.ts`, plus the e2e matrix.

#### P6 🟡 `'SUPER_ADMIN'` string literal repeated 8 times
- **Fix:** use `SystemRole.SUPER_ADMIN` from the Prisma enum, only inside `AccessService` and the `@SuperAdmin()` check. Falls out of P3.

### Hardening

| ID | Item | Where | Fix |
|---|---|---|---|
| H1 | No login rate limiting | `POST /auth/login` | `@nestjs/throttler`, e.g. 5 attempts/min per IP+username |
| H2 | No security headers | `src/main.ts` | `helmet()` |
| H3 | CORS allows every origin (HTTP and WS) | `main.ts:13`, `chat.gateway.ts:13` | `CORS_ORIGIN` env var, validated by the config schema (S5) |
| H4 | Old tokens survive a password reset/change | `JwtStrategy.validate()` | Add `User.passwordChangedAt`. Reject tokens whose `iat` is earlier than it. `validate()` already loads the user, so there is no extra query. |
| H5 | 7-day tokens, no refresh, no-op logout | `auth.module.ts:13`, `auth.controller.ts:32-38` | Depends on **D4**. The minimum is to keep 7d plus H4. The full fix is a 15-minute access token plus a rotating refresh token in an httpOnly cookie, with a server-side revoke on logout. This also touches the frontend. |
| H6 | Login timing reveals which usernames exist | `auth.service.ts:59-63` | Always run `bcrypt.compare`, against a dummy hash when the user is missing |
| H7 | User creation is not atomic | `users.service.ts:13-130` | Wrap user + membership (+ unit link) in `prisma.$transaction` |
| H8 | Query params are cast without validation (`?status`, `?buildingId`) | `threads.service.ts:116`, `tickets.service.ts:243` | Query DTOs with `@IsEnum` / `@IsUUID`; enable `transform: true` on the global pipe |
| H9 | `Document.fileUrl` accepts any string (e.g. `javascript:`) | `create-document.dto.ts:14-16` | `@IsUrl({ protocols: ['https'], require_protocol: true })` |

### Role lifecycle (depends on D1)

| ID | Item | Fix |
|---|---|---|
| R1 | No way to revoke access without editing the database | With **D1 = A**: `PATCH /buildings/:buildingId/members/:userId` `{ isActive }` (UPRAVNIK; cannot target other UPRAVNIKs) and `PATCH /users/:id` `{ isActive }` (SUPER_ADMIN). Deactivation also removes sockets from the chat room (S3). |
| R2 | No way to change a member's role | Decide later whether this is needed. Out of scope unless requested. |

### Tests

#### T1: authorization e2e suite (the safety net for everything above)
- **Setup:**
  - `test/jest-e2e.json` already exists.
  - Add a dedicated `upravnik_test` database on the docker-compose Postgres, `prisma migrate deploy` before the suite, and fixtures built with `prisma/factories`.
  - The fixtures are two buildings (A, B) in one complex, plus a standalone building. Actors: SUPER_ADMIN, UPRAVNIK A, BOARD A, RESIDENT A1, RESIDENT A2, RESIDENT B, an inactive member of A, and a user with no memberships.
- **Coverage:** a table-driven matrix of actor × endpoint → expected status. It includes:
  - "other building's id" cases;
  - "resident reads another resident's ticket";
  - every S-item regression.
- **Also:** delete or replace the boilerplate `src/app.controller.spec.ts` and `test/app.e2e-spec.ts`. They test an `AppController` that isn't registered.

---

## 5. Phases (implementation order)

Each phase is one PR, and each keeps the app shippable. Every PR that changes an endpoint's auth or errors also updates the Postman collection and `postman/CHANGES.md`, as required by `apps/backend/CLAUDE.md`.

| Phase | Contents | Depends on | Size |
|---|---|---|---|
| **0: Safety net** | T1 harness and the matrix for *current* behaviour. S1/S2 tests written as failing. | none | M |
| **1: Hotfixes** | S1, S2, S4, S5 | 0 | S |
| **2: Access layer** | P1, P2, P4 (decorators + filter + `AccessService` + boot coverage check). Old guards keep working alongside, so the boot check starts in *warn* mode. | 1 | M |
| **3: Migration** | P3, P6, module by module. The boot check switches to *fail* mode at the end. Delete the old guards and helpers. | 2 | L |
| **4: WebSocket** | S3 (plus H3 for WS) | 2 | M |
| **5: Policies** | P5 with decisions D2/D3 | 3 | S |
| **6: Hardening** | H1, H2, H3, H4, H6, H7, H8, H9 | 1 | M |
| **7: Lifecycle** | R1 (needs D1), H5 (needs D4) | 3, 4 | M |

## 6. Behaviour changes the frontend will notice

- Some responses that were **500** become **404**. Examples: a wrong resource id, another user's notification.
- A non-member on the tickets endpoints gets **403** instead of 500.
- Password reset on a non-resident target returns **404** instead of 200.
- Ticket creation in a building you don't belong to returns **403** instead of 201.
- Replying to a CLOSED item returns **409** (if D3 is accepted).
- WebSocket `join`/`message` failures return an error ack instead of silence.
- After a password reset, the user's old tokens get **401** (H4).
- An inactive membership (once R1 exists) loses access everywhere, including the complex forum and chat.

## 7. Related findings (not authorization; tracked here so they aren't lost)

- **Unit-account usernames are unique across the whole platform.**
  - Where: `users.service.ts:92-103`.
  - Two buildings can't both have unit "12", and the resulting 409 reveals the username exists.
  - Linking a unit that already has an account fails with a unique-constraint error (a 404/409 after P2).
- **`POST /users/system` does not check that `buildingIds` exist.** It fails after the user is already created; H7 fixes the partial write.
- **`ChatService.getHistory` is unused**, so chat history has no endpoint.
- **`AppController` is not registered in `AppModule`**, making it dead code.
- **`docs/case-study.md` is out of date.** L89 and L176 say some `@Roles` lack `RolesGuard`; that is no longer true. Update it after P3.
