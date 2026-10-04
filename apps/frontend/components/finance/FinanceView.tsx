'use client'

import { useState } from 'react'
import { Wallet } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useFinance, useFinanceSummary } from '@/hooks/useFinance'
import { useAuth } from '@/lib/auth'
import { ArrearsCard } from './Arrears'
import { ChargesTab } from './ChargesTab'
import { CreateInvoiceDialog } from './CreateInvoiceDialog'
import { CreateTransactionDialog } from './CreateTransactionDialog'
import { FinanceOverview } from './FinanceOverview'
import { InvoicesList } from './InvoicesList'
import { BankAccountDialog, FinanceProfileDialog, ReverseTransactionDialog, SupplierDialog } from './ManageDialogs'
import { Segmented } from './form'
import { TransactionsList } from './TransactionsList'
import { MyUnitTab } from './UnitLedger'

type Tab = 'overview' | 'unit' | 'charges' | 'transactions' | 'invoices'

/** The building's finance tab. Residents and staff share it; `canWrite` adds the upravnik's controls. */
export function FinanceView({ buildingId, canWrite }: { buildingId: string; canWrite: boolean }) {
  const [tab, setTab] = useState<Tab>('overview')
  const { user } = useAuth()
  // Staff (incl. read-only board members) get Zaduženja; a resident with a unit gets Moj stan.
  const isStaff = canWrite || user?.role === 'BOARD_MEMBER'
  const unitId = isStaff ? null : user?.unitId
  const { data: overview, isLoading } = useFinance(buildingId)
  const configured = overview?.configured === true
  const { data: summary, isLoading: summaryLoading } = useFinanceSummary(buildingId, configured)

  if (isLoading || !buildingId) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    )
  }

  if (!overview?.configured) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <Wallet className="size-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-base text-muted-foreground">Finansije zgrade još nisu podešene.</p>
        {canWrite && <FinanceProfileDialog buildingId={buildingId} />}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented
          label="Prikaz"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'overview', label: 'Pregled' },
            ...(unitId ? [{ value: 'unit' as const, label: 'Moj stan' }] : []),
            ...(isStaff ? [{ value: 'charges' as const, label: 'Zaduženja' }] : []),
            { value: 'transactions', label: 'Transakcije' },
            { value: 'invoices', label: 'Fakture' },
          ]}
        />
        {canWrite && (
          <div className="flex flex-wrap gap-2">
            {tab === 'overview' && (
              <>
                <FinanceProfileDialog buildingId={buildingId} entity={overview.entity} />
                <BankAccountDialog buildingId={buildingId} />
              </>
            )}
            {tab === 'transactions' && (
              <CreateTransactionDialog buildingId={buildingId} bankAccounts={overview.bankAccounts} />
            )}
            {tab === 'invoices' && (
              <>
                <SupplierDialog buildingId={buildingId} />
                <CreateInvoiceDialog buildingId={buildingId} />
              </>
            )}
          </div>
        )}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <ArrearsCard buildingId={buildingId} />
          <FinanceOverview
            entity={overview.entity}
            bankAccounts={overview.bankAccounts}
            totalBalance={overview.totalBalance}
            summary={summary}
            summaryLoading={summaryLoading}
          />
        </div>
      )}
      {tab === 'unit' && unitId && <MyUnitTab buildingId={buildingId} unitId={unitId} />}
      {tab === 'charges' && <ChargesTab buildingId={buildingId} canWrite={canWrite} />}
      {tab === 'transactions' && (
        <TransactionsList
          buildingId={buildingId}
          rowAction={
            canWrite
              ? (tx) =>
                  !tx.reversedBy && !tx.reversesId && <ReverseTransactionDialog buildingId={buildingId} tx={tx} />
              : undefined
          }
        />
      )}
      {tab === 'invoices' && <InvoicesList buildingId={buildingId} canWrite={canWrite} />}
    </div>
  )
}
