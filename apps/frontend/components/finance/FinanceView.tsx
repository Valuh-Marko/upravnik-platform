'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Wallet } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { FinanceFeedbackContext, useFinance, useFinanceSummary } from '@/hooks/useFinance'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { ArrearsCard } from './Arrears'
import { BudgetTab } from './BudgetTab'
import { ChargesTab } from './ChargesTab'
import { CreateInvoiceDialog } from './CreateInvoiceDialog'
import { CreateTransactionDialog } from './CreateTransactionDialog'
import { FinanceOverview } from './FinanceOverview'
import { ImportsTab } from './imports/ImportsList'
import { InvoicesList } from './InvoicesList'
import {
  BankAccountDialog,
  FinanceProfileDialog,
  ManageFinanceSheet,
  ReverseTransactionDialog,
  SupplierDialog,
} from './ManageDialogs'
import { QueryError, rovingIndex } from './form'
import { ReportsTab } from './ReportsTab'
import { TransactionsList } from './TransactionsList'
import { MyUnitTab } from './UnitLedger'

type Tab = 'overview' | 'unit' | 'charges' | 'transactions' | 'invoices' | 'imports' | 'budget' | 'reports'

const TAB_LABEL: Record<Tab, string> = {
  unit: 'Moj stan',
  overview: 'Pregled',
  transactions: 'Transakcije',
  invoices: 'Fakture',
  imports: 'Uvoz',
  charges: 'Zaduženja',
  budget: 'Plan',
  reports: 'Izveštaji',
}

interface TabGroup {
  key: string
  label: string
  tabs: Tab[]
}

// Daily, monthly and yearly work in separate groups; groups the role can't use are dropped.
function tabGroups(isStaff: boolean, unitId: string | null | undefined): TabGroup[] {
  const groups: TabGroup[] = [
    { key: 'unit', label: 'Moj stan', tabs: unitId ? ['unit'] : [] },
    { key: 'overview', label: 'Pregled', tabs: ['overview'] },
    {
      key: 'books',
      label: 'Knjiženje',
      tabs: isStaff ? ['transactions', 'invoices', 'imports'] : ['transactions', 'invoices'],
    },
    { key: 'residents', label: 'Stanari', tabs: isStaff ? ['charges'] : [] },
    { key: 'yearly', label: 'Godišnje', tabs: ['budget', 'reports'] },
  ]
  return groups.filter((g) => g.tabs.length > 0)
}

/** The building's finance tab. Residents and staff share it; `canWrite` adds the upravnik's controls. */
export function FinanceView(props: { buildingId: string; canWrite: boolean }) {
  // The tab lives in ?tab=, and useSearchParams needs a Suspense boundary to prerender.
  return (
    <Suspense fallback={<FinanceSkeleton />}>
      <FinanceViewContent {...props} />
    </Suspense>
  )
}

function FinanceSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  )
}

function FinanceViewContent({ buildingId, canWrite }: { buildingId: string; canWrite: boolean }) {
  const { user } = useAuth()
  // Staff (incl. read-only board members) get Zaduženja; anyone with a unit, a board member too, gets Moj stan.
  const isStaff = canWrite || user?.role === 'BOARD_MEMBER'
  const unitId = user?.unitId
  const groups = tabGroups(isStaff, unitId)

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const requested = searchParams.get('tab') as Tab | null
  // A resident lands on their own unit; staff on Pregled. Unknown or forbidden tabs fall back to that.
  const tab =
    requested && groups.some((g) => g.tabs.includes(requested)) ? requested : unitId && !isStaff ? 'unit' : 'overview'
  const group = groups.find((g) => g.tabs.includes(tab))!
  const setTab = (next: Tab) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', next)
    router.push(`${pathname}?${params}`, { scroll: false })
  }

  const [feedback, setFeedback] = useState<{ message: string; highlightId: string | null } | null>(null)
  const announce = useCallback(
    (message: string, highlightId?: string) => setFeedback({ message, highlightId: highlightId ?? null }),
    []
  )
  useEffect(() => {
    if (!feedback) return
    const timer = setTimeout(() => setFeedback(null), 4000)
    return () => clearTimeout(timer)
  }, [feedback])
  const feedbackValue = useMemo(
    () => ({ announce, highlightId: feedback?.highlightId ?? null }),
    [announce, feedback]
  )

  const { data: overview, isLoading, error, refetch } = useFinance(buildingId)
  const configured = overview?.configured === true
  const { data: summary, isLoading: summaryLoading } = useFinanceSummary(buildingId, configured)

  const hasActions = canWrite && (tab === 'overview' || tab === 'transactions' || tab === 'invoices')
  const panelLabel = group.tabs.length > 1 ? `finance-tab-${tab}` : `finance-group-${group.key}`

  function body() {
    if (isLoading || !buildingId) return <FinanceSkeleton />
    if (error && !overview) {
      return <QueryError message="Finansije trenutno nisu dostupne." onRetry={refetch} />
    }
    if (!overview || overview.configured === false) {
      return (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Wallet className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-base text-muted-foreground">
            {canWrite ? 'Finansije zgrade još nisu podešene.' : 'Upravnik još nije podesio finansije zgrade.'}
          </p>
          {canWrite && <FinanceProfileDialog buildingId={buildingId} />}
        </div>
      )
    }
    return (
      <div
        role="tabpanel"
        id="finance-panel"
        aria-labelledby={panelLabel}
        tabIndex={0}
        className="outline-none"
      >
        {tab === 'overview' && (
          <div className="space-y-4">
            <ArrearsCard buildingId={buildingId} />
            <FinanceOverview
              entity={overview.entity}
              bankAccounts={overview.bankAccounts}
              totalBalance={overview.totalBalance}
              summary={summary}
              summaryLoading={summaryLoading}
              unassignedPayments={isStaff ? overview.unassignedPayments : undefined}
            />
          </div>
        )}
        {tab === 'unit' && unitId && <MyUnitTab buildingId={buildingId} unitId={unitId} />}
        {tab === 'charges' && <ChargesTab buildingId={buildingId} canWrite={canWrite} />}
        {tab === 'transactions' && (
          <TransactionsList
            buildingId={buildingId}
            booksStartDate={overview.entity.booksStartDate}
            rowAction={
              canWrite
                ? (tx) =>
                    !tx.reversedBy &&
                    !tx.reversesId && <ReverseTransactionDialog buildingId={buildingId} tx={tx} />
                : undefined
            }
          />
        )}
        {tab === 'invoices' && (
          <InvoicesList
            buildingId={buildingId}
            booksStartDate={overview.entity.booksStartDate}
            canWrite={canWrite}
          />
        )}
        {tab === 'imports' && (
          <ImportsTab buildingId={buildingId} canWrite={canWrite} bankAccounts={overview.bankAccounts} />
        )}
        {tab === 'budget' && <BudgetTab buildingId={buildingId} canWrite={canWrite} />}
        {tab === 'reports' && (
          <ReportsTab
            buildingId={buildingId}
            isStaff={isStaff}
            canWrite={canWrite}
            booksStartDate={overview.entity.booksStartDate}
          />
        )}
      </div>
    )
  }

  return (
    <FinanceFeedbackContext.Provider value={feedbackValue}>
      <div className="space-y-4">
        {overview?.configured && (
          <>
            <TabList
              label="Finansije"
              variant="primary"
              items={groups.map((g) => ({ id: `finance-group-${g.key}`, key: g.tabs[0], label: g.label }))}
              active={group.tabs[0]}
              onSelect={setTab}
            />
            {(group.tabs.length > 1 || hasActions) && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                {group.tabs.length > 1 ? (
                  <TabList
                    label={group.label}
                    variant="secondary"
                    items={group.tabs.map((t) => ({ id: `finance-tab-${t}`, key: t, label: TAB_LABEL[t] }))}
                    active={tab}
                    onSelect={setTab}
                  />
                ) : (
                  <span />
                )}
                {hasActions && (
                  <div className="flex flex-wrap gap-2">
                    {tab === 'overview' && (
                      <>
                        <FinanceProfileDialog buildingId={buildingId} entity={overview.entity} />
                        <BankAccountDialog buildingId={buildingId} />
                        <ManageFinanceSheet buildingId={buildingId} bankAccounts={overview.bankAccounts} />
                      </>
                    )}
                    {tab === 'transactions' && (
                      <CreateTransactionDialog buildingId={buildingId} />
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
            )}
          </>
        )}
        {/* Stays mounted in every state so screen readers hear each change. */}
        <p
          role="status"
          aria-live="polite"
          className={cn('text-sm font-medium text-[var(--success-text)]', !feedback && 'sr-only')}
        >
          {feedback?.message}
        </p>
        {body()}
      </div>
    </FinanceFeedbackContext.Provider>
  )
}

/** Tabs with roving focus: arrow keys, Home and End move and select; Tab moves on into the panel. */
function TabList({
  label,
  variant,
  items,
  active,
  onSelect,
}: {
  label: string
  variant: 'primary' | 'secondary'
  items: { id: string; key: Tab; label: string }[]
  active: Tab
  onSelect: (tab: Tab) => void
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  function onKeyDown(e: React.KeyboardEvent, i: number) {
    const next = rovingIndex(e.key, i, items.length)
    if (next === null) return
    e.preventDefault()
    onSelect(items[next].key)
    refs.current[next]?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        'flex',
        variant === 'primary'
          ? 'border-b border-border'
          : 'inline-flex gap-1 p-1 rounded-lg bg-muted max-w-full overflow-x-auto'
      )}
    >
      {items.map((item, i) => {
        const selected = item.key === active
        return (
          <button
            key={item.id}
            ref={(el) => {
              refs.current[i] = el
            }}
            id={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls="finance-panel"
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(item.key)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              variant === 'primary'
                ? cn(
                    'flex-1 sm:flex-none h-10 px-2 sm:px-4 -mb-px border-b-2',
                    selected
                      ? 'border-[var(--brand)] text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )
                : cn(
                    'h-8 px-3 rounded-md text-xs',
                    selected
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
