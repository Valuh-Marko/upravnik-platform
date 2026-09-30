import type { UnitType } from '@/lib/types'

export type { UnitType }
export type Scope = 'single' | 'multi' | 'complex'
export type FormMode = 'manual' | 'csv'
export type NumberPattern = 'floor-unit' | 'sequential'
export type UnitMode = 'auto' | 'manual'

export interface UnitEntry {
  id: string
  unitNumber: string
  floor: number | ''
  type: UnitType
  areaSqm: number | ''
}

export interface BuildingDraft {
  id: string
  name: string
  address: string
  city: string
  unitMode: UnitMode
  floors: number
  unitsPerFloor: number
  pattern: NumberPattern
  defaultType: UnitType
  units: UnitEntry[]
}
