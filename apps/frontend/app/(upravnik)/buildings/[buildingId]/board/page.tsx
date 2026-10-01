'use client'

import { use } from 'react'
import { useAnnouncements, useUpdateAnnouncement } from '@/hooks/useAnnouncements'
import { useAuth } from '@/lib/auth'
import { CreateAnnouncementDialog } from '@/components/CreateAnnouncementDialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Pin, Megaphone } from 'lucide-react'
import { formatTimestamp, getAuthorName } from '@/lib/format'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/PageHeader'

export default function BuildingBoardPage({
  params,
}: {
  params: Promise<{ buildingId: string }>
}) {
  const { buildingId } = use(params)
  const { user } = useAuth()
  const { data: announcements, isLoading } = useAnnouncements(buildingId)

  const canManage = user?.role === 'UPRAVNIK' || user?.role === 'BOARD_MEMBER'
  const { mutate: updateAnnouncement } = useUpdateAnnouncement()

  const sorted = [...(announcements ?? [])].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return (
    <div className="pb-6">
      <PageHeader
        icon={<Megaphone />}
        tone="board"
        title="Oglasna tabla"
        description="Obaveštenja za ovu zgradu"
        actions={canManage && <CreateAnnouncementDialog buildingId={buildingId} />}
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-4 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-32 mt-2" />
            </div>
          ))}
        </div>
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
                {canManage ? (
                  <button
                    onClick={() =>
                      updateAnnouncement({ buildingId, id: a.id, isPinned: !a.isPinned })
                    }
                    className={cn(
                      'p-1 rounded transition-colors flex-shrink-0',
                      a.isPinned
                        ? 'text-pine-600 hover:text-pine-700'
                        : 'text-muted-foreground/30 hover:text-muted-foreground'
                    )}
                    title={a.isPinned ? 'Otkvači' : 'Prikvači'}
                  >
                    <Pin className="w-4 h-4" />
                  </button>
                ) : (
                  a.isPinned && <Pin className="w-4 h-4 text-pine-600 flex-shrink-0 mt-1" />
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
