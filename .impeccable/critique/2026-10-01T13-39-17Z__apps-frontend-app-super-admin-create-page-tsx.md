---
target: create structure form
total_score: 16
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:C:\\My Web Projects\\upravnik-platform\\apps\\frontend\\app\\(super-admin)\\create\\page.tsx"
target_fingerprint: "sha256:22a8c2dd00aba0cb90cb93f7071efe5b38315c648b7e44b5fd64490ce0cf9e1d"
target_path: "C:\\My Web Projects\\upravnik-platform\\apps\\frontend\\app\\(super-admin)\\create\\page.tsx"
timestamp: 2026-10-01T13-39-17Z
slug: apps-frontend-app-super-admin-create-page-tsx
---
Method: dual-agent (A: design review · B: detector + browser evidence)

# Critique — "Kreiranje strukture" wizard (`apps/frontend/app/(super-admin)/create/`)

Premise correction: the wizard does not create accounts or passwords (`setup.service.ts` creates complex/buildings/units only, `userId` null). The high stakes come from "nothing is hard-deleted".

## Design Health Score — 16/40 (Poor)

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Live tree good; disabled "Dalje" with no reason, no Loader on pending, silent redirect (`page.tsx:107`) |
| 2 | Match System / Real World | 2 | Hotel numbering only, no prizemlje/lokali; plural ternaries identical (`page.tsx:412`, `TreePreview.tsx:70-71`); "upload" |
| 3 | User Control and Freedom | 1 | Auto params regenerate units, wiping edits (`BuildingCard.tsx:73-78`); manual→auto drops units; X deletes building unconfirmed; refresh loses all |
| 4 | Consistency and Standards | 2 | Three toggle styles; native select; "Poslovni prostor" vs "Poslovni"; CSV skips Review |
| 5 | Error Prevention | 1 | No duplicate unit check anywhere incl. DB; max unenforced; no irreversibility warning |
| 6 | Recognition Rather Than Recall | 1 | CSV columns undocumented; required fields implied only by disabled button |
| 7 | Flexibility and Efficiency | 2 | Auto + CSV are real shortcuts; manual add resets floor/type, no area |
| 8 | Aesthetic and Minimalist Design | 3 | Calm, on-token; flat hierarchy, squeezed at xl |
| 9 | Error Recovery | 1 | CSV errors in English keys/enums; no field-level errors, no role="alert" |
| 10 | Help and Documentation | 1 | No CSV template; no next-step guidance |

## Design Specificity Verdict
LLM: mostly generic shadcn wizard; live tree is the only product-grounded idea but rendered as mono ASCII; numbering patterns ignore Serbian building conventions.
Detector: 0 findings on all 4 source files (verified scanner works on TSX). URL scan hit /login via AuthGuard redirect — not attributable. Detector is blind to the behavioural/a11y/data issues that dominate here.
Overlays: none (no browser automation, auth-gated route).

## Priority Issues
- [P0] Duplicate unit numbers + irreversible create. No check in form, DTO, or schema (`schema.prisma:143-160`); max unclamped (`BuildingCard.tsx:196,208`). Fix: inline duplicate detection, clamp, @@unique, irreversibility note + count-specific CTA. → harden
- [P1] Silent data loss: regenerate-on-change (`BuildingCard.tsx:73-90`), unconfirmed building delete, no draft persistence. Fix: one-shot Generiši into editable table, undo, sessionStorage. → harden
- [P1] Invisible validation: `canProceedFromStep2` only disables. Fix: focus first invalid field, per-card status chip, mark tree. → clarify
- [P1] A11y: CSV dropzone div onClick + hidden input (`page.tsx:448-458`); no htmlFor/id; icon buttons unlabeled; trash opacity-0 on focus (`BuildingCard.tsx:312`); toggles lack roles; no focus mgmt on step change. → audit
- [P2] Serbian numbering + CSV robustness: no prizemlje/lokali/1..N; comma split, no ; or Windows-1250; no template; CSV skips Review. → shape

## Persona Red Flags
- Jordan: abstract "Opseg"; grey Dalje; no CSV format; no next step; silent redirect.
- Sam: file picker unreachable; nameless inputs; nameless icon buttons; no selected-state announcements; focus lost on step change.
- Alex: realistic 120-unit layout not generatable; manual entry resets floor/type, no edit, ~7 visible rows; number inputs can't be cleared ("18").

## Minor Observations
font-mono on names (TreePreview.tsx:24); border-2 (page.tsx:450); 4px rounded rows; bg-primary/5 instead of --brand-subtle; flat text-sm font-medium hierarchy; layout squeeze at xl and broken <768px though linked from AppBottomNav.tsx:92; "u jednom koraku" vs 3 steps; scope change keeps extra buildings; array error messages possibly concatenated.

## Questions to Consider
- Should the preview be the editor (floor-by-floor building section)?
- Draft-until-upravnik-assigned instead of one-shot Kreiraj?
- Should the flow end at assign-upravnik rather than a list redirect?
