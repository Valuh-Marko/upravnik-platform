'use client'

import { useRef, useState } from 'react'
import { Download, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { plural } from '@/lib/format'
import { cn } from '@/lib/utils'
import { CSV_COLUMNS, csvTemplate, parseCsv, readCsvFile, type CsvResult } from './csv'
import { findDuplicateUnitNumbers } from './units'

const MAX_SHOWN_ERRORS = 8

function downloadTemplate() {
  const url = URL.createObjectURL(csvTemplate())
  const a = document.createElement('a')
  a.href = url
  a.download = 'sablon-zgrade.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export function CsvImport({
  replacesDraft,
  onImport,
}: {
  replacesDraft: boolean
  onImport: (result: CsvResult) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<CsvResult | null>(null)
  const [dragging, setDragging] = useState(false)

  async function load(file: File) {
    setFileName(file.name)
    setResult(parseCsv(await readCsvFile(file)))
  }

  const units = result?.buildings.reduce((s, b) => s + b.units.length, 0) ?? 0
  const withDuplicates =
    result?.buildings.filter((b) => findDuplicateUnitNumbers(b.units).size > 0).length ?? 0

  return (
    <div className="space-y-5">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const file = e.dataTransfer.files[0]
          if (file) load(file)
        }}
        className={cn(
          'flex flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--border-strong)] bg-card px-6 py-8 text-center transition-colors',
          dragging && 'border-[var(--brand-border)] bg-[var(--brand-subtle)]',
        )}
      >
        <FileSpreadsheet aria-hidden="true" className="size-6 text-muted-foreground" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            {fileName || 'Prevucite CSV fajl ovde'}
          </p>
          <p className="text-xs text-muted-foreground">
            Kolone odvojene zarezom ili tačka-zarezom. Excel „CSV (Comma delimited)” radi.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) load(file)
            e.target.value = ''
          }}
        />
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
          {fileName ? 'Izaberite drugi fajl' : 'Izaberite CSV fajl'}
        </Button>
      </div>

      {result && result.errors.length > 0 && (
        <div
          role="alert"
          className="space-y-1.5 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-subtle)] px-4 py-3 text-sm text-[var(--danger-text)]"
        >
          <p className="font-medium">
            {result.errors.length === 1
              ? 'Fajl nije uvezen:'
              : `Fajl nije uvezen, ${result.errors.length} ${plural(result.errors.length, 'greška', 'greške', 'grešaka')}:`}
          </p>
          <ul className="space-y-0.5">
            {result.errors.slice(0, MAX_SHOWN_ERRORS).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
            {result.errors.length > MAX_SHOWN_ERRORS && (
              <li>…i još {result.errors.length - MAX_SHOWN_ERRORS}.</li>
            )}
          </ul>
        </div>
      )}

      {result && result.buildings.length > 0 && (
        <div role="status" className="space-y-3 rounded-xl border border-border bg-card p-4 md:p-6">
          <p className="text-base font-semibold text-foreground">
            Pronađeno:{' '}
            {result.complex && <>kompleks {result.complex.name}, </>}
            {result.buildings.length} {plural(result.buildings.length, 'zgrada', 'zgrade', 'zgrada')} i{' '}
            {units} {plural(units, 'jedinica', 'jedinice', 'jedinica')}
          </p>
          {withDuplicates > 0 && (
            <p className="text-sm text-[var(--warning-text)]">
              {withDuplicates === 1 ? 'U jednoj zgradi' : `U ${withDuplicates} ${plural(withDuplicates, 'zgradi', 'zgrade', 'zgrada')}`} ima
              dupliranih brojeva jedinica. Biće označeni u sledećem koraku.
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Zgrade i jedinice proveravate i ispravljate u sledećem koraku, pre kreiranja.
            {replacesDraft && ' Ovo zamenjuje vaš trenutni ručni unos.'}
          </p>
          <Button type="button" onClick={() => onImport(result)}>
            Nastavi na proveru
          </Button>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Kolone u fajlu</h2>
          <Button type="button" variant="ghost" size="sm" onClick={downloadTemplate}>
            <Download aria-hidden="true" />
            Preuzmi šablon
          </Button>
        </div>
        <dl className="divide-y divide-border rounded-lg border border-border text-sm">
          {CSV_COLUMNS.map((c) => (
            <div key={c.key} className="grid gap-1 px-3 py-2 sm:grid-cols-[11rem_1fr] sm:gap-3">
              <dt className="font-mono text-xs leading-5 text-foreground">{c.key}</dt>
              <dd className="text-muted-foreground">
                {c.label}
                {c.required && <span className="text-foreground"> · obavezno</span>}
              </dd>
            </div>
          ))}
        </dl>
        <p className="max-w-prose text-xs text-muted-foreground">
          Jedan red je jedna jedinica. Redovi sa istim nazivom i adresom zgrade spajaju se u jednu
          zgradu.
        </p>
      </div>
    </div>
  )
}
