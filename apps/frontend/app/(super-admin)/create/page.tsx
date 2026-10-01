'use client'

import { Fragment, useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, Check, CheckCircle2, Plus, PlusCircle } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader } from '@/components/ui/loader'
import { PageHeader } from '@/components/PageHeader'
import { setupApi } from '@/lib/api/setup'
import { plural } from '@/lib/format'
import type { BulkCreateResponse } from '@/lib/types'
import { cn } from '@/lib/utils'
import { BuildingSection } from './BuildingSection'
import { CsvImport } from './CsvImport'
import { Field } from './fields'
import { FloorPlan } from './FloorEditor'
import type { CsvResult } from './csv'
import {
  buildingIssues,
  countByType,
  duplicateBuilding,
  newBuilding,
  nextBuilding,
  toDto,
} from './units'
import type { BuildingDraft, ComplexDraft, FormMode, Scope } from './types'

type Step = 1 | 2 | 3

interface Draft {
  step: Step
  scope: Scope | null
  complex: ComplexDraft
  buildings: BuildingDraft[]
}

const DRAFT_KEY = 'upravnik.create-draft'

const emptyDraft = (): Draft => ({
  step: 1,
  scope: null,
  complex: { name: '', address: '', city: '' },
  buildings: [newBuilding()],
})

// The page renders only on the client (behind AuthGuard), so reading storage
// in a state initializer can't cause a hydration mismatch.
function loadDraft(): Draft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const d = JSON.parse(raw) as Draft
    const ok =
      Array.isArray(d.buildings) &&
      d.buildings.length > 0 &&
      d.buildings.every((b) => b.generator && Array.isArray(b.units))
    return ok && d.scope ? d : null
  } catch {
    return null
  }
}

const steps = ['Vrsta', 'Zgrade i jedinice', 'Pregled']

const scopes: { value: Scope; label: string; desc: string }[] = [
  { value: 'single', label: 'Jedna zgrada', desc: 'Samostalna zgrada sa svojim jedinicama.' },
  { value: 'multi', label: 'Više zgrada', desc: 'Nekoliko samostalnih zgrada odjednom.' },
  { value: 'complex', label: 'Kompleks', desc: 'Zgrade koje dele dvorište, upravu ili adresu.' },
]

const focusFrame = (fn: () => void) => requestAnimationFrame(fn)

export default function BulkCreatePage() {
  const [initial] = useState(() => {
    const saved = loadDraft()
    return { draft: saved ?? emptyDraft(), restored: !!saved }
  })
  const [draft, setDraft] = useState<Draft>(initial.draft)
  const [restored, setRestored] = useState(initial.restored)
  const [mode, setMode] = useState<FormMode>('manual')
  const [showErrors, setShowErrors] = useState(false)
  const [removed, setRemoved] = useState<{ building: BuildingDraft; index: number } | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string[]>([])
  const [result, setResult] = useState<BulkCreateResponse | null>(null)

  const headingRef = useRef<HTMLHeadingElement>(null)
  const stepRef = useRef<HTMLDivElement>(null)
  const undoRef = useRef<HTMLButtonElement>(null)
  const tabsId = useId()
  const scopeErrorId = useId()

  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch {
      // Storage full or blocked: the draft just won't survive a refresh.
    }
  }, [draft])

  const { step, scope, complex, buildings } = draft
  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }))
  const issues = buildings.map(buildingIssues)
  const incomplete = issues.filter((i) => i.status).length
  const totalUnits = buildings.reduce((s, b) => s + b.units.length, 0)
  const complexErrors = {
    name: complex.name.trim() ? undefined : 'Unesite naziv kompleksa.',
    address: complex.address.trim() ? undefined : 'Unesite adresu kompleksa.',
    city: complex.city.trim() ? undefined : 'Unesite grad.',
  }

  function goTo(next: Step) {
    patch({ step: next })
    setShowErrors(false)
    setRemoved(null)
    setSubmitError([])
    focusFrame(() => headingRef.current?.focus())
  }

  function revealErrors() {
    setShowErrors(true)
    focusFrame(() => {
      const el = stepRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid]')
      if (!el) return
      const details = el.closest('details')
      if (details && !details.open) details.open = true
      el.focus({ preventScroll: true })
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
  }

  function next() {
    if (step === 1) {
      const complexInvalid = scope === 'complex' && Object.values(complexErrors).some(Boolean)
      if (!scope || complexInvalid) return revealErrors()
      goTo(2)
    } else if (step === 2) {
      if (incomplete > 0) return revealErrors()
      goTo(3)
    }
  }

  function updateBuilding(index: number, b: BuildingDraft) {
    setDraft((d) => ({ ...d, buildings: d.buildings.map((x, i) => (i === index ? b : x)) }))
  }

  // Adding or copying a building folds the finished ones, so the page stays short.
  function insertBuilding(at: number, b: BuildingDraft) {
    const next = [...buildings]
    next.splice(at, 0, b)
    patch({ buildings: next })
    setCollapsed(new Set(buildings.filter((_, i) => !issues[i].status).map((x) => x.id)))
    setRemoved(null)
    focusFrame(() => document.querySelector<HTMLElement>(`#building-${b.id} input`)?.focus())
  }

  function toggleBuilding(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function removeBuilding(index: number) {
    setRemoved({ building: buildings[index], index })
    patch({ buildings: buildings.filter((_, i) => i !== index) })
    focusFrame(() => undoRef.current?.focus())
  }

  function undoRemove() {
    if (!removed) return
    const next = [...buildings]
    next.splice(removed.index, 0, removed.building)
    patch({ buildings: next })
    setRemoved(null)
  }

  function importCsv({ complex: cx, buildings: imported }: CsvResult) {
    const nextScope: Scope = cx ? 'complex' : imported.length > 1 ? 'multi' : 'single'
    const complexIncomplete = !!cx && !(cx.name && cx.address && cx.city)
    setDraft({
      step: complexIncomplete ? 1 : 2,
      scope: nextScope,
      complex: cx ?? emptyDraft().complex,
      buildings: imported,
    })
    setMode('manual')
    setRestored(false)
    setRemoved(null)
    if (complexIncomplete) revealErrors()
    else {
      setShowErrors(false)
      focusFrame(() => headingRef.current?.focus())
    }
  }

  async function submit() {
    if (submitting) return
    setSubmitting(true)
    setSubmitError([])
    try {
      const res = await setupApi.bulkCreate(
        toDto(scope === 'complex' ? complex : null, buildings),
      )
      try {
        sessionStorage.removeItem(DRAFT_KEY)
      } catch {}
      setResult(res)
      focusFrame(() => headingRef.current?.focus())
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response
        ?.data?.message
      setSubmitError(
        Array.isArray(msg)
          ? msg
          : [msg ?? 'Kreiranje nije uspelo. Proverite vezu i pokušajte ponovo.'],
      )
    } finally {
      setSubmitting(false)
    }
  }

  function startOver() {
    setDraft(emptyDraft())
    setResult(null)
    setRestored(false)
    setShowErrors(false)
    setRemoved(null)
    setMode('manual')
    focusFrame(() => headingRef.current?.focus())
  }

  const buildingsLabel = `${buildings.length} ${plural(buildings.length, 'zgradu', 'zgrade', 'zgrada')}`
  const unitsLabel = `${totalUnits} ${plural(totalUnits, 'jedinicu', 'jedinice', 'jedinica')}`
  const stepHeading = (text: string) => (
    <h2
      ref={headingRef}
      tabIndex={-1}
      className="text-base font-semibold text-foreground outline-none"
    >
      {text}
    </h2>
  )

  return (
    <div className="pb-6">
      <PageHeader
        icon={<PlusCircle />}
        title="Kreiranje strukture"
        description="Izaberite šta kreirate, unesite zgrade i njihove jedinice, pa proverite sve pre kreiranja."
      />

      <div className="max-w-3xl">
        {result ? (
          <section className="space-y-6">
            <div className="flex items-start gap-3 rounded-xl border border-[var(--success)]/30 bg-[var(--success-subtle)] p-4 md:p-6">
              <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[var(--success-text)]" />
              <div className="space-y-1">
                <h2
                  ref={headingRef}
                  tabIndex={-1}
                  className="text-base font-semibold text-foreground outline-none"
                >
                  Struktura je kreirana
                </h2>
                <p className="text-sm text-[var(--success-text)]">
                  {result.complex && <>Kompleks {result.complex.name}, </>}
                  {result.buildings.length}{' '}
                  {plural(result.buildings.length, 'zgrada', 'zgrade', 'zgrada')} i{' '}
                  {result.totalUnits} {plural(result.totalUnits, 'jedinica', 'jedinice', 'jedinica')}.
                </p>
              </div>
            </div>

            <ul className="divide-y divide-border rounded-xl border border-border bg-card shadow-xs">
              {result.buildings.map((b) => (
                <li key={b.id} className="flex items-center gap-3 px-4 py-3 md:px-6">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">{b.name}</p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-mono tabular-nums">{b.unitCount}</span>{' '}
                      {plural(b.unitCount, 'jedinica', 'jedinice', 'jedinica')}
                    </p>
                  </div>
                  <Link
                    href={`/buildings/${b.id}/members`}
                    className={buttonVariants({ variant: 'outline', size: 'sm' })}
                  >
                    Jedinice
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>

            <p className="max-w-prose text-sm text-muted-foreground">
              Jedinice su kreirane bez naloga stanara. Sledeći korak je otvaranje naloga i podela
              lozinki, a zatim dodela upravnika zgradama.
            </p>

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={startOver}>
                Kreiraj još
              </Button>
              <Link href="/buildings" className={buttonVariants({ variant: 'outline' })}>
                Sve zgrade
              </Link>
            </div>
          </section>
        ) : (
          <>
            <div
              role="tablist"
              aria-label="Način unosa"
              className="mb-6 flex border-b border-border"
              onKeyDown={(e) => {
                if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
                const nextMode = mode === 'manual' ? 'csv' : 'manual'
                setMode(nextMode)
                focusFrame(() => document.getElementById(`${tabsId}-${nextMode}-tab`)?.focus())
              }}
            >
              {(['manual', 'csv'] as const).map((m) => (
                <button
                  key={m}
                  id={`${tabsId}-${m}-tab`}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  aria-controls={`${tabsId}-${m}-panel`}
                  tabIndex={mode === m ? 0 : -1}
                  onClick={() => setMode(m)}
                  className={cn(
                    '-mb-px border-b-2 px-4 py-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
                    mode === m
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  {m === 'manual' ? 'Ručni unos' : 'Uvoz iz CSV-a'}
                </button>
              ))}
            </div>

            <div
              id={`${tabsId}-${mode}-panel`}
              role="tabpanel"
              aria-labelledby={`${tabsId}-${mode}-tab`}
            >
              {mode === 'csv' ? (
                <CsvImport
                  replacesDraft={buildings.some((b) => b.name.trim() || b.units.length > 0)}
                  onImport={importCsv}
                />
              ) : (
                <div ref={stepRef} className="space-y-6">
                  {restored && (
                    <div
                      role="status"
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-[var(--surface-sunken)] px-4 py-2.5 text-sm text-muted-foreground"
                    >
                      {confirmDiscard
                        ? 'Obrisati ceo unos? Ovo se ne može vratiti.'
                        : 'Nastavljate nesačuvan unos iz ove sesije.'}
                      {confirmDiscard ? (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmDiscard(false)}
                          >
                            Otkaži
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setDraft(emptyDraft())
                              setRestored(false)
                              setShowErrors(false)
                              setConfirmDiscard(false)
                            }}
                          >
                            Obriši unos
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmDiscard(true)}
                        >
                          Počni iznova
                        </Button>
                      )}
                    </div>
                  )}

                  <ol aria-label="Koraci" className="flex flex-wrap items-center gap-x-2 gap-y-2">
                    {steps.map((label, i) => {
                      const s = (i + 1) as Step
                      return (
                        <li
                          key={label}
                          aria-current={step === s ? 'step' : undefined}
                          className="flex items-center gap-2"
                        >
                          <span
                            aria-hidden="true"
                            className={cn(
                              'flex size-6 items-center justify-center rounded-full font-mono text-xs font-semibold',
                              step === s && 'bg-primary text-primary-foreground',
                              step > s && 'bg-[var(--brand-subtle)] text-[var(--brand)]',
                              step < s && 'bg-muted text-muted-foreground',
                            )}
                          >
                            {step > s ? <Check className="size-3.5" /> : s}
                          </span>
                          <span
                            className={cn(
                              'text-sm',
                              step === s
                                ? 'font-medium text-foreground'
                                : 'sr-only text-muted-foreground sm:not-sr-only',
                            )}
                          >
                            {label}
                            {step > s && <span className="sr-only"> (završeno)</span>}
                          </span>
                          {i < steps.length - 1 && (
                            <span aria-hidden="true" className="mx-1 h-px w-6 bg-border" />
                          )}
                        </li>
                      )
                    })}
                  </ol>

                  {step === 1 && (
                    <div className="space-y-6">
                      {stepHeading('Šta kreirate?')}
                      <fieldset
                        aria-describedby={showErrors && !scope ? scopeErrorId : undefined}
                        className="space-y-2"
                      >
                        <legend className="sr-only">Šta kreirate?</legend>
                        <div className="grid gap-3 sm:grid-cols-3">
                          {scopes.map((opt, i) => {
                            const locked = opt.value === 'single' && buildings.length > 1
                            return (
                              <label
                                key={opt.value}
                                className="flex cursor-pointer flex-col gap-1 rounded-md border border-border bg-card p-4 transition-colors hover:border-[var(--border-strong)] has-[:checked]:border-[var(--brand-border)] has-[:checked]:bg-[var(--brand-subtle)] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 has-[:disabled]:hover:border-border has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50 has-[[aria-invalid=true]]:border-[var(--danger)]"
                              >
                                <input
                                  type="radio"
                                  name="scope"
                                  value={opt.value}
                                  checked={scope === opt.value}
                                  disabled={locked}
                                  onChange={() => patch({ scope: opt.value })}
                                  aria-invalid={(showErrors && !scope && i === 0) || undefined}
                                  className="sr-only"
                                />
                                <span className="text-sm font-semibold text-foreground">
                                  {opt.label}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {locked
                                    ? `Imate ${buildings.length} ${plural(buildings.length, 'zgradu', 'zgrade', 'zgrada')} u unosu. Uklonite višak u sledećem koraku.`
                                    : opt.desc}
                                </span>
                              </label>
                            )
                          })}
                        </div>
                        {showErrors && !scope && (
                          <p id={scopeErrorId} className="text-xs text-[var(--danger-text)]">
                            Izaberite šta kreirate.
                          </p>
                        )}
                      </fieldset>

                      {scope === 'complex' && (
                        <fieldset className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-xs md:p-6">
                          <legend className="sr-only">Podaci o kompleksu</legend>
                          <h3 aria-hidden="true" className="text-base font-semibold text-foreground">
                            Podaci o kompleksu
                          </h3>
                          <Field
                            label="Naziv kompleksa"
                            error={showErrors ? complexErrors.name : undefined}
                          >
                            {(control) => (
                              <Input
                                {...control}
                                value={complex.name}
                                onChange={(e) => patch({ complex: { ...complex, name: e.target.value } })}
                                placeholder="npr. Blok 23"
                              />
                            )}
                          </Field>
                          <div className="grid gap-4 sm:grid-cols-3">
                            <Field
                              label="Adresa"
                              className="sm:col-span-2"
                              error={showErrors ? complexErrors.address : undefined}
                            >
                              {(control) => (
                                <Input
                                  {...control}
                                  value={complex.address}
                                  onChange={(e) =>
                                    patch({ complex: { ...complex, address: e.target.value } })
                                  }
                                  placeholder="npr. Bulevar Oslobođenja 12"
                                />
                              )}
                            </Field>
                            <Field label="Grad" error={showErrors ? complexErrors.city : undefined}>
                              {(control) => (
                                <Input
                                  {...control}
                                  value={complex.city}
                                  onChange={(e) => patch({ complex: { ...complex, city: e.target.value } })}
                                  placeholder="npr. Novi Sad"
                                />
                              )}
                            </Field>
                          </div>
                        </fieldset>
                      )}

                      <div className="flex justify-end">
                        <Button onClick={next}>Dalje</Button>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-4">
                      {stepHeading(scope === 'single' ? 'Zgrada i jedinice' : 'Zgrade i jedinice')}

                      {buildings.map((b, i) => (
                        <Fragment key={b.id}>
                          {removed?.index === i && (
                            <UndoRow ref={undoRef} name={removed.building.name} onUndo={undoRemove} />
                          )}
                          <BuildingSection
                            building={b}
                            index={i}
                            issues={issues[i]}
                            showErrors={showErrors}
                            complex={scope === 'complex' ? complex : null}
                            collapsed={collapsed.has(b.id) && !issues[i].status}
                            onToggle={() => toggleBuilding(b.id)}
                            onChange={(updated) => updateBuilding(i, updated)}
                            onDuplicate={
                              scope !== 'single' ? () => insertBuilding(i + 1, duplicateBuilding(b)) : undefined
                            }
                            onRemove={buildings.length > 1 ? () => removeBuilding(i) : undefined}
                          />
                        </Fragment>
                      ))}
                      {removed && removed.index >= buildings.length && (
                        <UndoRow ref={undoRef} name={removed.building.name} onUndo={undoRemove} />
                      )}

                      {scope !== 'single' && (
                        <button
                          type="button"
                          onClick={() =>
                            insertBuilding(
                              buildings.length,
                              nextBuilding(buildings[buildings.length - 1], scope === 'complex'),
                            )
                          }
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border-strong)] py-3 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-card hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                          <Plus aria-hidden="true" className="size-4" />
                          Dodaj zgradu
                        </button>
                      )}

                      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
                        <p className="mr-auto text-sm text-muted-foreground">
                          <span className="font-mono tabular-nums">{buildings.length}</span>{' '}
                          {plural(buildings.length, 'zgrada', 'zgrade', 'zgrada')} ·{' '}
                          <span className="font-mono tabular-nums">{totalUnits}</span>{' '}
                          {plural(totalUnits, 'jedinica', 'jedinice', 'jedinica')}
                          {showErrors && incomplete > 0 && (
                            <span role="alert" className="text-[var(--danger-text)]">
                              {' '}
                              · {incomplete === 1 && buildings.length === 1
                                ? 'dopunite podatke'
                                : `${incomplete} ${plural(incomplete, 'zgradu', 'zgrade', 'zgrada')} treba dopuniti`}
                            </span>
                          )}
                        </p>
                        <Button variant="outline" onClick={() => goTo(1)}>
                          Nazad
                        </Button>
                        <Button onClick={next}>Dalje</Button>
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-6">
                      {stepHeading('Pregled pre kreiranja')}

                      <div className="rounded-xl border border-border bg-card shadow-xs">
                        {scope === 'complex' && (
                          <div className="border-b border-border px-4 py-3 md:px-6">
                            <p className="font-semibold text-foreground">{complex.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Kompleks · {complex.address}, {complex.city}
                            </p>
                          </div>
                        )}
                        <ul className="divide-y divide-border">
                          {buildings.map((b) => (
                            <li key={b.id} className="space-y-3 px-4 py-4 md:px-6">
                              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                                <div className="min-w-0">
                                  <p className="font-semibold text-foreground">{b.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {b.address}, {b.city}
                                  </p>
                                </div>
                                <p className="text-sm text-muted-foreground">{countByType(b.units)}</p>
                              </div>
                              <FloorPlan units={b.units} label={`Raspored jedinica: ${b.name}`} />
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex gap-3 rounded-lg border border-[var(--warning)]/40 bg-[var(--warning-subtle)] px-4 py-3 text-sm text-foreground">
                        <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[var(--warning-text)]" />
                        <p className="max-w-prose">
                          <span className="font-semibold">Ovo se ne može poništiti.</span> Kreirane
                          zgrade i jedinice ostaju u sistemu, a stanari se prijavljuju brojem jedinice.
                          Proverite brojeve iznad pre kreiranja.
                        </p>
                      </div>

                      {submitError.length > 0 && (
                        <div
                          role="alert"
                          className="space-y-1 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-subtle)] px-4 py-3 text-sm text-[var(--danger-text)]"
                        >
                          <p className="font-medium">Struktura nije kreirana.</p>
                          <ul className="space-y-0.5">
                            {submitError.map((m, i) => (
                              <li key={i}>{m}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex flex-wrap justify-between gap-2">
                        <Button variant="outline" onClick={() => goTo(2)} disabled={submitting}>
                          Nazad
                        </Button>
                        <Button onClick={submit} disabled={submitting}>
                          {submitting ? (
                            <>
                              <Loader size={16} tone="current" />
                              Kreiranje…
                            </>
                          ) : (
                            `Kreiraj ${scope === 'complex' ? 'kompleks, ' : ''}${buildingsLabel} i ${unitsLabel}`
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function UndoRow({
  ref,
  name,
  onUndo,
}: {
  ref: React.Ref<HTMLButtonElement>
  name: string
  onUndo: () => void
}) {
  return (
    <div
      role="status"
      className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-[var(--border-strong)] px-4 py-2.5 text-sm text-muted-foreground"
    >
      <span className="min-w-0 truncate">
        {name.trim() ? `Zgrada „${name.trim()}” je uklonjena.` : 'Zgrada je uklonjena.'}
      </span>
      <Button ref={ref} type="button" variant="ghost" size="sm" onClick={onUndo}>
        Poništi
      </Button>
    </div>
  )
}
