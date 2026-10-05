'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { useArrears } from '@/hooks/useFinance'
import { overdueText, unitTypeLabel } from '@/lib/chips'
import { formatDate, formatRSD, plural } from '@/lib/format'
import { cn } from '@/lib/utils'
import { eyebrow, financeCard, QueryError } from './form'

/** Building-wide owner charges vs. payments, shown to everyone on Pregled. Hidden until charges exist. */
export function ArrearsCard({ buildingId }: { buildingId: string }) {
  const { data, error, refetch } = useArrears(buildingId)
  if (error && !data) {
    return <QueryError inline message="Naplata od vlasnika trenutno nije dostupna." onRetry={refetch} />
  }
  if (!data || Number(data.totalCharged) === 0) return null

  return (
    <section className={financeCard}>
      <p className={eyebrow}>Naplata od vlasnika</p>
      <dl className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div>
          <dt className="text-xs text-muted-foreground">Zaduženo</dt>
          <dd className="text-base font-semibold font-mono tabular-nums">{formatRSD(data.totalCharged)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Uplaćeno</dt>
          <dd className="text-base font-semibold font-mono tabular-nums">{formatRSD(data.totalPaid)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Ukupan dug</dt>
          <dd className="text-base font-semibold font-mono tabular-nums">{formatRSD(data.totalOutstanding)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Dospeli dug</dt>
          <dd className={cn('text-base font-semibold font-mono tabular-nums', overdueText)}>
            {formatRSD(data.totalOverdue)}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-sm text-muted-foreground">
        {data.unitsInArrears} od {data.unitCount} {plural(data.unitCount, 'stana', 'stana', 'stanova')} ima dospeli dug
        {data.collectionRate !== null && <> · naplaćeno {data.collectionRate.toLocaleString('sr-Latn-RS')}%</>}
      </p>
    </section>
  )
}

/** Staff: every unit's balance; a row opens the unit's ledger. */
export function ArrearsTable({ buildingId, onOpen }: { buildingId: string; onOpen: (unitId: string) => void }) {
  const { data, isLoading, error, refetch } = useArrears(buildingId)

  if (error && !data) return <QueryError onRetry={refetch} />
  if (isLoading || !data) return <Skeleton className="h-40 w-full rounded-xl" />
  const units = data.units ?? []
  if (units.length === 0) return <p className="text-sm text-muted-foreground">Zgrada nema stanova.</p>

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {units.map((u) => {
        const overdue = Number(u.overdueAmount) > 0
        return (
          <li key={u.unitId}>
            <button
              type="button"
              onClick={() => onOpen(u.unitId)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {unitTypeLabel[u.type]} {u.unitNumber}
                </p>
                {overdue && u.overdueSince && (
                  <p className={cn('text-xs', overdueText)}>Dospelo od {formatDate(u.overdueSince)}</p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p
                  className={cn(
                    'text-sm font-mono tabular-nums',
                    Number(u.balance) > 0 ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {formatRSD(u.balance)}
                </p>
                {overdue && (
                  <p className={cn('text-xs font-mono tabular-nums', overdueText)}>
                    dospelo {formatRSD(u.overdueAmount)}
                  </p>
                )}
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
