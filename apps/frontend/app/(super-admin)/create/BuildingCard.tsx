'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import type { BuildingDraft, UnitEntry, UnitType } from './types'

function generateUnits(
  floors: number,
  unitsPerFloor: number,
  pattern: 'floor-unit' | 'sequential',
  type: UnitType,
): UnitEntry[] {
  const units: UnitEntry[] = []
  for (let f = 1; f <= floors; f++) {
    for (let u = 1; u <= unitsPerFloor; u++) {
      units.push({
        id: crypto.randomUUID(),
        unitNumber: pattern === 'floor-unit' ? `${f}-${u}` : String(f * 100 + u),
        floor: f,
        type,
        areaSqm: '',
      })
    }
  }
  return units
}

interface Props {
  building: BuildingDraft
  onChange: (b: BuildingDraft) => void
  onRemove: () => void
  isOnlyBuilding: boolean
  complexAddress?: string
  complexCity?: string
}

export function BuildingCard({
  building,
  onChange,
  onRemove,
  isOnlyBuilding,
  complexAddress,
  complexCity,
}: Props) {
  const [draft, setDraft] = useState<BuildingDraft>(building)

  useEffect(() => {
    if (draft.unitMode === 'auto' && draft.units.length === 0) {
      const units = generateUnits(draft.floors, draft.unitsPerFloor, draft.pattern, draft.defaultType)
      const next = { ...draft, units }
      setDraft(next)
      onChange(next)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [newUnit, setNewUnit] = useState({
    unitNumber: '',
    floor: '',
    type: 'APARTMENT' as UnitType,
    areaSqm: '',
  })

  function apply(next: BuildingDraft) {
    setDraft(next)
    onChange(next)
  }

  function handleAutoParam(
    partial: Partial<Pick<BuildingDraft, 'floors' | 'unitsPerFloor' | 'pattern' | 'defaultType'>>,
  ) {
    const next = { ...draft, ...partial }
    apply({ ...next, units: generateUnits(next.floors, next.unitsPerFloor, next.pattern, next.defaultType) })
  }

  function setUnitMode(mode: 'auto' | 'manual') {
    if (mode === 'auto') {
      apply({
        ...draft,
        unitMode: mode,
        units: generateUnits(draft.floors, draft.unitsPerFloor, draft.pattern, draft.defaultType),
      })
    } else {
      apply({ ...draft, unitMode: mode })
    }
  }

  function addUnit() {
    if (!newUnit.unitNumber.trim()) return
    const unit: UnitEntry = {
      id: crypto.randomUUID(),
      unitNumber: newUnit.unitNumber.trim(),
      floor: newUnit.floor === '' ? '' : Number(newUnit.floor),
      type: newUnit.type,
      areaSqm: newUnit.areaSqm === '' ? '' : Number(newUnit.areaSqm),
    }
    apply({ ...draft, units: [...draft.units, unit] })
    setNewUnit({ unitNumber: '', floor: '', type: 'APARTMENT', areaSqm: '' })
  }

  function removeUnit(id: string) {
    apply({ ...draft, units: draft.units.filter((u) => u.id !== id) })
  }

  const canCopyAddress = !!complexAddress && complexAddress !== draft.address

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-3 pt-4 px-4">
        <span className="font-medium text-sm text-foreground">{draft.name || 'Nova zgrada'}</span>
        <button
          type="button"
          onClick={onRemove}
          disabled={isOnlyBuilding}
          className="text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-4">
        <div className="space-y-1.5">
          <Label>Naziv zgrade</Label>
          <Input
            value={draft.name}
            onChange={(e) => apply({ ...draft, name: e.target.value })}
            placeholder="npr. Zgrada A"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Adresa</Label>
              {canCopyAddress && (
                <button
                  type="button"
                  onClick={() => apply({ ...draft, address: complexAddress!, city: complexCity ?? draft.city })}
                  className="text-xs text-primary hover:underline"
                >
                  Kopiraj iz kompleksa
                </button>
              )}
            </div>
            <Input
              value={draft.address}
              onChange={(e) => apply({ ...draft, address: e.target.value })}
              placeholder="Bulevar Oslobođenja 12"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Grad</Label>
            <Input
              value={draft.city}
              onChange={(e) => apply({ ...draft, city: e.target.value })}
              placeholder="Novi Sad"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-medium text-foreground">Jedinice</div>

          <div className="flex gap-2">
            {(['auto', 'manual'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setUnitMode(m)}
                className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                  draft.unitMode === m
                    ? 'border-primary bg-primary/5 text-foreground font-medium'
                    : 'border-border text-muted-foreground hover:border-muted-foreground'
                }`}
              >
                {m === 'auto' ? 'Auto-generisanje' : 'Ručni unos'}
              </button>
            ))}
          </div>

          {draft.unitMode === 'auto' && (
            <div className="space-y-3 p-3 bg-muted/40 rounded-lg">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Spratovi</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={draft.floors}
                    onChange={(e) =>
                      handleAutoParam({ floors: Math.max(1, parseInt(e.target.value) || 1) })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Jedinice po spratu</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={draft.unitsPerFloor}
                    onChange={(e) =>
                      handleAutoParam({ unitsPerFloor: Math.max(1, parseInt(e.target.value) || 1) })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Format broja</Label>
                  <select
                    value={draft.pattern}
                    onChange={(e) =>
                      handleAutoParam({ pattern: e.target.value as 'floor-unit' | 'sequential' })
                    }
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    <option value="floor-unit">Sprat-Jedinica (1-1, 1-2…)</option>
                    <option value="sequential">Sekvencijalni (101, 102…)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Podrazumevani tip</Label>
                  <select
                    value={draft.defaultType}
                    onChange={(e) =>
                      handleAutoParam({ defaultType: e.target.value as UnitType })
                    }
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    <option value="APARTMENT">Stan</option>
                    <option value="OFFICE">Kancelarija</option>
                    <option value="COMMERCIAL">Poslovni prostor</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {draft.unitMode === 'manual' && (
            <div className="p-3 bg-muted/40 rounded-lg">
              <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Br. jedinice</Label>
                  <Input
                    value={newUnit.unitNumber}
                    onChange={(e) => setNewUnit((n) => ({ ...n, unitNumber: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addUnit()
                      }
                    }}
                    placeholder="1-1"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Sprat</Label>
                  <Input
                    type="number"
                    value={newUnit.floor}
                    onChange={(e) => setNewUnit((n) => ({ ...n, floor: e.target.value }))}
                    placeholder="1"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tip</Label>
                  <select
                    value={newUnit.type}
                    onChange={(e) => setNewUnit((n) => ({ ...n, type: e.target.value as UnitType }))}
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    <option value="APARTMENT">Stan</option>
                    <option value="OFFICE">Kancelarija</option>
                    <option value="COMMERCIAL">Poslovni</option>
                  </select>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={addUnit}
                  disabled={!newUnit.unitNumber.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {draft.units.length > 0 ? (
            <div className="space-y-0.5 max-h-44 overflow-y-auto">
              {draft.units.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 px-2 py-1 rounded text-sm hover:bg-muted/50 group"
                >
                  <span className="font-mono w-14 shrink-0 text-foreground">{u.unitNumber}</span>
                  <span className="text-muted-foreground text-xs w-16 shrink-0">
                    {u.floor !== '' ? `sp. ${u.floor}` : '—'}
                  </span>
                  <span className="text-muted-foreground text-xs flex-1">
                    {u.type === 'APARTMENT' ? 'Stan' : u.type === 'OFFICE' ? 'Kancelarija' : 'Poslovni'}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeUnit(u.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity ml-auto"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {draft.unitMode === 'auto'
                ? 'Unesite broj spratova i jedinica za generisanje.'
                : 'Dodajte jedinice koristeći formu iznad.'}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
