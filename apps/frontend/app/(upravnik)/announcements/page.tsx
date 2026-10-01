'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/lib/auth'
import { useAllAnnouncements, useUpdateAnnouncement } from '@/hooks/useAnnouncements'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Pin, ChevronDown, ChevronRight, Megaphone } from 'lucide-react'
import { formatTimestamp } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Announcement } from '@/lib/types'
import { PageHeader } from '@/components/PageHeader'

export default function AnnouncementsPage() {
  const { user } = useAuth()
  const { data: announcements, isLoading } = useAllAnnouncements()
  const { mutate: updateAnnouncement } = useUpdateAnnouncement()

  const canManage =
    user?.role === 'UPRAVNIK' || user?.role === 'BOARD_MEMBER' || user?.role === 'SUPER_ADMIN'

  const grouped = useMemo(() => {
    if (!announcements) return []
    const map = new Map<string, { id: string; name: string; announcements: Announcement[] }>()
    for (const a of announcements) {
      const b = a.building!
      if (!map.has(b.id)) map.set(b.id, { id: b.id, name: b.name, announcements: [] })
      map.get(b.id)!.announcements.push(a)
    }
    return Array.from(map.values())
  }, [announcements])

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
    <div className="pb-6">
      <PageHeader
        icon={<Megaphone />}
        tone="board"
        title="Oglasna tabla"
        description="Sva obaveštenja po zgradama"
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <p className="text-base text-muted-foreground text-center py-12">Nema obaveštenja.</p>
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
                  <span className="font-semibold text-base text-foreground flex-1">
                    {group.name}
                  </span>
                  <Badge variant="secondary" className="flex-shrink-0 text-xs">
                    {group.announcements.length}
                  </Badge>
                </button>

                {isOpen && (
                  <div className="border-t border-border px-4 py-3 space-y-2">
                    {group.announcements.map((a) => (
                      <div
                        key={a.id}
                        className={cn(
                          'p-4 rounded-lg border',
                          a.isPinned ? 'border-pine-200 bg-pine-50' : 'border-border bg-card'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="text-base font-semibold text-foreground">{a.title}</h3>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-muted-foreground font-mono">
                              {formatTimestamp(a.createdAt)}
                            </span>
                            {canManage ? (
                              <button
                                onClick={() =>
                                  updateAnnouncement({
                                    buildingId: a.buildingId,
                                    id: a.id,
                                    isPinned: !a.isPinned,
                                  })
                                }
                                className={cn(
                                  'p-1 rounded transition-colors',
                                  a.isPinned
                                    ? 'text-pine-600 hover:text-pine-700'
                                    : 'text-muted-foreground/30 hover:text-muted-foreground'
                                )}
                                title={a.isPinned ? 'Otkvači' : 'Prikvači'}
                              >
                                <Pin className="w-4 h-4" />
                              </button>
                            ) : (
                              a.isPinned && <Pin className="w-4 h-4 text-pine-600" />
                            )}
                          </div>
                        </div>
                        <p className="text-base text-muted-foreground whitespace-pre-wrap leading-relaxed">
                          {a.body}
                        </p>
                      </div>
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
