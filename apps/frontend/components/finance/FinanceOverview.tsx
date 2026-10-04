'use client'

import { useState } from 'react'
import { Check, Copy, Landmark } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { financeFundLabel } from '@/lib/chips'
import { formatAccountNumber, formatDate, formatRSD } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { BankAccount, FinanceEntity, FinanceSummary } from '@/lib/types'

const card = 'rounded-lg border border-border bg-card p-4 md:p-5'
const eyebrow = 'text-[11px] font-semibold uppercase tracking-[0.06em] text-stone-500'

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        navigator.clipboard.writeText(value).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        })
      }}
      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  )
}

function Amount({ value, className }: { value: string; className?: string }) {
  return <span className={cn('font-mono tabular-nums', className)}>{formatRSD(value)}</span>
}

export function FinanceOverview({
  entity,
  bankAccounts,
  totalBalance,
  summary,
  summaryLoading,
}: {
  entity: FinanceEntity
  bankAccounts: BankAccount[]
  totalBalance: string
  summary?: FinanceSummary
  summaryLoading: boolean
}) {
  const income = summary?.byCategory.filter((c) => c.direction === 'INCOME') ?? []
  const expense = summary?.byCategory.filter((c) => c.direction === 'EXPENSE') ?? []

  return (
    <div className="space-y-4">
      {/* Balance + accounts */}
      <section className={card}>
        <p className={eyebrow}>Ukupno stanje</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
          <Amount value={totalBalance} />
        </p>

        {bankAccounts.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Nema unetih računa.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border border-t border-border">
            {bankAccounts.map((a) => (
              <li
                key={a.id}
                className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 py-3', !a.isActive && 'opacity-60')}
              >
                <Landmark className="size-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {a.bankName}
                    {a.isPrimary && (
                      <span className="ml-2 text-[11px] font-medium text-pine-700">Primarni</span>
                    )}
                    {!a.isActive && (
                      <span className="ml-2 text-[11px] font-medium text-muted-foreground">Ugašen</span>
                    )}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="font-mono">{formatAccountNumber(a.accountNumber)}</span>
                    <CopyButton value={formatAccountNumber(a.accountNumber)} label="Kopiraj broj računa" />
                  </p>
                </div>
                <Amount value={a.balance} className="text-sm font-semibold text-foreground" />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* This year */}
      <section className={card}>
        <p className={eyebrow}>
          {summary ? `Period ${formatDate(summary.from)} – ${formatDate(summary.to)}` : 'Ova godina'}
        </p>
        {summaryLoading || !summary ? (
          <Skeleton className="mt-3 h-20 w-full" />
        ) : (
          <>
            <dl className="mt-3 grid grid-cols-3 gap-3">
              <div>
                <dt className="text-xs text-muted-foreground">Prihodi</dt>
                <dd className="text-base font-semibold text-[var(--success-text)]">
                  <Amount value={summary.income} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Rashodi</dt>
                <dd className="text-base font-semibold text-[var(--danger-text)]">
                  <Amount value={summary.expense} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Razlika</dt>
                <dd className="text-base font-semibold text-foreground">
                  <Amount value={summary.net} />
                </dd>
              </div>
            </dl>

            {summary.byFund.length > 0 && (
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th className="text-left font-medium py-1">Fond</th>
                    <th className="text-right font-medium py-1">Prihodi</th>
                    <th className="text-right font-medium py-1">Rashodi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {summary.byFund.map((f) => (
                    <tr key={f.fund ?? 'none'}>
                      <td className="py-1.5">{f.fund ? financeFundLabel[f.fund] : 'Bez fonda'}</td>
                      <td className="py-1.5 text-right"><Amount value={f.income} /></td>
                      <td className="py-1.5 text-right"><Amount value={f.expense} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {Number(summary.marketIncome) > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                Od toga prihod od tržišne delatnosti: <Amount value={summary.marketIncome} />
              </p>
            )}
          </>
        )}
      </section>

      {/* By category */}
      {summary && summary.byCategory.length > 0 && (
        <section className={cn(card, 'grid gap-5 md:grid-cols-2')}>
          {[
            { title: 'Prihodi po kategoriji', rows: income },
            { title: 'Rashodi po kategoriji', rows: expense },
          ].map(({ title, rows }) => (
            <div key={title}>
              <p className={eyebrow}>{title}</p>
              {rows.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">Nema stavki.</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {rows.map((c) => (
                    <li key={c.categoryId} className="flex justify-between gap-3 text-sm">
                      <span className="text-foreground">{c.name}</span>
                      <Amount value={c.amount} className="flex-shrink-0" />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}

      {/* HOA details */}
      <section className={card}>
        <p className={eyebrow}>Stambena zajednica</p>
        <p className="mt-1 text-base font-semibold text-foreground">{entity.legalName}</p>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">PIB</dt>
          <dd className="font-mono">{entity.pib}</dd>
          <dt className="text-muted-foreground">Matični broj</dt>
          <dd className="font-mono">{entity.maticniBroj}</dd>
          {entity.address && (
            <>
              <dt className="text-muted-foreground">Adresa</dt>
              <dd>{entity.address}</dd>
            </>
          )}
          <dt className="text-muted-foreground">Evidencija od</dt>
          <dd>{formatDate(entity.booksStartDate)}</dd>
        </dl>
      </section>
    </div>
  )
}
