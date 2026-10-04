import api from '@/lib/axios'
import type {
  Arrears,
  BankAccount,
  ChargesPreview,
  ChargesResult,
  CreateBankAccountDto,
  CreateInvoiceDto,
  CreateSupplierDto,
  CreateTransactionDto,
  FeeRule,
  FeeRuleDto,
  FinanceCategory,
  FinanceEntity,
  FinanceOverview,
  FinanceSummary,
  FinanceTransaction,
  Invoice,
  InvoiceDetail,
  InvoicesQuery,
  Supplier,
  TransactionsQuery,
  UnitLedger,
  UpdateBankAccountDto,
  UpsertFinanceProfileDto,
} from '@/lib/types'

const base = (buildingId: string) => `/buildings/${buildingId}/finance`

export const financeApi = {
  overview: (buildingId: string) =>
    api.get<FinanceOverview>(base(buildingId)).then((r) => r.data),
  summary: (buildingId: string, params?: { from?: string; to?: string }) =>
    api.get<FinanceSummary>(`${base(buildingId)}/summary`, { params }).then((r) => r.data),
  upsertProfile: (buildingId: string, dto: UpsertFinanceProfileDto) =>
    api.put<FinanceEntity>(`${base(buildingId)}/profile`, dto).then((r) => r.data),

  createBankAccount: (buildingId: string, dto: CreateBankAccountDto) =>
    api.post<BankAccount>(`${base(buildingId)}/bank-accounts`, dto).then((r) => r.data),
  updateBankAccount: (buildingId: string, id: string, dto: UpdateBankAccountDto) =>
    api.patch<BankAccount>(`${base(buildingId)}/bank-accounts/${id}`, dto).then((r) => r.data),

  categories: (buildingId: string) =>
    api.get<FinanceCategory[]>(`${base(buildingId)}/categories`).then((r) => r.data),

  suppliers: (buildingId: string) =>
    api.get<Supplier[]>(`${base(buildingId)}/suppliers`).then((r) => r.data),
  createSupplier: (buildingId: string, dto: CreateSupplierDto) =>
    api.post<Supplier>(`${base(buildingId)}/suppliers`, dto).then((r) => r.data),

  transactions: (buildingId: string, params?: TransactionsQuery) =>
    api
      .get<FinanceTransaction[]>(`${base(buildingId)}/transactions`, { params })
      .then((r) => r.data),
  createTransaction: (buildingId: string, dto: CreateTransactionDto) =>
    api.post<FinanceTransaction>(`${base(buildingId)}/transactions`, dto).then((r) => r.data),
  reverseTransaction: (buildingId: string, id: string, reason?: string) =>
    api
      .post<FinanceTransaction>(`${base(buildingId)}/transactions/${id}/reverse`, { reason })
      .then((r) => r.data),

  invoices: (buildingId: string, params?: InvoicesQuery) =>
    api.get<Invoice[]>(`${base(buildingId)}/invoices`, { params }).then((r) => r.data),
  invoice: (buildingId: string, id: string) =>
    api.get<InvoiceDetail>(`${base(buildingId)}/invoices/${id}`).then((r) => r.data),
  createInvoice: (buildingId: string, dto: CreateInvoiceDto) =>
    api.post<Invoice>(`${base(buildingId)}/invoices`, dto).then((r) => r.data),
  cancelInvoice: (buildingId: string, id: string, reason: string) =>
    api.post<Invoice>(`${base(buildingId)}/invoices/${id}/cancel`, { reason }).then((r) => r.data),

  feeRules: (buildingId: string) =>
    api.get<FeeRule[]>(`${base(buildingId)}/fee-rules`).then((r) => r.data),
  createFeeRule: (buildingId: string, dto: FeeRuleDto) =>
    api.post<FeeRule>(`${base(buildingId)}/fee-rules`, dto).then((r) => r.data),
  updateFeeRule: (buildingId: string, id: string, dto: Partial<FeeRuleDto>) =>
    api.patch<FeeRule>(`${base(buildingId)}/fee-rules/${id}`, dto).then((r) => r.data),

  previewCharges: (buildingId: string, period: string) =>
    api
      .get<ChargesPreview>(`${base(buildingId)}/charges/preview`, { params: { period } })
      .then((r) => r.data),
  generateCharges: (buildingId: string, period: string, regenerate: boolean) =>
    api
      .post<ChargesResult>(`${base(buildingId)}/charges/${regenerate ? 'regenerate' : 'generate'}`, { period })
      .then((r) => r.data),
  cancelCharge: (buildingId: string, id: string, reason: string) =>
    api.post(`${base(buildingId)}/charges/${id}/cancel`, { reason }).then((r) => r.data),
  openingBalance: (buildingId: string, unitId: string, amount: string) =>
    api.post(`${base(buildingId)}/units/${unitId}/opening-balance`, { amount }).then((r) => r.data),
  createAdjustment: (buildingId: string, unitId: string, dto: { amount: string; description: string }) =>
    api.post(`${base(buildingId)}/units/${unitId}/charges`, dto).then((r) => r.data),

  unitLedger: (buildingId: string, unitId: string) =>
    api.get<UnitLedger>(`${base(buildingId)}/units/${unitId}/ledger`).then((r) => r.data),
  arrears: (buildingId: string) =>
    api.get<Arrears>(`${base(buildingId)}/arrears`).then((r) => r.data),
}
