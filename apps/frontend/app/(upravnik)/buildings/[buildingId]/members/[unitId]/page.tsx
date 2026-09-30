'use client'

import { use } from 'react'
import Link from 'next/link'
import { useUnit } from '@/hooks/useUnits'
import { useThreads } from '@/hooks/useThreads'
import { useTickets } from '@/hooks/useTickets'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Home, Building, Store, MessageSquare, Ticket } from 'lucide-react'
import { formatTimestamp, getAuthorName } from '@/lib/format'
import type { UnitType, ThreadCategory, TicketCategory, TicketStatus } from '@/lib/types'

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

const categoryLabel: Record<ThreadCategory, string> = {
  GENERAL: 'Opšte',
  MAINTENANCE: 'Održavanje',
  COMPLAINT: 'Žalba',
  QUESTION: 'Pitanje',
}

const categoryClass: Record<ThreadCategory, string> = {
  GENERAL: 'border-border text-foreground',
  MAINTENANCE: 'bg-amber-100 text-amber-800 border-amber-200',
  COMPLAINT: 'bg-red-100 text-red-700 border-red-200',
  QUESTION: 'bg-violet-100 text-violet-700 border-violet-200',
}

const ticketCategoryLabel: Record<TicketCategory, string> = {
  GENERAL: 'Opšte',
  MAINTENANCE: 'Održavanje',
  COMPLAINT: 'Žalba',
  PAYMENT: 'Plaćanje',
  REQUEST: 'Zahtjev',
}

const ticketCategoryClass: Record<TicketCategory, string> = {
  GENERAL: 'border-border text-foreground',
  MAINTENANCE: 'bg-amber-100 text-amber-800 border-amber-200',
  COMPLAINT: 'bg-red-100 text-red-700 border-red-200',
  PAYMENT: 'bg-blue-100 text-blue-700 border-blue-200',
  REQUEST: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

const ticketStatusClass: Record<TicketStatus, string> = {
  OPEN: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  CLOSED: 'bg-stone-100 text-stone-500 border-stone-200',
}

const ticketStatusLabel: Record<TicketStatus, string> = {
  OPEN: 'Otvoreno',
  CLOSED: 'Zatvoreno',
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
    <div className="py-6">
      <Link
        href={`/buildings/${buildingId}/members`}
        className="inline-flex items-center gap-2 text-base text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Stanari
      </Link>

      {unitLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
      ) : unit ? (
        <>
          {/* Unit info card */}
          <div className="rounded-xl border border-border bg-card p-5 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground">Br. <span className="font-mono">{unit.unitNumber}</span></h1>
                  {unit.userId ? (
                    <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
                      Aktivan nalog
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      Bez naloga
                    </span>
                  )}
                </div>
                <p className="text-base text-muted-foreground">{unitTypeLabel[unit.type]}</p>
                {unit.user && (
                  <div className="mt-1 space-y-0.5">
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
                      <Badge variant="outline" className={`text-xs h-5 px-2 font-medium ${categoryClass[t.category]}`}>
                        {categoryLabel[t.category]}
                      </Badge>
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
            Zahtjevi stanara
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
            <p className="text-base text-muted-foreground">Stanar još nije poslao zahtjeve.</p>
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
                      <Badge variant="outline" className={`text-xs h-5 px-2 font-medium ${ticketCategoryClass[t.category]}`}>
                        {ticketCategoryLabel[t.category]}
                      </Badge>
                      <Badge variant="outline" className={`text-xs h-5 px-2 font-medium ${ticketStatusClass[t.status]}`}>
                        {ticketStatusLabel[t.status]}
                      </Badge>
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
