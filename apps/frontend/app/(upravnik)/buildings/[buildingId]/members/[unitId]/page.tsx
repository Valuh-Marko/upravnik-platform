'use client'

import { use } from 'react'
import Link from 'next/link'
import { useUnit } from '@/hooks/useUnits'
import { useThreads } from '@/hooks/useThreads'
import { useTickets } from '@/hooks/useTickets'
import { Skeleton } from '@/components/ui/skeleton'
import { Home, Building, Store, MessageSquare, Ticket } from 'lucide-react'
import { formatTimestamp, getAuthorName } from '@/lib/format'
import type { UnitType } from '@/lib/types'
import { ChipBadge } from '@/components/ChipBadge'
import { threadCategory, ticketCategory, ticketStatus } from '@/lib/chips'
import { PageHeader } from '@/components/PageHeader'

const unitTypeLabel: Record<UnitType, string> = {
  APARTMENT: 'Stan',
  OFFICE: 'Kancelarija',
  COMMERCIAL: 'Lokal',
}

const unitTypeIcon: Record<UnitType, React.ElementType> = {
  APARTMENT: Home,
  OFFICE: Building,
  COMMERCIAL: Store,
}

export default function UnitPage({
  params,
}: {
  params: Promise<{ buildingId: string; unitId: string }>
}) {
  const { buildingId, unitId } = use(params)

  const { data: unit, isLoading: unitLoading } = useUnit(buildingId, unitId)
  const { data: threads, isLoading: threadsLoading } = useThreads(buildingId)
  const { data: tickets, isLoading: ticketsLoading } = useTickets(buildingId)

  const unitThreads = (threads ?? [])
    .filter((t) => unit?.userId && t.authorId === unit.userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const unitTickets = (tickets ?? [])
    .filter((t) => unit?.userId && t.authorId === unit.userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const Icon = unit ? unitTypeIcon[unit.type] : Home

  return (
    <div className="pb-6">
      <PageHeader
        back={{ href: `/buildings/${buildingId}/members`, label: 'Stanari' }}
        icon={<Icon />}
        title={unit ? <>Br. <span className="font-mono">{unit.unitNumber}</span></> : 'Stan'}
        description={unit && unitTypeLabel[unit.type]}
        loading={unitLoading}
      />

      {unitLoading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : unit ? (
        <>
          {/* Unit info card */}
          <div className="rounded-xl border border-border bg-card p-5 mb-8">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                {unit.userId ? (
                  <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
                    Aktivan nalog
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    Bez naloga
                  </span>
                )}
                {unit.user && (
                  <div className="mt-3 space-y-0.5">
                    <p className="text-sm text-foreground font-medium">
                      {unit.user.firstName && unit.user.lastName
                        ? `${unit.user.firstName} ${unit.user.lastName}`
                        : unit.user.username}
                    </p>
                    {unit.user.phone && (
                      <p className="text-xs text-muted-foreground">{unit.user.phone}</p>
                    )}
                    {unit.user.email && (
                      <p className="text-xs text-muted-foreground">{unit.user.email}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mt-5 pt-5 border-t border-border">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Sprat
                </p>
                <p className="text-base font-semibold text-foreground">
                  {unit.floor != null ? <span className="font-mono">{unit.floor}.</span> : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Površina
                </p>
                <p className="text-base font-semibold text-foreground">
                  {unit.areaSqm != null ? <><span className="font-mono">{parseFloat(unit.areaSqm).toFixed(2)}</span> m²</> : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Tip
                </p>
                <p className="text-base font-semibold text-foreground">{unitTypeLabel[unit.type]}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Stanari
                </p>
                <p className="text-base font-semibold text-foreground font-mono">
                  {unit.residentCount}
                </p>
              </div>
            </div>
          </div>

          {/* Threads by this unit */}
          <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Diskusije stanara
          </h2>

          {threadsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : !unit.userId ? (
            <p className="text-base text-muted-foreground">Jedinica nema aktivan nalog.</p>
          ) : unitThreads.length === 0 ? (
            <p className="text-base text-muted-foreground">Stanar još nije pokrenuo diskusije.</p>
          ) : (
            <div className="space-y-2">
              {unitThreads.map((t) => (
                <Link
                  key={t.id}
                  href={`/buildings/${buildingId}/forum/${t.id}`}
                  className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card hover:bg-stone-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <ChipBadge chip={threadCategory[t.category]} />
                      <span className="text-base font-semibold text-foreground truncate">
                        {t.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-mono">{formatTimestamp(t.createdAt)}</span>
                      {t._count !== undefined && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          <span className="font-mono">{t._count.replies}</span>
                        </span>
                      )}
                      {t.status === 'CLOSED' && <span>Zatvoreno</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Tickets by this unit */}
          <h2 className="text-base font-semibold text-foreground mb-3 mt-8 flex items-center gap-2">
            <Ticket className="w-4 h-4" />
            Zahtevi stanara
          </h2>

          {ticketsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : !unit.userId ? (
            <p className="text-base text-muted-foreground">Jedinica nema aktivan nalog.</p>
          ) : unitTickets.length === 0 ? (
            <p className="text-base text-muted-foreground">Stanar još nije poslao zahteve.</p>
          ) : (
            <div className="space-y-2">
              {unitTickets.map((t) => (
                <Link
                  key={t.id}
                  href={`/buildings/${buildingId}/tickets/${t.id}`}
                  className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card hover:bg-stone-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <ChipBadge chip={ticketCategory[t.category]} />
                      <ChipBadge chip={ticketStatus[t.status]} />
                      <span className="text-base font-semibold text-foreground truncate">
                        {t.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-mono">{formatTimestamp(t.createdAt)}</span>
                      {t._count !== undefined && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          <span className="font-mono">{t._count.replies}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="text-base text-muted-foreground">Jedinica nije pronađena.</p>
      )}
    </div>
  )
}
