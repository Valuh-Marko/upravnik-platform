'use client'

import { use } from 'react'
import Link from 'next/link'
import { useThreads } from '@/hooks/useThreads'
import { CreateThreadDialog } from '@/components/CreateThreadDialog'
import { Skeleton } from '@/components/ui/skeleton'
import { MessageSquare, MessagesSquare } from 'lucide-react'
import { formatTimestamp, getAuthorName } from '@/lib/format'
import { ChipBadge } from '@/components/ChipBadge'
import { threadCategory } from '@/lib/chips'
import { PageHeader } from '@/components/PageHeader'

export default function BuildingForumPage({
  params,
}: {
  params: Promise<{ buildingId: string }>
}) {
  const { buildingId } = use(params)
  const { data: threads, isLoading } = useThreads(buildingId)

  const sorted = [...(threads ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <div className="pb-6">
      <PageHeader
        icon={<MessagesSquare />}
        tone="forum"
        title="Forum"
        description="Diskusije stanara zgrade"
        actions={<CreateThreadDialog buildingId={buildingId} />}
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <p className="text-base text-muted-foreground text-center py-12">Nema diskusija.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((t) => (
            <Link key={t.id} href={`/buildings/${buildingId}/forum/${t.id}`} className="block">
              <div className="rounded-lg border border-border bg-card p-4 hover:bg-stone-100 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <ChipBadge chip={threadCategory[t.category]} />
                    <p className="font-semibold text-base text-foreground leading-snug">{t.title}</p>
                  </div>
                  {t.status === 'CLOSED' && (
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      Zatvoreno
                    </span>
                  )}
                </div>
                <p className="text-base text-muted-foreground line-clamp-2 mb-3">{t.body}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/70">{getAuthorName(t.author)}</span>
                  {t.author?.unitNumber && (
                    <span className="font-mono">Stan {t.author.unitNumber}</span>
                  )}
                  <span className="font-mono">{formatTimestamp(t.createdAt)}</span>
                  {t._count !== undefined && (
                    <span className="flex items-center gap-1 ml-auto">
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
    </div>
  )
}
