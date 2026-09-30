'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useThread, useCreateReply } from '@/hooks/useThreads'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, MessageSquare } from 'lucide-react'
import { formatTimestamp, getAuthorName } from '@/lib/format'
import type { ThreadCategory } from '@/lib/types'

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

function getInitials(username: string, firstName?: string | null, lastName?: string | null) {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase()
  return username.slice(0, 2).toUpperCase()
}

export default function BuildingThreadPage({
  params,
}: {
  params: Promise<{ buildingId: string; threadId: string }>
}) {
  const { buildingId, threadId } = use(params)
  const [body, setBody] = useState('')

  const { data: thread, isLoading } = useThread(buildingId, threadId)
  const { mutate: createReply, isPending } = useCreateReply(buildingId, threadId)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    createReply({ body: body.trim() }, { onSuccess: () => setBody('') })
  }

  return (
    <div className="py-6">
      <Link
        href={`/buildings/${buildingId}/forum`}
        className="inline-flex items-center gap-2 text-base text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Forum
      </Link>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ) : thread ? (
        <>
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className={`text-xs h-5 px-2 font-medium ${categoryClass[thread.category]}`}>
                {categoryLabel[thread.category]}
              </Badge>
              {thread.status === 'CLOSED' && (
                <span className="text-xs text-muted-foreground">Zatvoreno</span>
              )}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-1">{thread.title}</h1>
            <p className="text-xs text-muted-foreground mb-4">
              {getAuthorName(thread.author)}
              {thread.author?.unitNumber && <span className="font-mono"> · Stan {thread.author.unitNumber}</span>}
              {' · '}<span className="font-mono">{formatTimestamp(thread.createdAt)}</span>
            </p>
            <p className="text-base text-foreground whitespace-pre-wrap leading-relaxed">
              {thread.body}
            </p>
          </div>

          <div className="border-t border-border pt-6">
            <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              {`${thread.replies?.length ?? 0} odgovora`}
            </h2>

            {thread.replies && thread.replies.length > 0 && (
              <div className="space-y-4 mb-6">
                {thread.replies.map((r) => {
                  const initials = getInitials(
                    r.author?.username ?? '',
                    r.author?.firstName,
                    r.author?.lastName
                  )
                  return (
                    <div key={r.id} className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground flex-shrink-0 mt-1">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-xs font-semibold text-foreground">
                            {getAuthorName(r.author)}
                          </span>
                          {r.author?.unitNumber && (
                            <span className="text-xs text-muted-foreground font-mono">
                              Stan {r.author.unitNumber}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground font-mono">
                            {formatTimestamp(r.createdAt)}
                          </span>
                        </div>
                        <p className="text-base text-foreground whitespace-pre-wrap leading-relaxed">
                          {r.body}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {thread.status === 'OPEN' && (
              <form onSubmit={handleSubmit} className="space-y-2">
                <Textarea
                  placeholder="Napišite odgovor…"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={isPending || !body.trim()}>
                    {isPending ? 'Slanje…' : 'Pošalji'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </>
      ) : (
        <p className="text-base text-muted-foreground">Tema nije pronađena.</p>
      )}
    </div>
  )
}
