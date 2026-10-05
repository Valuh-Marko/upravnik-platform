'use client'

import { Wallet } from 'lucide-react'
import { useBuildings } from '@/hooks/useBuildings'
import { PageHeader } from '@/components/PageHeader'
import { FinanceView } from '@/components/finance/FinanceView'
import { QueryError } from '@/components/finance/form'

export default function FinancesPage() {
  const { data: buildings, error, refetch } = useBuildings()
  const buildingId = buildings?.[0]?.id ?? ''

  return (
    <div className="pb-6">
      <PageHeader
        icon={<Wallet />}
        title="Finansije"
        description="Vaša zaduženja i uplate, i finansije zgrade"
      />
      {error && !buildings ? (
        <QueryError message="Finansije trenutno nisu dostupne." onRetry={refetch} />
      ) : buildings && buildings.length === 0 ? (
        <p className="text-base text-muted-foreground text-center py-12">Niste povezani ni sa jednom zgradom.</p>
      ) : (
        <FinanceView buildingId={buildingId} canWrite={false} />
      )}
    </div>
  )
}
