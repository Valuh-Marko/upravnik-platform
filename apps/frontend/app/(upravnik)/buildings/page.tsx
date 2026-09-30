'use client'

import Link from 'next/link'
import { useBuildings } from '@/hooks/useBuildings'
import { Building2, MapPin, ChevronRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

function BuildingsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border p-4 flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-md flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function BuildingsPage() {
  const { data: buildings, isLoading } = useBuildings()

  return (
    <div className="py-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-1">Zgrade</h1>
      <p className="text-base text-muted-foreground mb-6">Zgrade kojim upravljate</p>

      {isLoading ? (
        <BuildingsSkeleton />
      ) : buildings && buildings.length > 0 ? (
        <div className="space-y-2">
          {buildings.map((b) => (
            <Link
              key={b.id}
              href={`/buildings/${b.id}/members`}
              className="flex items-center gap-3 rounded-lg border border-border p-4 hover:bg-stone-100 transition-colors group"
            >
              <div className="w-8 h-8 rounded-md bg-pine-50 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-pine-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-foreground">{b.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="w-4 h-4" />
                  {b.address}, {b.city}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-base text-muted-foreground text-center py-12">Nema zgrada.</p>
      )}
    </div>
  )
}
