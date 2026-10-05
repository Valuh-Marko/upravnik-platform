'use client'

import { useMemo, useState } from 'react'
import { FileUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useUploadStatement } from '@/hooks/useFinance'
import { decodeCsv, parseCsv } from '@/lib/csv'
import { formatAccountNumber, parseMoneyInput } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { BankAccount, CsvMapping } from '@/lib/types'
import { Field, FormError, guardDirty, NativeSelect, NoAccountHint, Segmented } from '../form'

const MAX_BYTES = 10 * 1024 * 1024
const PREVIEW_BYTES = 64 * 1024
const PREVIEW_ROWS = 8

const DEFAULT_MAPPING: CsvMapping = {
  encoding: 'utf-8',
  delimiter: ';',
  skipRows: 1,
  dateFormat: 'DD.MM.YYYY',
  decimalSeparator: ',',
  columns: { date: 0 },
}

type ColumnKey = keyof CsvMapping['columns']

const OPTIONAL_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: 'counterpartyName', label: 'Naziv uplatioca / primaoca' },
  { key: 'counterpartyAccount', label: 'Račun uplatioca / primaoca' },
  { key: 'reference', label: 'Poziv na broj' },
  { key: 'purpose', label: 'Svrha plaćanja' },
  { key: 'id', label: 'ID stavke banke' },
]

/** Role names shown over mapped columns in the preview. */
const COLUMN_ROLE: Record<ColumnKey, string> = {
  date: 'Datum',
  amount: 'Iznos',
  debit: 'Duguje',
  credit: 'Potražuje',
  counterpartyName: 'Naziv',
  counterpartyAccount: 'Račun',
  reference: 'Poziv na broj',
  purpose: 'Svrha',
  id: 'ID stavke',
}

export function UploadStatementDialog({
  buildingId,
  bankAccounts,
  onUploaded,
}: {
  buildingId: string
  bankAccounts: BankAccount[]
  onUploaded: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [bankAccountId, setBankAccountId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  // The start of the picked file; enough to choose the columns.
  const [raw, setRaw] = useState<{ file: File; buffer: ArrayBuffer } | null>(null)
  const [mapping, setMapping] = useState<CsvMapping>(DEFAULT_MAPPING)
  const [form, setForm] = useState({ statementNumber: '', openingBalance: '', closingBalance: '' })
  const upload = useUploadStatement(buildingId)

  const activeAccounts = bankAccounts.filter((a) => a.isActive)
  const split = mapping.columns.amount === undefined
  const fileTooBig = !!file && file.size > MAX_BYTES
  const openingBalance = parseMoneyInput(form.openingBalance)
  const closingBalance = parseMoneyInput(form.closingBalance)

  const rows = useMemo(
    () =>
      raw && raw.file === file
        ? parseCsv(decodeCsv(raw.buffer, mapping.encoding), mapping.delimiter)
            .filter((r) => r.some((cell) => cell.trim()))
            .slice(0, PREVIEW_ROWS)
        : [],
    [raw, file, mapping.encoding, mapping.delimiter]
  )
  const columnCount = Math.max(0, ...rows.map((r) => r.length))
  const header = mapping.skipRows > 0 ? rows[mapping.skipRows - 1] : undefined
  const columnLabel = (i: number) => `${i + 1}${header?.[i]?.trim() ? ` · ${header[i].trim()}` : ''}`
  // Which role each mapped column plays, for the preview header.
  const roles = new Map<number, string>()
  for (const [key, index] of Object.entries(mapping.columns)) {
    if (index !== undefined) roles.set(index, COLUMN_ROLE[key as ColumnKey])
  }
  const dirty = !!file || Object.values(form).some((v) => v.trim())

  function accountMapping(id: string) {
    return activeAccounts.find((a) => a.id === id)?.importMapping ?? DEFAULT_MAPPING
  }

  function handleOpen() {
    const first = activeAccounts.find((a) => a.isPrimary) ?? activeAccounts[0]
    setBankAccountId(first?.id ?? '')
    setMapping(accountMapping(first?.id ?? ''))
    setFile(null)
    setForm({ statementNumber: '', openingBalance: '', closingBalance: '' })
    upload.reset()
    setOpen(true)
  }

  function pickFile(next: File | null) {
    setFile(next)
    next
      ?.slice(0, PREVIEW_BYTES)
      .arrayBuffer()
      .then((buffer) => setRaw({ file: next, buffer }))
  }

  function changeAccount(id: string) {
    setBankAccountId(id)
    setMapping(accountMapping(id))
  }

  function setColumn(key: ColumnKey, value: string) {
    setMapping((m) => ({ ...m, columns: { ...m.columns, [key]: value === '' ? undefined : Number(value) } }))
  }

  function setSplit(next: boolean) {
    setMapping((m) => {
      const columns = { ...m.columns }
      delete columns.amount
      delete columns.debit
      delete columns.credit
      return { ...m, columns: next ? columns : { ...columns, amount: 0 } }
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    upload.mutate(
      {
        file,
        dto: {
          bankAccountId,
          mapping,
          statementNumber: form.statementNumber.trim() || undefined,
          openingBalance: openingBalance ?? undefined,
          closingBalance: closingBalance ?? undefined,
        },
      },
      {
        onSuccess: (imp) => {
          setOpen(false)
          onUploaded(imp.id)
        },
      }
    )
  }

  const amountMapped = split
    ? mapping.columns.debit !== undefined && mapping.columns.credit !== undefined
    : mapping.columns.amount !== undefined
  const valid =
    bankAccountId &&
    file &&
    !fileTooBig &&
    amountMapped &&
    (!form.openingBalance || openingBalance) &&
    (!form.closingBalance || closingBalance)

  const columnSelect = (key: ColumnKey, label: string, required = false) => (
    <Field key={key} id={`imp-col-${key}`} label={label}>
      <NativeSelect
        id={`imp-col-${key}`}
        value={mapping.columns[key] ?? ''}
        onChange={(e) => setColumn(key, e.target.value)}
      >
        {!required && <option value="">—</option>}
        {required && mapping.columns[key] === undefined && <option value="">Izaberite…</option>}
        {Array.from({ length: Math.max(columnCount, (mapping.columns[key] ?? -1) + 1) }, (_, i) => (
          <option key={i} value={i}>
            {columnLabel(i)}
          </option>
        ))}
      </NativeSelect>
    </Field>
  )

  return (
    <Dialog open={open} onOpenChange={guardDirty(setOpen, dirty)}>
      {activeAccounts.length === 0 && <NoAccountHint />}
      <Button size="sm" onClick={handleOpen} disabled={activeAccounts.length === 0}>
        <FileUp />
        Uvezi izvod
      </Button>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Uvoz izvoda</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="imp-account" label="Račun">
              <NativeSelect id="imp-account" value={bankAccountId} onChange={(e) => changeAccount(e.target.value)}>
                {activeAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.bankName} · {formatAccountNumber(a.accountNumber)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="imp-file" label="CSV fajl izvoda" hint="Izvoz iz e-bankinga, najviše 10 MB.">
              <Input
                id="imp-file"
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                aria-invalid={fileTooBig}
              />
            </Field>
          </div>
          {fileTooBig && <p className="text-sm text-destructive">Fajl je veći od 10 MB.</p>}

          {rows.length > 0 && (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-xs">
                <caption className="sr-only">Prvi redovi fajla</caption>
                <thead className="border-b border-border">
                  <tr>
                    {Array.from({ length: columnCount }, (_, c) => (
                      <th
                        key={c}
                        scope="col"
                        className={cn(
                          'px-2 py-1 text-left align-bottom font-medium whitespace-nowrap max-w-48 truncate',
                          roles.has(c) ? 'bg-[var(--info-subtle)] text-[var(--info-text)]' : 'text-muted-foreground'
                        )}
                      >
                        <span className="block">{columnLabel(c)}</span>
                        {roles.has(c) && <span className="block font-semibold">{roles.get(c)}</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row, r) => (
                    <tr key={r} className={cn(r < mapping.skipRows && 'bg-muted text-muted-foreground')}>
                      {Array.from({ length: columnCount }, (_, c) => (
                        <td
                          key={c}
                          className={cn(
                            'px-2 py-1 whitespace-nowrap max-w-48 truncate',
                            roles.has(c) && r >= mapping.skipRows && 'bg-[var(--info-subtle)]'
                          )}
                        >
                          {row[c]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-foreground mb-2">Format fajla</legend>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
              <Field id="imp-encoding" label="Kodiranje">
                <NativeSelect
                  id="imp-encoding"
                  value={mapping.encoding}
                  onChange={(e) => setMapping((m) => ({ ...m, encoding: e.target.value as CsvMapping['encoding'] }))}
                >
                  <option value="utf-8">UTF-8</option>
                  <option value="windows-1250">Windows-1250</option>
                </NativeSelect>
              </Field>
              <Field id="imp-delimiter" label="Razdvajač">
                <NativeSelect
                  id="imp-delimiter"
                  value={mapping.delimiter}
                  onChange={(e) => setMapping((m) => ({ ...m, delimiter: e.target.value }))}
                >
                  <option value=";">Tačka-zarez (;)</option>
                  <option value=",">Zarez (,)</option>
                  <option value={'\t'}>Tab</option>
                  <option value="|">Uspravna crta (|)</option>
                </NativeSelect>
              </Field>
              <Field id="imp-skip" label="Redova pre podataka" hint="Zaglavlje se računa.">
                <Input
                  id="imp-skip"
                  type="number"
                  min={0}
                  max={50}
                  value={mapping.skipRows}
                  onChange={(e) =>
                    setMapping((m) => ({ ...m, skipRows: Math.min(50, Math.max(0, Number(e.target.value) || 0)) }))
                  }
                />
              </Field>
              <Field id="imp-date-format" label="Format datuma">
                <NativeSelect
                  id="imp-date-format"
                  value={mapping.dateFormat}
                  onChange={(e) =>
                    setMapping((m) => ({ ...m, dateFormat: e.target.value as CsvMapping['dateFormat'] }))
                  }
                >
                  <option value="DD.MM.YYYY">DD.MM.GGGG</option>
                  <option value="DD/MM/YYYY">DD/MM/GGGG</option>
                  <option value="YYYY-MM-DD">GGGG-MM-DD</option>
                </NativeSelect>
              </Field>
              <Field id="imp-decimal" label="Decimalni znak">
                <NativeSelect
                  id="imp-decimal"
                  value={mapping.decimalSeparator}
                  onChange={(e) =>
                    setMapping((m) => ({
                      ...m,
                      decimalSeparator: e.target.value as CsvMapping['decimalSeparator'],
                    }))
                  }
                >
                  <option value=",">Zarez (1.234,56)</option>
                  <option value=".">Tačka (1,234.56)</option>
                </NativeSelect>
              </Field>
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-foreground mb-2">Kolone</legend>
            <Segmented
              label="Iznos"
              value={split ? 'split' : 'signed'}
              onChange={(v) => setSplit(v === 'split')}
              options={[
                { value: 'signed', label: 'Jedan iznos (minus = isplata)' },
                { value: 'split', label: 'Duguje / potražuje' },
              ]}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {columnSelect('date', 'Datum', true)}
              {split ? (
                <>
                  {columnSelect('debit', 'Duguje (isplata)', true)}
                  {columnSelect('credit', 'Potražuje (uplata)', true)}
                </>
              ) : (
                columnSelect('amount', 'Iznos', true)
              )}
              {OPTIONAL_COLUMNS.map((c) => columnSelect(c.key, c.label))}
            </div>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field id="imp-number" label="Broj izvoda (opciono)">
              <Input
                id="imp-number"
                value={form.statementNumber}
                onChange={(e) => setForm((f) => ({ ...f, statementNumber: e.target.value }))}
              />
            </Field>
            <Field id="imp-opening" label="Početno stanje (opciono)" hint="Npr. 12.500,00">
              <Input
                id="imp-opening"
                inputMode="decimal"
                className="font-mono"
                value={form.openingBalance}
                onChange={(e) => setForm((f) => ({ ...f, openingBalance: e.target.value }))}
                aria-invalid={form.openingBalance !== '' && !openingBalance}
              />
            </Field>
            <Field id="imp-closing" label="Završno stanje (opciono)" hint="Npr. 12.500,00">
              <Input
                id="imp-closing"
                inputMode="decimal"
                className="font-mono"
                value={form.closingBalance}
                onChange={(e) => setForm((f) => ({ ...f, closingBalance: e.target.value }))}
                aria-invalid={form.closingBalance !== '' && !closingBalance}
              />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">
            Stanja sa izvoda služe za proveru; ništa se ne knjiži dok ne pregledate i potvrdite stavke.
          </p>

          <FormError error={upload.error} />
          <DialogFooter>
            <Button type="submit" disabled={!valid || upload.isPending} className="w-full sm:w-auto">
              {upload.isPending ? 'Učitavanje…' : 'Učitaj izvod'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
