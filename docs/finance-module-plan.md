# Finance module (Finansije) — implementation plan

## Context

Serbian HOAs (stambene zajednice) are legal entities with their own PIB, matični broj and tekući račun. The *Zakon o stanovanju i održavanju zgrada* gives every owner the right to "electronic or other access to the balance and changes on the HOA's account" (čl. 65). It obliges the upravnik to keep a record of income and expenses (čl. 50 t.12) and to report to the assembly on total income/expenses and planned vs. realised work, at least twice a year for a professional upravnik (čl. 50 t.13, čl. 53). Fees: tekuće održavanje + upravljanje are split **per unit**, investiciono održavanje **per m²** (čl. 63–64); HOAs are outside the Accounting Law (no APR filings) and only file PBN-1 if they have **market income** (e.g. renting the roof).

The platform today has no finance features and **no real file upload** (`Document.fileUrl` is just a pasted URL). Goal: a transparent "Finansije" tab per building (and a roll-up per complex) where residents see the HOA's bank details, balances, every income/expense transaction and every supplier invoice (with PDF), plus their own unit's charges and debt — with the upravnik as the only writer.

## Decisions (confirmed with user)

| Topic | Decision |
|---|---|
| Other units' debt | Residents see **only their own unit** ledger + **building aggregates** (total outstanding, number of units in arrears). No per-unit list for residents. |
| Payer privacy | Owner payments show to residents as **"Uplata – stan 12"**; payer name/account visible only to staff (UPRAVNIK, BOARD_MEMBER). |
| Complex HOA | Unsure → data model supports an entity owned by a complex; v1 builds **roll-up only**. |
| Data entry | **Manual first** (Phase 1–2), bank statement import in Phase 3. |
| Write access | **UPRAVNIK only** (`@InBuilding(Role.UPRAVNIK)`; SUPER_ADMIN resolves to UPRAVNIK). BOARD_MEMBER = read everything incl. raw bank data. |
| File storage | **S3-compatible** via AWS SDK; **RustFS (MinIO-compatible) in docker-compose** for local dev until real S3 exists (MinIO no longer publishes Docker images). |
| Monthly charges | **Both**: scheduled job on the 1st + manual preview/generate/regenerate. |
| Fee rules | Legal split + **per-unit-type overrides** (APARTMENT / OFFICE / COMMERCIAL). |
| Bank accounts | **Multiple** per HOA, one primary. |
| Start of books | **Opening balances** (account balance + per-unit opening debt at a start date). No backfill. |
| Reports | **PDF** generated server-side, saved as a `REPORT` Document, **locks the period**. |
| Notifications | Charge issued, payment recorded, overdue reminder, report published. |
| Unit sale | Debt and history **stay with the unit**. |
| Late interest | Out of scope (show overdue amount + days only). |
| IPS QR | Not selected → out of scope (easy later add-on). |
| SEF | Planned as a **later phase** (import supplier e-invoices). |

## Domain rules (apply to all phases)

- Money: Prisma `Decimal @db.Decimal(14, 2)`, RSD only; serialised as strings (same as `Unit.areaSqm`). DTOs validate with `@IsDecimal({ decimal_digits: '0,2' })` + positive check. Never use JS floats for sums — aggregate in SQL (`aggregate`/`groupBy`) or `Prisma.Decimal`.
- Transactions store a positive `amount` + `direction` (INCOME / EXPENSE). Balance = `openingBalance + Σincome − Σexpense`.
- **Nothing is hard-deleted or edited after the fact** (D1 spirit): transactions are immutable; corrections are a reversal (storno) entry linked by `reversesId`. Invoices can be cancelled (`cancelledAt` + reason), not deleted.
- Every finance write also writes an `AuditLog` row (model exists in `schema.prisma`, currently unused) inside the same `prisma.$transaction`.
- Once a period is locked by a published report (Phase 4), writes with `valueDate`/`period` inside it return **409**.
- Building isolation: every query is scoped through `FinanceEntity.buildingId = :buildingId`; IDs from the body (category, supplier, invoice, bank account, unit, file) are checked to belong to the same entity → otherwise 404.

---

## Phase 1 — Foundation (detailed)

Ledger, invoices, files, read-only resident tab.

### 1.1 Infrastructure: file storage

- `docker-compose.yml`: add an `s3` service (`rustfs/rustfs`, ports 9000/9001, volume) and a one-shot `s3-init` (`amazon/aws-cli`) that creates bucket `upravnik-files`.
- `apps/backend/src/config/env.validation.ts`: add `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE` (required, same error style as `JWT_SECRET`). Update `.env.example` and `test/setup-env.ts` (dummy values).
- Deps: `npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner -w @upravnik/backend`, `@types/multer` as backend devDependency.
- New `src/storage/`: `StorageService` (`put(key, buffer, mime)`, `signedDownloadUrl(key, fileName)` — 5 min expiry, `Content-Disposition` with original name) + `StorageModule` (global export).
- New model `StoredFile` (generic so Documents can adopt it later): `id, buildingId?, complexId?, storageKey, fileName, mimeType, sizeBytes, uploadedBy, createdAt`.
- `src/files/files.controller.ts` at `buildings/:buildingId/files`:
  - `POST` (multipart `file`, `@InBuilding(Role.UPRAVNIK)`): PDF/JPEG/PNG, max 10 MB (`ParseFilePipe` with `MaxFileSizeValidator` + `FileTypeValidator`) → creates `StoredFile`, key `buildings/{buildingId}/{uuid}-{sanitisedName}`.
  - `GET :fileId/download` (`@InBuilding()`): returns `{ url }` (signed URL) after checking `file.buildingId === buildingId`.

### 1.2 Prisma schema (`apps/backend/prisma/schema.prisma`, migration `finance_foundation`)

New enums: `FinanceDirection { INCOME EXPENSE }`, `FinanceFund { TEKUCE_ODRZAVANJE INVESTICIONO_ODRZAVANJE UPRAVLJANJE HITNE_INTERVENCIJE OSTALO }`.

New section `// ─── Layer 7 — Finance ───`:

```
FinanceEntity    id, buildingId? @unique, complexId? @unique, legalName, pib (9 digits), maticniBroj (8 digits),
                 address?, booksStartDate @db.Date, createdAt, updatedAt
                 + raw-SQL CHECK in migration: exactly one of buildingId / complexId is set
BankAccount      id, entityId, bankName, accountNumber @unique (normalised 18 digits), isPrimary, isActive,
                 openingBalance Decimal(14,2), createdAt, updatedAt
FinanceCategory  id, entityId? (null = global default), direction, fund?, code, name,
                 isOwnerPayment (bool), isMarketIncome (bool), isActive
Supplier         id, entityId, name, pib?, maticniBroj?, bankAccount?, isActive, createdAt, updatedAt
Invoice          id, entityId, supplierId, number, issueDate @db.Date, dueDate? @db.Date, amount Decimal(14,2),
                 categoryId, description?, fileId?, cancelledAt?, cancelReason?, createdBy, createdAt, updatedAt
                 @@unique([supplierId, number])
FinanceTransaction  id, bankAccountId, direction, amount Decimal(14,2), valueDate @db.Date, categoryId,
                 description, counterpartyName?, counterpartyAccount?, reference? (poziv na broj),
                 unitId? (owner payment), reversesId? @unique (storno), createdBy, createdAt
                 @@index([bankAccountId, valueDate])
InvoicePayment   transactionId, invoiceId, amount Decimal(14,2)   @@id([transactionId, invoiceId])
```

Back-relations are added on `Building`, `Complex`, `Unit`, `User`. Invoice status is **derived**, not stored: CANCELLED if `cancelledAt`, else PAID / PARTIALLY_PAID / UNPAID from Σ`InvoicePayment.amount` (net of reversed transactions), plus `isOverdue` when `dueDate < today` and not paid.

Global default categories are seeded in `prisma/seed.ts` and in the migration (so prod gets them), e.g.:
- **Prihodi:** Uplate vlasnika – tekuće održavanje / investiciono / upravljanje (`isOwnerPayment`); Zakup zajedničkih prostorija / krova (`isMarketIncome`); Kamata banke; Ostali prihodi.
- **Rashodi:** Struja zajedničkih prostorija; Voda; Čišćenje; Održavanje lifta; Naknada upravniku; Bankarske provizije; Osiguranje; DDD; PP aparati i hidranti; Hitne intervencije; Tekuće popravke; Investicioni radovi; Ostali rashodi.

### 1.3 Backend module `src/finance/`

Files: `finance.module.ts`, `finance.controller.ts`, `finance.service.ts` (profile, accounts, summary), `transactions.service.ts`, `invoices.service.ts`, `finance.util.ts` (bank account + PIB validation), `dto/*`. Registered in `src/app.module.ts`.

Reuse:
- `@InBuilding`, `@CurrentUser`, `@CurrentAccess` — `src/auth/access/access.decorators.ts`
- `isStaff()` — `src/auth/access/policies.ts`; add `canSeeRawBankData = isStaff` there.
- `PrismaService`, `prisma.$transaction` pattern from `src/users/users.service.ts`.
- `AccessCoverageCheck` will verify every new handler has a policy.

`finance.util.ts`:
- `normaliseAccountNumber("160-12345-67")` → zero-pads the middle part to 13 digits; `isValidAccountNumber` checks the control number (ISO 7064 MOD 97-10: `98 − (first16 × 100 mod 97)`).
- `isValidPib` (9 digits, mod-11 check digit), `isValidMaticniBroj` (8 digits).

Endpoints (all under `buildings/:buildingId/finance`; R = `@InBuilding()`, W = `@InBuilding(Role.UPRAVNIK)`):

| Method & path | Access | Purpose |
|---|---|---|
| `GET /` | R | Profile + bank accounts with current balances, or `{ configured: false }` |
| `PUT /profile` | W | Create/update FinanceEntity (legalName, pib, maticniBroj, address, booksStartDate) |
| `POST /bank-accounts` | W | Add account (bankName, accountNumber, openingBalance, isPrimary) |
| `PATCH /bank-accounts/:id` | W | bankName, isPrimary, isActive; accountNumber/openingBalance only while the account has no transactions (else 409) |
| `GET /summary?from&to` | R | Totals: income, expense, net; by fund; by category; opening/closing balance for range (default: current year) |
| `GET /categories` | R | Global + entity categories |
| `POST /categories`, `PATCH /categories/:id` | W | Entity-specific categories (global ones are read-only) |
| `GET /suppliers` | R | List |
| `POST /suppliers`, `PATCH /suppliers/:id` | W | Manage |
| `GET /transactions?from&to&direction&categoryId&bankAccountId&fund` | R | List, newest first. **Residents:** owner-payment rows have `counterpartyName/Account` stripped and `displayName = "Uplata – stan {unitNumber}"` (or "Uplata vlasnika" when no unit). Staff get raw data. |
| `POST /transactions` | W | Create; optional `invoicePayments: [{invoiceId, amount}]` (EXPENSE only; can't exceed open invoice amount → 422); `unitId` only on owner-payment categories |
| `POST /transactions/:id/reverse` | W | Storno: mirror entry; 409 if already reversed or is itself a reversal |
| `GET /invoices?status&supplierId&from&to` | R | List with derived status, paid amount, supplier, category, file |
| `GET /invoices/:id` | R | Detail + linked payments |
| `POST /invoices` | W | Create (fileId optional) |
| `PATCH /invoices/:id` | W | Metadata; `amount` only while no payments (409) |
| `POST /invoices/:id/cancel` | W | Cancel with reason; 409 if it has non-reversed payments |

Errors follow existing conventions: 401/403 from `AccessGuard`, 404 via `findFirstOrThrow` + `PrismaExceptionFilter`, 409 `ConflictException`, 422 validation.

Swagger decorators on all DTOs/controllers (as in `src/documents/`). **Postman:** add a "Finance" and "Files" folder to `apps/backend/postman/upravnik-platform.postman_collection.json` with full descriptions per `apps/backend/CLAUDE.md`, and a line per endpoint group in `apps/backend/postman/CHANGES.md`.

### 1.4 Frontend (Phase 1)

Read the relevant guide in `node_modules/next/dist/docs/` before writing (per `apps/frontend/AGENTS.md`).

- `lib/types.ts` — finance types (money as `string`).
- `lib/api/finance.ts`, `lib/api/files.ts` — same shape as `lib/api/documents.ts`.
- `hooks/useFinance.ts` — `useFinance(buildingId)`, `useFinanceSummary`, `useTransactions`, `useInvoices`, `useInvoice`, plus mutations (invalidate `['finance', buildingId, …]`); pattern of `hooks/useDocuments.ts`.
- `lib/format.ts` — `formatRSD(value: string)` with `Intl.NumberFormat('sr-Latn-RS', { style: 'currency', currency: 'RSD' })`, `formatAccountNumber`.
- Shared components `components/finance/`: `FinanceOverview` (balance cards per account + total, HOA card with legal name, PIB, MB, bank + account number with copy button, YTD income/expense by fund), `TransactionsTable` (filters, mobile card layout), `InvoicesTable`, `InvoiceDetailSheet` (PDF download via signed URL, payments list). Staff-only: `FinanceProfileDialog`, `BankAccountDialog`, `CreateTransactionDialog` (with invoice allocation), `ReverseTransactionDialog`, `CreateInvoiceDialog` (with upload), `SupplierDialog`.
- Resident page `app/(resident)/finances/page.tsx` (building = `buildings[0]`, like `app/(resident)/board/page.tsx`): tabs **Pregled · Transakcije · Fakture** (Moj stan arrives in Phase 2). Empty state if not configured: "Finansije zgrade još nisu podešene."
- Upravnik page `app/(upravnik)/buildings/[buildingId]/finances/page.tsx`: same components + controls ("same space, more controls"); setup CTA when not configured.
- Navigation: add `{ href: "/finances", label: "Finansije", icon: Wallet }` to `residentNav` in `components/AppSidebar.tsx` and resident items in `components/AppBottomNav.tsx` (check 6-item fit on phone; if it doesn't fit, put it in the existing overflow sheet); add `{ key: "finances", label: "Finansije", icon: Wallet }` to `buildingSubNav`.
- All copy in Serbian Latin; follow `apps/frontend/DESIGN.md` / `PageHeader` usage.

### 1.5 Tests (Phase 1)

- Unit: `src/finance/finance.util.spec.ts` (valid/invalid account numbers incl. short form, PIB check digit); `policies.spec.ts` addition for `canSeeRawBankData`.
- e2e `test/finance.e2e-spec.ts` using `test/fixtures.ts` actors; `StorageService` overridden with an in-memory fake in `createTestApp` (or via `overrideProvider` in this spec):
  - upravnikA sets up profile + account (opening 100 000,00), adds income 5 000 (owner payment, unit of residentA1) and expense 3 000 paying an invoice of 4 000 → balance 102 000,00, invoice PARTIALLY_PAID.
  - reverse the expense → balance 105 000,00, invoice UNPAID; second reverse → 409.
  - boardA: GET sees `counterpartyName`; POST → 403.
  - residentA1: GET transactions → owner payment shows `displayName "Uplata – stan …"`, no `counterpartyName`/`counterpartyAccount` keys; any write → 403.
  - residentB (building B) GET building A finance → 403; outsider → 403; inactiveA → 403.
  - invalid account number / PIB → 400/422; categoryId from another entity → 404.
  - upload: non-PDF → 422; download URL for another building's file → 404.

### 1.6 Phase 1 verification

1. `npm run db:up` (Postgres + RustFS) → `npx nx run @upravnik/backend:prisma:migrate` → seed.
2. `npx nx run-many -t lint test build` and backend e2e (`npm run test:e2e -w @upravnik/backend`) green.
3. Manual: `npm run dev`; as upravnik set up a building's finances, upload an invoice PDF, record payments; log in as a resident of that building on a phone-width viewport → see balances, transactions with "Uplata – stan X", download invoice PDF; resident of another building gets nothing.
4. Swagger (`/api/docs`) shows new endpoints; Postman collection updated.

---

## Phase 2 — Unit charges and debt (zaduženja)

- Schema: `UnitChargeType { MONTHLY OPENING ADJUSTMENT }`.
  - `FeeRule`: `entityId, fund, method PER_UNIT | PER_SQM | FIXED, amount, unitType? (null = default), validFrom, validTo?, decisionDocumentId?`. Override resolution: rule with matching `unitType` beats the default.
  - `UnitCharge`: `unitId, entityId, period (YYYY-MM), fund, type, amount, description?, createdBy, createdAt, cancelledAt?` with `@@unique([unitId, period, fund, type])` for MONTHLY.
  - `Unit.paymentReference`: a stable *poziv na broj* (model 97, derived from building + unit sequence), generated for all existing units in the migration.
- Payments: an owner-payment transaction with `unitId` is the payment. Unit balance = Σ charges (not cancelled) − Σ owner payments (not reversed) + opening debt. Allocation is FIFO by period for "overdue since" display only (no per-charge allocation table).
- Generation:
  - `GET /finance/charges/preview?period=2026-11`: per-unit lines; units missing `areaSqm` under a PER_SQM rule are flagged and **block** generation.
  - `POST /finance/charges/generate { period }`: idempotent, skips existing units. `POST /finance/charges/regenerate { period }` cancels and recreates only if no locked period.
  - Scheduler: `@nestjs/schedule` cron `0 6 1 * *` runs generate for every entity with an active rule and `autoGenerate = true` (flag on FinanceEntity).
- Opening debt: `POST /finance/units/:unitId/opening-balance { amount, asOf }` (one per unit, type OPENING).
- Endpoints: `GET /finance/units/:unitId/ledger`: resident may read **only their own unit** (`unit.userId === user.id`) → else 403; staff any. `GET /finance/arrears`: staff → per-unit list; residents → **aggregate only** (total outstanding, units in arrears count, collection rate %). `GET/POST/PATCH /finance/fee-rules` (W).
- Frontend: resident tab **Moj stan** (balance, charges/payments timeline, poziv na broj + account number to pay); building aggregates card on Pregled; upravnik: fee rules editor, monthly generate dialog with preview, arrears table, unit ledger drawer from the Members page.
- Notifications (via `NotificationsService.create`, as in `TicketsService.notifyStaff`): "Novo zaduženje za {mesec}" to each unit account on generate; "Uplata evidentirana" on owner payment with `unitId`; daily cron for overdue reminders (units with debt older than N days, configurable on FinanceEntity, default 30, max one reminder per unit per 7 days via a `lastReminderAt` field).
- Tests: allocation math (per unit, per m², type override, rounding to 0.01 with remainder rule documented), idempotent generation, resident cannot read other unit ledger, arrears response shape differs by role.

**As built (deviations from the above):**

- **FeeRule and charges:**
  - `FIXED` was dropped; `PER_UNIT` covers it.
  - A rule with amount `0` exempts a unit type from a fund.
  - Overlapping rules for the same fund + unit type return 409.
  - Every amount is rounded to 0.01 per unit, with no remainder spreading.
- **No unique index on MONTHLY charges.** Regenerate keeps cancelled rows next to the new ones, so duplicates are prevented by a per-HOA advisory lock (`pg_advisory_xact_lock`) around generation instead.
- **Generate is idempotent:**
  - It only issues lines never issued.
  - It does not reissue charges cancelled by hand.
  - Regenerate replaces only lines that differ (and reissues hand-cancelled ones).
- **Allowed months.** Manual generation is allowed from the books-start month to the current month; there is no period lock until Phase 4.
- **Dates:**
  - Monthly charges are dated the 1st of the period.
  - The opening balance has no `asOf`. It is dated `booksStartDate`, and there is one active per unit; cancel it to replace it.
  - Ad-hoc corrections are `POST /units/:unitId/charges`, type `ADJUSTMENT`, dated today.
- **Poziv na broj.** It is assigned lazily, not in the migration, in floor/number order as `CC-NNNN` (model 97 control digits). This happens on first generation or ledger read, under the same lock.
- **FinanceEntity settings:** `paymentTermDays` (default 30) and `autoGenerateCharges` (default false). Overdue = the unpaid remainder (FIFO) of charges older than the payment term.
- **Scheduler:**
  - Cron runs write no AuditLog row, because `performedBy` is required.
  - A failed auto-run notifies the building's upravnik.
  - Reminders run daily at 09:00.
- **Libraries.** `@nestjs/schedule` is pinned to 6.x; 12.x is ESM-only and breaks jest.
- **Frontend:**
  - The unit ledger drawer opens from the Zaduženja tab's unit list, not from the Members page.
  - The charge preview is staff-only (UPRAVNIK, BOARD_MEMBER).

## Phase 3 — Bank statement import (izvodi)

- `BankStatementImport` model: `id, bankAccountId, fileId, statementNumber?, statementDate, openingBalance, closingBalance, status DRAFT | COMMITTED, createdBy`. `FinanceTransaction` gains `source MANUAL | IMPORT`, `importId?`, `externalId?` with `@@unique([bankAccountId, externalId])` for dedupe.
- Parsers in `src/finance/import/`: **NBS XML statement format** first (used by ZgradIS and most Serbian e-banking exports); a configurable CSV mapper as fallback. Get real sample files from the user's banks before implementing, and use them as test fixtures.
- Flow: upload → parse → draft lines with proposed matches: owner payments by `reference` = `Unit.paymentReference` (model 97 validated), suppliers by counterparty account/PIB, invoices by number in purpose text → upravnik reviews/edits categories → commit (single `$transaction`). Statement opening balance must equal computed balance, else warn.
- Re-import of the same file creates no duplicates (dedupe test).

## Phase 4 — Budget (program održavanja) and reports

- `Budget { entityId, year, adoptedAt?, decisionDocumentId? }`, `BudgetLine { budgetId, categoryId, plannedAmount, note? }`; summary endpoint adds plan vs. actual per category/fund.
- `FinanceReport { entityId, from, to, documentId, publishedBy, publishedAt }`: publishing renders a PDF (`pdfkit` or similar, server-side, with a Serbian-Latin-capable font), stores via `StorageService`, creates a `Document` (category `REPORT`) and **locks** `[from, to]` (service-level guard on all writes). Contents: entity data, opening/closing balance per account, income and expense by fund and category, plan vs. actual, list of invoices, market income subtotal (PBN-1 relevance), aggregate arrears.
- Notify all residents "Objavljen finansijski izveštaj".
- Note: Documents still store a URL; Phase 4 either links `Document` to `StoredFile` (adds `fileId?`) or stores the internal download path — decide at Phase 4 start.

## Phase 5 — Complex level

- `GET complexes/:complexId/finance/summary` (`@InComplex()`): roll-up of all building entities (balances, income/expense by fund) + per-building breakdown, aggregates only.
- Pages: `app/(resident)/complexes/[complexId]/finances` and an upravnik equivalent.
- Model already permits a complex-owned `FinanceEntity`. If the user later confirms complexes have their own HOA, add W endpoints under `complexes/:complexId/finance` reusing the same services keyed by entity, and optionally cost sharing across buildings.

## Later (not scheduled)

- SEF API import of supplier e-invoices into `Invoice` (+ PDF).
- NBS IPS QR on unit statement; late-payment interest; Excel export; open-banking feeds.

## Open items to settle during implementation

- Exact bottom-nav placement on phone (fit check).
- Phase 3 needs real sample statement files from the banks used.
- Phase 4 PDF library choice and the Document ↔ StoredFile link.
- Have a lawyer or accountant review the report template before launch.
