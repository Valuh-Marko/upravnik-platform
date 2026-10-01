'use client'

import { use } from 'react'
import Link from 'next/link'
import { useTickets } from '@/hooks/useTickets'
import { Skeleton } from '@/components/ui/skeleton'
import { MessageSquare, Ticket as TicketIcon } from 'lucide-react'
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

export default function BuildingTicketsPage({
  params,
}: {
  params: Promise<{ buildingId: string }>
}) {
  const { buildingId } = use(params)
  const { data: tickets, isLoading } = useTickets(buildingId)

  const sorted = [...(tickets ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <div className="pb-6">
      <PageHeader icon={<TicketIcon />} title="Zahtevi" description="Privatni zahtevi stanara" />

      {isLoading ? (
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
      ) : sorted.length === 0 ? (
        <p className="text-base text-muted-foreground text-center py-12">Nema zahteva.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((t) => (
            <Link key={t.id} href={`/buildings/${buildingId}/tickets/${t.id}`} className="block">
              <div className={`rounded-lg border bg-card p-4 hover:bg-stone-100 transition-colors ${t.isUnread ? 'border-primary/40' : 'border-border'}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <ChipBadge chip={ticketCategory[t.category]} />
                    <ChipBadge chip={ticketStatus[t.status]} />
                    <p className="font-semibold text-base text-foreground leading-snug">{t.title}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {t.isUnread && <span className="w-2 h-2 rounded-full bg-primary" />}
                    {t._count !== undefined && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MessageSquare className="w-4 h-4" />
                        <span className="font-mono">{t._count.replies}</span>
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-base text-muted-foreground line-clamp-2 mb-3">{t.body}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/70">{authorName(t.author)}</span>
                  {t.author?.unit?.unitNumber && (
                    <span className="font-mono">Stan {t.author.unit.unitNumber}</span>
                  )}
                  {t.building?.name && (
                    <span>{t.building.name}</span>
                  )}
                  <span className="font-mono">{formatTimestamp(t.createdAt)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
