'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useAllThreads } from '@/hooks/useThreads'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronRight, MessageSquare } from 'lucide-react'
import { formatTimestamp, getAuthorName } from '@/lib/format'
import type { Thread, ThreadCategory } from '@/lib/types'

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

function ThreadRow({ thread }: { thread: Thread }) {
  return (
    <Link href={`/buildings/${thread.buildingId}/forum/${thread.id}`} className="block">
      <div className="rounded-lg border border-border bg-card p-4 hover:bg-stone-100 transition-colors">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`text-xs h-5 px-2 font-medium ${categoryClass[thread.category]}`}>
              {categoryLabel[thread.category]}
            </Badge>
            <p className="font-semibold text-base text-foreground leading-snug">{thread.title}</p>
          </div>
          {thread.status === 'CLOSED' && (
            <span className="text-xs text-muted-foreground flex-shrink-0">Zatvoreno</span>
          )}
        </div>
        <p className="text-base text-muted-foreground line-clamp-2 mb-3">{thread.body}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/70">{getAuthorName(thread.author)}</span>
          {thread.author?.unitNumber && (
            <span className="font-mono">Stan {thread.author.unitNumber}</span>
          )}
          <span className="font-mono">{formatTimestamp(thread.createdAt)}</span>
          {thread._count !== undefined && (
            <span className="flex items-center gap-1 ml-auto">
              <MessageSquare className="w-4 h-4" />
              <span className="font-mono">{thread._count.replies}</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

export default function ThreadsPage() {
  const { data: threads, isLoading } = useAllThreads()

  const grouped = useMemo(() => {
    if (!threads) return []
    const map = new Map<string, { id: string; name: string; threads: Thread[] }>()
    for (const t of threads) {
      const b = t.building!
      if (!map.has(b.id)) map.set(b.id, { id: b.id, name: b.name, threads: [] })
      map.get(b.id)!.threads.push(t)
    }
    return Array.from(map.values())
  }, [threads])

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
      <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-1">Forum</h1>
      <p className="text-base text-muted-foreground mb-6">Sve diskusije stanara po zgradama</p>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <p className="text-base text-muted-foreground text-center py-12">Nema diskusija.</p>
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
                    {group.threads.length}
                  </Badge>
                </button>

                {isOpen && (
                  <div className="border-t border-border px-4 py-3 space-y-2">
                    {group.threads.map((t) => (
                      <ThreadRow key={t.id} thread={t} />
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
