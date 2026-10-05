'use client'

import { use } from 'react'
import { Wallet } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { PageHeader } from '@/components/PageHeader'
import { FinanceView } from '@/components/finance/FinanceView'

export default function BuildingFinancesPage({
  params,
}: {
  params: Promise<{ buildingId: string }>
}) {
  const { buildingId } = use(params)
  const { user } = useAuth()
  // Board members read everything; only the upravnik writes (enforced by the API too).
  const canWrite = user?.role === 'UPRAVNIK' || user?.role === 'SUPER_ADMIN'

  return (
    <div className="pb-6">
      <PageHeader
        icon={<Wallet />}
        title="Finansije"
        description="Stanje računa, knjiženje, zaduženja stanara i izveštaji zgrade"
      />
      <FinanceView buildingId={buildingId} canWrite={canWrite} />
    </div>
  )
}
