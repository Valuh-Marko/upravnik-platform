'use client'

import { useState } from 'react'
import { ChipBadge } from '@/components/ChipBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { useFinanceFeedback, useTransactionPages } from '@/hooks/useFinance'
import { financeFundLabel, transactionStatus } from '@/lib/chips'
import { formatDate, formatRSD } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { FinanceDirection, FinanceFund, FinanceTransaction } from '@/lib/types'
import { LoadMore, NativeSelect, QueryError, SearchInput, Segmented, YearSelect } from './form'

type DirectionFilter = 'ALL' | FinanceDirection

export function TransactionsList({
  buildingId,
  booksStartDate,
  rowAction,
}: {
  buildingId: string
  booksStartDate: string
  /** Staff controls rendered on each row. */
  rowAction?: (tx: FinanceTransaction) => React.ReactNode
}) {
  const [direction, setDirection] = useState<DirectionFilter>('ALL')
  const [fund, setFund] = useState<FinanceFund | ''>('')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [q, setQ] = useState('')
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
  } = useTransactionPages(buildingId, {
    direction: direction === 'ALL' ? undefined : direction,
    fund: fund || undefined,
    from: `${year}-01-01`,
    to: `${year}-12-31`,
    q: q || undefined,
  })
  const transactions = data?.pages.flat()

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          label="Vrsta"
          value={direction}
          onChange={setDirection}
          options={[
            { value: 'ALL', label: 'Sve' },
            { value: 'INCOME', label: 'Prihodi' },
            { value: 'EXPENSE', label: 'Rashodi' },
          ]}
        />
        <NativeSelect
          aria-label="Fond"
          value={fund}
          onChange={(e) => setFund(e.target.value as FinanceFund | '')}
          className="w-auto"
        >
          <option value="">Svi fondovi</option>
          {Object.entries(financeFundLabel).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
        <YearSelect booksStartDate={booksStartDate} value={year} onChange={setYear} />
        <SearchInput label="Pretraži transakcije" onSearch={setQ} />
      </div>

      {error && !data ? (
        <QueryError message="Transakcije trenutno nisu dostupne." onRetry={refetch} />
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : !transactions?.length ? (
        <p className="text-base text-muted-foreground text-center py-12">Nema transakcija.</p>
      ) : (
        <>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {transactions.map((tx) => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                action={rowAction?.(tx)}
                highlight={tx.id === highlightId}
              />
            ))}
          </ul>
          {isFetchNextPageError ? (
            <QueryError inline onRetry={fetchNextPage} />
          ) : (
            <LoadMore hasMore={hasNextPage} loading={isFetchingNextPage} onLoad={fetchNextPage} />
          )}
        </>
      )}
    </div>
  )
}

function TransactionRow({
  tx,
  action,
  highlight,
}: {
  tx: FinanceTransaction
  action?: React.ReactNode
  highlight: boolean
}) {
  const isIncome = tx.direction === 'INCOME'
  // Staff see the payer behind an owner payment; residents never get these fields.
  const details = [
    tx.category.isOwnerPayment ? tx.counterpartyName : null,
    tx.description !== tx.displayName ? tx.description : null,
    tx.reference ? `Poziv na broj ${tx.reference}` : null,
  ].filter(Boolean)

  return (
    <li className={cn('flex items-start gap-3 px-4 py-3', highlight && 'finance-highlight')}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{tx.displayName}</p>
        <p className="text-xs text-muted-foreground">
          <span className="font-mono">{formatDate(tx.valueDate)}</span> · {tx.category.name}
        </p>
        {(tx.reversedBy || tx.reverses) && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <ChipBadge chip={transactionStatus[tx.reversedBy ? 'REVERSED' : 'REVERSAL']} />
            {tx.reversedBy && <span>storno od {formatDate(tx.reversedBy.valueDate)}</span>}
            {tx.reverses && <span>Storno transakcije od {formatDate(tx.reverses.valueDate)}</span>}
          </div>
        )}
        {details.length > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5 break-words">{details.join(' · ')}</p>
        )}
        {tx.invoicePayments.map((p) => (
          <p key={p.invoice.id} className="text-xs text-muted-foreground mt-0.5">
            Faktura {p.invoice.number} · {p.invoice.supplier.name} ·{' '}
            <span className="font-mono">{formatRSD(p.amount)}</span>
          </p>
        ))}
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span
          className={cn(
            'font-mono tabular-nums text-sm font-semibold',
            isIncome ? 'text-[var(--success-text)]' : 'text-[var(--danger-text)]',
            tx.reversedBy && 'line-through'
          )}
        >
          {isIncome ? '+' : '−'}
          {formatRSD(tx.amount)}
        </span>
        {action}
      </div>
    </li>
  )
}
