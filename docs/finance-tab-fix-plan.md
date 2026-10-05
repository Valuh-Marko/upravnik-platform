# Finance tab: critique fix plan

Source: Impeccable critique of the Finance tab, run on 2026-10-04 against the uncommitted `feat/finance-phase-1` working tree. The critique covered every file in `apps/frontend/components/finance/`, both route pages, `hooks/useFinance.ts`, `lib/api/finance.ts`, `lib/format.ts`, `lib/chips.ts` and `lib/csv.ts`.

This plan is written for a future agent. Work through the phases in order. Each finding has an ID, a severity, a location, what is wrong, the fix, and how to verify it. Paths are relative to `apps/frontend/` unless they start with `apps/` or `docs/`.

Severity:

- **P0**: blocks a core task.
- **P1**: a significant UX or correctness problem.
- **P2**: friction or inconsistency.
- **P3**: polish.

## Ground rules for the implementer

- Follow the repo root `CLAUDE.md`: surgical changes, and every changed line traces to a finding below. Do not refactor beyond the finding.
- Follow `apps/frontend/CLAUDE.md`, `apps/frontend/AGENTS.md` and `DESIGN.md`. This is Next.js 16, so read `node_modules/next/dist/docs/` before touching routing or search-param APIs.
- Copy is Serbian (Latin script). Never ship English strings to users.
- Use semantic tokens (`text-muted-foreground`, `bg-muted`, `var(--success-text)` and so on). Never use raw `stone-*`, `gray-*`, `slate-*` or palette ramps. Chip and status maps belong in `lib/chips.ts`.
- **One Pine Rule:** pine means "act here". It never marks status or a label.
- Cards and dialogs use a 20px radius (`rounded-xl`). Controls use 12px (`rounded-md`). `rounded-lg` (16px) is for large frame panes only.
- Mono font is for numbers, amounts, account numbers and dates only.
- The page has one headline size. Hero numbers must not invent a new display size; see F-21.
- **Money:** amounts arrive as decimal strings. Never sum or divide them with `Number` for anything that is displayed as a total. See F-14.
- If a phase changes a backend endpoint, update `apps/backend/postman/upravnik-platform.postman_collection.json` and `apps/backend/postman/CHANGES.md` in the same change.
- Do not add a Co-Authored-By or Claude attribution line to commits.
- After each phase, run `npx nx run @upravnik/frontend:lint` and `npx nx run @upravnik/frontend:build`. If the backend changed, also run `npx nx run @upravnik/backend:test` and the e2e suite.
- Verify UI changes in the browser at desktop width (1280px) and mobile width (375px). Check three roles: an upravnik, a board member and a resident with a unit.

---

## Phase 0: Blocker (do first, ship alone)

### F-01 · P0 · The finance profile can never be saved (fixed 2026-10-04)

> Fixed during the critique session: the regex is corrected and lint passes. The future agent only needs to run the browser verification below.

- **Where:** `components/finance/ManageDialogs.tsx:72`
- **Problem:** `const termValid = /^d{1,3}$/.test(form.paymentTermDays) && …`. The regex is missing a backslash, so it matches the literal letter `d`, not digits. For any numeric input `termValid` is always false. As a result:
  - "Sačuvaj" in `FinanceProfileDialog` is permanently disabled.
  - The payment-term field shows `aria-invalid` from the moment it renders.
  - The upravnik cannot set up finances for a new building ("Podesi finansije") or edit the HOA profile.

  This bug is already in the committed HEAD (`48d3d0c`).
- **Fix:** change the regex to `/^\d{1,3}$/`.
- **Verify:**
  1. As an upravnik, open a building with no finance profile and click "Podesi finansije".
  2. Fill in the form with a payment term of `15`. The field must not be marked invalid, and "Sačuvaj" must be enabled.
  3. Save. The Pregled tab should appear.
  4. Reopen the dialog from Pregled, change the term to `400`, and confirm the field is invalid. Change it to `30` and confirm it saves.
- **Also:** `grep -rn "/\^d" components lib hooks app` to rule out the same typo elsewhere.

---

## Phase 1: State, errors and navigation (P1) (implemented 2026-10-04)

> Implemented and checked with lint, build, backend unit tests and e2e. Browser verification of each **Verify** step is still to do. Deviations and choices:
>
> - **F-04:** tab changes use `router.push(…, { scroll: false })`, not `router.replace`, because the verify step needs Back/Forward to move between tabs. `FinanceView` wraps itself in `<Suspense>` so the static `/finances` route still prerenders. Sheet deep links (`?invoice=`) were not added.
> - **F-05:** chose the first option. A resident with a unit lands on Moj stan, and it is listed first.
> - **F-06:** primary tabs are Moj stan (residents with a unit), Pregled, Knjiženje (Transakcije, Fakture, Uvoz for staff), Stanari (Zaduženja, staff only) and Godišnje (Plan, Izveštaji). Each role sees four. A secondary pill row appears when the group has more than one tab. Residents keep Plan under Godišnje, next to Izveštaji.
> - **F-07:** `useFinanceMutation` takes a success message and announces it through `FinanceFeedbackContext` into a polite live region in `FinanceView` (visible for 4 s). New transactions and invoices are highlighted with `--info-subtle` (not pine). Statement line edits stay silent because they happen on every review click.
> - **F-10:** the response stays a plain array. `q`, `take` (1–200) and `skip` are optional, and without `take` the whole range is returned, so the invoice pickers are unchanged. Residents cannot search the hidden payer fields of owner payments. Transakcije defaults to the current year (the API already did). Fakture defaults to "Sve godine" so last year's unpaid invoices stay visible. Page size is 50.

### F-02 · P1 · A failed load is shown as "not configured"

- **Where:** `components/finance/FinanceView.tsx:31-53`
- **Problem:** if `useFinance` errors, `isLoading` is false and `overview` is undefined. The view then says "Finansije zgrade još nisu podešene." and offers the upravnik "Podesi finansije". A network or 500 error looks like an empty building and invites the upravnik to create a duplicate profile.
- **Fix:**
  - Read `error` and `refetch` from `useFinance`.
  - When `error` is set, render an error state instead: "Finansije trenutno nisu dostupne." plus a "Pokušaj ponovo" button wired to `refetch()`.
  - Only show the "not configured" state when `overview?.configured === false`.
- **Verify:** block `/finance` in DevTools (request blocking). You should see the error state with a retry button. Unblock, click retry, and the overview should load.

### F-03 · P1 · Errors leave skeletons spinning forever

- **Where:**
  - `InvoiceDetailSheet.tsx:38`
  - `UnitLedger.tsx:192-202` (`UnitLedgerSheet`)
  - `ImportsTab.tsx:470` (`StatementSheet`)
  - `Arrears.tsx:52` (`ArrearsTable`)
  - `Arrears.tsx` (`ArrearsCard`, which returns null on error)
  - `TransactionsList.tsx:24-60`
  - `InvoicesList.tsx`
  - `ChargesTab.tsx:63`
  - `BudgetTab.tsx:51`
  - `ReportsTab.tsx:79`
- **Problem:** these use `isLoading || !data ? <Skeleton/>`. On error `data` stays undefined, so the skeleton never resolves. `ArrearsCard` hides itself silently. Only `MyUnitTab` handles `error`.
- **Fix:**
  - Add one small shared `QueryError` component to `components/finance/form.tsx`. It shows Serbian copy, a retry button calling `refetch`, and `role="alert"`.
  - In every listed place, branch on `error` before the skeleton check.
  - For `ArrearsCard`, render a compact inline error line rather than `null`.
- **Verify:** block each endpoint in turn. Every surface must show the error with a working retry. No skeleton should stay on screen longer than the request.

### F-04 · P1 · Tab state is not in the URL

- **Where:** `FinanceView.tsx:26`
- **Problem:** `useState<Tab>('overview')` means:
  - a reload or the back button drops the user on Pregled;
  - a specific view (for example an unpaid invoice list) can't be linked;
  - a notification can't deep-link to "Moj stan".
- **Fix:**
  - Store the tab in a `?tab=` search param using `useSearchParams` and `router.replace` (check the Next 16 docs first).
  - Validate the value against the role's allowed tabs and fall back to the role default (F-05).
  - Optionally, store the open invoice, transaction or statement id in `?invoice=` and similar params so sheets can be deep-linked. Do this only if it stays small.
- **Verify:** switch to Fakture and reload; you should stay on Fakture. Back and forward should move between tabs. `?tab=imports` as a resident should fall back to the default.

### F-05 · P1 · The resident's first view is the building, not their debt

- **Where:** `FinanceView.tsx:26,64`
- **Problem:** PRODUCT.md says to put "what did I miss" first. A resident's first question is "do I owe anything, and how do I pay?". Today they land on Pregled, which shows building balances and plan-vs-actual, and "Moj stan" is a second click.
- **Fix:**
  - When `unitId` is set, default the tab to `'unit'` and list "Moj stan" first.
  - Alternatively, add a compact "Vaš stan" summary at the top of Pregled: balance, overdue amount, and a "Detalji i uplata" link. Choose one approach and note it in the PR.
  - Staff keep Pregled as the default.
- **Verify:** log in as a resident with a unit. The first screen shows their balance and payment details.

### F-06 · P1 · Staff navigation is an 8-option segmented control

- **Where:** `FinanceView.tsx:58-70`, `form.tsx:70-95`
- **Problem:** staff get Pregled, Zaduženja, Transakcije, Fakture, Uvoz, Plan and Izveštaji, plus Moj stan for residents. That is too many for a segmented control, which should hold four or fewer peers. The tabs also mix different kinds of work:
  - **Daily:** Transakcije, Fakture, Uvoz.
  - **Monthly:** Zaduženja.
  - **Yearly:** Plan, Izveštaji.

  On mobile the bar scrolls sideways with no affordance. It uses `role="radiogroup"`, but it is navigation.
- **Fix:**
  - Turn the control into a real tab list (`role="tablist"`/`tab`/`tabpanel` with `aria-controls`) or link-style navigation backed by F-04.
  - Group the tabs:
    - **Pregled**
    - **Knjiženje:** Transakcije, Fakture, Uvoz
    - **Stanari:** Zaduženja
    - **Godišnje:** Plan, Izveštaji

    This can be a primary row of four plus a secondary row, or a primary row with a "Više" overflow. Keep it simple and match the existing building-tab pattern in `app/(upravnik)/buildings/[buildingId]/` if there is one.
  - Residents see at most four: Moj stan, Pregled, Transakcije/Fakture, Izveštaji.
- **Verify:** at 375px every destination is reachable without hidden horizontal scroll. Keyboard: arrow keys move between tabs and Tab moves into the panel.

### F-07 · P1 · Mutations give no success feedback

- **Where:**
  - `hooks/useFinance.ts`: every mutation.
  - Dialogs: `CreateTransactionDialog`, `CreateInvoiceDialog`, `ManageDialogs`, `ChargesTab`, `BudgetTab`, `ReportsTab`, `ImportsTab`.
- **Problem:** `onSuccess` only closes the dialog. After "Proknjiži", "Storno", "Objavi", "Proknjiži N stavki" or "Odbaci", nothing confirms what happened. A screen-reader user hears nothing. This fails "trust through closure" for an accounting surface.
- **Fix:**
  - The app has no toast system (`components/ui` has no toaster, and `sonner` is not installed). Do not add one just for this.
  - Instead, add a polite live region to `FinanceView`: one `<p role="status" aria-live="polite">`, fed through a tiny context or callback.
  - Each mutation's `onSuccess` sets a short Serbian message, for example:
    - "Transakcija proknjižena."
    - "Faktura sačuvana."
    - "Izveštaj objavljen."
    - "Proknjiženo 12 stavki."
  - Show the message visibly for about 4 seconds near the tab header.
  - Also, briefly highlight the new row (subtle background, then fade) after creating a transaction or invoice.
  - If the team would rather add `sonner` app-wide, raise it as a question instead of doing it here.
- **Verify:** every create, update, reverse, cancel, publish, commit and discard action announces itself visually, and VoiceOver or NVDA reads the message.

### F-08 · P1 · Re-running a charge calculation needs confirmation

- **Where:** `ChargesTab.tsx:379-385`
- **Problem:** "Ponovni obračun (n)" calls `generate.mutate({ period, regenerate: true })` straight away. This cancels and reissues charges that residents may already have seen or paid against. Nothing explains the consequence and nothing asks for confirmation.
- **Fix:**
  - Use the same inline-confirm pattern as Reports publish (`ReportsTab`) and statement discard (`ImportsTab.tsx:583-604`).
  - First click shows: "Ponovni obračun poništava {n} izdatih zaduženja za {period} i izdaje nova. Stanari će videti izmenjene iznose." followed by "Da, ponovo obračunaj" and "Odustani".
- **Verify:** clicking once does not change data. Confirming regenerates. The count in the copy matches `changedCount`.

### F-09 · P1 · An invoice payment amount can exceed the transaction or the open amount

- **Where:** `CreateTransactionDialog.tsx:49-94`
- **Problem:** `invoiceAmount` is pre-filled, but the user can edit it to more than the transaction amount or more than `invoice.openAmount`. The only check is on the server, and its error may come back as raw English (F-12).
- **Fix:**
  - Validate on the client: `0 < invoiceAmount ≤ min(amount, openAmount)`. Compare in integer paras, not floats (F-14).
  - Mark the field `aria-invalid` and add a Serbian hint ("Najviše {iznos}").
  - Include this check in `valid`.
  - Also, when an invoice is picked and the counterparty is empty, auto-fill the counterparty with `invoice.supplier.name`.
- **Verify:** pay 5.000 against an invoice with 3.000 open. The field is invalid and submit is disabled. Pick an invoice and the counterparty fills in.

### F-10 · P1 · Lists are unbounded

- **Where:** `lib/api/finance.ts` (transactions and invoices), `TransactionsList.tsx`, `InvoicesList.tsx`, plus the backend `apps/backend/src/finance/transactions.service.ts` and `invoices.service.ts`.
- **Problem:** both lists fetch every row the building has ever had. A building with several years of daily bank imports will grow to thousands of rows. The lists also have no date range or text search, which an upravnik needs ("find the payment from Petrović in March").
- **Fix:**
  - **Backend:** add `from`/`to` date params, a `q` param (search counterparty, purpose and invoice number) and cursor or `take`/`skip` paging. Keep the existing response shape behind a `{ items, nextCursor }` wrapper, or add new params without breaking the old shape. Update the Postman collection and `CHANGES.md`.
  - **Frontend:**
    - Use `useInfiniteQuery` with a "Učitaj još" button. Do not auto-scroll-load; it is better for keyboard and screen-reader users.
    - Add a period picker that defaults to the current year.
    - Add a search input with a 300ms debounce.
- **Verify:** seed about 500 transactions. The first load is one page. The filters narrow results. E2E tests cover the new params.

---

## Phase 2: Correctness of money and dates (P1/P2) (implemented 2026-10-04)

> Implemented and checked with lint, build and tests. Notes:
>
> - **F-11:** `formatDateTime` is used for imports `createdAt`, invoice and charge `cancelledAt`, and report `publishedAt`. `adoptedAt` is a `@db.Date` field and keeps `formatDate`.
> - **F-12:** the backend validation messages and field labels are Serbian, and `errorMessage` maps status codes (400 → "Proverite unete podatke.", 403, 404, 413; 409/422 pass the Serbian server text through).
> - **F-13:** tests live in `apps/frontend/lib/format.test.ts`. They run with Node's built-in runner (`npx nx run @upravnik/frontend:test`), so no test dependency was added; `allowImportingTsExtensions` was enabled in the frontend tsconfig for the `./format.ts` import. Money fields now show an "Npr. 12.500,00" hint. The budget table inputs keep their "Iznos (RSD)" placeholder because there is no room for a hint.
> - **F-14:** `toParas`/`fromParas` are used for the budget totals and the invoice-payment checks in `CreateTransactionDialog` (F-09). The remaining `Number(…)` uses are sign checks or rounded display percentages, so they are kept as the plan allows.

### F-11 · P1 · `formatDate` shows the wrong day for timestamps near midnight

- **Where:** `lib/format.ts:51`
- **Problem:** `iso.slice(0, 10)` takes the UTC calendar date. Some fields are full timestamps (`createdAt`, `cancelledAt`, `publishedAt`, `committedAt`). Belgrade is UTC+1 or UTC+2, so an action at 00:30 local time shows as the previous day. Pure date fields such as `valueDate`, `issueDate` and `dueDate` are fine.
- **Fix:**
  - Split the function in two:
    - `formatDate(dateOnly)` keeps the current slicing.
    - `formatDateTime(timestamp)` uses `toLocaleDateString('sr-Latn-RS', { timeZone: 'Europe/Belgrade' })` and optionally shows the time.
  - Switch every timestamp call site to `formatDateTime`. Find them with `grep -rn "formatDate(.*\(At\|createdAt\))" components/finance`.
- **Verify:** a fixture `cancelledAt: '2026-03-14T23:30:00Z'` renders as 15.3.2026.

### F-12 · P1 · Raw server validation messages reach users

- **Where:** `components/finance/form.tsx:8-16` (`errorMessage`)
- **Problem:** Nest's `ValidationPipe` returns English messages such as "amount must be a decimal string". These are shown verbatim, joined with ` · `.
- **Fix:**
  - For a 400 response with an array message, show a generic Serbian line: "Proverite unete podatke." Keep the raw text out of the UI; logging it with `console.error` in dev is fine.
  - Only pass through single-string messages from finance services that are known to be Serbian. Check `apps/backend/src/finance/*.ts` to confirm all thrown `BadRequestException`/`ConflictException` messages are Serbian, and translate any that are not.
  - Map the common status codes: 403 → "Nemate dozvolu za ovu radnju.", 409 → use the server message, 413 → keep the existing handling.
  - **Backend (confirmed English sources):**
    - `apps/backend/src/finance/dto/validators.ts:20` builds `${propertyName} ${message}`, which produces messages such as "pib must be a valid 9-digit PIB" or "amount must be a positive amount…". Translate the rule messages to Serbian and replace the property name with a Serbian field label (a small `FIELD_LABELS` map in the same file).
    - `apps/backend/src/finance/finance.util.ts:62` and `apps/backend/src/finance/reports.service.ts:154` throw `'"from" must not be after "to"'`. Change both to "Datum „od“ ne može biti posle datuma „do“."
    - Update the e2e tests that assert on these messages, and note the change in `apps/backend/postman/CHANGES.md`.
  - **Row-level commit errors:** import commit errors come back as "Red N: …" (`apps/backend/src/finance/imports.service.ts:310,326`). Map them to the line they belong to; see F-43.
- **Verify:** send an invalid DTO through the dev tools. The UI shows Serbian text only.

### F-13 · P2 · Money input rejects Serbian thousands separators

- **Where:** `lib/format.ts:62-67` (`parseMoneyInput`)
- **Problem:** dots are only stripped when the input also has a comma. So "12.500" (twelve thousand five hundred, written the Serbian way) fails the 2-decimal regex and the field silently becomes invalid. "1.500.000" also fails. The user isn't told why.
- **Fix:**
  - If there is no comma and the dots form valid thousands groups (`/^\d{1,3}(\.\d{3})+$/`), strip the dots.
  - Make the hint on money fields say the format: "npr. 12.500,00".
- **Verify:**
  - Unit tests in a small `lib/format.test.ts`, or the existing test location: "12.500" → "12500.00", "1.500.000,50" → "1500000.50", "12,5" → "12.50", "12.50" → "12.50".
  - Separately, "12.5" is ambiguous and must stay accepted as 12.50.

### F-14 · P2 · Totals and percentages use float maths

- **Where:**
  - `BudgetTab.tsx:73` (`reduce(... + Number(...))`)
  - `FinanceOverview.tsx:177` (plan %)
  - `UnitLedger.tsx:30,42`
  - `CreateTransactionDialog.tsx:73`
  - `Arrears.tsx:59,79`
- **Problem:** summing decimal strings with `Number` can drift by a para on large budgets (the classic 0.1 + 0.2 case). Today it's mostly display-only, but budget totals are shown as authoritative.
- **Fix:**
  - Add two helpers to `lib/format.ts`:
    - `toParas(s: string): bigint`, which parses "1234.56" to 123456n;
    - `fromParas`.
  - Use them for the budget sum and the invoice-amount comparisons.
  - Sign and zero checks (`Number(x) > 0`) are fine to keep.
  - Only use percentages for display, and round them.
- **Verify:** a budget with lines 0.10 + 0.20 totals 0.30 exactly.

---

## Phase 3: Design-system conformance (P2) (implemented 2026-10-04)

> Implemented and checked with lint, build, frontend tests, backend unit tests and e2e. Browser verification of each **Verify** step is still to do. Notes:
>
> - **F-15:** `financeCard` and `eyebrow` live in `components/finance/form.tsx`. The two `rounded-lg` left in `components/finance` are the segmented-tab tracks (`FinanceView` `TabList`, `form.tsx` `Segmented`), which are controls, not cards.
> - **F-17:** finance chips use the status tokens with icons; `PARTIALLY_PAID` uses the info tone and a half-filled icon. Raw ramps outside finance (home page `bg-green-500` / `text-pine-600`, `AppBottomNav`) are untouched; mention them in the PR.
> - **F-18:** overdue is **warning** everywhere, through `overdueText` in `lib/chips.ts`.
> - **F-19:** `unitTypeLabel` moved to `lib/chips.ts`.
> - **F-23:** added `components/ui/checkbox.tsx` and replaced the raw checkboxes.

### F-15 · P2 · Card radius is 16px instead of 20px, and card/eyebrow constants are copied across files

- **Where:**
  - `const card` / `const eyebrow` in `FinanceOverview.tsx:11-12`, `Arrears.tsx:9-10`, `BudgetTab.tsx:16-17`, `ReportsTab.tsx:15-16`, `UnitLedger.tsx:18-19` and `ChargesTab.tsx:26`.
  - An inline eyebrow at `InvoiceDetailSheet.tsx:144`.
  - `rounded-lg` list containers in every list.
- **Problem:** DESIGN.md says cards are 20px (`rounded-xl`, `--radius-xl`), and `components/ui/card.tsx` already uses `rounded-xl`. The eyebrow uses `text-stone-500`, a raw ramp.
- **Fix:**
  - Export `financeCard` and `eyebrow` from `components/finance/form.tsx` (or reuse `components/ui/card.tsx` if it fits without restyling) with `rounded-xl` and `text-muted-foreground`.
  - Import them everywhere and delete the copies.
  - Change list containers (`ul.divide-y … rounded-lg`) to `rounded-xl`.
  - Skeleton placeholders follow the shape they stand in for.
- **Verify:** `grep -rn "rounded-lg\|stone-" components/finance` returns only intentional frame-level uses (expected: none).

### F-16 · P2 · Raw `stone` hover colour on list rows

- **Where:** `Arrears.tsx:65`, `InvoicesList.tsx:53`, `ImportsTab.tsx:98`, and the transactions rows if they are clickable.
- **Fix:**
  - Use `hover:bg-muted` (or the hover alias DESIGN.md defines for clickable rows).
  - Add `focus-visible:bg-muted focus-visible:outline-none` with the standard ring so keyboard users get the same signal.
  - "Lift means click": make sure non-clickable rows have no hover.
- **Verify:** compare against the hover on the building's other list rows (for example the Documents or Announcements list).

### F-17 · P2 · Pine is used for status labels, and finance chips use raw colour ramps

- **Where:**
  - `ChargesTab.tsx:238` (`NEW: 'text-pine-700'`).
  - `FinanceOverview.tsx:76` (the "Primarni" label in `text-pine-700`).
  - `lib/chips.ts:78-86`:
    - `invoiceStatus.PAID` uses `bg-green-100 text-green-700`.
    - `CANCELLED` uses `stone-*`.
    - `UNPAID` and `PARTIALLY_PAID` share one style, so they look identical.
    - The chips have no icons, so status is shown by colour alone.

  Check whether the non-finance chips in `lib/chips.ts` use the same ramps. If they do, that is a pre-existing convention: fix only the finance maps and mention the rest in the PR.
- **Problem:** this breaks the One Pine Rule. Pine must only mean "act here".
- **Fix:**
  - Move charge-line statuses (`NEW`, `CHANGED`, `UNCHANGED` and so on) into `lib/chips.ts` as a `chargeLineStatus` chip map. Use the info or neutral status tokens and render them with `ChipBadge`.
  - Render "Primarni" as a neutral chip or as muted text.
  - Give `PARTIALLY_PAID` a visual difference from `UNPAID`, such as a different status token or a half-filled icon.
  - Move `PAID` and `CANCELLED` onto the status tokens.
- **Verify:** `grep -rn "pine-" components/finance` returns only buttons or links, if anything.

### F-18 · P2 · Overdue colour is inconsistent

- **Where:** `Arrears.tsx` (danger), `UnitLedger.tsx:64` (warning)
- **Problem:** the same fact ("overdue") is red in the staff arrears list and amber on the resident's ledger.
- **Fix:**
  - Pick one meaning. Recommendation: **warning** for overdue (it can still be acted on). Reserve danger for errors or destructive actions, and for overdue amounts past a threshold only if the product wants escalation.
  - Put the choice in `lib/chips.ts` (for example `overdueTone`) and use it in both places.
- **Verify:** check the same unit in the staff arrears list and in the resident view. The colour must match.

### F-19 · P2 · Cross-route import of `unitTypeLabel`

- **Where:** `Arrears.tsx:3`, `ChargesTab.tsx:5`, `UnitLedger.tsx:5`, `ImportsTab.tsx:5`, all importing from `@/app/(super-admin)/create/units`.
- **Problem:** finance components (used by resident routes) depend on a super-admin route module, which is the wrong direction for dependencies.
- **Fix:**
  - Move `unitTypeLabel` to `lib/labels.ts`, or to `lib/chips.ts` if a labels map already lives there.
  - Re-export it from the old location so super-admin code doesn't change, or update its import too. Prefer updating, since it is one line.
- **Verify:** `grep -rn "(super-admin)" components/finance` returns nothing.

### F-20 · P2 · `Segmented` lacks roving focus and uses the wrong focus ring

- **Where:** `form.tsx:70-95`
- **Problem:**
  - It declares `role="radiogroup"`/`radio` but has no arrow-key handling, so every option is a separate Tab stop. That is the wrong pattern for a radio group.
  - The focus ring is `ring-2` rather than the DESIGN.md 3px at 50% (`focus-visible:ring-3 focus-visible:ring-ring/50`), which the inputs in the same file already use.
- **Fix:**
  - Add roving `tabIndex` (0 on the checked option, -1 on the others) and ArrowLeft/Right/Home/End handling.
  - Change the ring classes.
  - After F-06, the main navigation won't use this component, but the invoice-status filter, the amount-mode toggle and others still will.
- **Verify:** Tab into the invoice status filter; the arrows move between options and a second Tab leaves the group.

### F-21 · P2 · Hero numbers use an extra display size

- **Where:** `FinanceOverview.tsx:58` (`text-3xl` balance), `UnitLedger.tsx:57`
- **Problem:** DESIGN.md allows one 1.5rem headline per page. `text-3xl` (1.875rem) creates a second display size. The balance is a number and should be mono with `tabular-nums`; the overview balance is missing mono.
- **Fix:**
  - Use the page headline size (`text-2xl`, 1.5rem) with `font-mono tabular-nums font-semibold`.
  - Hierarchy comes from placement and the eyebrow label, not size.
- **Verify:** compare side by side with the page title. There is one big size on screen.

### F-22 · P2 · The no-debt state shows no amount

- **Where:** `UnitLedger.tsx:52-62`
- **Problem:** when the balance is 0 it says "Nema dugovanja" and hides the amount. That's fine, but it lacks the reassurance PRODUCT.md asks for (trust through closure).
- **Fix:**
  - Show "0,00 RSD" in muted mono under "Nema dugovanja".
  - Add a short line: "Sve obaveze su izmirene." If the API exposes the last payment date, show "poslednja uplata {datum}" there.
- **Verify:** check a resident with a zero balance.

### F-23 · P2 · Raw checkboxes

- **Where:** `ManageDialogs.tsx` (several), `ImportsTab.tsx:718-727`
- **Fix:**
  - The UI kit has no checkbox. Add `components/ui/checkbox.tsx` with the shadcn add command, using the repo's shadcn config, and style it to DESIGN.md controls.
  - Replace the raw inputs.
  - If adding a UI primitive is out of scope for the team, at minimum use `accent-primary size-4` consistently with a visible focus ring.
- **Verify:** keyboard toggling and the focus ring.

---

## Phase 4: Workflow friction (P2) (implemented 2026-10-04)

> Implemented and checked with lint, build, frontend tests, backend unit tests and e2e. Browser verification of each **Verify** step is still to do. Deviations and choices:
>
> - **F-24:** `CreateTransactionDialog` takes a `payInvoice` prop instead of `initial` plus a controlled `open`; it renders its own "Evidentiraj plaćanje" trigger in the sheet. Suppliers have no default category, so the category is pre-filled from the invoice's own category.
> - **F-25:** "+ Novi dobavljač" is a button next to the supplier select (the `SupplierDialog` trigger), not an option inside it. The new supplier is selected and the typed fields are kept.
> - **F-26:** took the alternative: helper text next to the disabled button ("Prvo dodajte tekući račun zgrade…").
> - **F-27:** a dirty form blocks outside click and Escape (`guardDirty` in `form.tsx`); there is no confirm prompt. "Otkaži" closes it deliberately.
> - **F-28:** the owner's surname is not shown; the units payload doesn't carry it.
> - **F-31:** done last, in its own step, after every import finding. `imports/ImportsList.tsx` still exports `ImportsTab`, so only the import path in `FinanceView` changed; the moved code is line-for-line identical apart from imports.
> - **F-32:** the filter takes a snapshot of the matching lines when it is chosen, so a line being fixed doesn't drop out of view.
> - **F-33:** the header row uses the existing `columnLabel` letters, with the mapped role (Datum, Iznos…) under the letter.

### F-24 · P2 · No path from an invoice to its payment

- **Where:** `InvoiceDetailSheet.tsx`
- **Problem:** to pay an invoice the upravnik has to close the sheet, go to Transakcije, open "Nova transakcija", choose expense, and find the invoice again in a dropdown.
- **Fix:**
  - For `UNPAID` or `PARTIALLY_PAID` invoices with `canWrite`, add a "Evidentiraj plaćanje" button in the sheet.
  - It opens `CreateTransactionDialog` pre-filled with:
    - direction = expense;
    - `invoiceId`;
    - amount = `openAmount`;
    - counterparty = supplier;
    - category = the supplier's default category, if one exists.
  - This needs `CreateTransactionDialog` to accept an `initial` prop and a controlled `open`.
- **Verify:** pay an invoice from its sheet. The status becomes `PAID` and the sheet updates.

### F-25 · P2 · A supplier must exist before the invoice

- **Where:** `CreateInvoiceDialog.tsx` ("Prvo dodajte dobavljača")
- **Fix:**
  - Add a "+ Novi dobavljač" option in the supplier select. It opens `SupplierDialog` stacked or inline.
  - On success, select the new supplier and keep the invoice form's state.
- **Verify:** create an invoice for a new supplier without losing the typed fields.

### F-26 · P2 · Disabled primary actions don't say why

- **Where:** `CreateTransactionDialog.tsx:110`, `ImportsTab.tsx:261` (both `disabled={activeAccounts.length === 0}`), and the commit button at `ImportsTab.tsx:594`, which is partly explained already.
- **Fix:**
  - When there is no active account, keep the button enabled. Clicking it should explain "Prvo dodajte tekući račun zgrade." with a link to the Pregled account dialog.
  - Alternatively, render that helper text next to the disabled button.
  - Never leave a silently disabled button.
- **Verify:** archive every account. Both buttons explain themselves.

### F-27 · P2 · Posting a transaction has no review step, and a filled form can be lost

- **Where:** `CreateTransactionDialog.tsx:222`, and every finance dialog.
- **Problem:**
  - "Proknjiži" posts immediately, and a posted transaction can only be reversed (storno), which leaves a permanent pair.
  - Clicking outside the dialog discards a half-filled form without warning.
  - There is no "Otkaži" button.
- **Fix:**
  - Add a one-line summary above the footer, for example: "Uplata 12.500,00 RSD na Intesa · Stan 14 · Održavanje".
  - Add an "Otkaži" ghost button.
  - When the form is dirty, block outside click and Escape from closing (`onInteractOutside`/`onEscapeKeyDown` → `preventDefault`) or ask for confirmation. Apply this to the transaction, invoice, budget and statement-upload dialogs.
- **Verify:** fill half the form and click outside. It doesn't close (or it asks first).

### F-28 · P2 · Unit selects show only the number

- **Where:** `CreateTransactionDialog.tsx:170`
- **Problem:** "14" is ambiguous between Stan 14, Lokal 14 and Garaža 14. `ImportsTab.tsx:697` already prefixes the type.
- **Fix:** render `{unitTypeLabel[u.type]} {u.unitNumber}` and, if available, the owner's surname.
- **Verify:** a building with a garage and a flat that share a number.

### F-29 · P2 · Decision-document pickers list every document

- **Where:** `ChargesTab.tsx:110,218`, `BudgetTab.tsx:119,192`
- **Fix:**
  - Filter to the Decision category (check the documents category enum in `lib/types.ts`).
  - Keep the currently linked document visible even if it has been recategorised.
  - Add an empty-state option: "Nema odluka. Otpremite odluku u Dokumentima."
- **Verify:** only decisions appear.

### F-30 · P2 · The unit ledger sheet is crowded

- **Where:** `UnitLedger.tsx` (`UnitLedgerSheet`: the opening-balance and adjustment forms always show under the ledger)
- **Fix:**
  - Collapse the two forms behind "Početno stanje" and "Korekcija" buttons that expand inline, one at a time.
  - Keep the ledger as the main content of the sheet.
- **Verify:** the sheet opens on the ledger with no form fields visible.

### F-31 · P2 · `ImportsTab.tsx` is 744 lines

- **Where:** `components/finance/ImportsTab.tsx`
- **Fix:** split it into three files, moving code only with no behaviour change:
  - `imports/ImportsList.tsx`
  - `imports/UploadStatementDialog.tsx` (the mapping UI)
  - `imports/StatementSheet.tsx` (the review, `LineRow`)

  Do this split **after** the import-related findings in this plan are fixed, in its own commit.
- **Verify:** the build passes and the behaviour is identical.

### F-32 · P2 · Statement line review is one long uncollapsed list

- **Where:** `ImportsTab.tsx:560-573`
- **Problem:** a monthly statement can have more than 100 lines. Blocked lines (`issues.length > 0`) are scattered through it, so the upravnik has to scroll to find what stops the commit.
- **Fix:**
  - Add a filter above the list: "Sve · Za dopunu ({blocked}) · Preskočene · Duplikati", defaulting to "Za dopunu" when `blocked > 0`.
  - Make the blocked-count sentence a button that applies that filter.
- **Verify:** import a statement with 3 uncategorised lines among 80. The view opens on those 3.

### F-33 · P2 · CSV mapping preview has no column headers

- **Where:** `ImportsTab.tsx:292-308`
- **Problem:** the preview table shows raw cells, and the column selects say "Kolona A/B/C…" (`columnLabel`). The user has to count columns to match them.
- **Fix:**
  - Add a header row with `columnLabel(i)`.
  - Tint the mapped columns and label them with their role: Datum, Iznos and so on.
  - Use `<th scope="col">` for the header cells.
- **Verify:** mapping a new bank's CSV can be done by reading the table alone.

---

## Phase 5: Resident payment and polish (P2/P3) (implemented 2026-10-04)

> Implemented and checked with lint, build, frontend tests, backend unit tests and e2e. Browser verification of each **Verify** step is still to do. Notes:
>
> - **F-34:** the payload is built in `lib/ips.ts` (tests in `lib/ips.test.ts`) and rendered with `uqr` (no dependencies). **Still to do:** check the format against the current NBS spec and scan it with a real m-banking app.
> - **F-36:** the backend now returns `reverses { id, valueDate }` on transactions (Postman and `CHANGES.md` updated), so a storno row can say which transaction it reverses.
> - **F-37:** the reason is required (3+ characters) **in the UI only**; the backend still treats it as optional. Confirm with the product owner before also enforcing it in the DTO.
> - **F-38:** the account-number input keeps the text keyboard (`inputMode="numeric"` hides the dash on many phones); PIB and MB use `numeric`. The backend DTOs already had these rules.

### F-34 · P2 · No IPS QR code for paying

- **Where:** `UnitLedger.tsx` (the payment-details card: Primalac, Račun, Model, Poziv na broj)
- **Problem:** residents are phone-first, and Serbian banking apps scan NBS IPS QR codes. Today they copy four fields by hand.
- **Fix:**
  - Generate an NBS IPS QR payload on the client. The format is `K:PR|V:01|C:1|R:<18-digit account>|N:<payee>|I:RSD<amount with comma>|SF:289|S:<purpose>|RO:<model+reference>`. Check the format against the current NBS spec before shipping.
  - Render it with a small QR library: check bundle size first and prefer one with no dependencies.
  - Show it below the payment details, with the amount set to the current balance when it is positive.
  - Add "Iznos u QR kodu: {iznos}" and keep the copy buttons.
- **Verify:** scan it with at least one real Serbian m-banking app. All fields fill correctly.

### F-35 · P3 · Copy button gives no confirmation to assistive tech and ignores failures

- **Where:** `FinanceOverview.tsx:21` (`CopyButton`, also used in `UnitLedger`)
- **Fix:**
  - On success, set an `aria-live` "Kopirano" (visually hidden or as a tooltip).
  - On rejection (for example in an insecure context), show "Kopiranje nije uspelo".
  - Move `CopyButton` to `form.tsx` because it is shared.
- **Verify:** test with a screen reader, and simulate a clipboard rejection.

### F-36 · P3 · Reversed transactions are hard to read

- **Where:** `TransactionsList.tsx` (line-through plus 11px "Stornirano")
- **Fix:**
  - Use a `ChipBadge` with a `transactionStatus.REVERSED` chip from `lib/chips.ts` instead of the 11px text.
  - Keep the line-through only on the amount.
  - Link the reversal and the original to each other ("Storno transakcije od {datum}").
- **Verify:** reverse one transaction. Both rows read clearly.

### F-37 · P3 · The storno action is a tiny ghost button, and the reason is optional

- **Where:** `ManageDialogs.tsx` (`ReverseTransactionDialog`)
- **Fix:**
  - Use the `sm` button size (32px; it meets the 24px target minimum, but it is the only destructive action in its row).
  - Make the reason required, with at least 3 characters; it is an accounting record.
  - Check with the product owner first if the backend treats it as optional on purpose.
- **Verify:** reversing without a reason is blocked, with a Serbian hint.

### F-38 · P3 · Validation of account number, PIB and MB

- **Where:** `ManageDialogs.tsx` (BankAccount and FinanceProfile forms)
- **Fix:**
  - **Account number:** validate the 3-13-2 structure (18 digits, dashes optional) and the mod-97 control number.
  - **PIB:** exactly 9 digits.
  - **MB:** exactly 8 digits.
  - Use `inputMode="numeric"` and Serbian hints.
  - Mirror the same rules in the backend DTOs if they are missing, and update Postman if any DTO changes.
- **Verify:** `160-12345-95` is accepted (it normalises), `160-12345-96` is rejected, and an 8-digit PIB is rejected.

### F-39 · P3 · Cache invalidation is too broad

- **Where:** `hooks/useFinance.ts` (every mutation invalidates `['finance', buildingId]`)
- **Problem:** every change refetches every finance query, including reports and budget. It works, but it flickers (`isFetching` dims tables) and is wasteful.
- **Fix:**
  - Invalidate the specific keys: transactions plus overview plus summary plus arrears for a transaction mutation; invoices plus overview for an invoice mutation; and so on.
  - Keep the broad invalidation only for profile and account changes.
- **Verify:** in React Query Devtools, posting a transaction does not refetch `reports` or `budget`.

### F-40 · P3 · The resident page shows a skeleton forever when the buildings request fails

- **Where:** `app/(resident)/finances/page.tsx` (`buildingId = buildings?.[0]?.id ?? ''`)
- **Fix:**
  - Handle the buildings query's `error` with the F-03 `QueryError`.
  - Handle "no building" with an empty state: "Niste povezani ni sa jednom zgradom."
- **Verify:** block the buildings endpoint, and test with a user who has no building.

### F-41 · P3 · Wide tables inside narrow dialogs

- **Where:** `ChargesTab.tsx:311` (preview table in a `sm:max-w-2xl` dialog), `BudgetTab.tsx` (the `1fr_9rem_10rem` grid)
- **Fix:**
  - Give the charges preview `sm:max-w-3xl` or render it in a Sheet.
  - Make the budget line grid collapse to a stacked layout below `sm`.
- **Verify:** at 375px nothing scrolls sideways except an intentional table wrapper.

---

## Phase 6: Findings from the design review (Assessment A), checked against the code (implemented 2026-10-04)

> Implemented and checked with lint, build, frontend tests, backend unit tests and e2e. Browser verification of each **Verify** step is still to do. Deviations and choices:
>
> - **F-42:** Get Finance Overview gained `unassignedPayments` (non-reversed owner payments with no unit), covered by e2e and documented in Postman and `CHANGES.md`. Pregled shows "Nerazvrstane uplate ({n})" to staff only, as a warning line under the total balance.
> - **F-44:** "Upravljanje" is a sheet opened from the Pregled toolbar, with accounts, suppliers and categories. Optional supplier fields, the category fund and the supplier PIB/MB/account can be cleared (sent as `null`); an invoice's `dueDate` cannot be cleared when editing.
> - **F-46:** the "rok" on the home card is the newest open charge's date plus `paymentTermDays`, computed on the client; once overdue it shows "dospelo {datum}" instead.
> - **F-53:** the two page descriptions are kept different on purpose, one per audience.

### F-42 · P1 · Owner payments default to "Nepoznat stan"

- **Where:** `CreateTransactionDialog.tsx:164-174` (`<option value="">Nepoznat stan</option>` is the default), `ImportsTab.tsx:694` ("Jedinica (opciono)…")
- **Problem:**
  - A payment in an owner-payment category that is saved without a unit goes into building income but never reduces that owner's debt.
  - The resident still appears to owe money and has no way to dispute it in the app.
  - This is the module's biggest risk to data quality.
- **Fix:**
  - When `category.isOwnerPayment` is true, the unit is required. Default the select to "Izaberite stan…" (an invalid placeholder).
  - Keep a deliberate escape option: "Nepoznat stan — razvrstaću kasnije". Selecting it shows a warning hint.
  - In import review, an owner-payment line with no unit gets a client-side warning badge on its row. It is not a hard block, because the backend allows it.
  - Add "Nerazvrstane uplate ({n})" to Pregled for staff. This needs a count from the backend; if no endpoint exposes it, add the count to the overview or summary response and update Postman.
  - Option labels use `{unitTypeLabel} {unitNumber}`; see F-28.
- **Verify:**
  - The owner-payment form cannot be submitted with the placeholder selected.
  - Choosing "Nepoznat stan" works and shows the warning.
  - Pregled counts unassigned payments.

### F-43 · P1 · Import commit has no confirmation, and editing one line locks every line

- **Where:**
  - `ImportsTab.tsx:593-599` (commit).
  - `ImportsTab.tsx:504,566` (`pending` disables every `LineRow`).
  - `ImportsTab.tsx:559` (`update.error` shown above the list).
  - `hooks/useFinance.ts:157` (broad invalidation).
- **Problem:**
  - "Proknjiži N stavki" posts real money in one click and shows no totals. Meanwhile the reversible "Odbaci" does ask for confirmation, which is backwards.
  - Every category or unit change disables all rows and refetches the whole finance module, so a 60-line review flickers constantly.
  - Errors appear far from the line that failed.
  - Lines with problems are shown only in red text.
- **Fix:**
  - **Commit confirmation**, inline in the same pattern as discard: "Proknjižiti {n} stavki? Uplate {income}, isplate {expense}." When `closingBalance` is set, add "Stanje računa posle knjiženja: {x}".
  - Per-row pending: keep the line id being saved in state and disable only that row.
  - Line updates invalidate only the statement-import query. Commit invalidates the whole module once (ties in with F-39).
  - Show `update.error` inside the row that failed. Map commit errors of the form "Red N: …" to their rows.
  - Rows with issues get an `AlertTriangle` icon and a subtle danger tint, not only red text.
  - The filter from F-32 covers jumping to the problem lines.
- **Verify:**
  - Editing a line leaves the other rows interactive.
  - React Query Devtools shows only the import query refetching.
  - Commit asks for confirmation and shows totals that match `summary`.

### F-44 · P1 · Edit UI is missing for entities the backend already supports

- **Where:**
  - `useUpdateBankAccount` (`hooks/useFinance.ts:173`) and `financeApi.updateBankAccount` exist, but nothing uses them.
  - Backend has `PATCH bank-accounts/:id`, `POST/PATCH categories`, `PATCH suppliers/:id` and `PATCH invoices/:id` (`apps/backend/src/finance/finance.controller.ts:104,130,140,167,234`).
  - `BankAccountDialog` and `SupplierDialog` in `ManageDialogs.tsx` can only create.
- **Problem:** from the UI, a typo in an account number or supplier name can never be fixed. The only workaround is a duplicate record, which then clutters every select. The category list is stuck at the defaults.
- **Fix:**
  - Let `BankAccountDialog` and `SupplierDialog` take an optional `entity` prop for editing, the same way `FinanceProfileDialog` does.
  - Add an "Upravljanje" section for staff with write access, either on Pregled or in a small sheet off the profile button. It lists:
    - accounts (edit, deactivate, set primary);
    - suppliers (edit, deactivate);
    - categories (add, rename, deactivate).
  - Add "Izmeni" to `InvoiceDetailSheet` for `UNPAID` invoices. Reuse `CreateInvoiceDialog` with initial values.
  - Add the missing API wrappers to `lib/api/finance.ts` and the hooks to `useFinance.ts`. Don't change backend endpoints.
- **Verify:**
  - Rename a supplier, and confirm the invoice list shows the new name.
  - Deactivate an account, and confirm it disappears from the transaction and import selects.
  - Edit an unpaid invoice's amount.

### F-45 · P2 · The account select shows only the bank name

- **Where:** `CreateTransactionDialog.tsx:132-136`
- **Problem:** two accounts at the same bank look identical.
- **Fix:** render `{bankName} · {formatAccountNumber(accountNumber)}`, as `ImportsTab.tsx:275` already does.
- **Verify:** a building with two Intesa accounts.

### F-46 · P2 · Residents on mobile reach Finansije only through the "Nalog" sheet

- **Where:** `components/AppBottomNav.tsx:104-112`
- **Problem:**
  - A resident checking what they owe needs about 4 taps: Nalog, Finansije, the tab switch (fixed by F-05), and then scrolling.
  - PRODUCT.md says residents are phone-first.
- **Fix (decided 2026-10-04: Option A):**
  - **Option A (chosen):** on the resident home page (Početna), show a compact card when the balance is above 0, for example "Dugujete {iznos} · rok {datum}", with a "Plati" link to `/finances?tab=unit`. When the balance is 0, show nothing.
  - ~~Option B: swap one of the bottom-bar items for Finansije.~~ Rejected.
- **Verify:** a resident who owes money sees the amount on Početna and reaches the payment details in 1 tap.

### F-47 · P2 · The ledger's +/− signs have no legend

- **Where:** `UnitLedger.tsx:28-32` (`signed()`), timeline at `UnitLedger.tsx:110-157`
- **Problem:**
  - Charges show as "+" because they raise the debt, and payments as "−". That is the reverse of how a bank statement reads, and nothing explains it.
  - Cancelled entries are only struck through, with no text label.
- **Fix:**
  - Add a one-line legend above the timeline: "+ zaduženje · − uplata ili umanjenje".
  - Alternatively, use explicit labels per row ("Zaduženje", "Uplata") with an unsigned amount.
  - Struck-through entries get a "(stornirano)" text label.
- **Verify:** a resident can tell each row's direction without relying on colour.

### F-48 · P2 · Missing client-side guards that the backend enforces

- **Where and fix:**
  - **Positive amounts:**
    - `parseMoneyInput` accepts "0" and "-" (`lib/format.ts:62`).
    - "0.00" passes `CreateInvoiceDialog` and `CreateTransactionDialog`.
    - Fix: require positive amounts for `IsMoney` fields. Keep zero and negative only for the opening balance and corrections.
  - **Books start date:**
    - The transaction value date and the report `from` have no `min={booksStartDate}`. See `CreateTransactionDialog` and `ReportsTab.tsx:150-157`; the backend checks this at `transactions.service.ts:95` and `reports.service.ts:158,163`.
    - Fix: add `min`, plus `max={todayISO()}` on report `to`.
  - **Fee-rule dates:** `FeeRuleDialog` needs a check that `validTo ≥ validFrom` (`ChargesTab.tsx:209-212`).
  - **Invoice dates:** `CreateInvoiceDialog` needs a check that `dueDate ≥ issueDate`.
  - **Month inputs:** `type="month"` inputs (`ChargesTab.tsx:209,212,276`) work poorly in Firefox and in desktop Safari. Replace them with two `NativeSelect`s (month and year) or a year select plus a 12-option month select.
  - Every guard shows a Serbian inline hint and sets `aria-invalid`.
- **Verify:** each invalid input is caught before the request.

### F-49 · P2 · Accessibility gaps in shared form and list primitives

- **Where and fix:**
  - **Field hints:** `form.tsx` `Field` doesn't link `hint` to its input. Give the hint `id={`${id}-hint`}` and pass `aria-describedby` to the child, for example through a render prop or by cloning the child. Do the same for field-level errors once F-12 can map them.
  - **Low contrast:** `opacity-60` drops text below AA in three places:
    - inactive accounts (`FinanceOverview.tsx:69`);
    - skipped and duplicate import lines (`ImportsTab.tsx:640`);
    - the fetching preview (`ChargesTab.tsx:311`).

    Use `text-muted-foreground` plus a text label ("neaktivan", "preskočeno") instead. For fetching, show a small inline loader rather than dimming numbers.
  - **Colour-only meaning:** income and expense in Pregled are shown by colour alone. Add a `+`/`−` sign or the word "Prihodi"/"Rashodi" beside each amount, which is already partly there; check every amount.
  - **Paperclip icon:** `InvoicesList.tsx:59-63` puts `aria-label` on an svg that has no `role="img"`. Use `role="img"`, or hide the icon and add `sr-only` text.
  - **Download labels:** `ReportsTab.tsx:97-100` buttons say only "PDF". Add the label "Preuzmi izveštaj {period} (PDF)" through `aria-label`, or make the visible text that.
  - **Fund table:** `FinanceOverview.tsx:125-143` needs `<th scope="col">`, plus a caption (`sr-only` is fine).
  - **Copy button:** `FinanceOverview.tsx:26` is `size-7` (28px). Make it at least 40px on touch screens (`size-10 md:size-8`). F-35 covers the announcement.
  - **Segmented on mobile:** the `overflow-x-auto` strip (`form.tsx:76`) shows no sign that it scrolls. F-06 removes most of the overflow; any Segmented that can still overflow gets an edge fade mask.
- **Verify:** run axe DevTools on every tab with no serious or critical issues. Keyboard-only and screen-reader passes on Moj stan and Transakcije.

### F-50 · P2 · No confirmation before overwriting a budget, or before posting from the ledger sheet

- **Where:** `BudgetTab.tsx` (`BudgetDialog` replaces the whole year's plan), `UnitLedger.tsx` (opening-balance and adjustment forms)
- **Fix:**
  - When a plan already exists for the year, the save button reads "Zameni plan za {godina}" and asks for confirmation inline.
  - The adjustment and opening-balance forms (collapsed by F-30) show a one-line summary before posting: "Korekcija +1.500,00 RSD za Stan 14 — stanar će je videti."
- **Verify:** overwriting an existing plan needs two clicks.

### F-51 · P3 · Downloads open a blank tab first

- **Where:** `InvoiceDetailSheet.tsx:70`, `ReportsTab.tsx:132` (`window.open('', '_blank')` before the fetch)
- **Problem:** if the fetch fails, or a popup blocker interferes, the user is left with an empty tab and no message.
- **Fix:**
  - Close the pre-opened tab in the `catch` block and show an inline Serbian error.
  - If `window.open` returns `null` because of a popup blocker, fall back to an anchor download.
- **Verify:** block the file endpoint. No empty tab is left behind, and an error is shown.

### F-52 · P3 · Report publish doesn't refresh other modules

- **Where:** `hooks/useFinance.ts:271-275` (`usePublishReport`), `hooks/useDocuments.ts:6` (key `['documents', buildingId]`)
- **Problem:** publishing a report creates a document, but only `['finance', buildingId]` is invalidated. The new PDF doesn't appear in Dokumenta until the page is refreshed.
- **Fix:**
  - On publish success, also invalidate `['documents', buildingId]`.
  - Also invalidate the notifications query if publish notifies residents (check its key).
  - Give `useInvoice` and `useStatementImport` the module's `STALE` value.
- **Verify:** publish a report, open Dokumenta, and the PDF is listed.

### F-53 · P3 · Copy and naming consistency

- **Pages:** the two finance page descriptions differ (`app/(resident)/finances/page.tsx` vs `app/(upravnik)/buildings/[buildingId]/finances/page.tsx`). Use one text, or make each fit its role on purpose.
- **Not-configured state for non-upravnik roles:** `FinanceView.tsx:45-53`. Residents and board members should see "Upravnik još nije podesio finansije zgrade."
- **Sheet titles:**
  - "Faktura" becomes "Faktura {broj}" (`InvoiceDetailSheet`).
  - "Kartica stana" (`UnitLedger.tsx:198`) and "Moj stan" should use one term per audience. Suggestion: staff see "Kartica stana · Stan 14", the resident tab stays "Moj stan".
- **Heading sizes:** the `text-lg` titles inside sheets (`InvoiceDetailSheet.tsx:86`, `ImportsTab.tsx:509`) should use the sheet-title scale from DESIGN.md, not an ad-hoc size.
- **Invoice storno:** it is only offered for `UNPAID`. For `PARTIALLY_PAID`, show the backend's reason (`invoices.service.ts:212`) as disabled-state help text.
- **Charges dialog:** after a successful generate (`ChargesTab.tsx:365-371`), the stale preview stays on screen. Close the dialog, or refresh the preview so it shows the new state.

### F-54 · P3 · Board members who own a unit lose "Moj stan" (decided 2026-10-04: show both)

- **Where:** `FinanceView.tsx:29-30`. `isStaff` includes `BOARD_MEMBER`, so `unitId` is null.
- **Problem:** per the authorisation decisions, BOARD_MEMBER is an extension of the upravnik. If a board member is also an owner and has `user.unitId`, they currently can't see their own unit's ledger.
- **Fix (confirmed):** compute `unitId = user?.unitId` regardless of role, and show both Zaduženja and Moj stan.
- **Verify:** a board member with a unit sees Moj stan.

### Out of scope (noted, not part of this plan)

- `lib/format.ts` `formatTimestamp` uses the `'sr-RS'` locale, which shows Cyrillic month names. Finance doesn't use it. Mention it to the team.
- `AppBottomNav.tsx` uses raw `hover:bg-stone-100` and `hover:bg-red-100` in the Nalog sheet. This is outside finance; mention it, don't fix it here.
- A cross-building finance overview for upravniks who manage several buildings, and a guided month-close flow (charges → import → resolve → report), were raised in the review as product directions. They are not defects. Consider them for a future phase in `docs/finance-module-plan.md`.

---

## Suggested commit sequence

1. `fix(finance): payment-term regex blocks profile save` (F-01). The fix is already in the working tree; commit it with the next change.
2. `fix(finance): error states and retry across finance views` (F-02, F-03, F-40)
3. `fix(finance): require unit on owner payments` (F-42, F-28, F-45)
4. `fix(finance): confirm and scope import commit and line edits` (F-43, F-32, F-39, F-52)
5. `feat(finance): URL tab state, role defaults and grouped navigation` (F-04, F-05, F-06, F-20)
6. `feat(finance): success announcements and destructive-action confirmations` (F-07, F-08, F-50)
7. `fix(finance): money parsing, totals, timestamp dates and input guards` (F-11, F-13, F-14, F-48)
8. `fix(finance): Serbian validation messages, frontend and backend` (F-12)
9. `fix(finance): invoice payment validation and invoice→payment flow` (F-09, F-24, F-27)
10. `feat(finance): edit accounts, suppliers, categories and invoices` (F-44, F-25)
11. `feat(finance): paginated, filterable transactions and invoices` (F-10, backend plus Postman)
12. `style(finance): align with DESIGN.md tokens, radius and chips` (F-15 to F-19, F-21, F-23)
13. `fix(finance): accessibility of fields, lists and controls` (F-49, F-35, F-36, F-47)
14. `feat(finance): CSV preview headers` (F-33), then `refactor(finance): split ImportsTab` (F-31)
15. `feat(finance): IPS QR and resident debt entry point` (F-34, F-22, F-46)
16. Remaining items: F-26, F-29, F-30, F-37, F-38, F-41, F-51, F-53, and F-54.

When everything is done, re-run `/impeccable critique the finance tab` and compare against the stored baseline, using `critique-storage trend "apps/frontend/components/finance"`.
