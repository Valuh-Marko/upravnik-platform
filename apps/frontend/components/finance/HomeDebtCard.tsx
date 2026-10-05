'use client'

import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { useUnitLedger } from '@/hooks/useFinance'
import { formatDate, formatRSD, toParas } from '@/lib/format'
import { financeCard } from './form'

function addDays(iso: string, days: number) {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Resident home: what the unit owes, with one tap to the payment details. Hidden when nothing is owed. */
export function HomeDebtCard({ buildingId, unitId }: { buildingId: string; unitId: string | null | undefined }) {
  const { data: ledger } = useUnitLedger(buildingId, unitId)
  if (!ledger || toParas(ledger.balance) <= 0) return null

  // Entries are newest first; the newest charge sets the coming due date.
  const charge = ledger.entries.find((e) => e.kind === 'CHARGE' && !e.cancelledAt)
  const overdue = toParas(ledger.overdueAmount) > 0

  return (
    <section className={`${financeCard} mb-4 flex items-center justify-between gap-3`}>
      <p className="text-sm text-foreground">
        Dugujete <span className="font-mono font-semibold">{formatRSD(ledger.balance)}</span>
        {overdue && ledger.overdueSince ? (
          <span className="text-[var(--warning-text)]"> · dospelo {formatDate(ledger.overdueSince)}</span>
        ) : (
          charge && <span className="text-muted-foreground"> · rok {formatDate(addDays(charge.date, ledger.paymentTermDays))}</span>
        )}
      </p>
      <Link href="/finances?tab=unit" className={buttonVariants({ size: 'sm' })}>
        Plati
      </Link>
    </section>
  )
}
