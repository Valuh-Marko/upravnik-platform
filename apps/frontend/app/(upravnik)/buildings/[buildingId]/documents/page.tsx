'use client'

import { use } from 'react'
import { useDocuments } from '@/hooks/useDocuments'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText, ExternalLink } from 'lucide-react'
import { formatTimestamp, getAuthorName } from '@/lib/format'
import type { DocumentCategory } from '@/lib/types'

const categoryLabel: Record<DocumentCategory, string> = {
  CONTRACT: 'Ugovor',
  REPORT: 'Izveštaj',
  DECISION: 'Odluka',
  OTHER: 'Ostalo',
}

export default function BuildingDocumentsPage({
  params,
}: {
  params: Promise<{ buildingId: string }>
}) {
  const { buildingId } = use(params)
  const { data: documents, isLoading } = useDocuments(buildingId)

  const sorted = [...(documents ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <div className="py-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-1">Dokumenta</h1>
      <p className="text-base text-muted-foreground mb-6">Dokumenti i fajlovi zgrade</p>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <p className="text-base text-muted-foreground text-center py-12">Nema dokumenata.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((d) => (
            <a
              key={d.id}
              href={d.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:bg-stone-100 transition-colors group"
            >
              <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-foreground truncate">{d.title}</p>
                <p className="text-xs text-muted-foreground">
                  {categoryLabel[d.category]} · {getAuthorName(d.uploader)} ·{' '}
                  <span className="font-mono">{formatTimestamp(d.createdAt)}</span>
                </p>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
