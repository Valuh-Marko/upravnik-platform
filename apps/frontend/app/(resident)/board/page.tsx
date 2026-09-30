'use client'

import { useBuildings } from '@/hooks/useBuildings'
import { useAnnouncements } from '@/hooks/useAnnouncements'
import { Skeleton } from '@/components/ui/skeleton'
import { Pin } from 'lucide-react'
import { formatTimestamp, getAuthorName } from '@/lib/format'
import { cn } from '@/lib/utils'

function AnnouncementSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-32 mt-2" />
        </div>
      ))}
    </div>
  )
}

export default function BoardPage() {
  const { data: buildings, isLoading: buildingsLoading } = useBuildings()
  const buildingId = buildings?.[0]?.id ?? ''
  const { data: announcements, isLoading } = useAnnouncements(buildingId)

  const sorted = [...(announcements ?? [])].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return (
    <div className="py-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-1">Oglasna tabla</h1>
      <p className="text-base text-muted-foreground mb-6">Obaveštenja od upravnika</p>

      {isLoading || buildingsLoading ? (
        <AnnouncementSkeleton />
      ) : sorted.length === 0 ? (
        <p className="text-base text-muted-foreground text-center py-12">Nema obaveštenja.</p>
      ) : (
        <div className="space-y-3">
          {sorted.map((a) => (
            <div
              key={a.id}
              className={cn(
                'rounded-lg border p-4',
                a.isPinned
                  ? 'border-pine-200 bg-pine-50'
                  : 'border-border bg-card'
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="font-semibold text-base text-foreground leading-snug">{a.title}</p>
                {a.isPinned && (
                  <Pin className="w-4 h-4 text-pine-600 flex-shrink-0 mt-1" />
                )}
              </div>
              <p className="text-base text-muted-foreground mb-3 whitespace-pre-wrap">{a.body}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground/70">{getAuthorName(a.author)}</span>
                <span className="font-mono">{formatTimestamp(a.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
