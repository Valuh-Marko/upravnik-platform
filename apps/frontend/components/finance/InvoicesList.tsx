'use client'

import { useState } from 'react'
import { Paperclip } from 'lucide-react'
import { ChipBadge } from '@/components/ChipBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { useInvoices } from '@/hooks/useFinance'
import { invoiceStatus } from '@/lib/chips'
import { formatDate, formatRSD } from '@/lib/format'
import type { InvoiceStatus } from '@/lib/types'
import { Segmented } from './form'
import { InvoiceDetailSheet } from './InvoiceDetailSheet'

type StatusFilter = 'ALL' | InvoiceStatus

export function InvoicesList({ buildingId, canWrite }: { buildingId: string; canWrite: boolean }) {
  const [status, setStatus] = useState<StatusFilter>('ALL')
  const [openId, setOpenId] = useState<string | null>(null)
  const { data: invoices, isLoading } = useInvoices(buildingId, {
    status: status === 'ALL' ? undefined : status,
  })

  return (
    <div className="space-y-3">
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

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : !invoices?.length ? (
        <p className="text-base text-muted-foreground text-center py-12">Nema faktura.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {invoices.map((inv) => (
            <li key={inv.id}>
              <button
                type="button"
                onClick={() => setOpenId(inv.id)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-stone-100 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {inv.supplier.name}
                    {inv.file && (
                      <Paperclip
                        className="inline ml-1.5 size-3.5 text-muted-foreground"
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
                      <span className="text-xs font-medium text-[var(--danger-text)]">
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
