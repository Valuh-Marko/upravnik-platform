'use client'

import { use } from 'react'
import Link from 'next/link'
import { useComplexThreads } from '@/hooks/useThreads'
import { CreateComplexThreadDialog } from '@/components/CreateComplexThreadDialog'
import { Skeleton } from '@/components/ui/skeleton'
import { MessageSquare, MessagesSquare } from 'lucide-react'
import { formatTimestamp } from '@/lib/format'
import type { ComplexThread } from '@/lib/types'
import { ChipBadge } from '@/components/ChipBadge'
import { threadCategory } from '@/lib/chips'
import { PageHeader } from '@/components/PageHeader'

function authorName(a?: ComplexThread['author'] | null) {
  if (!a) return 'Nepoznat'
  if (a.firstName && a.lastName) return `${a.firstName} ${a.lastName[0]}.`
  return 'Korisnik'
}

export default function ComplexForumPage({
  params,
}: {
  params: Promise<{ complexId: string }>
}) {
  const { complexId } = use(params)
  const { data: threads, isLoading } = useComplexThreads(complexId)

  const sorted = [...(threads ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <div className="pb-6">
      <PageHeader
        icon={<MessagesSquare />}
        tone="forum"
        title="Forum kompleksa"
        description="Diskusije svih stanara u kompleksu"
        actions={<CreateComplexThreadDialog complexId={complexId} />}
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
            <Link
              key={t.id}
              href={`/complexes/${complexId}/forum/${t.id}`}
              className="block"
            >
              <div className="rounded-lg border border-border bg-card p-4 hover:bg-stone-100 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <ChipBadge chip={threadCategory[t.category]} />
                    <p className="font-semibold text-base text-foreground leading-snug">{t.title}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {t.status === 'CLOSED' && (
                      <span className="text-xs text-muted-foreground">Zatvoreno</span>
                    )}
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
                  {(t.author?.building?.name || t.author?.unitNumber) && (
                    <span className="font-mono">
                      {[t.author?.building?.name, t.author?.unitNumber ? `Stan ${t.author.unitNumber}` : null]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
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
