import type { UnitType } from '@/lib/types'

export type { UnitType }
export type Scope = 'single' | 'multi' | 'complex'
export type FormMode = 'manual' | 'csv'
/** 'sequential': 1, 2, 3… through the building; 'floor-unit': 1-1, 1-2, P-1… */
export type NumberPattern = 'sequential' | 'floor-unit'

export interface UnitEntry {
  id: string
  unitNumber: string
  /** 0 is prizemlje; '' when unknown (CSV without a floor column). */
  floor: number | ''
  type: UnitType
  areaSqm: number | ''
}

/** What "Generiši" builds. Changing it never touches existing units. */
export interface Generator {
  pattern: NumberPattern
  floors: number
  unitsPerFloor: number
  groundUnits: number
  /** Lokali: their own L1, L2… series in prizemlje. */
  shops: number
  type: UnitType
}

export interface BuildingDraft {
  id: string
  name: string
  address: string
  city: string
  generator: Generator
  units: UnitEntry[]
  /** Units changed by hand since the last generate, so regenerating asks first. */
  edited: boolean
}

export interface ComplexDraft {
  name: string
  address: string
  city: string
}
