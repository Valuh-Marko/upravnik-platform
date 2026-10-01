import { newBuilding, newUnit } from './units'
import type { BuildingDraft, ComplexDraft, UnitType } from './types'

export const CSV_COLUMNS: { key: string; label: string; required?: boolean }[] = [
  { key: 'building_name', label: 'Naziv zgrade', required: true },
  { key: 'building_address', label: 'Adresa zgrade', required: true },
  { key: 'building_city', label: 'Grad', required: true },
  { key: 'unit_number', label: 'Broj jedinice', required: true },
  { key: 'unit_type', label: 'Tip: stan, kancelarija ili lokal (prazno je stan)' },
  { key: 'floor', label: 'Sprat: broj, P ili 0 za prizemlje' },
  { key: 'area_sqm', label: 'Površina u m²' },
  { key: 'complex_name', label: 'Naziv kompleksa, ako zgrade pripadaju kompleksu' },
  { key: 'complex_address', label: 'Adresa kompleksa' },
  { key: 'complex_city', label: 'Grad kompleksa' },
]

const TEMPLATE_ROWS = [
  ['Lamela A', 'Bulevar Oslobođenja 12', 'Novi Sad', 'L1', 'lokal', 'P', '48', 'Blok 23', 'Bulevar Oslobođenja 12', 'Novi Sad'],
  ['Lamela A', 'Bulevar Oslobođenja 12', 'Novi Sad', '1', 'stan', '1', '52,5', 'Blok 23', 'Bulevar Oslobođenja 12', 'Novi Sad'],
]

/** Semicolon-separated with a BOM, so Excel with Serbian regional settings opens it as columns. */
export function csvTemplate(): Blob {
  const lines = [CSV_COLUMNS.map((c) => c.key), ...TEMPLATE_ROWS].map((r) => r.join(';'))
  return new Blob(['﻿' + lines.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' })
}

/** UTF-8 first; Excel on Serbian Windows saves "CSV" as Windows-1250. */
export async function readCsvFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf)
  } catch {
    return new TextDecoder('windows-1250').decode(buf)
  }
}

function splitRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === delimiter) {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  row.push(field)
  rows.push(row)
  return rows.filter((r) => r.some((f) => f.trim() !== ''))
}

function detectDelimiter(text: string): string {
  const header = text.slice(0, text.search(/\r|\n|$/))
  return header.split(';').length > header.split(',').length ? ';' : ','
}

const TYPES: Record<string, UnitType> = {
  '': 'APARTMENT',
  stan: 'APARTMENT',
  apartment: 'APARTMENT',
  kancelarija: 'OFFICE',
  office: 'OFFICE',
  lokal: 'COMMERCIAL',
  'poslovni prostor': 'COMMERCIAL',
  commercial: 'COMMERCIAL',
}

export interface CsvResult {
  errors: string[]
  complex: ComplexDraft | null
  buildings: BuildingDraft[]
}

export function parseCsv(raw: string): CsvResult {
  const text = raw.replace(/^﻿/, '')
  const [header, ...rows] = splitRows(text, detectDelimiter(text))
  const fail = (error: string): CsvResult => ({ errors: [error], complex: null, buildings: [] })

  if (!header || rows.length === 0) return fail('Fajl nema redova sa jedinicama ispod zaglavlja.')

  const keys = header.map((h) => h.trim().toLowerCase())
  const missing = CSV_COLUMNS.filter((c) => c.required && !keys.includes(c.key))
  if (missing.length) {
    return fail(
      `Nedostaju kolone: ${missing.map((c) => `${c.key} (${c.label.toLowerCase()})`).join(', ')}. Preuzmite šablon za tačan format.`,
    )
  }

  const errors: string[] = []
  const buildings = new Map<string, BuildingDraft>()
  let complex: ComplexDraft | null = null

  rows.forEach((cols, i) => {
    const line = i + 2
    const cell = (key: string) => (cols[keys.indexOf(key)] ?? '').trim()
    const name = cell('building_name')
    const address = cell('building_address')
    const city = cell('building_city')
    const unitNumber = cell('unit_number')

    const missingCells = [
      !name && 'naziv zgrade',
      !address && 'adresa zgrade',
      !city && 'grad',
      !unitNumber && 'broj jedinice',
    ].filter(Boolean)
    if (missingCells.length) {
      errors.push(`Red ${line}: nedostaje ${missingCells.join(', ')}.`)
      return
    }

    const rawType = cell('unit_type')
    const type = TYPES[rawType.toLowerCase()]
    if (!type) {
      errors.push(`Red ${line}: nepoznat tip „${rawType}”. Koristite stan, kancelarija ili lokal.`)
      return
    }

    const rawFloor = cell('floor')
    let floor: number | '' = ''
    if (/^(p|prizemlje)$/i.test(rawFloor)) floor = 0
    else if (/^-?\d+$/.test(rawFloor)) floor = Number(rawFloor)
    else if (rawFloor) {
      errors.push(`Red ${line}: sprat „${rawFloor}” nije broj. Za prizemlje upišite P ili 0.`)
      return
    }

    const rawArea = cell('area_sqm').replace(',', '.')
    if (rawArea && !/^\d+(\.\d+)?$/.test(rawArea)) {
      errors.push(`Red ${line}: površina „${cell('area_sqm')}” nije broj.`)
      return
    }

    if (!complex && cell('complex_name')) {
      complex = {
        name: cell('complex_name'),
        address: cell('complex_address'),
        city: cell('complex_city'),
      }
    }

    const key = `${name}\u0000${address}`.toLowerCase()
    let building = buildings.get(key)
    if (!building) {
      building = { ...newBuilding(), name, address, city, edited: true }
      buildings.set(key, building)
    }
    building.units.push({ ...newUnit(unitNumber, floor, type), areaSqm: rawArea ? Number(rawArea) : '' })
  })

  return { errors, complex, buildings: errors.length ? [] : [...buildings.values()] }
}
