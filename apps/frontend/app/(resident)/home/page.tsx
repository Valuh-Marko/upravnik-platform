'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { useBuildings } from '@/hooks/useBuildings'
import { useAnnouncements } from '@/hooks/useAnnouncements'
import { useThreads } from '@/hooks/useThreads'
import { FeedCard } from '@/components/resident/FeedCard'
import { Skeleton } from '@/components/ui/skeleton'
import { Pin } from 'lucide-react'
import { formatTimestamp, getAuthorName } from '@/lib/format'

function FeedSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4 space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  )
}

export default function ResidentHomePage() {
  const { user } = useAuth()
  const { data: buildings, isLoading: buildingsLoading } = useBuildings()
  const buildingId = buildings?.[0]?.id ?? ''

  const { data: announcements, isLoading: announcementsLoading } = useAnnouncements(buildingId)
  const { data: threads, isLoading: threadsLoading } = useThreads(buildingId)

  const isLoading = buildingsLoading || announcementsLoading || threadsLoading

  const { pinned, feed } = useMemo(() => {
    const items = [
      ...(announcements ?? []).map((a) => ({
        id: a.id,
        href: `/board`,
        type: 'announcement' as const,
        title: a.title,
        body: a.body,
        author: getAuthorName(a.author),
        timestamp: formatTimestamp(a.createdAt),
        pinned: a.isPinned,
        createdAt: a.createdAt,
      })),
      ...(threads ?? []).map((t) => ({
        id: t.id,
        href: `/forum/${t.id}`,
        type: 'forum' as const,
        title: t.title,
        body: t.body,
        author: getAuthorName(t.author),
        timestamp: formatTimestamp(t.createdAt),
        replyCount: t._count?.replies,
        pinned: false,
        createdAt: t.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return {
      pinned: items.filter((i) => i.pinned),
      feed: items.filter((i) => !i.pinned),
    }
  }, [announcements, threads])

  const greeting = user?.firstName ? `Dobro jutro, ${user.firstName}` : 'Dobro jutro'
  const building = buildings?.[0]

  return (
    <div className="py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{greeting}</h1>
        <p className="text-base text-muted-foreground mt-1">
          {building ? building.name : '—'}
        </p>
        {user && (
          <span className="inline-flex items-center gap-2 mt-2 text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            {user.username}
          </span>
        )}
      </div>

      {isLoading ? (
        <FeedSkeleton />
      ) : (
        <>
          {pinned.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-pine-600 mb-2">
                <Pin className="w-4 h-4" />
                Zakačeno
              </div>
              <div className="space-y-3">
                {pinned.map(({ id, href, ...card }) => (
                  <Link key={id} href={href} className="block">
                    <FeedCard {...card} pinned />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {feed.length > 0 ? (
            <div className="space-y-3">
              {feed.map(({ id, href, ...card }) => (
                <Link key={id} href={href} className="block">
                  <FeedCard {...card} />
                </Link>
              ))}
            </div>
          ) : (
            !pinned.length && (
              <p className="text-base text-muted-foreground text-center py-12">Nema novih objava.</p>
            )
          )}
        </>
      )}
    </div>
  )
}
