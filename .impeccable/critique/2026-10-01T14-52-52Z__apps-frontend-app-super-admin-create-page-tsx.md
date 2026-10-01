---
target: create structure form
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\My Web Projects\\upravnik-platform\\apps\\frontend\\app\\(super-admin)\\create\\page.tsx"
target_fingerprint: "sha256:163cd6ae787528dbecdf47a2f8b9f92e11b4cc16d3a8665be7d6cb0554f8280c"
target_path: "C:\\My Web Projects\\upravnik-platform\\apps\\frontend\\app\\(super-admin)\\create\\page.tsx"
timestamp: 2026-10-01T14-52-52Z
slug: apps-frontend-app-super-admin-create-page-tsx
---
Method: dual-agent (A: design review · B: detector + browser)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Generator inputs drift from grid silently ("Generiši 26" while 18 units remain) |
| 2 | Match System / Real World | 3 | "Stanova u prizemlju" wrong for Kancelarija/Lokal; CSV keys English |
| 3 | User Control and Freedom | 3 | "Počni iznova" wipes draft with no confirm/undo; stepper not clickable |
| 4 | Consistency and Standards | 3 | Mode tabs + stepper double navigation, tabs persist on review |
| 5 | Error Prevention | 2 | "Proverite brojeve" on a review that shows no numbers; stale generator can reach submit |
| 6 | Recognition Rather Than Recall | 3 | Review requires recalling step-2 layout |
| 7 | Flexibility and Efficiency | 2 | No duplicate-building, every building starts blank, 36 tab stops per 18-unit grid |
| 8 | Aesthetic and Minimalist Design | 3 | Step 2 becomes a wall: buildings and generators stay expanded |
| 9 | Error Recovery | 3 | Raw server error strings shown as-is |
| 10 | Help and Documentation | 3 | Login consequence of numbering explained only on step 3 |
| **Total** | | **28/40** | **Good** |

## Design Specificity Verdict

Core is product-specific (floor-by-floor FloorEditor, P/S/L rows, lokali series, Sprat i broj numbering, Windows-1250 CSV). Wrapper is generic shadcn wizard chrome (tabs, stepper, radio cards, plain review, green banner). Review drops the building drawing at the irreversible moment. PRODUCT.md still mentions the removed "live tree preview".

Detector: 0 findings in create/ source (exit 0, also with --no-config). Browser injection (headless, no visible overlay), real: low-contrast warning callout 4.1:1 (page.tsx:579, --warning-text on --warning-subtle, light); skipped heading h1→h3 in CSV panel (CsvImport.tsx:136); line length ~122ch CSV help; nested bordered boxes in step 2. Shell-only: sidebar group label 2.6:1 (AppSidebar.tsx:325). False positives: PageHeader nested-cards, AppShell clipped-overflow, sr-only stepper labels, fixed-height button padding, ai-color-palette on muted brand teal. No page or console errors.

## Overall Impression

Data-integrity and lost-work problems are fixed (16 → 28). What remains is workflow: review can't be checked, multi-lamela entry repeats work, the ending points at "Kreiraj još" instead of the real next step. Biggest opportunity: floor grid on the review step.

## What's Working

1. FloorEditor as a drawing of the building (top-down rows, sr-only floor names, invalid cells, icons + legend, per-floor + with next free number).
2. Validation and focus: per-building chips, alert summary, focus to first invalid, auto-open generator, step heading focus, correct plurals.
3. Safety: undo for removed building, replace confirm, draft restore, CSV replace warning.

## Priority Issues

- **[P1] Review step can't be checked.** page.tsx:553-575 shows counts only; warning asks to check numbers that become logins. Fix: read-only FloorEditor per building + numbering summary. Command: /impeccable clarify, /impeccable layout.
- **[P1] Multi-building entry repeats everything and grows into a wall.** Dodaj zgradu uses newBuilding(); generatorOpen only set on mount (BuildingSection.tsx:43). Fix: clone previous generator (+address/city for complex), "Dupliraj" action, close generator after Generiši, collapse "Spremno" buildings. Command: /impeccable distill, /impeccable layout.
- **[P2] Generator settings drift from grid silently.** Fix: track last-applied generator, show "Podešavanja su promenjena, raspored nije ažuriran", make Generiši primary. Command: /impeccable harden.
- **[P2] Ending doesn't lead anywhere.** page.tsx:229-277 primary is "Kreiraj još". Fix: per-building link primary, "Sledeći koraci" (accounts/passwords, upravnik). Command: /impeccable onboard.
- **[P2] Grid weak for touch and keyboard.** FloorEditor.tsx:127 cells 32×40px; every cell a tab stop; selected cards marked by faint wash only. Fix: larger coarse-pointer cells, roving tabindex with arrows, check/dot on selected card. Command: /impeccable adapt, /impeccable audit.

## Persona Red Flags

- Jordan: numbering choice doesn't say it's the login; "Spratova" ambiguous re prizemlje; "Stanova u prizemlju" makes offices; CSV tab as equal alternative above stepper; no next step at the end.
- Sam: grid tab-stop flood; selected cards rely on faint wash; amber warning 4.1:1 in light.
- Casey: Dalje below fold at 390×844; 32px cells; address retyped per building; sessionStorage draft lost on tab close.
- Platform operator (PRODUCT.md super admin): no duplicate-building; English CSV keys; can't add a lamela to an existing complex (backend unverified); unverifiable review.

## Minor Observations

- page.tsx:417 hard-codes "zgrade" ("Imate 5 zgrade"); use plural().
- "Počni iznova" deletes draft instantly.
- Mode tabs visible on step 3 and after import.
- UnitDetails opens far below top-floor cells.
- Bare mono count next to "Jedinice".
- Client duplicate check case-insensitive, server case-sensitive.
- No suteren row in generator; type select label "Jedinice na spratovima" also applies to ground floor.
- CSV panel: no h2; ~122ch help line.
- Shell: super admin sees resident/upravnik nav; sidebar label contrast 2.6:1; no current-page marker.

## Questions to Consider

- What if review showed read-only floor grids per lamela side by side?
- Should lamela 2 start as a copy of lamela 1?
- Is this creating structure or onboarding a client — and should it end at passwords and the upravnik?
