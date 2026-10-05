'use client'

import { useId, useRef, useState } from 'react'
import { ChevronDown, Copy, Wand2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { plural } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Field, NumberInput, Select } from './fields'
import { FloorEditor } from './FloorEditor'
import {
  MAX_UNITS,
  countByType,
  generateUnits,
  generatedCount,
  type BuildingIssues,
} from './units'
import { unitTypeLabel } from '@/lib/chips'
import type { BuildingDraft, ComplexDraft, Generator, NumberPattern, UnitType } from './types'

const patterns: { value: NumberPattern; label: string; example: string }[] = [
  { value: 'sequential', label: 'Redni brojevi', example: '1, 2, 3…' },
  { value: 'floor-unit', label: 'Sprat i broj', example: 'P-1, 1-1, 1-2…' },
]

export function BuildingSection({
  building,
  index,
  issues,
  showErrors,
  complex,
  collapsed,
  onToggle,
  onChange,
  onDuplicate,
  onRemove,
}: {
  building: BuildingDraft
  index: number
  issues: BuildingIssues
  showErrors: boolean
  complex: ComplexDraft | null
  /** Only ready buildings collapse, so errors are never hidden. */
  collapsed: boolean
  onToggle: () => void
  onChange: (b: BuildingDraft) => void
  onDuplicate?: () => void
  onRemove?: () => void
}) {
  const headingId = useId()
  const bodyId = useId()
  const [generatorOpen, setGeneratorOpen] = useState(building.units.length === 0)
  const [confirmReplace, setConfirmReplace] = useState(false)
  const summaryRef = useRef<HTMLElement>(null)

  const title = building.name.trim() || `Zgrada ${index + 1}`
  const g = building.generator
  const count = generatedCount(g)
  const tooMany = count > MAX_UNITS
  const err = (message?: string) => (showErrors ? message : undefined)
  const unitsError = issues.duplicates.size ? issues.units : err(issues.units)

  const setGenerator = (patch: Partial<Generator>) => {
    setConfirmReplace(false)
    onChange({ ...building, generator: { ...g, ...patch } })
  }

  function generate() {
    if (building.edited && building.units.length > 0 && !confirmReplace) {
      setConfirmReplace(true)
      return
    }
    setConfirmReplace(false)
    // The grid shows the result; the generator folds away, keeping focus on its toggle.
    setGeneratorOpen(false)
    requestAnimationFrame(() => summaryRef.current?.focus())
    onChange({ ...building, units: generateUnits(g), edited: false })
  }

  const canCopyAddress =
    !!complex?.address.trim() &&
    (complex.address !== building.address || complex.city !== building.city)

  return (
    <section
      id={`building-${building.id}`}
      aria-labelledby={headingId}
      className="rounded-xl border border-border bg-card shadow-xs"
    >
      <header className="flex items-center gap-3 border-b border-border px-4 py-3 md:px-6">
        <h3 id={headingId} className="min-w-0 flex-1 text-base font-semibold text-foreground">
          {issues.status ? (
            <span className="block truncate">{title}</span>
          ) : (
            <button
              type="button"
              aria-expanded={!collapsed}
              aria-controls={bodyId}
              onClick={onToggle}
              className="-mx-1 flex max-w-full items-center gap-1.5 rounded-sm px-1 text-left outline-none hover:text-[var(--brand)] focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  'size-4 shrink-0 text-muted-foreground transition-transform',
                  collapsed && '-rotate-90',
                )}
              />
              <span className="truncate">{title}</span>
            </button>
          )}
        </h3>
        <span
          className={cn(
            'inline-flex h-5 shrink-0 items-center rounded-full border px-2 text-xs font-medium',
            !issues.status
              ? 'border-[var(--success)]/30 bg-[var(--success-subtle)] text-[var(--success-text)]'
              : issues.duplicates.size
                ? 'border-[var(--danger)]/30 bg-[var(--danger-subtle)] text-[var(--danger-text)]'
                : 'border-[var(--warning)]/40 bg-[var(--warning-subtle)] text-[var(--warning-text)]',
          )}
        >
          {issues.status ?? 'Spremno'}
        </span>
        {onDuplicate && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDuplicate}
            aria-label={`Dupliraj zgradu ${title}`}
            className="text-muted-foreground"
          >
            <Copy aria-hidden="true" />
            <span aria-hidden="true" className="max-sm:hidden">
              Dupliraj
            </span>
          </Button>
        )}
        {onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            aria-label={`Ukloni zgradu ${title}`}
            title="Ukloni zgradu"
            className="-mr-1.5 text-muted-foreground hover:text-[var(--danger-text)]"
          >
            <X aria-hidden="true" />
          </Button>
        )}
      </header>

      {collapsed ? (
        <p id={bodyId} className="px-4 py-3 text-sm text-muted-foreground md:px-6">
          {building.address}, {building.city} · {countByType(building.units)}
        </p>
      ) : (
        <div id={bodyId} className="space-y-6 p-4 md:p-6">
          <div className="space-y-4">
            <Field label="Naziv zgrade" error={err(issues.name)}>
              {(control) => (
                <Input
                  {...control}
                  value={building.name}
                  onChange={(e) => onChange({ ...building, name: e.target.value })}
                  placeholder="npr. Lamela A"
                />
              )}
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="Adresa"
                error={err(issues.address)}
                className="sm:col-span-2"
                action={
                  canCopyAddress && (
                    <button
                      type="button"
                      onClick={() =>
                        onChange({
                          ...building,
                          address: complex!.address,
                          city: complex!.city,
                        })
                      }
                      className="rounded-sm text-xs font-medium text-[var(--brand)] underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      Preuzmi adresu kompleksa
                    </button>
                  )
                }
              >
                {(control) => (
                  <Input
                    {...control}
                    value={building.address}
                    onChange={(e) => onChange({ ...building, address: e.target.value })}
                    placeholder="npr. Bulevar Oslobođenja 12"
                  />
                )}
              </Field>
              <Field label="Grad" error={err(issues.city)}>
                {(control) => (
                  <Input
                    {...control}
                    value={building.city}
                    onChange={(e) => onChange({ ...building, city: e.target.value })}
                    placeholder="npr. Novi Sad"
                  />
                )}
              </Field>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h4 className="text-sm font-semibold text-foreground">Jedinice</h4>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {building.units.length}
              </span>
            </div>

            <details
              open={generatorOpen}
              onToggle={(e) => setGeneratorOpen(e.currentTarget.open)}
              className="group rounded-lg border border-border"
            >
              <summary
                ref={summaryRef}
                className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground outline-none hover:bg-[var(--surface-hover)] focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden"
              >
                <Wand2 aria-hidden="true" className="size-4 text-muted-foreground" />
                Generiši raspored
                <span className="ml-auto text-xs font-normal text-muted-foreground group-open:hidden">
                  Prizemlje, spratovi i lokali
                </span>
              </summary>

              <div className="space-y-4 border-t border-border p-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Field label="Spratova">
                    {(control) => (
                      <NumberInput
                        {...control}
                        min={0}
                        max={50}
                        value={g.floors}
                        onChange={(floors) => setGenerator({ floors })}
                      />
                    )}
                  </Field>
                  <Field label="Jedinica po spratu">
                    {(control) => (
                      <NumberInput
                        {...control}
                        min={1}
                        max={50}
                        value={g.unitsPerFloor}
                        onChange={(unitsPerFloor) => setGenerator({ unitsPerFloor })}
                      />
                    )}
                  </Field>
                  <Field label="Stanova u prizemlju">
                    {(control) => (
                      <NumberInput
                        {...control}
                        min={0}
                        max={50}
                        value={g.groundUnits}
                        onChange={(groundUnits) => setGenerator({ groundUnits })}
                      />
                    )}
                  </Field>
                  <Field label="Lokala">
                    {(control) => (
                      <NumberInput
                        {...control}
                        min={0}
                        max={50}
                        value={g.shops}
                        onChange={(shops) => setGenerator({ shops })}
                      />
                    )}
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <fieldset className="space-y-1.5">
                    <legend className="mb-1.5 text-sm font-medium">Numeracija</legend>
                    <div className="grid grid-cols-2 gap-2">
                      {patterns.map((p) => (
                        <label
                          key={p.value}
                          className="flex cursor-pointer flex-col rounded-md border border-border px-3 py-2 transition-colors hover:border-[var(--border-strong)] has-[:checked]:border-[var(--brand-border)] has-[:checked]:bg-[var(--brand-subtle)] has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50"
                        >
                          <input
                            type="radio"
                            name={`pattern-${building.id}`}
                            value={p.value}
                            checked={g.pattern === p.value}
                            onChange={() => setGenerator({ pattern: p.value })}
                            className="sr-only"
                          />
                          <span className="text-sm font-medium text-foreground">{p.label}</span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {p.example}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <Field label="Jedinice na spratovima">
                    {(control) => (
                      <Select
                        {...control}
                        value={g.type}
                        onChange={(e) => setGenerator({ type: e.target.value as UnitType })}
                        className="sm:w-40"
                      >
                        {(Object.keys(unitTypeLabel) as UnitType[]).map((t) => (
                          <option key={t} value={t}>
                            {unitTypeLabel[t]}
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>
                </div>

                {confirmReplace ? (
                  <div
                    role="alert"
                    className="flex flex-wrap items-center gap-3 rounded-md border border-[var(--warning)]/40 bg-[var(--warning-subtle)] px-3 py-2.5"
                  >
                    <p className="flex-1 text-sm text-[var(--warning-text)]">
                      Ovo zamenjuje {building.units.length}{' '}
                      {plural(
                        building.units.length,
                        'postojeću jedinicu',
                        'postojeće jedinice',
                        'postojećih jedinica',
                      )}{' '}
                      i vaše izmene.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirmReplace(false)}
                      >
                        Otkaži
                      </Button>
                      <Button type="button" size="sm" onClick={generate}>
                        Zameni
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    {tooMany && (
                      <p className="flex-1 text-xs text-[var(--danger-text)]">
                        Najviše {MAX_UNITS} jedinica po zgradi.
                      </p>
                    )}
                    <Button
                      type="button"
                      variant={building.units.length ? 'secondary' : 'default'}
                      onClick={generate}
                      disabled={count === 0 || tooMany}
                      data-invalid={(showErrors && building.units.length === 0) || undefined}
                      className="data-invalid:ring-3 data-invalid:ring-destructive/20 data-invalid:border-destructive"
                    >
                      Generiši {count} {plural(count, 'jedinicu', 'jedinice', 'jedinica')}
                    </Button>
                  </div>
                )}
              </div>
            </details>

            <FloorEditor
              building={building}
              duplicates={issues.duplicates}
              unitsError={unitsError}
              onChange={(units) => onChange({ ...building, units, edited: true })}
            />
          </div>
        </div>
      )}
    </section>
  )
}
