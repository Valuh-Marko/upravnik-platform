'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { useComplexThread, useCreateComplexReply, useCloseComplexThread } from '@/hooks/useThreads'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, MessageSquare } from 'lucide-react'
import { formatTimestamp } from '@/lib/format'
import type { ComplexThread, ComplexThreadReply, ThreadCategory } from '@/lib/types'

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

function authorName(a?: ComplexThread['author'] | null) {
  if (!a) return 'Nepoznat'
  if (a.firstName && a.lastName) return `${a.firstName} ${a.lastName[0]}.`
  return 'Korisnik'
}

function getInitials(a?: ComplexThread['author'] | null) {
  if (a?.firstName && a?.lastName) return `${a.firstName[0]}${a.lastName[0]}`.toUpperCase()
  return '??'
}

export default function ComplexThreadPage({
  params,
}: {
  params: Promise<{ complexId: string; threadId: string }>
}) {
  const { complexId, threadId } = use(params)
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: thread, isLoading, error } = useComplexThread(complexId, threadId)
  const { mutate: createReply, isPending: isReplying } = useCreateComplexReply(complexId, threadId)
  const { mutate: closeThread, isPending: isClosing } = useCloseComplexThread(complexId, threadId)
  const [replyBody, setReplyBody] = useState('')

  const canClose =
    user?.role === 'UPRAVNIK' ||
    user?.role === 'BOARD_MEMBER' ||
    thread?.authorId === user?.id

  if (error) {
    const status = (error as { response?: { status?: number } }).response?.status
    return (
      <div className="py-6">
        <Link
          href={`/complexes/${complexId}/forum`}
          className="inline-flex items-center gap-2 text-base text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Forum kompleksa
        </Link>
        <p className="text-base text-muted-foreground">
          {status === 403 ? 'Pristup odbijen.' : 'Tema nije pronađena.'}
        </p>
      </div>
    )
  }

  return (
    <div className="py-6">
      <Link
        href={`/complexes/${complexId}/forum`}
        className="inline-flex items-center gap-2 text-base text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Forum kompleksa
      </Link>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ) : thread ? (
        <>
          {/* Thread header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className={`text-xs h-5 px-2 font-medium ${categoryClass[thread.category]}`}>
                {categoryLabel[thread.category]}
              </Badge>
              {thread.status === 'CLOSED' && (
                <span className="text-xs text-muted-foreground">Zatvoreno</span>
              )}
            </div>
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-1">
                {thread.title}
              </h1>
              {canClose && thread.status === 'OPEN' && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isClosing}
                  onClick={() => closeThread()}
                  className="flex-shrink-0 text-xs"
                >
                  {isClosing ? 'Zatvaranje…' : 'Zatvori temu'}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              {authorName(thread.author)}
              {(thread.author?.building?.name || thread.author?.unitNumber) && (
                <span className="font-mono">
                  {' · '}
                  {[thread.author?.building?.name, thread.author?.unitNumber ? `Stan ${thread.author.unitNumber}` : null]
                    .filter(Boolean)
                    .join(', ')}
                </span>
              )}
              {' · '}<span className="font-mono">{formatTimestamp(thread.createdAt)}</span>
            </p>
            <p className="text-base text-foreground whitespace-pre-wrap leading-relaxed">
              {thread.body}
            </p>
          </div>

          {/* Closed banner */}
          {thread.status === 'CLOSED' && (
            <div className="mb-6 rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
              Tema je zatvorena. Više nije moguće dodavati odgovore.
            </div>
          )}

          {/* Replies */}
          <div className="border-t border-border pt-6">
            <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              {`${thread.replies?.length ?? 0} odgovora`}
            </h2>

            {thread.replies && thread.replies.length > 0 && (
              <div className="space-y-4 mb-6">
                {thread.replies.map((r) => (
                  <div key={r.id} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground flex-shrink-0 mt-1">
                      {getInitials(r.author)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-xs font-semibold text-foreground">
                          {authorName(r.author)}
                        </span>
                        {(r.author?.building?.name || r.author?.unitNumber) && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {[r.author?.building?.name, r.author?.unitNumber ? `Stan ${r.author.unitNumber}` : null]
                              .filter(Boolean)
                              .join(', ')}
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
                ))}
              </div>
            )}

            {/* Reply form */}
            {thread.status === 'OPEN' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const body = replyBody.trim()
                  if (!body) return
                  createReply(
                    { body },
                    {
                      onSuccess: (reply) => {
                        const newReply: ComplexThreadReply = {
                          ...reply,
                          author: {
                            id: user!.id,
                            firstName: user?.firstName ?? null,
                            lastName: user?.lastName ?? null,
                          },
                        }
                        queryClient.setQueryData(
                          ['complexThreads', complexId, threadId],
                          (old: ComplexThread | undefined) =>
                            old
                              ? { ...old, replies: [...(old.replies ?? []), newReply] }
                              : old
                        )
                        setReplyBody('')
                      },
                    }
                  )
                }}
                className="mt-2 space-y-3"
              >
                <Textarea
                  placeholder="Napišite odgovor…"
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={isReplying || !replyBody.trim()}
                >
                  {isReplying ? 'Slanje…' : 'Odgovori'}
                </Button>
              </form>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}
