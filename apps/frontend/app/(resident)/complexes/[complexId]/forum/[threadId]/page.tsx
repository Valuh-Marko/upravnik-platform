'use client'

import { use, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { useComplexThread, useCreateComplexReply, useCloseComplexThread } from '@/hooks/useThreads'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { MessageSquare } from 'lucide-react'
import { formatTimestamp } from '@/lib/format'
import type { ComplexThread, ComplexThreadReply } from '@/lib/types'
import { ChipBadge } from '@/components/ChipBadge'
import { threadCategory } from '@/lib/chips'
import { PageHeader } from '@/components/PageHeader'

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
      <div className="pb-6">
        <PageHeader
          back={{ href: `/complexes/${complexId}/forum`, label: 'Forum kompleksa' }}
          title="Tema"
        />
        <p className="text-base text-muted-foreground">
          {status === 403 ? 'Pristup odbijen.' : 'Tema nije pronađena.'}
        </p>
      </div>
    )
  }

  return (
    <div className="pb-6">
      <PageHeader
        back={{ href: `/complexes/${complexId}/forum`, label: 'Forum kompleksa' }}
        title={thread?.title ?? 'Tema'}
        loading={isLoading}
        actions={
          canClose &&
          thread?.status === 'OPEN' && (
            <Button variant="outline" size="sm" disabled={isClosing} onClick={() => closeThread()}>
              {isClosing ? 'Zatvaranje…' : 'Zatvori temu'}
            </Button>
          )
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ) : thread ? (
        <>
          {/* Thread header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <ChipBadge chip={threadCategory[thread.category]} />
              {thread.status === 'CLOSED' && (
                <span className="text-xs text-muted-foreground">Zatvoreno</span>
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
