import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { financeApi } from '@/lib/api/finance'
import type {
  CreateBankAccountDto,
  CreateInvoiceDto,
  CreateSupplierDto,
  CreateTransactionDto,
  FeeRuleDto,
  InvoicesQuery,
  TransactionsQuery,
  UpdateBankAccountDto,
  UpsertFinanceProfileDto,
} from '@/lib/types'

const STALE = 30 * 1000

export function useFinance(buildingId: string) {
  return useQuery({
    queryKey: ['finance', buildingId, 'overview'],
    queryFn: () => financeApi.overview(buildingId),
    enabled: !!buildingId,
    staleTime: STALE,
  })
}

export function useFinanceSummary(buildingId: string, enabled = true) {
  return useQuery({
    queryKey: ['finance', buildingId, 'summary'],
    queryFn: () => financeApi.summary(buildingId),
    enabled: !!buildingId && enabled,
    staleTime: STALE,
  })
}

export function useFinanceCategories(buildingId: string, enabled = true) {
  return useQuery({
    queryKey: ['finance', buildingId, 'categories'],
    queryFn: () => financeApi.categories(buildingId),
    enabled: !!buildingId && enabled,
    staleTime: STALE,
  })
}

export function useSuppliers(buildingId: string, enabled = true) {
  return useQuery({
    queryKey: ['finance', buildingId, 'suppliers'],
    queryFn: () => financeApi.suppliers(buildingId),
    enabled: !!buildingId && enabled,
    staleTime: STALE,
  })
}

export function useTransactions(buildingId: string, query: TransactionsQuery, enabled = true) {
  return useQuery({
    queryKey: ['finance', buildingId, 'transactions', query],
    queryFn: () => financeApi.transactions(buildingId, query),
    enabled: !!buildingId && enabled,
    staleTime: STALE,
  })
}

export function useInvoices(buildingId: string, query: InvoicesQuery, enabled = true) {
  return useQuery({
    queryKey: ['finance', buildingId, 'invoices', query],
    queryFn: () => financeApi.invoices(buildingId, query),
    enabled: !!buildingId && enabled,
    staleTime: STALE,
  })
}

export function useInvoice(buildingId: string, id: string | null) {
  return useQuery({
    queryKey: ['finance', buildingId, 'invoice', id],
    queryFn: () => financeApi.invoice(buildingId, id!),
    enabled: !!buildingId && !!id,
  })
}

export function useFeeRules(buildingId: string, enabled = true) {
  return useQuery({
    queryKey: ['finance', buildingId, 'fee-rules'],
    queryFn: () => financeApi.feeRules(buildingId),
    enabled: !!buildingId && enabled,
    staleTime: STALE,
  })
}

export function useChargesPreview(buildingId: string, period: string | null) {
  return useQuery({
    queryKey: ['finance', buildingId, 'charges-preview', period],
    queryFn: () => financeApi.previewCharges(buildingId, period!),
    enabled: !!buildingId && !!period,
  })
}

export function useUnitLedger(buildingId: string, unitId: string | null | undefined) {
  return useQuery({
    queryKey: ['finance', buildingId, 'ledger', unitId],
    queryFn: () => financeApi.unitLedger(buildingId, unitId!),
    enabled: !!buildingId && !!unitId,
    staleTime: STALE,
  })
}

export function useArrears(buildingId: string, enabled = true) {
  return useQuery({
    queryKey: ['finance', buildingId, 'arrears'],
    queryFn: () => financeApi.arrears(buildingId),
    enabled: !!buildingId && enabled,
    staleTime: STALE,
  })
}

// Any write can move balances, totals and invoice statuses, so refresh the whole module.
function useFinanceMutation<T, R>(buildingId: string, mutationFn: (vars: T) => Promise<R>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['finance', buildingId] }),
  })
}

export function useUpsertFinanceProfile(buildingId: string) {
  return useFinanceMutation(buildingId, (dto: UpsertFinanceProfileDto) =>
    financeApi.upsertProfile(buildingId, dto)
  )
}

export function useCreateBankAccount(buildingId: string) {
  return useFinanceMutation(buildingId, (dto: CreateBankAccountDto) =>
    financeApi.createBankAccount(buildingId, dto)
  )
}

export function useUpdateBankAccount(buildingId: string) {
  return useFinanceMutation(buildingId, ({ id, dto }: { id: string; dto: UpdateBankAccountDto }) =>
    financeApi.updateBankAccount(buildingId, id, dto)
  )
}

export function useCreateSupplier(buildingId: string) {
  return useFinanceMutation(buildingId, (dto: CreateSupplierDto) =>
    financeApi.createSupplier(buildingId, dto)
  )
}

export function useCreateTransaction(buildingId: string) {
  return useFinanceMutation(buildingId, (dto: CreateTransactionDto) =>
    financeApi.createTransaction(buildingId, dto)
  )
}

export function useReverseTransaction(buildingId: string) {
  return useFinanceMutation(buildingId, ({ id, reason }: { id: string; reason?: string }) =>
    financeApi.reverseTransaction(buildingId, id, reason)
  )
}

export function useCreateInvoice(buildingId: string) {
  return useFinanceMutation(buildingId, (dto: CreateInvoiceDto) =>
    financeApi.createInvoice(buildingId, dto)
  )
}

export function useCancelInvoice(buildingId: string) {
  return useFinanceMutation(buildingId, ({ id, reason }: { id: string; reason: string }) =>
    financeApi.cancelInvoice(buildingId, id, reason)
  )
}

export function useCreateFeeRule(buildingId: string) {
  return useFinanceMutation(buildingId, (dto: FeeRuleDto) => financeApi.createFeeRule(buildingId, dto))
}

export function useUpdateFeeRule(buildingId: string) {
  return useFinanceMutation(buildingId, ({ id, dto }: { id: string; dto: Partial<FeeRuleDto> }) =>
    financeApi.updateFeeRule(buildingId, id, dto)
  )
}

export function useGenerateCharges(buildingId: string) {
  return useFinanceMutation(buildingId, ({ period, regenerate }: { period: string; regenerate: boolean }) =>
    financeApi.generateCharges(buildingId, period, regenerate)
  )
}

export function useCancelCharge(buildingId: string) {
  return useFinanceMutation(buildingId, ({ id, reason }: { id: string; reason: string }) =>
    financeApi.cancelCharge(buildingId, id, reason)
  )
}

export function useOpeningBalance(buildingId: string) {
  return useFinanceMutation(buildingId, ({ unitId, amount }: { unitId: string; amount: string }) =>
    financeApi.openingBalance(buildingId, unitId, amount)
  )
}

export function useCreateAdjustment(buildingId: string) {
  return useFinanceMutation(
    buildingId,
    ({ unitId, amount, description }: { unitId: string; amount: string; description: string }) =>
      financeApi.createAdjustment(buildingId, unitId, { amount, description })
  )
}
