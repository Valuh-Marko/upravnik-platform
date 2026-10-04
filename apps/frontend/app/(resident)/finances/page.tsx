'use client'

import { Wallet } from 'lucide-react'
import { useBuildings } from '@/hooks/useBuildings'
import { PageHeader } from '@/components/PageHeader'
import { FinanceView } from '@/components/finance/FinanceView'

export default function FinancesPage() {
  const { data: buildings } = useBuildings()
  const buildingId = buildings?.[0]?.id ?? ''

  return (
    <div className="pb-6">
      <PageHeader
        icon={<Wallet />}
        title="Finansije"
        description="Stanje računa, prihodi, rashodi i fakture zgrade"
      />
      <FinanceView buildingId={buildingId} canWrite={false} />
    </div>
  )
}
