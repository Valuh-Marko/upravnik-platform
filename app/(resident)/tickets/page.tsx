'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { useBuildings } from '@/hooks/useBuildings'
import { useTickets, useAllTickets } from '@/hooks/useTickets'
import { CreateTicketDialog } from '@/components/CreateTicketDialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronRight, MessageSquare } from 'lucide-react'
import { formatTimestamp } from '@/lib/format'
import type { Ticket, TicketCategory, TicketStatus, TicketAuthor } from '@/lib/types'

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
            <Badge variant="outline" className={`text-xs h-5 px-2 font-medium ${categoryClass[ticket.category]}`}>
              {categoryLabel[ticket.category]}
            </Badge>
            <Badge variant="outline" className={`text-xs h-5 px-2 font-medium ${statusClass[ticket.status]}`}>
              {statusLabel[ticket.status]}
            </Badge>
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
    <div className="py-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-1">Moji zahtjevi</h1>
          <p className="text-base text-muted-foreground">Privatni kanal podrške sa osobljem zgrade</p>
        </div>
        {buildingId && <CreateTicketDialog buildingId={buildingId} />}
      </div>

      {isLoading || buildingsLoading ? (
        <TicketSkeleton />
      ) : sorted.length === 0 ? (
        <p className="text-base text-muted-foreground text-center py-12">Nemate zahtjeva.</p>
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

  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (grouped.length > 0) setExpanded(new Set(grouped.map((g) => g.id)))
  }, [grouped])

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  return (
    <div className="py-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-1">Zahtjevi</h1>
      <p className="text-base text-muted-foreground mb-6">Svi zahtjevi stanara po zgradama</p>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <p className="text-base text-muted-foreground text-center py-12">Nema zahtjeva.</p>
      ) : (
        <div className="space-y-3">
          {grouped.map((group) => {
            const isOpen = expanded.has(group.id)
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
