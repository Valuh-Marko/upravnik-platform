'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTicket, useCreateTicketReply, useCloseTicket } from '@/hooks/useTickets'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { MessageSquare } from 'lucide-react'
import { formatTimestamp } from '@/lib/format'
import type { TicketAuthor } from '@/lib/types'
import { ChipBadge } from '@/components/ChipBadge'
import { ticketCategory, ticketStatus } from '@/lib/chips'
import { PageHeader } from '@/components/PageHeader'

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
        <div className="pb-6">
          <PageHeader
            back={{ href: `/buildings/${buildingId}/tickets`, label: 'Zahtevi' }}
            title="Zahtev"
          />
          <p className="text-base text-muted-foreground">Pristup odbijen.</p>
        </div>
      )
    }
    if (status === 404) {
      return (
        <div className="pb-6">
          <PageHeader
            back={{ href: `/buildings/${buildingId}/tickets`, label: 'Zahtevi' }}
            title="Zahtev"
          />
          <p className="text-base text-muted-foreground">Zahtev nije pronađen.</p>
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
    <div className="pb-6">
      <PageHeader
        back={{ href: `/buildings/${buildingId}/tickets`, label: 'Zahtevi' }}
        title={ticket?.title ?? 'Zahtev'}
        loading={isLoading}
        actions={
          ticket?.status === 'OPEN' && (
            <Button variant="outline" size="sm" onClick={handleClose} disabled={closePending}>
              {closePending ? 'Zatvaranje…' : 'Zatvori zahtev'}
            </Button>
          )
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ) : ticket ? (
        <>
          {/* Ticket header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <ChipBadge chip={ticketCategory[ticket.category]} />
              <ChipBadge chip={ticketStatus[ticket.status]} />
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
        <p className="text-base text-muted-foreground">Zahtev nije pronađen.</p>
      )}
    </div>
  )
}
