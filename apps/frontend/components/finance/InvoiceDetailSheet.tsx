'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { ChipBadge } from '@/components/ChipBadge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useCancelInvoice, useInvoice } from '@/hooks/useFinance'
import { openStoredFile } from '@/lib/api/files'
import { financeFundLabel, invoiceStatus, overdueText } from '@/lib/chips'
import { formatDate, formatDateTime, formatRSD } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { InvoiceDetail } from '@/lib/types'
import { CreateInvoiceDialog } from './CreateInvoiceDialog'
import { CreateTransactionDialog } from './CreateTransactionDialog'
import { eyebrow, FormError, QueryError } from './form'

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
  const { data: invoice, isLoading, error, refetch } = useInvoice(buildingId, invoiceId)

  return (
    <Sheet open={!!invoiceId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {invoice ? `Faktura ${invoice.number}` : 'Faktura'}
          </SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-6">
          {error && !invoice ? (
            <QueryError onRetry={refetch} />
          ) : isLoading || !invoice ? (
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
    try {
      await openStoredFile(buildingId, fileId)
    } catch (err) {
      setDownloadError(err)
    }
  }

  const canCancel = canWrite && invoice.status === 'UNPAID'
  const canPay = canWrite && (invoice.status === 'UNPAID' || invoice.status === 'PARTIALLY_PAID')

  return (
    <div className="space-y-5">
      <div>
        <p className="text-base font-semibold text-foreground">{invoice.supplier.name}</p>
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
            <dd className={cn(invoice.isOverdue && [overdueText, 'font-medium'])}>
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

      {canPay && (
        <div className="flex flex-wrap gap-2">
          <CreateTransactionDialog buildingId={buildingId} payInvoice={invoice} />
          {invoice.status === 'UNPAID' && <CreateInvoiceDialog buildingId={buildingId} invoice={invoice} />}
        </div>
      )}

      {invoice.description && (
        <p className="text-sm text-foreground whitespace-pre-wrap">{invoice.description}</p>
      )}

      {invoice.cancelledAt && (
        <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          Stornirana {formatDateTime(invoice.cancelledAt)}
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
        <p className={cn(eyebrow, 'mb-2')}>Plaćanja</p>
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
      {canWrite && invoice.status === 'PARTIALLY_PAID' && (
        <p className="text-xs text-muted-foreground">
          Faktura sa uplatama ne može se stornirati. Prvo stornirajte uplate na kartici Transakcije.
        </p>
      )}
    </div>
  )
}
