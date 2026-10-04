'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { ChipBadge } from '@/components/ChipBadge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useCancelInvoice, useInvoice } from '@/hooks/useFinance'
import { filesApi } from '@/lib/api/files'
import { financeFundLabel, invoiceStatus } from '@/lib/chips'
import { formatDate, formatRSD } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { InvoiceDetail } from '@/lib/types'
import { FormError } from './form'

export function InvoiceDetailSheet({
  buildingId,
  invoiceId,
  canWrite,
  onClose,
}: {
  buildingId: string
  invoiceId: string | null
  canWrite: boolean
  onClose: () => void
}) {
  const { data: invoice, isLoading } = useInvoice(buildingId, invoiceId)

  return (
    <Sheet open={!!invoiceId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Faktura</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-6">
          {isLoading || !invoice ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            // Keyed so the cancel form resets when another invoice opens.
            <InvoiceBody key={invoice.id} buildingId={buildingId} invoice={invoice} canWrite={canWrite} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function InvoiceBody({
  buildingId,
  invoice,
  canWrite,
}: {
  buildingId: string
  invoice: InvoiceDetail
  canWrite: boolean
}) {
  const [downloadError, setDownloadError] = useState<unknown>(null)
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState('')
  const cancel = useCancelInvoice(buildingId)

  async function download(fileId: string) {
    setDownloadError(null)
    // Open the tab synchronously so popup blockers allow it, then point it at the signed URL.
    const tab = window.open('', '_blank')
    try {
      const url = await filesApi.downloadUrl(buildingId, fileId)
      if (tab) tab.location.href = url
      else window.location.href = url
    } catch (err) {
      tab?.close()
      setDownloadError(err)
    }
  }

  const canCancel = canWrite && invoice.status === 'UNPAID'

  return (
    <div className="space-y-5">
      <div>
        <p className="text-lg font-semibold text-foreground">{invoice.supplier.name}</p>
        <p className="text-sm text-muted-foreground">
          Br. {invoice.number}
          {invoice.supplier.pib && <> · PIB <span className="font-mono">{invoice.supplier.pib}</span></>}
        </p>
        <div className="mt-2">
          <ChipBadge chip={invoiceStatus[invoice.status]} />
        </div>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-muted-foreground">Iznos</dt>
        <dd className="font-mono font-semibold">{formatRSD(invoice.amount)}</dd>
        <dt className="text-muted-foreground">Plaćeno</dt>
        <dd className="font-mono">{formatRSD(invoice.paidAmount)}</dd>
        <dt className="text-muted-foreground">Preostalo</dt>
        <dd className="font-mono">{formatRSD(invoice.openAmount)}</dd>
        <dt className="text-muted-foreground">Datum izdavanja</dt>
        <dd>{formatDate(invoice.issueDate)}</dd>
        {invoice.dueDate && (
          <>
            <dt className="text-muted-foreground">Rok plaćanja</dt>
            <dd className={cn(invoice.isOverdue && 'text-[var(--danger-text)] font-medium')}>
              {formatDate(invoice.dueDate)}
            </dd>
          </>
        )}
        <dt className="text-muted-foreground">Kategorija</dt>
        <dd>
          {invoice.category.name}
          {invoice.category.fund && (
            <span className="text-muted-foreground"> · {financeFundLabel[invoice.category.fund]}</span>
          )}
        </dd>
      </dl>

      {invoice.description && (
        <p className="text-sm text-foreground whitespace-pre-wrap">{invoice.description}</p>
      )}

      {invoice.cancelledAt && (
        <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          Stornirana {formatDate(invoice.cancelledAt)}
          {invoice.cancelReason && `: ${invoice.cancelReason}`}
        </p>
      )}

      {invoice.file && (
        <div className="space-y-1">
          <Button variant="outline" onClick={() => download(invoice.file!.id)} className="w-full">
            <Download />
            {invoice.file.fileName}
          </Button>
          <FormError error={downloadError} />
        </div>
      )}

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-stone-500 mb-2">
          Plaćanja
        </p>
        {invoice.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nema plaćanja.</p>
        ) : (
          <ul className="space-y-1.5">
            {invoice.payments.map((p) => (
              <li
                key={p.transaction.id}
                className={cn('flex justify-between gap-3 text-sm', p.isReversed && 'text-muted-foreground')}
              >
                <span>
                  <span className="font-mono">{formatDate(p.transaction.valueDate)}</span>
                  {p.isReversed && ' · stornirano'}
                </span>
                <span className={cn('font-mono', p.isReversed && 'line-through')}>{formatRSD(p.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {canCancel &&
        (cancelling ? (
          <form
            className="space-y-2 border-t border-border pt-4"
            onSubmit={(e) => {
              e.preventDefault()
              cancel.mutate({ id: invoice.id, reason: reason.trim() })
            }}
          >
            <Textarea
              aria-label="Razlog storniranja"
              placeholder="Razlog storniranja…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="resize-none"
              autoFocus
            />
            <FormError error={cancel.error} />
            <div className="flex gap-2">
              <Button type="submit" variant="destructive" disabled={!reason.trim() || cancel.isPending}>
                {cancel.isPending ? 'Storniranje…' : 'Storniraj fakturu'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setCancelling(false)}>
                Odustani
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="destructive" onClick={() => setCancelling(true)}>
            Storniraj fakturu
          </Button>
        ))}
    </div>
  )
}
