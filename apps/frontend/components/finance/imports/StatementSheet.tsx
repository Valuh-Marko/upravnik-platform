'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { ChipBadge } from '@/components/ChipBadge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useCommitStatement,
  useDiscardStatement,
  useFinanceCategories,
  useInvoices,
  useStatementImport,
  useUpdateStatementLine,
} from '@/hooks/useFinance'
import { useUnits } from '@/hooks/useUnits'
import { needsReview, statementImportStatus, unassignedPayment, unitTypeLabel } from '@/lib/chips'
import { formatAccountNumber, formatDate, formatRSD, plural } from '@/lib/format'
import { cn } from '@/lib/utils'
import type {
  FinanceCategory,
  Invoice,
  StatementImport,
  StatementLine,
  Unit,
  UpdateStatementLineDto,
} from '@/lib/types'
import { errorMessage, FormError, NativeSelect, QueryError, Segmented } from '../form'

export function StatementSheet({
  buildingId,
  importId,
  canWrite,
  onClose,
}: {
  buildingId: string
  importId: string | null
  canWrite: boolean
  onClose: () => void
}) {
  const { data: imp, isLoading, error, refetch } = useStatementImport(buildingId, importId)

  return (
    <Sheet open={!!importId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Izvod</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-6">
          {error && !imp ? (
            <QueryError onRetry={refetch} />
          ) : isLoading || !imp ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <StatementBody key={imp.id} buildingId={buildingId} imp={imp} canWrite={canWrite} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

type LineFilter = 'all' | 'blocked' | 'skipped' | 'duplicates'

const lineMatches: Record<LineFilter, (line: StatementLine) => boolean> = {
  all: () => true,
  blocked: (l) => l.issues.length > 0,
  skipped: (l) => l.skip,
  duplicates: (l) => l.isDuplicate,
}

// Commit failures name lines as "Red N: …"; each is shown beside its line.
function commitIssues(error: unknown) {
  const issues = new Map<number, string>()
  if (!error) return issues
  for (const part of errorMessage(error).split('; ')) {
    const match = /^Red (\d+): (.+)$/.exec(part)
    if (match) issues.set(Number(match[1]), match[2])
  }
  return issues
}

function StatementBody({
  buildingId,
  imp,
  canWrite,
}: {
  buildingId: string
  imp: StatementImport
  canWrite: boolean
}) {
  const editable = canWrite && imp.status === 'DRAFT'
  const [discarding, setDiscarding] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const { data: categories } = useFinanceCategories(buildingId, editable)
  const { data: units } = useUnits(editable ? buildingId : '')
  const { data: invoices } = useInvoices(buildingId, {}, editable)
  const update = useUpdateStatementLine(buildingId, imp.id)
  const commit = useCommitStatement(buildingId)
  const discard = useDiscardStatement(buildingId)
  // Lines being saved, and the save error per line; every other line stays editable.
  const [saving, setSaving] = useState<string[]>([])
  const [lineErrors, setLineErrors] = useState<Record<string, unknown>>({})

  const blocked = imp.lines.filter(lineMatches.blocked).length
  const { summary } = imp
  const pending = saving.length > 0 || commit.isPending || discard.isPending
  const failedLines = commitIssues(commit.error)

  // The filtered lines are fixed when the filter is chosen, so a line stays put while it is being fixed.
  const pick = (key: LineFilter) => ({
    key,
    ids: key === 'all' ? null : new Set(imp.lines.filter(lineMatches[key]).map((l) => l.id)),
  })
  const [filter, setFilter] = useState(() => pick(blocked > 0 ? 'blocked' : 'all'))
  const shown = filter.ids ? imp.lines.filter((l) => filter.ids!.has(l.id)) : imp.lines

  async function saveLine(lineId: string, dto: UpdateStatementLineDto) {
    setSaving((ids) => [...ids, lineId])
    setLineErrors((errors) => {
      const next = { ...errors }
      delete next[lineId]
      return next
    })
    try {
      await update.mutateAsync({ lineId, dto })
    } catch (error) {
      setLineErrors((errors) => ({ ...errors, [lineId]: error }))
    } finally {
      setSaving((ids) => ids.filter((id) => id !== lineId))
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-base font-semibold text-foreground">
          {imp.statementNumber ? `Izvod br. ${imp.statementNumber}` : imp.file.fileName}
        </p>
        <p className="text-sm text-muted-foreground">
          {imp.bankAccount.bankName} ·{' '}
          <span className="font-mono">{formatAccountNumber(imp.bankAccount.accountNumber)}</span>
        </p>
        <div className="mt-2">
          <ChipBadge chip={statementImportStatus[imp.status]} />
        </div>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-muted-foreground">Stavki</dt>
        <dd>
          {summary.lineCount}
          {summary.duplicateCount > 0 && ` · ${summary.duplicateCount} već proknjiženo`}
          {summary.skippedCount > 0 && ` · ${summary.skippedCount} preskočeno`}
        </dd>
        <dt className="text-muted-foreground">Za knjiženje</dt>
        <dd>{summary.toBookCount}</dd>
        <dt className="text-muted-foreground">Uplate</dt>
        <dd className="font-mono text-[var(--success-text)]">{formatRSD(summary.income)}</dd>
        <dt className="text-muted-foreground">Isplate</dt>
        <dd className="font-mono text-[var(--danger-text)]">{formatRSD(summary.expense)}</dd>
        {imp.openingBalance && (
          <>
            <dt className="text-muted-foreground">Početno stanje</dt>
            <dd className="font-mono">{formatRSD(imp.openingBalance)}</dd>
          </>
        )}
        {imp.closingBalance && (
          <>
            <dt className="text-muted-foreground">Završno stanje</dt>
            <dd className="font-mono">{formatRSD(imp.closingBalance)}</dd>
          </>
        )}
      </dl>

      {imp.warnings.length > 0 && (
        <div className="rounded-md border border-[var(--warning)]/30 bg-[var(--warning-subtle)] px-3 py-2 text-sm text-[var(--warning-text)]">
          {imp.warnings.map((w) => (
            <p key={w} className="flex gap-2">
              <AlertTriangle className="size-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
              {w}
            </p>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <Segmented
          label="Prikaz stavki"
          value={filter.key}
          onChange={(key) => setFilter(pick(key))}
          options={[
            { value: 'all', label: 'Sve' },
            { value: 'blocked', label: `Za dopunu (${blocked})` },
            { value: 'skipped', label: `Preskočene (${summary.skippedCount})` },
            { value: 'duplicates', label: `Duplikati (${summary.duplicateCount})` },
          ]}
        />
        {shown.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nema stavki u ovom prikazu.</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {shown.map((line) => (
              <LineRow
                key={line.id}
                line={line}
                editable={editable}
                disabled={saving.includes(line.id) || commit.isPending || discard.isPending}
                categories={categories ?? []}
                units={units ?? []}
                invoices={invoices ?? []}
                commitIssue={failedLines.get(line.lineNo)}
                error={lineErrors[line.id]}
                onChange={(dto) => saveLine(line.id, dto)}
              />
            ))}
          </ul>
        )}
      </div>

      {editable && (
        <div className="space-y-2 border-t border-border pt-4">
          <FormError error={commit.error ?? discard.error} />
          {blocked > 0 && (
            <button
              type="button"
              onClick={() => setFilter(pick('blocked'))}
              className="text-left text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Dopunite ili preskočite označene stavke ({blocked}) pre knjiženja.
            </button>
          )}
          {discarding ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="destructive" disabled={pending} onClick={() => discard.mutate(imp.id)}>
                {discard.isPending ? 'Odbacivanje…' : 'Da, odbaci izvod'}
              </Button>
              <Button variant="ghost" onClick={() => setDiscarding(false)}>
                Odustani
              </Button>
            </div>
          ) : confirming ? (
            <div className="space-y-2">
              <p className="text-sm text-foreground">
                Proknjižiti {summary.toBookCount} {plural(summary.toBookCount, 'stavku', 'stavke', 'stavki')}?
                Uplate <span className="font-mono">{formatRSD(summary.income)}</span>, isplate{' '}
                <span className="font-mono">{formatRSD(summary.expense)}</span>.
              </p>
              {imp.closingBalance && (
                <p className="text-sm text-muted-foreground">
                  Stanje računa posle knjiženja (prema izvodu):{' '}
                  <span className="font-mono">{formatRSD(imp.closingBalance)}</span>
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={pending}
                  onClick={() => commit.mutate(imp.id, { onSettled: () => setConfirming(false) })}
                >
                  {commit.isPending ? 'Knjiženje…' : 'Da, proknjiži'}
                </Button>
                <Button variant="ghost" disabled={commit.isPending} onClick={() => setConfirming(false)}>
                  Odustani
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={blocked > 0 || summary.toBookCount === 0 || pending}
                onClick={() => {
                  commit.reset()
                  setConfirming(true)
                }}
              >
                Proknjiži {summary.toBookCount} {plural(summary.toBookCount, 'stavku', 'stavke', 'stavki')}
              </Button>
              <Button variant="ghost" disabled={pending} onClick={() => setDiscarding(true)}>
                Odbaci
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function LineRow({
  line,
  editable,
  disabled,
  categories,
  units,
  invoices,
  commitIssue,
  error,
  onChange,
}: {
  line: StatementLine
  editable: boolean
  disabled: boolean
  categories: FinanceCategory[]
  units: Unit[]
  invoices: Invoice[]
  /** Why the last commit rejected this line. */
  commitIssue?: string
  /** The last failed save of this line. */
  error?: unknown
  onChange: (dto: UpdateStatementLineDto) => void
}) {
  const income = line.direction === 'INCOME'
  const canEdit = editable && !line.isDuplicate
  const inactive = line.skip || line.isDuplicate
  const category = categories.find((c) => c.id === line.categoryId) ?? line.category
  const categoryOptions = categories.filter(
    (c) => c.direction === line.direction && (c.isActive || c.id === line.categoryId)
  )
  const openInvoices = invoices.filter(
    (i) => i.id === line.invoiceId || i.status === 'UNPAID' || i.status === 'PARTIALLY_PAID'
  )
  const id = (field: string) => `line-${line.id}-${field}`
  const issues = commitIssue ? [...line.issues, commitIssue] : line.issues
  // Allowed by the backend, but the payment then never reaches an owner's balance.
  const unassigned = !inactive && !!category?.isOwnerPayment && !line.unitId

  return (
    <li className={cn('px-3 py-3 space-y-2', issues.length > 0 && 'bg-[var(--danger-subtle)]')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn('text-sm font-semibold truncate', inactive ? 'text-muted-foreground' : 'text-foreground')}>
            {line.counterpartyName ?? (income ? 'Uplata' : 'Isplata')}
          </p>
          <p className="text-xs text-muted-foreground break-words">
            <span className="font-mono">{formatDate(line.valueDate)}</span> · {line.purpose}
            {line.reference && <> · poziv na broj <span className="font-mono">{line.reference}</span></>}
          </p>
          {(issues.length > 0 || unassigned || (line.skip && canEdit)) && (
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {issues.length > 0 && <ChipBadge chip={needsReview} />}
              {unassigned && <ChipBadge chip={unassignedPayment} />}
              {line.skip && canEdit && <span className="text-xs text-muted-foreground">preskočeno</span>}
            </div>
          )}
        </div>
        <p
          className={cn(
            'font-mono tabular-nums text-sm font-semibold flex-shrink-0',
            inactive ? 'text-muted-foreground' : income ? 'text-[var(--success-text)]' : 'text-[var(--danger-text)]'
          )}
        >
          {income ? '+' : '−'}
          {formatRSD(line.amount)}
        </p>
      </div>

      {line.isDuplicate ? (
        <p className="text-xs text-muted-foreground">Već proknjiženo ranijim izvodom.</p>
      ) : canEdit ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <NativeSelect
            aria-label="Kategorija"
            id={id('category')}
            value={line.categoryId ?? ''}
            disabled={disabled}
            onChange={(e) => {
              const next = categories.find((c) => c.id === e.target.value)
              onChange({
                categoryId: next?.id ?? null,
                ...(next?.isOwnerPayment ? {} : { unitId: null }),
              })
            }}
          >
            <option value="">Kategorija…</option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
          {category?.isOwnerPayment && (
            <NativeSelect
              aria-label="Jedinica"
              id={id('unit')}
              value={line.unitId ?? ''}
              disabled={disabled}
              onChange={(e) => onChange({ unitId: e.target.value || null })}
              aria-invalid={unassigned}
            >
              <option value="">Izaberite stan…</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {unitTypeLabel[u.type]} {u.unitNumber}
                </option>
              ))}
            </NativeSelect>
          )}
          {!income && (
            <NativeSelect
              aria-label="Faktura"
              id={id('invoice')}
              value={line.invoiceId ?? ''}
              disabled={disabled}
              onChange={(e) => onChange({ invoiceId: e.target.value || null })}
            >
              <option value="">Bez fakture</option>
              {openInvoices.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.supplier.name} · {i.number} · {formatRSD(i.openAmount)}
                </option>
              ))}
            </NativeSelect>
          )}
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox
              checked={line.skip}
              disabled={disabled}
              onCheckedChange={(checked) => onChange({ skip: checked })}
            />
            Preskoči stavku
          </label>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {line.category?.name ?? 'Bez kategorije'}
          {line.unit && ` · ${line.unit.unitNumber}`}
          {line.invoice && ` · faktura ${line.invoice.number} (${line.invoice.supplier.name})`}
          {line.skip && ' · preskočeno'}
          {line.transactionId && ' · proknjiženo'}
        </p>
      )}

      {unassigned && canEdit && (
        <p className="text-xs text-muted-foreground">
          Bez stana uplata ulazi u prihode zgrade, ali ne umanjuje dug nijednog vlasnika.
        </p>
      )}
      {issues.length > 0 && (
        <p className="flex gap-1.5 text-xs font-medium text-[var(--danger-text)]">
          <AlertTriangle className="size-3.5 flex-shrink-0 mt-px" aria-hidden="true" />
          {issues.join(' · ')}
        </p>
      )}
      <FormError error={error} />
    </li>
  )
}
