---
target: finance tab
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 14
target_identity: "file:C:\\My Web Projects\\upravnik-platform\\apps\\frontend\\components\\finance"
timestamp: 2026-10-04T10-12-14Z
slug: apps-frontend-components-finance
---
Method: dual-agent (A: a1fddd62c57a22f61 · B: aab5ba70061470477)

# Critique: Finance tab (apps/frontend/components/finance)

Source-only review. The browser was unavailable, so there are no overlays and no live check at 1366px or 390px. The detector returned 0 findings.

## Nielsen heuristics: 21/40 (Acceptable, needs significant work)

| # | Heuristic | Score |
|---|---|---|
| 1 | Visibility of system status | 2 |
| 2 | Match between system and real world | 3 |
| 3 | User control and freedom | 2 |
| 4 | Consistency and standards | 2 |
| 5 | Error prevention | 1 |
| 6 | Recognition rather than recall | 2 |
| 7 | Flexibility and efficiency | 1 |
| 8 | Aesthetic and minimalist design | 3 |
| 9 | Error recovery | 2 |
| 10 | Help and documentation | 3 |

## Priority issues

- **P0:** the payment-term regex is `/^d{1,3}$/` (ManageDialogs.tsx:72), so the finance profile can never be saved.
- **P1:**
  - Errors shown as "not configured", and skeletons that never resolve.
  - Owner payments default to "Nepoznat stan".
  - Import commit has no confirmation, and editing one line locks every line.
  - Tab state isn't in the URL, there are 7 tabs, and residents don't land on Moj stan.
  - No success feedback.
  - Regenerating charges has no confirmation.
  - Invoice payment amounts aren't validated.
  - Lists have no pagination or filters.
  - Timestamps can show the wrong date.
  - English validation messages reach users.
  - No edit UI for accounts, suppliers, categories or invoices.
- **P2:** DESIGN.md drift:
  - card radius;
  - `stone-*` colours;
  - pine used for status;
  - `text-3xl` numbers;
  - inconsistent overdue colour;
  - cross-route import.

  Also float money maths, accessibility of shared primitives, workflow friction, and no IPS QR for residents.

Full fix plan: docs/finance-tab-fix-plan.md (F-01 to F-54).
