'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { setupApi } from '@/lib/api/setup'
import type { BulkCreateDto } from '@/lib/types'
import { BuildingCard } from './BuildingCard'
import { TreePreview } from './TreePreview'
import type { BuildingDraft, Scope, FormMode } from './types'
import { PageHeader } from '@/components/PageHeader'

function newBuilding(): BuildingDraft {
  return {
    id: crypto.randomUUID(),
    name: '',
    address: '',
    city: '',
    unitMode: 'auto',
    floors: 2,
    unitsPerFloor: 4,
    pattern: 'floor-unit',
    defaultType: 'APARTMENT',
    units: [],
  }
}

function buildingIsValid(b: BuildingDraft): boolean {
  return (
    b.name.trim() !== '' &&
    b.address.trim() !== '' &&
    b.city.trim() !== '' &&
    b.units.length > 0 &&
    b.units.every((u) => u.unitNumber.trim() !== '')
  )
}

function toDto(buildings: BuildingDraft[]): BulkCreateDto['buildings'] {
  return buildings.map((b) => ({
    name: b.name.trim(),
    address: b.address.trim(),
    city: b.city.trim(),
    units: b.units.map((u) => ({
      unitNumber: u.unitNumber.trim(),
      ...(u.floor !== '' ? { floor: Number(u.floor) } : {}),
      type: u.type,
      ...(u.areaSqm !== '' ? { areaSqm: Number(u.areaSqm) } : {}),
    })),
  }))
}

export default function BulkCreatePage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  // Manual mode state
  const [mode, setMode] = useState<FormMode>('manual')
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [scope, setScope] = useState<Scope | null>(null)
  const [complexName, setComplexName] = useState('')
  const [complexAddress, setComplexAddress] = useState('')
  const [complexCity, setComplexCity] = useState('')
  const [buildings, setBuildings] = useState<BuildingDraft[]>([newBuilding()])

  // CSV mode state
  const [csvBuildings, setCsvBuildings] = useState<BuildingDraft[]>([])
  const [csvScope, setCsvScope] = useState<Scope>('single')
  const [csvComplexName, setCsvComplexName] = useState('')
  const [csvComplexAddress, setCsvComplexAddress] = useState('')
  const [csvComplexCity, setCsvComplexCity] = useState('')
  const [csvErrors, setCsvErrors] = useState<string[]>([])
  const [csvFileName, setCsvFileName] = useState('')

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  function updateBuilding(index: number, updated: BuildingDraft) {
    setBuildings((prev) => prev.map((b, i) => (i === index ? updated : b)))
  }

  function removeBuilding(index: number) {
    setBuildings((prev) => prev.filter((_, i) => i !== index))
  }

  function canProceedFromStep1(): boolean {
    if (!scope) return false
    if (scope === 'complex') {
      return complexName.trim() !== '' && complexAddress.trim() !== '' && complexCity.trim() !== ''
    }
    return true
  }

  function canProceedFromStep2(): boolean {
    return buildings.length > 0 && buildings.every(buildingIsValid)
  }

  async function handleSubmit(dto: BulkCreateDto) {
    if (isSubmitting) return
    setIsSubmitting(true)
    setSubmitError('')
    try {
      await setupApi.bulkCreate(dto)
      router.push('/buildings')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setSubmitError(msg ?? 'Greška pri kreiranju. Pokušajte ponovo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function submitManual() {
    const dto: BulkCreateDto = {
      ...(scope === 'complex'
        ? { complex: { name: complexName.trim(), address: complexAddress.trim(), city: complexCity.trim() } }
        : {}),
      buildings: toDto(buildings),
    }
    handleSubmit(dto)
  }

  function submitCsv() {
    const dto: BulkCreateDto = {
      ...(csvScope === 'complex' && csvComplexName
        ? { complex: { name: csvComplexName, address: csvComplexAddress, city: csvComplexCity } }
        : {}),
      buildings: toDto(csvBuildings),
    }
    handleSubmit(dto)
  }

  function parseCSV(text: string) {
    const lines = text.trim().split('\n').filter(Boolean)
    if (lines.length < 2) {
      setCsvErrors(['CSV ne sadrži podatke.'])
      return
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
    const errors: string[] = []
    const buildingMap = new Map<string, BuildingDraft>()
    let detectedCxName = ''
    let detectedCxAddr = ''
    let detectedCxCity = ''

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',')
      const row: Record<string, string> = {}
      headers.forEach((h, idx) => {
        row[h] = (cols[idx] ?? '').trim()
      })

      const bName = row['building_name']
      const bAddr = row['building_address']
      const bCity = row['building_city']
      const uNum = row['unit_number']

      if (!bName) { errors.push(`Red ${i + 1}: building_name je obavezan`); continue }
      if (!bAddr) { errors.push(`Red ${i + 1}: building_address je obavezan`); continue }
      if (!bCity) { errors.push(`Red ${i + 1}: building_city je obavezan`); continue }
      if (!uNum) { errors.push(`Red ${i + 1}: unit_number je obavezan`); continue }

      const rawType = (row['unit_type'] || 'APARTMENT').toUpperCase()
      if (!['APARTMENT', 'OFFICE', 'COMMERCIAL'].includes(rawType)) {
        errors.push(`Red ${i + 1}: unit_type mora biti APARTMENT, OFFICE ili COMMERCIAL`)
        continue
      }

      if (row['complex_name'] && !detectedCxName) {
        detectedCxName = row['complex_name']
        detectedCxAddr = row['complex_address'] || ''
        detectedCxCity = row['complex_city'] || ''
      }

      const key = `${bName}__${bAddr}`
      if (!buildingMap.has(key)) {
        buildingMap.set(key, {
          id: crypto.randomUUID(),
          name: bName,
          address: bAddr,
          city: bCity,
          unitMode: 'manual',
          floors: 1,
          unitsPerFloor: 1,
          pattern: 'floor-unit',
          defaultType: 'APARTMENT',
          units: [],
        })
      }

      const floorRaw = row['floor']
      const floorNum = floorRaw ? parseInt(floorRaw) : NaN
      const areaSqmRaw = row['area_sqm']
      const areaSqmNum = areaSqmRaw ? parseFloat(areaSqmRaw) : NaN

      buildingMap.get(key)!.units.push({
        id: crypto.randomUUID(),
        unitNumber: uNum,
        floor: isNaN(floorNum) ? '' : floorNum,
        type: rawType as 'APARTMENT' | 'OFFICE' | 'COMMERCIAL',
        areaSqm: isNaN(areaSqmNum) ? '' : areaSqmNum,
      })
    }

    setCsvErrors(errors)
    if (errors.length > 0) return

    const parsed = Array.from(buildingMap.values())
    const detectedScope: Scope = detectedCxName ? 'complex' : parsed.length > 1 ? 'multi' : 'single'
    setCsvScope(detectedScope)
    setCsvComplexName(detectedCxName)
    setCsvComplexAddress(detectedCxAddr)
    setCsvComplexCity(detectedCxCity)
    setCsvBuildings(parsed)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvFileName(file.name)
    setCsvBuildings([])
    setCsvErrors([])
    const reader = new FileReader()
    reader.onload = (ev) => parseCSV(ev.target?.result as string)
    reader.readAsText(file)
  }

  const previewBuildings = mode === 'csv' ? csvBuildings : buildings
  const previewScope = mode === 'csv' ? csvScope : scope ?? 'single'
  const previewComplexName = mode === 'csv' ? csvComplexName : complexName

  return (
    <div className="pb-6">
      <PageHeader
        icon={<PlusCircle />}
        title="Kreiranje strukture"
        description="Kreirajte kompleks, zgrade i jedinice u jednom koraku."
      />

      {/* Mode tabs */}
      <div className="flex border-b border-border mb-6">
        {(['manual', 'csv'] as FormMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              mode === m
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {m === 'manual' ? 'Ručni unos' : 'Uvoz iz CSV-a'}
          </button>
        ))}
      </div>

      <div className="flex gap-8 items-start">
        {/* LEFT — form */}
        <div className="flex-1 min-w-0 max-w-xl">
          {mode === 'manual' ? (
            <>
              {/* Step indicator */}
              <div className="flex items-center gap-1 mb-6">
                {([1, 2, 3] as const).map((s, i) => (
                  <div key={s} className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                        step === s
                          ? 'bg-primary text-primary-foreground'
                          : step > s
                          ? 'bg-primary/15 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {s}
                    </div>
                    <span
                      className={`text-sm ${step === s ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
                    >
                      {s === 1 ? 'Opseg' : s === 2 ? 'Zgrade' : 'Pregled'}
                    </span>
                    {i < 2 && <div className="w-8 h-px bg-border mx-1" />}
                  </div>
                ))}
              </div>

              {/* Step 1 — scope */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-foreground">Šta kreirate?</div>
                    <div className="grid grid-cols-3 gap-3">
                      {(
                        [
                          { value: 'single', label: 'Jedna zgrada', desc: 'Samostalna zgrada bez kompleksa' },
                          { value: 'multi', label: 'Više zgrada', desc: 'Više samostalnih zgrada' },
                          { value: 'complex', label: 'Kompleks', desc: 'Zajednička nekretnina sa zgradama' },
                        ] as { value: Scope; label: string; desc: string }[]
                      ).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setScope(opt.value)}
                          className={`p-4 rounded-lg border text-left transition-colors space-y-1 ${
                            scope === opt.value
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-muted-foreground'
                          }`}
                        >
                          <div className="text-sm font-medium text-foreground">{opt.label}</div>
                          <div className="text-xs text-muted-foreground">{opt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {scope === 'complex' && (
                    <div className="space-y-4 p-4 rounded-lg border border-border">
                      <div className="text-sm font-medium text-foreground">Podaci o kompleksu</div>
                      <div className="space-y-1.5">
                        <Label>Naziv kompleksa</Label>
                        <Input
                          value={complexName}
                          onChange={(e) => setComplexName(e.target.value)}
                          placeholder="npr. Blok 23"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2 space-y-1.5">
                          <Label>Adresa</Label>
                          <Input
                            value={complexAddress}
                            onChange={(e) => setComplexAddress(e.target.value)}
                            placeholder="Bulevar Oslobođenja 12"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Grad</Label>
                          <Input
                            value={complexCity}
                            onChange={(e) => setComplexCity(e.target.value)}
                            placeholder="Novi Sad"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button onClick={() => setStep(2)} disabled={!canProceedFromStep1()}>
                      Dalje
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2 — buildings */}
              {step === 2 && (
                <div className="space-y-4">
                  {buildings.map((b, i) => (
                    <BuildingCard
                      key={b.id}
                      building={b}
                      onChange={(updated) => updateBuilding(i, updated)}
                      onRemove={() => removeBuilding(i)}
                      isOnlyBuilding={buildings.length === 1}
                      complexAddress={scope === 'complex' ? complexAddress : undefined}
                      complexCity={scope === 'complex' ? complexCity : undefined}
                    />
                  ))}

                  {(scope === 'multi' || scope === 'complex') && (
                    <button
                      type="button"
                      onClick={() => setBuildings((prev) => [...prev, newBuilding()])}
                      className="w-full py-3 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Dodaj zgradu
                    </button>
                  )}

                  <div className="flex justify-between pt-2">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      Nazad
                    </Button>
                    <Button onClick={() => setStep(3)} disabled={!canProceedFromStep2()}>
                      Dalje
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3 — review */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="p-4 rounded-lg border border-border space-y-3">
                    <div className="text-sm font-medium text-foreground">Sažetak</div>
                    {scope === 'complex' && (
                      <div className="text-sm text-muted-foreground">
                        <span className="text-foreground font-medium">Kompleks:</span> {complexName} —{' '}
                        {complexAddress}, {complexCity}
                      </div>
                    )}
                    <div className="text-sm text-muted-foreground">
                      {scope === 'complex' && '1 kompleks · '}
                      {buildings.length} {buildings.length === 1 ? 'zgrada' : 'zgrada'} ·{' '}
                      {buildings.reduce((s, b) => s + b.units.length, 0)} jedinica
                    </div>
                    <div className="space-y-1 pt-1 border-t border-border">
                      {buildings.map((b) => (
                        <div key={b.id} className="text-sm">
                          <span className="font-medium text-foreground">{b.name}</span>
                          <span className="text-muted-foreground">
                            {' '}
                            — {b.units.length} jedinica · {b.address}, {b.city}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {submitError && (
                    <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                      {submitError}
                    </p>
                  )}

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep(2)}>
                      Nazad
                    </Button>
                    <Button onClick={submitManual} disabled={isSubmitting}>
                      {isSubmitting ? 'Kreiranje…' : 'Kreiraj'}
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* CSV mode */
            <div className="space-y-4">
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground transition-colors"
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="text-sm font-medium text-foreground mb-1">
                  {csvFileName ? csvFileName : 'Kliknite za upload CSV fajla'}
                </div>
                <div className="text-xs text-muted-foreground">Samo .csv fajlovi</div>
              </div>

              {csvErrors.length > 0 && (
                <div className="space-y-1 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="text-xs font-medium text-destructive mb-1">Greške u CSV-u:</div>
                  {csvErrors.map((err, i) => (
                    <div key={i} className="text-xs text-destructive">
                      {err}
                    </div>
                  ))}
                </div>
              )}

              {csvBuildings.length > 0 && (
                <>
                  <div className="text-sm text-muted-foreground">
                    Pronađeno: {csvBuildings.length} zgrada ·{' '}
                    {csvBuildings.reduce((s, b) => s + b.units.length, 0)} jedinica
                  </div>

                  {submitError && (
                    <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                      {submitError}
                    </p>
                  )}

                  <Button
                    className="w-full"
                    onClick={submitCsv}
                    disabled={isSubmitting || csvErrors.length > 0}
                  >
                    {isSubmitting ? 'Kreiranje…' : 'Potvrdi i kreiraj'}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* RIGHT — live tree preview */}
        <div className="w-72 shrink-0 sticky top-24 self-start">
          <TreePreview
            scope={previewScope}
            complexName={previewComplexName}
            buildings={previewBuildings}
          />
        </div>
      </div>
    </div>
  )
}
