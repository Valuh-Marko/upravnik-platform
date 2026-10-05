'use client'

import { useState } from 'react'
import { isAxiosError } from 'axios'
import { Download, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useFinanceReports, usePublishReport } from '@/hooks/useFinance'
import { financeApi } from '@/lib/api/finance'
import { openStoredFile, showFile } from '@/lib/api/files'
import { formatDate, formatDateTime, getAuthorName, todayISO } from '@/lib/format'
import { eyebrow, Field, financeCard as card, FormError, QueryError } from './form'

// A failed blob request carries its JSON error body as a Blob; parse it so errorMessage can read it.
async function readBlobError(err: unknown) {
  if (isAxiosError(err) && err.response?.data instanceof Blob) {
    try {
      err.response.data = JSON.parse(await err.response.data.text())
    } catch {
      // Not JSON; errorMessage falls back to the generic text.
    }
  }
  return err
}

function nextDay(iso: string) {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

/** Published financial reports for everyone; staff preview a period, the upravnik publishes it. */
export function ReportsTab({
  buildingId,
  isStaff,
  canWrite,
  booksStartDate,
}: {
  buildingId: string
  isStaff: boolean
  canWrite: boolean
  booksStartDate: string
}) {
  const { data: reports, isLoading, error, refetch } = useFinanceReports(buildingId)
  const [downloadError, setDownloadError] = useState<unknown>(null)

  async function download(fileId: string) {
    setDownloadError(null)
    try {
      await openStoredFile(buildingId, fileId)
    } catch (err) {
      setDownloadError(err)
    }
  }

  return (
    <div className="space-y-4">
      {isStaff && reports && (
        <ReportForm
          // Remounts with a fresh default range once a report is published.
          key={reports?.length}
          buildingId={buildingId}
          canWrite={canWrite}
          booksStart={booksStartDate.slice(0, 10)}
          defaultFrom={
            reports?.length
              ? nextDay(reports.reduce((max, r) => (r.to > max ? r.to : max), reports[0].to))
              : booksStartDate.slice(0, 10)
          }
        />
      )}

      {error && !reports ? (
        <QueryError onRetry={refetch} />
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : !reports?.length ? (
        <p className="text-base text-muted-foreground text-center py-12">Još nema objavljenih izveštaja.</p>
      ) : (
        <div className="space-y-1">
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {reports.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {formatDate(r.from)} – {formatDate(r.to)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Objavljen {formatDateTime(r.publishedAt)} · {getAuthorName(r.publisher)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => download(r.document.fileId)}
                  aria-label={`Preuzmi izveštaj ${formatDate(r.from)} – ${formatDate(r.to)} (PDF)`}
                >
                  <Download />
                  PDF
                </Button>
              </li>
            ))}
          </ul>
          <FormError error={downloadError} />
        </div>
      )}
    </div>
  )
}

function ReportForm({
  buildingId,
  canWrite,
  booksStart,
  defaultFrom,
}: {
  buildingId: string
  canWrite: boolean
  booksStart: string
  defaultFrom: string
}) {
  const [range, setRange] = useState({ from: defaultFrom, to: todayISO() })
  const [previewing, setPreviewing] = useState(false)
  const [previewError, setPreviewError] = useState<unknown>(null)
  const [confirming, setConfirming] = useState(false)
  const publish = usePublishReport(buildingId)

  // "YYYY-MM-DD" strings compare in calendar order.
  const fromInvalid = !!range.from && range.from < booksStart
  const toInvalid = !!range.to && (range.to > todayISO() || (!!range.from && range.to < range.from))
  const valid = range.from && range.to && !fromInvalid && !toInvalid

  async function preview() {
    setPreviewError(null)
    setPreviewing(true)
    // Open the tab synchronously so popup blockers allow it, then point it at the PDF.
    const tab = window.open('', '_blank')
    try {
      const url = URL.createObjectURL(await financeApi.previewReport(buildingId, range))
      showFile(tab, url, `izvestaj-${range.from}-${range.to}.pdf`)
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      tab?.close()
      setPreviewError(await readBlobError(err))
    } finally {
      setPreviewing(false)
    }
  }

  return (
    <section className={card}>
      <p className={eyebrow}>Novi izveštaj</p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:max-w-md">
        <Field
          id="rep-from"
          label="Od"
          hint={fromInvalid ? `Najranije ${formatDate(booksStart)}, početak evidencije.` : undefined}
        >
          <Input
            id="rep-from"
            type="date"
            min={booksStart}
            max={todayISO()}
            aria-invalid={fromInvalid}
            value={range.from}
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
          />
        </Field>
        <Field id="rep-to" label="Do" hint={toInvalid ? 'Između početka perioda i danas.' : undefined}>
          <Input
            id="rep-to"
            type="date"
            min={range.from}
            max={todayISO()}
            aria-invalid={toInvalid}
            value={range.to}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
          />
        </Field>
      </div>

      {confirming ? (
        <div className="mt-4 space-y-2">
          <p className="text-sm text-foreground">
            Izveštaj za period {formatDate(range.from)} – {formatDate(range.to)} biće objavljen u dokumentima zgrade i
            poslat svim stanarima. Period se zaključava: transakcije, fakture i zaduženja u njemu više se ne mogu menjati.
          </p>
          <FormError error={publish.error} />
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={publish.isPending}
              onClick={() => publish.mutate(range, { onSuccess: () => setConfirming(false) })}
            >
              {publish.isPending ? 'Objavljivanje…' : 'Objavi i zaključaj period'}
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Odustani
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          <FormError error={previewError} />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={!valid || previewing} onClick={preview}>
              <Eye />
              {previewing ? 'Priprema…' : 'Pregled (nacrt)'}
            </Button>
            {canWrite && (
              <Button
                disabled={!valid}
                onClick={() => {
                  publish.reset()
                  setConfirming(true)
                }}
              >
                Objavi izveštaj
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
