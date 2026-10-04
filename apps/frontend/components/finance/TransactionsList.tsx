'use client'

import { useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { useTransactions } from '@/hooks/useFinance'
import { financeFundLabel } from '@/lib/chips'
import { formatDate, formatRSD } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { FinanceDirection, FinanceFund, FinanceTransaction } from '@/lib/types'
import { NativeSelect, Segmented } from './form'

type DirectionFilter = 'ALL' | FinanceDirection

export function TransactionsList({
  buildingId,
  rowAction,
}: {
  buildingId: string
  /** Staff controls rendered on each row. */
  rowAction?: (tx: FinanceTransaction) => React.ReactNode
}) {
  const [direction, setDirection] = useState<DirectionFilter>('ALL')
  const [fund, setFund] = useState<FinanceFund | ''>('')
  const { data: transactions, isLoading } = useTransactions(buildingId, {
    direction: direction === 'ALL' ? undefined : direction,
    fund: fund || undefined,
  })

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
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : !transactions?.length ? (
        <p className="text-base text-muted-foreground text-center py-12">Nema transakcija.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {transactions.map((tx) => (
            <TransactionRow key={tx.id} tx={tx} action={rowAction?.(tx)} />
          ))}
        </ul>
      )}
    </div>
  )
}

function TransactionRow({ tx, action }: { tx: FinanceTransaction; action?: React.ReactNode }) {
  const isIncome = tx.direction === 'INCOME'
  // Staff see the payer behind an owner payment; residents never get these fields.
  const details = [
    tx.category.isOwnerPayment ? tx.counterpartyName : null,
    tx.description !== tx.displayName ? tx.description : null,
    tx.reference ? `Poziv na broj ${tx.reference}` : null,
  ].filter(Boolean)

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">
          <span className={cn(tx.reversedBy && 'line-through decoration-muted-foreground')}>
            {tx.displayName}
          </span>
          {tx.reversedBy && (
            <span className="ml-2 text-[11px] font-medium text-muted-foreground">Stornirano</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="font-mono">{formatDate(tx.valueDate)}</span> · {tx.category.name}
        </p>
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
            isIncome ? 'text-[var(--success-text)]' : 'text-[var(--danger-text)]'
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
