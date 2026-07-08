import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ContentType = 'announcement' | 'forum' | 'chat'

export interface FeedCardProps {
  type: ContentType
  title: string
  body: string
  author: string
  timestamp: string
  replyCount?: number
  activeUsers?: number
  pinned?: boolean
}

const typeConfig: Record<ContentType, { label: string; chipClass: string }> = {
  announcement: {
    label: 'Obaveštenje',
    chipClass: 'bg-pine-50 text-pine-700 border-pine-200',
  },
  forum: {
    label: 'Forum',
    chipClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  chat: {
    label: 'Chat',
    chipClass: 'bg-sky-100 text-sky-700 border-sky-200',
  },
}

export function FeedCard({
  type,
  title,
  body,
  author,
  timestamp,
  replyCount,
  activeUsers,
  pinned,
}: FeedCardProps) {
  const config = typeConfig[type]

  return (
    <Card
      className={cn(
        'shadow-xs transition-all duration-150 cursor-pointer hover:shadow-md hover:-translate-y-0.5',
        pinned && 'border-pine-200 bg-pine-50'
      )}
    >
      <CardContent className="p-4">
        {/* Header: chip + timestamp */}
        <div className="flex items-center justify-between mb-2">
          <Badge
            variant="outline"
            className={cn('text-xs font-medium h-5 px-2', config.chipClass)}
          >
            {config.label}
          </Badge>
          <span className="text-xs text-muted-foreground font-mono">{timestamp}</span>
        </div>

        {/* Title */}
        <p className="font-semibold text-base text-card-foreground mb-1 leading-snug">{title}</p>

        {/* Body preview — 2 lines max */}
        <p className="text-base text-muted-foreground line-clamp-2 mb-3">{body}</p>

        {/* Footer: author + stats */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/70">{author}</span>
          {replyCount !== undefined && (
            <span className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              <span className="font-mono">{replyCount}</span>
            </span>
          )}
          {activeUsers !== undefined && (
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {activeUsers}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
