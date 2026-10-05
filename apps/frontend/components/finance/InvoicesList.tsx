'use client'

import { useState } from 'react'
import { Paperclip } from 'lucide-react'
import { ChipBadge } from '@/components/ChipBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { useFinanceFeedback, useInvoicePages } from '@/hooks/useFinance'
import { invoiceStatus, overdueText } from '@/lib/chips'
import { formatDate, formatRSD } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { InvoiceStatus } from '@/lib/types'
import { LoadMore, QueryError, SearchInput, Segmented, YearSelect } from './form'
import { InvoiceDetailSheet } from './InvoiceDetailSheet'

type StatusFilter = 'ALL' | InvoiceStatus

export function InvoicesList({
  buildingId,
  booksStartDate,
  canWrite,
}: {
  buildingId: string
  booksStartDate: string
  canWrite: boolean
}) {
  const [status, setStatus] = useState<StatusFilter>('ALL')
  // All years by default: last year's unpaid invoices must stay in view.
  const [year, setYear] = useState('')
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const { highlightId } = useFinanceFeedback()
  const {
    data,
    isLoading,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useInvoicePages(buildingId, {
    status: status === 'ALL' ? undefined : status,
    from: year ? `${year}-01-01` : undefined,
    to: year ? `${year}-12-31` : undefined,
    q: q || undefined,
  })
  const invoices = data?.pages.flat()

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'ALL', label: 'Sve' },
            { value: 'UNPAID', label: 'Neplaćene' },
            { value: 'PARTIALLY_PAID', label: 'Delimično' },
            { value: 'PAID', label: 'Plaćene' },
            { value: 'CANCELLED', label: 'Stornirane' },
          ]}
        />
        <YearSelect booksStartDate={booksStartDate} value={year} onChange={setYear} allLabel="Sve godine" />
        <SearchInput label="Pretraži fakture" onSearch={setQ} />
      </div>

      {error && !data ? (
        <QueryError message="Fakture trenutno nisu dostupne." onRetry={refetch} />
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : !invoices?.length ? (
        <p className="text-base text-muted-foreground text-center py-12">Nema faktura.</p>
      ) : (
        <>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {invoices.map((inv) => (
              <li key={inv.id} className={cn(inv.id === highlightId && 'finance-highlight')}>
                <button
                  type="button"
                  onClick={() => setOpenId(inv.id)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {inv.supplier.name}
                      {inv.file && (
                        <Paperclip
                          className="inline ml-1.5 size-3.5 text-muted-foreground"
                          role="img"
                          aria-label="Priložen fajl"
                        />
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Br. {inv.number} · <span className="font-mono">{formatDate(inv.issueDate)}</span> ·{' '}
                      {inv.category.name}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <ChipBadge chip={invoiceStatus[inv.status]} />
                      {inv.isOverdue && inv.dueDate && (
                        <span className={cn('text-xs font-medium', overdueText)}>
                          Rok {formatDate(inv.dueDate)} je prošao
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono tabular-nums text-sm font-semibold text-foreground">
                      {formatRSD(inv.amount)}
                    </p>
                    {inv.status === 'PARTIALLY_PAID' && (
                      <p className="text-xs text-muted-foreground">
                        preostalo <span className="font-mono">{formatRSD(inv.openAmount)}</span>
                      </p>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
          {isFetchNextPageError ? (
            <QueryError inline onRetry={fetchNextPage} />
          ) : (
            <LoadMore hasMore={hasNextPage} loading={isFetchingNextPage} onLoad={fetchNextPage} />
          )}
        </>
      )}

      <InvoiceDetailSheet
        buildingId={buildingId}
        invoiceId={openId}
        canWrite={canWrite}
        onClose={() => setOpenId(null)}
      />
    </div>
  )
}
