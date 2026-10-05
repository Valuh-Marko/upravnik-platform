'use client'

import { useState } from 'react'
import { ChipBadge } from '@/components/ChipBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { useStatementImports } from '@/hooks/useFinance'
import { statementImportStatus } from '@/lib/chips'
import { formatAccountNumber, formatDateTime, plural } from '@/lib/format'
import type { BankAccount } from '@/lib/types'
import { QueryError } from '../form'
import { StatementSheet } from './StatementSheet'
import { UploadStatementDialog } from './UploadStatementDialog'

/** Bank statement imports: upload a CSV izvod, review the proposed matches, then book it. Staff only. */
export function ImportsTab({
  buildingId,
  canWrite,
  bankAccounts,
}: {
  buildingId: string
  canWrite: boolean
  bankAccounts: BankAccount[]
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const { data: imports, isLoading, error, refetch } = useStatementImports(buildingId)

  return (
    <div className="space-y-3">
      {canWrite && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <UploadStatementDialog buildingId={buildingId} bankAccounts={bankAccounts} onUploaded={setOpenId} />
        </div>
      )}

      {error && !imports ? (
        <QueryError onRetry={refetch} />
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : !imports?.length ? (
        <p className="text-base text-muted-foreground text-center py-12">Nema uvezenih izvoda.</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {imports.map((imp) => (
            <li key={imp.id}>
              <button
                type="button"
                onClick={() => setOpenId(imp.id)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {imp.statementNumber ? `Izvod br. ${imp.statementNumber}` : imp.file.fileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {imp.bankAccount.bankName} ·{' '}
                    <span className="font-mono">{formatAccountNumber(imp.bankAccount.accountNumber)}</span>
                  </p>
                  <div className="mt-1">
                    <ChipBadge chip={statementImportStatus[imp.status]} />
                  </div>
                </div>
                <div className="text-right flex-shrink-0 text-xs text-muted-foreground">
                  <p className="font-mono">{formatDateTime(imp.createdAt)}</p>
                  <p>{imp._count.lines} {plural(imp._count.lines, 'stavka', 'stavke', 'stavki')}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <StatementSheet buildingId={buildingId} importId={openId} canWrite={canWrite} onClose={() => setOpenId(null)} />
    </div>
  )
}
