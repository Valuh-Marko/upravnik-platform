'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTicket, useCreateTicketReply, useCloseTicket } from '@/hooks/useTickets'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, MessageSquare } from 'lucide-react'
import { formatTimestamp } from '@/lib/format'
import type { TicketCategory, TicketStatus, TicketAuthor } from '@/lib/types'

const categoryLabel: Record<TicketCategory, string> = {
  GENERAL: 'Opšte',
  MAINTENANCE: 'Održavanje',
  COMPLAINT: 'Žalba',
  PAYMENT: 'Plaćanje',
  REQUEST: 'Zahtjev',
}

const categoryClass: Record<TicketCategory, string> = {
  GENERAL: 'border-border text-foreground',
  MAINTENANCE: 'bg-amber-100 text-amber-800 border-amber-200',
  COMPLAINT: 'bg-red-100 text-red-700 border-red-200',
  PAYMENT: 'bg-blue-100 text-blue-700 border-blue-200',
  REQUEST: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

const statusClass: Record<TicketStatus, string> = {
  OPEN: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  CLOSED: 'bg-stone-100 text-stone-500 border-stone-200',
}

const statusLabel: Record<TicketStatus, string> = {
  OPEN: 'Otvoreno',
  CLOSED: 'Zatvoreno',
}

function authorName(a?: TicketAuthor | null) {
  if (!a) return 'Nepoznat'
  if (a.firstName && a.lastName) return `${a.firstName} ${a.lastName[0]}.`
  return 'Korisnik'
}

function initials(a?: TicketAuthor | null) {
  if (!a) return '??'
  if (a.firstName && a.lastName) return `${a.firstName[0]}${a.lastName[0]}`.toUpperCase()
  return '?'
}

export default function BuildingTicketPage({
  params,
}: {
  params: Promise<{ buildingId: string; ticketId: string }>
}) {
  const { buildingId, ticketId } = use(params)
  const [body, setBody] = useState('')
  const router = useRouter()

  const { data: ticket, isLoading, error } = useTicket(buildingId, ticketId)
  const { mutate: createReply, isPending: replyPending } = useCreateTicketReply(buildingId, ticketId)
  const { mutate: closeTicket, isPending: closePending } = useCloseTicket(buildingId, ticketId)

  if (error) {
    const status = (error as { response?: { status?: number } }).response?.status
    if (status === 403) {
      return (
        <div className="py-6">
          <Link
            href={`/buildings/${buildingId}/tickets`}
            className="inline-flex items-center gap-2 text-base text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Zahtjevi
          </Link>
          <p className="text-base text-muted-foreground">Pristup odbijen.</p>
        </div>
      )
    }
    if (status === 404) {
      return (
        <div className="py-6">
          <Link
            href={`/buildings/${buildingId}/tickets`}
            className="inline-flex items-center gap-2 text-base text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Zahtjevi
          </Link>
          <p className="text-base text-muted-foreground">Zahtjev nije pronađen.</p>
        </div>
      )
    }
  }

  function handleReply(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    createReply({ body: body.trim() }, { onSuccess: () => setBody('') })
  }

  function handleClose() {
    closeTicket(undefined, { onSuccess: () => router.refresh() })
  }

  return (
    <div className="py-6">
      <Link
        href={`/buildings/${buildingId}/tickets`}
        className="inline-flex items-center gap-2 text-base text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Zahtjevi
      </Link>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ) : ticket ? (
        <>
          {/* Ticket header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className={`text-xs h-5 px-2 font-medium ${categoryClass[ticket.category]}`}>
                {categoryLabel[ticket.category]}
              </Badge>
              <Badge variant="outline" className={`text-xs h-5 px-2 font-medium ${statusClass[ticket.status]}`}>
                {statusLabel[ticket.status]}
              </Badge>
            </div>
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-1">{ticket.title}</h1>
              {ticket.status === 'OPEN' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClose}
                  disabled={closePending}
                  className="flex-shrink-0"
                >
                  {closePending ? 'Zatvaranje…' : 'Zatvori zahtjev'}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              {authorName(ticket.author)}{ticket.author?.unit?.unitNumber && ` · Stan ${ticket.author.unit.unitNumber}`} · <span className="font-mono">{formatTimestamp(ticket.createdAt)}</span>
            </p>
            <p className="text-base text-foreground whitespace-pre-wrap leading-relaxed">
              {ticket.body}
            </p>
          </div>

          {/* Replies */}
          <div className="border-t border-border pt-6">
            <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              {`${ticket.replies?.length ?? 0} odgovora`}
            </h2>

            {ticket.replies && ticket.replies.length > 0 && (
              <div className="space-y-4 mb-6">
                {ticket.replies.map((r) => (
                  <div key={r.id} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground flex-shrink-0 mt-1">
                      {initials(r.author)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-xs font-semibold text-foreground">
                          {authorName(r.author)}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {formatTimestamp(r.createdAt)}
                        </span>
                      </div>
                      <p className="text-base text-foreground whitespace-pre-wrap leading-relaxed">
                        {r.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {ticket.status === 'OPEN' && (
              <form onSubmit={handleReply} className="space-y-2">
                <Textarea
                  placeholder="Napišite odgovor…"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={replyPending || !body.trim()}>
                    {replyPending ? 'Slanje…' : 'Pošalji'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </>
      ) : (
        <p className="text-base text-muted-foreground">Zahtjev nije pronađen.</p>
      )}
    </div>
  )
}
