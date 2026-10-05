import { createContext, useContext } from 'react'
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { financeApi } from '@/lib/api/finance'
import { plural } from '@/lib/format'
import type {
  CreateBankAccountDto,
  CreateCategoryDto,
  CreateInvoiceDto,
  CreateSupplierDto,
  CreateTransactionDto,
  FeeRuleDto,
  InvoicesQuery,
  TransactionsQuery,
  UpdateBankAccountDto,
  UpdateCategoryDto,
  UpdateInvoiceDto,
  UpdateStatementLineDto,
  UpdateSupplierDto,
  UploadStatementDto,
  UpsertBudgetDto,
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

const PAGE = 50

// Next skip, or undefined once a short page shows the list has ended.
const nextSkip = (last: unknown[], pages: unknown[][]) =>
  last.length < PAGE ? undefined : pages.length * PAGE

/** The Transakcije list, one page at a time ("Učitaj još"). */
export function useTransactionPages(buildingId: string, query: TransactionsQuery) {
  return useInfiniteQuery({
    queryKey: ['finance', buildingId, 'transactions', 'pages', query],
    queryFn: ({ pageParam }) =>
      financeApi.transactions(buildingId, {
        ...query,
        take: PAGE,
        skip: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: nextSkip,
    enabled: !!buildingId,
    staleTime: STALE,
  })
}

/** The Fakture list, one page at a time ("Učitaj još"). */
export function useInvoicePages(buildingId: string, query: InvoicesQuery) {
  return useInfiniteQuery({
    queryKey: ['finance', buildingId, 'invoices', 'pages', query],
    queryFn: ({ pageParam }) =>
      financeApi.invoices(buildingId, {
        ...query,
        take: PAGE,
        skip: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: nextSkip,
    enabled: !!buildingId,
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
    staleTime: STALE,
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

export function useStatementImports(buildingId: string, enabled = true) {
  return useQuery({
    queryKey: ['finance', buildingId, 'imports'],
    queryFn: () => financeApi.imports(buildingId),
    enabled: !!buildingId && enabled,
    staleTime: STALE,
  })
}

export function useStatementImport(buildingId: string, id: string | null) {
  return useQuery({
    queryKey: ['finance', buildingId, 'import', id],
    queryFn: () => financeApi.import(buildingId, id!),
    enabled: !!buildingId && !!id,
    staleTime: STALE,
  })
}

export function useBudgets(buildingId: string, enabled = true) {
  return useQuery({
    queryKey: ['finance', buildingId, 'budgets'],
    queryFn: () => financeApi.budgets(buildingId),
    enabled: !!buildingId && enabled,
    staleTime: STALE,
  })
}

export function useFinanceReports(buildingId: string, enabled = true) {
  return useQuery({
    queryKey: ['finance', buildingId, 'reports'],
    queryFn: () => financeApi.reports(buildingId),
    enabled: !!buildingId && enabled,
    staleTime: STALE,
  })
}

/** Success feedback for finance writes. FinanceView provides it; elsewhere it is a no-op. */
export interface FinanceFeedback {
  announce: (message: string, highlightId?: string) => void
  /** The row just created, briefly highlighted in its list. */
  highlightId: string | null
}

export const FinanceFeedbackContext = createContext<FinanceFeedback>({
  announce: () => {},
  highlightId: null,
})

export const useFinanceFeedback = () => useContext(FinanceFeedbackContext)

/** The finance query scopes, the third part of every `['finance', buildingId, scope, …]` key. */
type FinanceScope =
  | 'overview'
  | 'summary'
  | 'categories'
  | 'suppliers'
  | 'transactions'
  | 'invoices'
  | 'invoice'
  | 'fee-rules'
  | 'charges-preview'
  | 'ledger'
  | 'arrears'
  | 'imports'
  | 'import'
  | 'budgets'
  | 'reports'

// What a write can change. Writes that move the books everywhere (profile, accounts,
// categories, statement commit) leave `scopes` out and refresh the whole module.
const TRANSACTION_SCOPES: FinanceScope[] = [
  'transactions',
  'overview',
  'summary',
  'arrears',
  'ledger',
  'invoices',
  'invoice',
]
const INVOICE_SCOPES: FinanceScope[] = ['invoices', 'invoice']
const FEE_RULE_SCOPES: FinanceScope[] = ['fee-rules', 'charges-preview']
const CHARGE_SCOPES: FinanceScope[] = ['charges-preview', 'ledger', 'arrears']
const IMPORT_SCOPES: FinanceScope[] = ['imports', 'import']

interface MutationOptions<R> {
  /** Announced to the user on success. */
  success?: string | ((result: R) => string)
  /** Marks the created row. */
  highlight?: (result: R) => string
  /** Finance scopes to refresh; omitted, the whole module refreshes. */
  scopes?: FinanceScope[]
  /** Query keys outside the finance module to refresh as well. */
  also?: unknown[][]
}

function useFinanceMutation<T, R>(
  buildingId: string,
  mutationFn: (vars: T) => Promise<R>,
  { success, highlight, scopes, also = [] }: MutationOptions<R> = {}
) {
  const queryClient = useQueryClient()
  const { announce } = useFinanceFeedback()
  return useMutation({
    mutationFn,
    onSuccess: (result) => {
      if (success) announce(typeof success === 'string' ? success : success(result), highlight?.(result))
      const keys = scopes ? scopes.map((scope) => ['finance', buildingId, scope]) : [['finance', buildingId]]
      return Promise.all(
        [...keys, ...also].map((queryKey) => queryClient.invalidateQueries({ queryKey }))
      )
    },
  })
}

export function useUpsertFinanceProfile(buildingId: string) {
  return useFinanceMutation(
    buildingId,
    (dto: UpsertFinanceProfileDto) => financeApi.upsertProfile(buildingId, dto),
    { success: 'Podaci zajednice sačuvani.' }
  )
}

export function useCreateBankAccount(buildingId: string) {
  return useFinanceMutation(
    buildingId,
    (dto: CreateBankAccountDto) => financeApi.createBankAccount(buildingId, dto),
    { success: 'Račun dodat.' }
  )
}

export function useUpdateBankAccount(buildingId: string) {
  return useFinanceMutation(
    buildingId,
    ({ id, dto }: { id: string; dto: UpdateBankAccountDto }) =>
      financeApi.updateBankAccount(buildingId, id, dto),
    { success: 'Račun sačuvan.' }
  )
}

export function useCreateCategory(buildingId: string) {
  return useFinanceMutation(
    buildingId,
    (dto: CreateCategoryDto) => financeApi.createCategory(buildingId, dto),
    { success: 'Kategorija dodata.', scopes: ['categories'] }
  )
}

export function useUpdateCategory(buildingId: string) {
  return useFinanceMutation(
    buildingId,
    ({ id, dto }: { id: string; dto: UpdateCategoryDto }) => financeApi.updateCategory(buildingId, id, dto),
    { success: 'Kategorija sačuvana.' }
  )
}

export function useCreateSupplier(buildingId: string) {
  return useFinanceMutation(
    buildingId,
    (dto: CreateSupplierDto) => financeApi.createSupplier(buildingId, dto),
    { success: 'Dobavljač dodat.', scopes: ['suppliers'] }
  )
}

export function useUpdateSupplier(buildingId: string) {
  return useFinanceMutation(
    buildingId,
    ({ id, dto }: { id: string; dto: UpdateSupplierDto }) => financeApi.updateSupplier(buildingId, id, dto),
    { success: 'Dobavljač sačuvan.', scopes: ['suppliers', 'transactions', ...INVOICE_SCOPES] }
  )
}

export function useCreateTransaction(buildingId: string) {
  return useFinanceMutation(
    buildingId,
    (dto: CreateTransactionDto) => financeApi.createTransaction(buildingId, dto),
    { success: 'Transakcija proknjižena.', highlight: (tx) => tx.id, scopes: TRANSACTION_SCOPES }
  )
}

export function useReverseTransaction(buildingId: string) {
  return useFinanceMutation(
    buildingId,
    ({ id, reason }: { id: string; reason?: string }) =>
      financeApi.reverseTransaction(buildingId, id, reason),
    { success: 'Transakcija stornirana.', scopes: TRANSACTION_SCOPES }
  )
}

export function useCreateInvoice(buildingId: string) {
  return useFinanceMutation(
    buildingId,
    (dto: CreateInvoiceDto) => financeApi.createInvoice(buildingId, dto),
    { success: 'Faktura sačuvana.', highlight: (invoice) => invoice.id, scopes: INVOICE_SCOPES }
  )
}

export function useUpdateInvoice(buildingId: string) {
  return useFinanceMutation(
    buildingId,
    ({ id, dto }: { id: string; dto: UpdateInvoiceDto }) => financeApi.updateInvoice(buildingId, id, dto),
    { success: 'Faktura sačuvana.', scopes: INVOICE_SCOPES }
  )
}

export function useCancelInvoice(buildingId: string) {
  return useFinanceMutation(
    buildingId,
    ({ id, reason }: { id: string; reason: string }) => financeApi.cancelInvoice(buildingId, id, reason),
    { success: 'Faktura stornirana.', scopes: INVOICE_SCOPES }
  )
}

export function useCreateFeeRule(buildingId: string) {
  return useFinanceMutation(
    buildingId,
    (dto: FeeRuleDto) => financeApi.createFeeRule(buildingId, dto),
    { success: 'Pravilo dodato.', scopes: FEE_RULE_SCOPES }
  )
}

export function useUpdateFeeRule(buildingId: string) {
  return useFinanceMutation(
    buildingId,
    ({ id, dto }: { id: string; dto: Partial<FeeRuleDto> }) => financeApi.updateFeeRule(buildingId, id, dto),
    { success: 'Pravilo sačuvano.', scopes: FEE_RULE_SCOPES }
  )
}

export function useGenerateCharges(buildingId: string) {
  return useFinanceMutation(
    buildingId,
    ({ period, regenerate }: { period: string; regenerate: boolean }) =>
      financeApi.generateCharges(buildingId, period, regenerate),
    {
      success: (r) => `Izdato ${r.issuedCount} ${plural(r.issuedCount, 'zaduženje', 'zaduženja', 'zaduženja')}.`,
      // Includes charges-preview, so an open preview refreshes to the issued state.
      scopes: CHARGE_SCOPES,
    }
  )
}

export function useCancelCharge(buildingId: string) {
  return useFinanceMutation(
    buildingId,
    ({ id, reason }: { id: string; reason: string }) => financeApi.cancelCharge(buildingId, id, reason),
    { success: 'Zaduženje stornirano.', scopes: CHARGE_SCOPES }
  )
}

export function useOpeningBalance(buildingId: string) {
  return useFinanceMutation(
    buildingId,
    ({ unitId, amount }: { unitId: string; amount: string }) =>
      financeApi.openingBalance(buildingId, unitId, amount),
    { success: 'Početno stanje sačuvano.', scopes: CHARGE_SCOPES }
  )
}

export function useCreateAdjustment(buildingId: string) {
  return useFinanceMutation(
    buildingId,
    ({ unitId, amount, description }: { unitId: string; amount: string; description: string }) =>
      financeApi.createAdjustment(buildingId, unitId, { amount, description }),
    { success: 'Korekcija proknjižena.', scopes: CHARGE_SCOPES }
  )
}

export function useUploadStatement(buildingId: string) {
  return useFinanceMutation(
    buildingId,
    ({ file, dto }: { file: File; dto: UploadStatementDto }) =>
      financeApi.uploadStatement(buildingId, file, dto),
    // The account's saved column mapping lives on the overview.
    { success: 'Izvod učitan. Proverite stavke pre knjiženja.', scopes: [...IMPORT_SCOPES, 'overview'] }
  )
}

export function useUpdateStatementLine(buildingId: string, importId: string) {
  return useFinanceMutation(
    buildingId,
    ({ lineId, dto }: { lineId: string; dto: UpdateStatementLineDto }) =>
      financeApi.updateStatementLine(buildingId, importId, lineId, dto),
    { scopes: ['import'] }
  )
}

export function useCommitStatement(buildingId: string) {
  return useFinanceMutation(buildingId, (id: string) => financeApi.commitStatement(buildingId, id), {
    success: (imp) => {
      const n = imp.lines.filter((l) => l.transactionId).length
      return `Proknjiženo ${n} ${plural(n, 'stavka', 'stavke', 'stavki')}.`
    },
  })
}

export function useDiscardStatement(buildingId: string) {
  return useFinanceMutation(buildingId, (id: string) => financeApi.discardStatement(buildingId, id), {
    success: 'Izvod odbačen.',
    scopes: IMPORT_SCOPES,
  })
}

export function useUpsertBudget(buildingId: string) {
  return useFinanceMutation(
    buildingId,
    ({ year, dto }: { year: number; dto: UpsertBudgetDto }) => financeApi.upsertBudget(buildingId, year, dto),
    { success: 'Plan sačuvan.', scopes: ['budgets', 'summary'] }
  )
}

// Publishing files the PDF under Dokumenta and notifies residents.
export function usePublishReport(buildingId: string) {
  return useFinanceMutation(
    buildingId,
    (dto: { from: string; to: string }) => financeApi.publishReport(buildingId, dto),
    { success: 'Izveštaj objavljen.', also: [['documents', buildingId], ['notifications']] }
  )
}
