'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type Tone = 'board' | 'forum' | 'chat' | 'docs' | 'neutral'

// Content-type hues follow the Content-Type Rule; everything else stays plaster.
const toneClass: Record<Tone, string> = {
  board: 'bg-[var(--type-board-subtle)] border-[var(--type-board-border)] text-[var(--type-board)]',
  forum: 'bg-[var(--type-forum-subtle)] border-[var(--type-forum-border)] text-[var(--type-forum)]',
  chat: 'bg-[var(--type-chat-subtle)] border-[var(--type-chat-border)] text-[var(--type-chat)]',
  docs: 'bg-[var(--type-docs-subtle)] border-[var(--type-docs-border)] text-[var(--type-docs)]',
  neutral: 'bg-[var(--surface-sunken)] border-[var(--border)] text-stone-600',
}

/**
 * Sticky cap at the top of the main column. Index pages show a section tile
 * (where you are); detail pages show a back link (where you came from).
 */
export function PageHeader({
  title,
  description,
  icon,
  tone = 'neutral',
  back,
  actions,
  loading,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
  tone?: Tone
  back?: { href: string; label: string }
  actions?: React.ReactNode
  loading?: boolean
}) {
  const ref = useRef<HTMLElement>(null)
  const [stuck, setStuck] = useState(false)

  useEffect(() => {
    const root = ref.current?.closest('[data-page-scroll]')
    if (!root) return
    const onScroll = () => setStuck(root.scrollTop > 0)
    onScroll()
    root.addEventListener('scroll', onScroll, { passive: true })
    return () => root.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      ref={ref}
      data-stuck={stuck}
      className="sticky top-0 z-20 -mx-4 md:-mx-5 mb-6 px-4 md:px-5 py-4 bg-[var(--surface)] border-b border-[var(--border)] transition-shadow duration-150 data-[stuck=true]:shadow-sm"
    >
      {back && (
        <Link
          href={back.href}
          className="inline-flex items-center gap-1.5 mb-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          {back.label}
        </Link>
      )}
      <div className="flex items-center gap-3">
        {icon && (
          <span
            aria-hidden="true"
            className={cn(
              'flex size-10 flex-shrink-0 items-center justify-center rounded-[var(--radius-md)] border [&>svg]:size-5',
              toneClass[tone]
            )}
          >
            {icon}
          </span>
        )}
        <div className="flex-1 min-w-0">
          {loading ? (
            <Skeleton className="h-8 w-2/3" />
          ) : (
            <h1 className="text-2xl font-semibold tracking-tight text-foreground line-clamp-2 text-balance">
              {title}
            </h1>
          )}
          {description && (
            <div className="mt-0.5 text-sm text-muted-foreground">{description}</div>
          )}
        </div>
        {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}
