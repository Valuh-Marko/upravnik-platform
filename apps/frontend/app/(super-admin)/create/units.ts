import { plural } from '@/lib/format'
import type { BulkCreateDto } from '@/lib/types'
import type { BuildingDraft, ComplexDraft, Generator, UnitEntry, UnitType } from './types'

/** Mirrors MAX_UNITS_PER_BUILDING in the backend bulk-create DTO. */
export const MAX_UNITS = 1000

const defaultGenerator: Generator = {
  pattern: 'sequential',
  floors: 4,
  unitsPerFloor: 4,
  groundUnits: 2,
  shops: 0,
  type: 'APARTMENT',
}

export function newBuilding(): BuildingDraft {
  return {
    id: crypto.randomUUID(),
    name: '',
    address: '',
    city: '',
    generator: { ...defaultGenerator },
    units: [],
    edited: false,
  }
}

/**
 * The next building starts from the previous one's generator settings; inside
 * a complex the lamele usually share the address too.
 */
export function nextBuilding(prev: BuildingDraft, sameAddress: boolean): BuildingDraft {
  return {
    ...newBuilding(),
    generator: { ...prev.generator },
    ...(sameAddress ? { address: prev.address, city: prev.city } : {}),
  }
}

/** A full copy with fresh ids and no name, so the copy has to be named. */
export function duplicateBuilding(b: BuildingDraft): BuildingDraft {
  return {
    ...b,
    id: crypto.randomUUID(),
    name: '',
    generator: { ...b.generator },
    units: b.units.map((u) => ({ ...u, id: crypto.randomUUID() })),
  }
}

export function newUnit(unitNumber: string, floor: number | '', type: UnitType): UnitEntry {
  return { id: crypto.randomUUID(), unitNumber, floor, type, areaSqm: '' }
}

const floorCode = (floor: number) => (floor === 0 ? 'P' : String(floor))

export function floorName(floor: number | ''): string {
  if (floor === '') return 'Bez sprata'
  if (floor === 0) return 'Prizemlje'
  return floor < 0 ? `Suteren ${-floor}` : `${floor}. sprat`
}

export function floorShort(floor: number | ''): string {
  if (floor === '') return '—'
  return floor < 0 ? `S${-floor}` : floorCode(floor)
}

export function generatedCount(g: Generator): number {
  return g.shops + g.groundUnits + g.floors * g.unitsPerFloor
}

export function generateUnits(g: Generator): UnitEntry[] {
  const units: UnitEntry[] = []
  for (let i = 1; i <= g.shops; i++) units.push(newUnit(`L${i}`, 0, 'COMMERCIAL'))
  let n = 0
  const addFloor = (floor: number, count: number) => {
    for (let i = 1; i <= count; i++) {
      n++
      units.push(
        newUnit(g.pattern === 'sequential' ? String(n) : `${floorCode(floor)}-${i}`, floor, g.type),
      )
    }
  }
  addFloor(0, g.groundUnits)
  for (let f = 1; f <= g.floors; f++) addFloor(f, g.unitsPerFloor)
  return units
}

const norm = (unitNumber: string) => unitNumber.trim().toLowerCase()

/** Next free number for a unit added by hand on `floor`. */
export function nextUnitNumber(b: BuildingDraft, floor: number | ''): string {
  const taken = new Set(b.units.map((u) => norm(u.unitNumber)))
  if (b.generator.pattern === 'floor-unit' && floor !== '' && floor >= 0) {
    for (let i = 1; ; i++) {
      const candidate = `${floorCode(floor)}-${i}`
      if (!taken.has(norm(candidate))) return candidate
    }
  }
  let max = 0
  for (const u of b.units) {
    if (/^\d+$/.test(u.unitNumber.trim())) max = Math.max(max, Number(u.unitNumber))
  }
  return String(max + 1)
}

/**
 * Unit numbers used more than once, keyed by their normalised form (trimmed,
 * case-insensitive) and mapped to the number as typed. Residents log in by
 * unit number, so a duplicate makes their login ambiguous.
 */
export function findDuplicateUnitNumbers(units: UnitEntry[]): Map<string, string> {
  const seen = new Set<string>()
  const dupes = new Map<string, string>()
  for (const u of units) {
    const key = norm(u.unitNumber)
    if (!key) continue
    if (seen.has(key) && !dupes.has(key)) dupes.set(key, u.unitNumber.trim())
    seen.add(key)
  }
  return dupes
}

export function isDuplicate(dupes: Map<string, string>, u: UnitEntry): boolean {
  return dupes.has(norm(u.unitNumber))
}

export interface BuildingIssues {
  name?: string
  address?: string
  city?: string
  units?: string
  duplicates: Map<string, string>
  /** Short label for the building's status chip; undefined when ready. */
  status?: string
}

export function buildingIssues(b: BuildingDraft): BuildingIssues {
  const duplicates = findDuplicateUnitNumbers(b.units)
  const unnumbered = b.units.filter((u) => !u.unitNumber.trim()).length
  const issues: BuildingIssues = { duplicates }

  if (!b.name.trim()) issues.name = 'Unesite naziv zgrade.'
  if (!b.address.trim()) issues.address = 'Unesite adresu.'
  if (!b.city.trim()) issues.city = 'Unesite grad.'

  if (b.units.length === 0) {
    issues.units = 'Dodajte bar jednu jedinicu: generišite raspored ili dodajte sprat.'
  } else if (b.units.length > MAX_UNITS) {
    issues.units = `Zgrada može imati najviše ${MAX_UNITS} jedinica.`
  } else if (unnumbered) {
    issues.units = `${unnumbered} ${plural(unnumbered, 'jedinica nema', 'jedinice nemaju', 'jedinica nema')} broj.`
  } else if (duplicates.size) {
    issues.units = `Broj jedinice mora biti jedinstven u zgradi. Duplirano: ${[...duplicates.values()].join(', ')}.`
  }

  if (duplicates.size) {
    const n = duplicates.size
    issues.status = `${n} ${plural(n, 'duplikat', 'duplikata', 'duplikata')}`
  } else if (issues.name) issues.status = 'Nedostaje naziv'
  else if (issues.address) issues.status = 'Nedostaje adresa'
  else if (issues.city) issues.status = 'Nedostaje grad'
  else if (issues.units) issues.status = b.units.length === 0 ? 'Nema jedinica' : 'Proverite jedinice'

  return issues
}

export function countByType(units: UnitEntry[]): string {
  const forms: Record<UnitType, [string, string, string]> = {
    APARTMENT: ['stan', 'stana', 'stanova'],
    OFFICE: ['kancelarija', 'kancelarije', 'kancelarija'],
    COMMERCIAL: ['lokal', 'lokala', 'lokala'],
  }
  return (Object.keys(forms) as UnitType[])
    .map((type) => {
      const n = units.filter((u) => u.type === type).length
      return n ? `${n} ${plural(n, ...forms[type])}` : ''
    })
    .filter(Boolean)
    .join(' · ')
}

export function toDto(
  complex: ComplexDraft | null,
  buildings: BuildingDraft[],
): BulkCreateDto {
  return {
    ...(complex
      ? {
          complex: {
            name: complex.name.trim(),
            address: complex.address.trim(),
            city: complex.city.trim(),
          },
        }
      : {}),
    buildings: buildings.map((b) => ({
      name: b.name.trim(),
      address: b.address.trim(),
      city: b.city.trim(),
      units: b.units.map((u) => ({
        unitNumber: u.unitNumber.trim(),
        ...(u.floor !== '' ? { floor: u.floor } : {}),
        type: u.type,
        ...(u.areaSqm !== '' ? { areaSqm: u.areaSqm } : {}),
      })),
    })),
  }
}
