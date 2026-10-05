'use client'

import { useState } from 'react'
import { Briefcase, Plus, Store, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Field, Select } from './fields'
import {
  floorName,
  floorShort,
  isDuplicate,
  newUnit,
  nextUnitNumber,
} from './units'
import { unitTypeLabel } from '@/lib/chips'
import type { BuildingDraft, UnitEntry, UnitType } from './types'

const typeIcon: Partial<Record<UnitType, typeof Store>> = {
  OFFICE: Briefcase,
  COMMERCIAL: Store,
}

type Floor = number | ''

function groupByFloor(units: UnitEntry[]): [Floor, UnitEntry[]][] {
  const map = new Map<Floor, UnitEntry[]>()
  for (const u of units) {
    const row = map.get(u.floor)
    if (row) row.push(u)
    else map.set(u.floor, [u])
  }
  // Top floor first, the way the building stands; units without a floor last.
  return [...map.entries()].sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : b - a))
}

const focusById = (id: string) => requestAnimationFrame(() => document.getElementById(id)?.focus())

/**
 * The building as it stands: one row per floor, one cell per unit. Selecting
 * a cell opens its details below the grid.
 */
export function FloorEditor({
  building,
  duplicates,
  unitsError,
  onChange,
}: {
  building: BuildingDraft
  duplicates: Map<string, string>
  unitsError?: string
  onChange: (units: UnitEntry[]) => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const rows = groupByFloor(building.units)
  const selected = building.units.find((u) => u.id === selectedId)
  const cellId = (u: UnitEntry) => `unit-${u.id}`
  const addId = (floor: Floor) => `add-${building.id}-${floor === '' ? 'none' : floor}`

  function addUnit(floor: Floor, row: UnitEntry[]) {
    const type = row.at(-1)?.type ?? building.generator.type
    const unit = newUnit(nextUnitNumber(building, floor), floor, type)
    onChange([...building.units, unit])
  }

  function addFloor() {
    const floors = building.units.map((u) => u.floor).filter((f): f is number => f !== '')
    const floor = floors.length ? Math.max(...floors) + 1 : 1
    const unit = newUnit(nextUnitNumber(building, floor), floor, building.generator.type)
    onChange([...building.units, unit])
    setSelectedId(unit.id)
  }

  function update(id: string, patch: Partial<UnitEntry>) {
    onChange(building.units.map((u) => (u.id === id ? { ...u, ...patch } : u)))
  }

  function remove(u: UnitEntry) {
    onChange(building.units.filter((x) => x.id !== u.id))
    setSelectedId(null)
    focusById(addId(u.floor))
  }

  function close(u: UnitEntry) {
    setSelectedId(null)
    focusById(cellId(u))
  }

  const usedTypes = (['OFFICE', 'COMMERCIAL'] as const).filter((t) =>
    building.units.some((u) => u.type === t),
  )

  return (
    <div className="space-y-3">
      {rows.length > 0 ? (
        <div
          role="group"
          aria-label={`Jedinice po spratovima: ${building.name || 'nova zgrada'}`}
          className="rounded-lg border border-border bg-[var(--surface-sunken)] px-3 py-1"
        >
          {rows.map(([floor, units]) => (
            <div
              key={floor === '' ? 'none' : floor}
              className="flex items-start gap-3 border-t border-border py-2 first:border-t-0"
            >
              <div
                className="w-8 shrink-0 pt-1.5 text-center text-xs font-semibold text-muted-foreground"
                title={floorName(floor)}
              >
                <span aria-hidden="true">{floorShort(floor)}</span>
                <span className="sr-only">{floorName(floor)}</span>
              </div>
              <ul className="flex flex-1 flex-wrap gap-1.5">
                {units.map((u) => {
                  const Icon = typeIcon[u.type]
                  const invalid = !u.unitNumber.trim() || isDuplicate(duplicates, u)
                  return (
                    <li key={u.id}>
                      <button
                        id={cellId(u)}
                        type="button"
                        aria-pressed={selectedId === u.id}
                        data-invalid={invalid || undefined}
                        aria-label={`Jedinica ${u.unitNumber.trim() || 'bez broja'}, ${unitTypeLabel[u.type]}${invalid ? ', broj nije ispravan' : ''}`}
                        onClick={() => setSelectedId(selectedId === u.id ? null : u.id)}
                        className={cn(
                          'inline-flex h-8 min-w-10 items-center justify-center gap-1 rounded-[var(--radius-sm)] border px-2 font-mono text-xs tabular-nums outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
                          'border-border bg-card text-foreground hover:border-[var(--border-strong)]',
                          selectedId === u.id &&
                            'border-[var(--brand-border)] bg-[var(--brand-subtle)] text-[var(--brand)] hover:border-[var(--brand-border)]',
                          invalid &&
                            'border-[var(--danger)] bg-[var(--danger-subtle)] text-[var(--danger-text)] hover:border-[var(--danger)]',
                        )}
                      >
                        {u.unitNumber.trim() || '?'}
                        {Icon && <Icon aria-hidden="true" className="size-3 opacity-70" />}
                      </button>
                    </li>
                  )
                })}
                <li>
                  <button
                    id={addId(floor)}
                    type="button"
                    aria-label={`Dodaj jedinicu: ${floorName(floor)}`}
                    title="Dodaj jedinicu"
                    onClick={() => addUnit(floor, units)}
                    className="inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] border border-dashed border-[var(--border-strong)] text-muted-foreground outline-none transition-colors hover:bg-card hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <Plus aria-hidden="true" className="size-3.5" />
                  </button>
                </li>
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-[var(--border-strong)] px-4 py-6 text-center text-sm text-muted-foreground">
          Još nema jedinica. Generišite raspored iznad ili dodajte spratove jedan po jedan.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={addFloor}>
          <Plus aria-hidden="true" />
          Dodaj sprat
        </Button>
        {usedTypes.length > 0 && (
          <p className="flex items-center gap-3 text-xs text-muted-foreground">
            {usedTypes.map((t) => {
              const Icon = typeIcon[t]!
              return (
                <span key={t} className="inline-flex items-center gap-1">
                  <Icon aria-hidden="true" className="size-3" />
                  {unitTypeLabel[t]}
                </span>
              )
            })}
          </p>
        )}
      </div>

      {unitsError && (
        <p className="text-xs text-[var(--danger-text)]">{unitsError}</p>
      )}

      {selected && (
        <UnitDetails
          key={selected.id}
          unit={selected}
          duplicate={isDuplicate(duplicates, selected)}
          onChange={(patch) => update(selected.id, patch)}
          onRemove={() => remove(selected)}
          onClose={() => close(selected)}
        />
      )}
    </div>
  )
}

/** Read-only version of the editor's grid, for the review step. */
export function FloorPlan({ units, label }: { units: UnitEntry[]; label: string }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="rounded-lg bg-[var(--surface-sunken)] px-3 py-1"
    >
      {groupByFloor(units).map(([floor, row]) => (
        <div
          key={floor === '' ? 'none' : floor}
          className="flex items-start gap-3 border-t border-border py-1.5 first:border-t-0"
        >
          <div
            className="w-8 shrink-0 pt-0.5 text-center text-xs font-semibold text-muted-foreground"
            title={floorName(floor)}
          >
            <span aria-hidden="true">{floorShort(floor)}</span>
            <span className="sr-only">{floorName(floor)}</span>
          </div>
          <ul className="flex flex-1 flex-wrap gap-1">
            {row.map((u) => {
              const Icon = typeIcon[u.type]
              return (
                <li
                  key={u.id}
                  className="inline-flex h-6 min-w-8 items-center justify-center gap-1 rounded-[var(--radius-sm)] border border-border bg-card px-1.5 font-mono text-xs tabular-nums text-foreground"
                >
                  {u.unitNumber}
                  {Icon && (
                    <>
                      <Icon aria-hidden="true" className="size-3 opacity-70" />
                      <span className="sr-only">, {unitTypeLabel[u.type]}</span>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

function UnitDetails({
  unit,
  duplicate,
  onChange,
  onRemove,
  onClose,
}: {
  unit: UnitEntry
  duplicate: boolean
  onChange: (patch: Partial<UnitEntry>) => void
  onRemove: () => void
  onClose: () => void
}) {
  const numberError = !unit.unitNumber.trim()
    ? 'Unesite broj jedinice.'
    : duplicate
      ? 'Ovaj broj već postoji u zgradi.'
      : undefined

  return (
    <div
      role="group"
      aria-label={`Jedinica ${unit.unitNumber}`}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
      className="space-y-3 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-subtle)] p-3"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Broj" error={numberError}>
          {(control) => (
            <Input
              {...control}
              autoFocus
              value={unit.unitNumber}
              onChange={(e) => onChange({ unitNumber: e.target.value })}
              className="bg-card font-mono tabular-nums dark:bg-input/30"
            />
          )}
        </Field>
        <Field label="Sprat">
          {(control) => (
            <Input
              {...control}
              type="number"
              inputMode="numeric"
              min={-5}
              max={99}
              value={unit.floor}
              placeholder="—"
              onChange={(e) => {
                const n = parseInt(e.target.value, 10)
                onChange({ floor: Number.isNaN(n) ? '' : n })
              }}
              className="bg-card font-mono tabular-nums dark:bg-input/30"
            />
          )}
        </Field>
        <Field label="Tip">
          {(control) => (
            <Select
              {...control}
              value={unit.type}
              onChange={(e) => onChange({ type: e.target.value as UnitType })}
              className="bg-card dark:bg-input/30"
            >
              {(Object.keys(unitTypeLabel) as UnitType[]).map((t) => (
                <option key={t} value={t}>
                  {unitTypeLabel[t]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Površina (m²)">
          {(control) => (
            <Input
              {...control}
              type="number"
              inputMode="decimal"
              min={0}
              step={0.01}
              value={unit.areaSqm}
              placeholder="—"
              onChange={(e) => {
                const n = parseFloat(e.target.value)
                onChange({ areaSqm: Number.isNaN(n) || n < 0 ? '' : n })
              }}
              className="bg-card font-mono tabular-nums dark:bg-input/30"
            />
          )}
        </Field>
      </div>
      <div className="flex justify-between gap-2">
        <Button type="button" variant="destructive" size="sm" onClick={onRemove}>
          <Trash2 aria-hidden="true" />
          Ukloni jedinicu
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Gotovo
        </Button>
      </div>
    </div>
  )
}
