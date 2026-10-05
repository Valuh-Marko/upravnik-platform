'use client'

import { useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useBudgets, useFinanceCategories, useUpsertBudget } from '@/hooks/useFinance'
import { financeFundLabel } from '@/lib/chips'
import { formatDate, formatRSD, fromParas, parseMoneyInput, toParas } from '@/lib/format'
import type { Budget, FinanceDirection } from '@/lib/types'
import { DecisionSelect, eyebrow, Field, financeCard as card, FormError, guardDirty, NativeSelect, QueryError } from './form'

const SECTIONS: { direction: FinanceDirection; title: string }[] = [
  { direction: 'INCOME', title: 'Planirani prihodi' },
  { direction: 'EXPENSE', title: 'Planirani rashodi' },
]

/** Program održavanja: the yearly plan per category. Everyone reads it; the upravnik enters it. */
export function BudgetTab({ buildingId, canWrite }: { buildingId: string; canWrite: boolean }) {
  const thisYear = new Date().getFullYear()
  const [year, setYear] = useState(thisYear)
  const { data: budgets, isLoading, error, refetch } = useBudgets(buildingId)
  const budget = budgets?.find((b) => b.year === year)
  const years = [...new Set([thisYear + 1, thisYear, ...(budgets ?? []).map((b) => b.year)])].sort((a, b) => b - a)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <NativeSelect
          aria-label="Godina"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-32"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}.
            </option>
          ))}
        </NativeSelect>
        {canWrite && budgets && <BudgetDialog buildingId={buildingId} year={year} budget={budget} />}
      </div>

      {error && !budgets ? (
        <QueryError onRetry={refetch} />
      ) : isLoading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : !budget ? (
        <p className="text-base text-muted-foreground text-center py-12">Plan za {year}. godinu nije unet.</p>
      ) : (
        <div className="space-y-4">
          <section className={card}>
            <p className={eyebrow}>Program održavanja {budget.year}.</p>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Usvojen</dt>
              <dd>{budget.adoptedAt ? formatDate(budget.adoptedAt) : 'Nije navedeno'}</dd>
              {budget.decisionDocument && (
                <>
                  <dt className="text-muted-foreground">Odluka</dt>
                  <dd>{budget.decisionDocument.title}</dd>
                </>
              )}
            </dl>
          </section>

          <section className={`${card} grid gap-5 md:grid-cols-2`}>
            {SECTIONS.map(({ direction, title }) => {
              const lines = budget.lines.filter((l) => l.category.direction === direction)
              const total = fromParas(lines.reduce((sum, l) => sum + toParas(l.plannedAmount), BigInt(0)))
              return (
                <div key={direction}>
                  <p className={eyebrow}>{title}</p>
                  {lines.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">Nema stavki.</p>
                  ) : (
                    <ul className="mt-2 space-y-1.5">
                      {lines.map((l) => (
                        <li key={l.id} className="text-sm">
                          <div className="flex justify-between gap-3">
                            <span className="text-foreground">
                              {l.category.name}
                              {l.category.fund && (
                                <span className="text-muted-foreground"> · {financeFundLabel[l.category.fund]}</span>
                              )}
                            </span>
                            <span className="font-mono tabular-nums flex-shrink-0">{formatRSD(l.plannedAmount)}</span>
                          </div>
                          {l.note && <p className="text-xs text-muted-foreground">{l.note}</p>}
                        </li>
                      ))}
                      <li className="flex justify-between gap-3 border-t border-border pt-1.5 text-sm font-semibold">
                        <span>Ukupno</span>
                        <span className="font-mono tabular-nums">{formatRSD(total)}</span>
                      </li>
                    </ul>
                  )}
                </div>
              )
            })}
          </section>
        </div>
      )}
    </div>
  )
}

type LineForm = { amount: string; note: string }

function BudgetDialog({ buildingId, year, budget }: { buildingId: string; year: number; budget?: Budget }) {
  const [open, setOpen] = useState(false)
  const [adoptedAt, setAdoptedAt] = useState('')
  const [decisionDocumentId, setDecisionDocumentId] = useState('')
  const [lines, setLines] = useState<Record<string, LineForm>>({})
  // The form as it was opened; anything else is unsaved input.
  const [initial, setInitial] = useState('')
  // Saving replaces the whole year's plan, so an existing plan asks first.
  const [confirmReplace, setConfirmReplace] = useState(false)
  const { data: categories } = useFinanceCategories(buildingId, open)
  const upsert = useUpsertBudget(buildingId)
  const dirty = JSON.stringify({ adoptedAt, decisionDocumentId, lines }) !== initial

  // Inactive categories stay editable while the budget still plans them.
  const shown = (categories ?? []).filter((c) => c.isActive || lines[c.id])
  const parsed = Object.entries(lines)
    .filter(([, l]) => l.amount.trim())
    .map(([categoryId, l]) => ({ categoryId, plannedAmount: parseMoneyInput(l.amount), note: l.note.trim() }))
  const invalid = (amount: string) => {
    if (!amount.trim()) return false
    const value = parseMoneyInput(amount)
    return value === null || value.startsWith('-')
  }

  function handleOpen() {
    const start = {
      adoptedAt: budget?.adoptedAt?.slice(0, 10) ?? '',
      decisionDocumentId: budget?.decisionDocumentId ?? '',
      lines: Object.fromEntries(
        (budget?.lines ?? []).map((l) => [l.categoryId, { amount: l.plannedAmount, note: l.note ?? '' }])
      ),
    }
    setAdoptedAt(start.adoptedAt)
    setDecisionDocumentId(start.decisionDocumentId)
    setLines(start.lines)
    setInitial(JSON.stringify(start))
    setConfirmReplace(false)
    upsert.reset()
    setOpen(true)
  }

  function setLine(categoryId: string, patch: Partial<LineForm>) {
    setLines((all) => ({ ...all, [categoryId]: { ...(all[categoryId] ?? { amount: '', note: '' }), ...patch } }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (budget && !confirmReplace) {
      setConfirmReplace(true)
      return
    }
    upsert.mutate(
      {
        year,
        dto: {
          adoptedAt: adoptedAt || null,
          decisionDocumentId: decisionDocumentId || null,
          lines: parsed.map((l) => ({
            categoryId: l.categoryId,
            plannedAmount: l.plannedAmount!,
            note: l.note || undefined,
          })),
        },
      },
      { onSuccess: () => setOpen(false), onSettled: () => setConfirmReplace(false) }
    )
  }

  const valid = Object.values(lines).every((l) => !invalid(l.amount))

  return (
    <Dialog open={open} onOpenChange={guardDirty(setOpen, dirty)}>
      <Button size="sm" onClick={handleOpen}>
        {budget ? <Pencil /> : <Plus />}
        {budget ? 'Izmeni plan' : 'Unesi plan'}
      </Button>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Program održavanja za {year}.</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="bud-adopted" label="Datum usvajanja (opciono)">
              <Input id="bud-adopted" type="date" value={adoptedAt} onChange={(e) => setAdoptedAt(e.target.value)} />
            </Field>
            <Field id="bud-doc" label="Odluka skupštine (opciono)">
              <DecisionSelect
                id="bud-doc"
                buildingId={buildingId}
                value={decisionDocumentId}
                onChange={setDecisionDocumentId}
              />
            </Field>
          </div>

          {SECTIONS.map(({ direction, title }) => (
            <fieldset key={direction} className="space-y-2">
              <legend className="text-sm font-semibold text-foreground mb-2">{title}</legend>
              {shown
                .filter((c) => c.direction === direction)
                .map((c) => {
                  const line = lines[c.id] ?? { amount: '', note: '' }
                  return (
                    <div key={c.id} className="grid gap-2 sm:grid-cols-[1fr_9rem_10rem] sm:items-center">
                      <label htmlFor={`bud-${c.id}`} className="text-sm text-foreground">
                        {c.name}
                      </label>
                      <Input
                        id={`bud-${c.id}`}
                        inputMode="decimal"
                        placeholder="Iznos (RSD)"
                        className="font-mono"
                        value={line.amount}
                        onChange={(e) => setLine(c.id, { amount: e.target.value })}
                        aria-invalid={invalid(line.amount)}
                      />
                      <Input
                        aria-label={`Napomena: ${c.name}`}
                        placeholder="Napomena"
                        value={line.note}
                        onChange={(e) => setLine(c.id, { note: e.target.value })}
                      />
                    </div>
                  )
                })}
            </fieldset>
          ))}
          <p className="text-xs text-muted-foreground">
            Kategorije bez iznosa nisu deo plana. Čuvanjem se ceo plan za {year}. zamenjuje.
          </p>

          <FormError error={upsert.error} />
          {confirmReplace && (
            <p className="text-sm text-foreground">
              Postojeći plan za {year}. biće zamenjen ovim unosom. Nastaviti?
            </p>
          )}
          <DialogFooter className="gap-2">
            {confirmReplace && (
              <Button type="button" variant="ghost" onClick={() => setConfirmReplace(false)} className="w-full sm:w-auto">
                Odustani
              </Button>
            )}
            <Button type="submit" disabled={!valid || upsert.isPending} className="w-full sm:w-auto">
              {upsert.isPending
                ? 'Čuvanje…'
                : confirmReplace
                  ? 'Da, zameni plan'
                  : budget
                    ? `Zameni plan za ${year}.`
                    : 'Sačuvaj plan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
