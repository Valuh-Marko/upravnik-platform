'use client'

import { use } from 'react'
import Link from 'next/link'
import { useUnits } from '@/hooks/useUnits'
import { Skeleton } from '@/components/ui/skeleton'
import { Home, Building, Store } from 'lucide-react'
import type { UnitType } from '@/lib/types'

const unitTypeLabel: Record<UnitType, string> = {
  APARTMENT: 'Stan',
  OFFICE: 'Kancelarija',
  COMMERCIAL: 'Lokal',
}

const unitTypeIcon: Record<UnitType, React.ElementType> = {
  APARTMENT: Home,
  OFFICE: Building,
  COMMERCIAL: Store,
}

export default function BuildingMembersPage({
  params,
}: {
  params: Promise<{ buildingId: string }>
}) {
  const { buildingId } = use(params)
  const { data: units, isLoading } = useUnits(buildingId)

  const sorted = [...(units ?? [])].sort((a, b) =>
    a.unitNumber.localeCompare(b.unitNumber, 'sr', { numeric: true })
  )

  return (
    <div className="py-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-1">Stanari</h1>
      <p className="text-base text-muted-foreground mb-6">
        {units ? `${units.length} jedinica` : 'Jedinice u zgradi'}
      </p>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <p className="text-base text-muted-foreground text-center py-12">
          Nema evidentiranih jedinica.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {sorted.map((u) => {
            const Icon = unitTypeIcon[u.type]
            return (
              <Link
                key={u.id}
                href={`/buildings/${buildingId}/members/${u.id}`}
                className="flex flex-col gap-3 p-4 rounded-xl border border-border bg-card hover:bg-stone-100 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  {u.userId ? (
                    <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
                      Aktivan
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      Bez naloga
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-base font-medium text-foreground">Br. <span className="font-mono">{u.unitNumber}</span></p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {unitTypeLabel[u.type]}
                    {u.floor != null && <> · <span className="font-mono">{u.floor}</span>. sprat</>}
                    {u.areaSqm != null && <> · <span className="font-mono">{parseFloat(u.areaSqm).toFixed(2)}</span> m²</>}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
