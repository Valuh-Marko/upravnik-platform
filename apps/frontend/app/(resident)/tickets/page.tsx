'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { useBuildings } from '@/hooks/useBuildings'
import { useTickets, useAllTickets } from '@/hooks/useTickets'
import { CreateTicketDialog } from '@/components/CreateTicketDialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronRight, MessageSquare, Ticket as TicketIcon } from 'lucide-react'
import { formatTimestamp } from '@/lib/format'
import type { Ticket, TicketAuthor } from '@/lib/types'
import { ChipBadge } from '@/components/ChipBadge'
import { ticketCategory, ticketStatus } from '@/lib/chips'
import { PageHeader } from '@/components/PageHeader'

function authorName(a?: TicketAuthor | null) {
  if (!a) return 'Nepoznat'
  if (a.firstName && a.lastName) return `${a.firstName} ${a.lastName[0]}.`
  return 'Korisnik'
}

function TicketSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  )
}

function TicketRow({ ticket, href }: { ticket: Ticket; href: string }) {
  return (
    <Link href={href} className="block">
      <div className={`rounded-lg border bg-card p-4 hover:bg-stone-100 transition-colors ${ticket.isUnread ? 'border-primary/40' : 'border-border'}`}>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <ChipBadge chip={ticketCategory[ticket.category]} />
            <ChipBadge chip={ticketStatus[ticket.status]} />
            <p className="font-semibold text-base text-foreground leading-snug">{ticket.title}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {ticket.isUnread && <span className="w-2 h-2 rounded-full bg-primary" />}
            {ticket._count !== undefined && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <MessageSquare className="w-4 h-4" />
                <span className="font-mono">{ticket._count.replies}</span>
              </span>
            )}
          </div>
        </div>
        <p className="text-base text-muted-foreground line-clamp-2 mb-3">{ticket.body}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/70">{authorName(ticket.author)}</span>
          {ticket.author?.unit?.unitNumber && (
            <span className="font-mono">Stan {ticket.author.unit.unitNumber}</span>
          )}
          {ticket.building?.name && (
            <span>{ticket.building.name}</span>
          )}
          <span className="font-mono">{formatTimestamp(ticket.createdAt)}</span>
        </div>
      </div>
    </Link>
  )
}

// ─── Resident view ────────────────────────────────────────────────────────────

function ResidentView() {
  const { data: buildings, isLoading: buildingsLoading } = useBuildings()
  const buildingId = buildings?.[0]?.id ?? ''
  const { data: tickets, isLoading } = useTickets(buildingId)

  const sorted = [...(tickets ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <div className="pb-6">
      <PageHeader
        icon={<TicketIcon />}
        title="Moji zahtevi"
        description="Privatni kanal podrške sa osobljem zgrade"
        actions={buildingId && <CreateTicketDialog buildingId={buildingId} />}
      />

      {isLoading || buildingsLoading ? (
        <TicketSkeleton />
      ) : sorted.length === 0 ? (
        <p className="text-base text-muted-foreground text-center py-12">Nemate zahteva.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((t) => (
            <TicketRow key={t.id} ticket={t} href={`/tickets/${t.id}`} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Upravnik aggregate view ──────────────────────────────────────────────────

function UpravnikView() {
  const { data: tickets, isLoading } = useAllTickets()

  const grouped = useMemo(() => {
    if (!tickets) return []
    const map = new Map<string, { id: string; name: string; tickets: Ticket[] }>()
    for (const t of tickets) {
      const b = t.building!
      if (!map.has(b.id)) map.set(b.id, { id: b.id, name: b.name, tickets: [] })
      map.get(b.id)!.tickets.push(t)
    }
    return Array.from(map.values())
  }, [tickets])

  // Groups start open; only the ones the user closes are tracked.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div className="pb-6">
      <PageHeader icon={<TicketIcon />} title="Zahtevi" description="Svi zahtevi stanara po zgradama" />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <p className="text-base text-muted-foreground text-center py-12">Nema zahteva.</p>
      ) : (
        <div className="space-y-3">
          {grouped.map((group) => {
            const isOpen = !collapsed.has(group.id)
            return (
              <div key={group.id} className="rounded-lg border border-border bg-card">
                <button
                  onClick={() => toggle(group.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-stone-100 transition-colors rounded-lg"
                >
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className="font-semibold text-base text-foreground flex-1">{group.name}</span>
                  <Badge variant="secondary" className="flex-shrink-0 text-xs">
                    {group.tickets.length}
                  </Badge>
                </button>

                {isOpen && (
                  <div className="border-t border-border px-4 py-3 space-y-2">
                    {group.tickets.map((t) => (
                      <TicketRow
                        key={t.id}
                        ticket={t}
                        href={`/buildings/${t.buildingId}/tickets/${t.id}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TicketsPage() {
  const { user } = useAuth()

  if (user?.accountType === 'SYSTEM_USER') {
    return <UpravnikView />
  }

  return <ResidentView />
}
