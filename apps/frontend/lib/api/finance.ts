import api from '@/lib/axios'
import type {
  Arrears,
  BankAccount,
  Budget,
  ChargesPreview,
  ChargesResult,
  CreateBankAccountDto,
  CreateCategoryDto,
  CreateInvoiceDto,
  CreateSupplierDto,
  CreateTransactionDto,
  FeeRule,
  FeeRuleDto,
  FinanceCategory,
  FinanceEntity,
  FinanceOverview,
  FinanceReport,
  FinanceSummary,
  FinanceTransaction,
  Invoice,
  InvoiceDetail,
  InvoicesQuery,
  StatementImport,
  StatementImportListItem,
  StatementLine,
  Supplier,
  TransactionsQuery,
  UnitLedger,
  UpdateBankAccountDto,
  UpdateCategoryDto,
  UpdateInvoiceDto,
  UpdateStatementLineDto,
  UpdateSupplierDto,
  UploadStatementDto,
  UpsertBudgetDto,
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
  createCategory: (buildingId: string, dto: CreateCategoryDto) =>
    api.post<FinanceCategory>(`${base(buildingId)}/categories`, dto).then((r) => r.data),
  updateCategory: (buildingId: string, id: string, dto: UpdateCategoryDto) =>
    api.patch<FinanceCategory>(`${base(buildingId)}/categories/${id}`, dto).then((r) => r.data),

  suppliers: (buildingId: string) =>
    api.get<Supplier[]>(`${base(buildingId)}/suppliers`).then((r) => r.data),
  createSupplier: (buildingId: string, dto: CreateSupplierDto) =>
    api.post<Supplier>(`${base(buildingId)}/suppliers`, dto).then((r) => r.data),
  updateSupplier: (buildingId: string, id: string, dto: UpdateSupplierDto) =>
    api.patch<Supplier>(`${base(buildingId)}/suppliers/${id}`, dto).then((r) => r.data),

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
  updateInvoice: (buildingId: string, id: string, dto: UpdateInvoiceDto) =>
    api.patch<Invoice>(`${base(buildingId)}/invoices/${id}`, dto).then((r) => r.data),
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

  imports: (buildingId: string) =>
    api.get<StatementImportListItem[]>(`${base(buildingId)}/imports`).then((r) => r.data),
  import: (buildingId: string, id: string) =>
    api.get<StatementImport>(`${base(buildingId)}/imports/${id}`).then((r) => r.data),
  uploadStatement: (buildingId: string, file: File, dto: UploadStatementDto) => {
    const form = new FormData()
    form.append('file', file)
    form.append('bankAccountId', dto.bankAccountId)
    if (dto.mapping) form.append('mapping', JSON.stringify(dto.mapping))
    if (dto.statementNumber) form.append('statementNumber', dto.statementNumber)
    if (dto.openingBalance) form.append('openingBalance', dto.openingBalance)
    if (dto.closingBalance) form.append('closingBalance', dto.closingBalance)
    return api
      .post<StatementImport>(`${base(buildingId)}/imports`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },
  updateStatementLine: (buildingId: string, importId: string, lineId: string, dto: UpdateStatementLineDto) =>
    api
      .patch<StatementLine>(`${base(buildingId)}/imports/${importId}/lines/${lineId}`, dto)
      .then((r) => r.data),
  commitStatement: (buildingId: string, id: string) =>
    api.post<StatementImport>(`${base(buildingId)}/imports/${id}/commit`).then((r) => r.data),
  discardStatement: (buildingId: string, id: string) =>
    api.post<StatementImport>(`${base(buildingId)}/imports/${id}/discard`).then((r) => r.data),

  budgets: (buildingId: string) =>
    api.get<Budget[]>(`${base(buildingId)}/budgets`).then((r) => r.data),
  upsertBudget: (buildingId: string, year: number, dto: UpsertBudgetDto) =>
    api.put<Budget>(`${base(buildingId)}/budgets/${year}`, dto).then((r) => r.data),

  reports: (buildingId: string) =>
    api.get<FinanceReport[]>(`${base(buildingId)}/reports`).then((r) => r.data),
  /** The unpublished PDF, fetched with auth so it can be opened as a blob URL. */
  previewReport: (buildingId: string, params: { from: string; to: string }) =>
    api
      .get<Blob>(`${base(buildingId)}/reports/preview`, { params, responseType: 'blob' })
      .then((r) => r.data),
  publishReport: (buildingId: string, dto: { from: string; to: string }) =>
    api.post<FinanceReport>(`${base(buildingId)}/reports`, dto).then((r) => r.data),
}
