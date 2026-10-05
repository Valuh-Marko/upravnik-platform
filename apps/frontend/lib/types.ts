// ─── Enums ────────────────────────────────────────────────────────────────────

export type Role = 'SUPER_ADMIN' | 'UPRAVNIK' | 'BOARD_MEMBER' | 'RESIDENT'
export type AccountType = 'SYSTEM_USER' | 'UNIT_ACCOUNT'
export type ThreadCategory = 'GENERAL' | 'MAINTENANCE' | 'COMPLAINT' | 'QUESTION'
export type ThreadStatus = 'OPEN' | 'CLOSED'
export type TicketCategory = 'GENERAL' | 'MAINTENANCE' | 'COMPLAINT' | 'PAYMENT' | 'REQUEST'
export type TicketStatus = 'OPEN' | 'CLOSED'
export type DocumentCategory = 'CONTRACT' | 'REPORT' | 'DECISION' | 'OTHER'
export type UnitType = 'APARTMENT' | 'OFFICE' | 'COMMERCIAL'

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  username: string
  accountType: AccountType
  role?: Role
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  /** The resident's own unit; null for staff. */
  unitId?: string | null
}

export interface MeBuildingMember {
  role: Role
  joinedAt: string
  building: { id: string; name: string; address: string; city: string }
  unit: { id: string; unitNumber: string; floor: number | null; type: UnitType } | null
}

export interface MeResponse {
  id: string
  username: string
  email?: string | null
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
  accountType: AccountType
  systemRole?: 'SUPER_ADMIN' | null
  createdAt: string
  buildingMembers: MeBuildingMember[]
  threads: unknown[]
}

export interface LoginResponse {
  accessToken: string
}

// ─── Shared ───────────────────────────────────────────────────────────────────

export interface Author {
  id?: string
  firstName?: string | null
  lastName?: string | null
  username: string
  unitNumber?: string | null
}

export interface SimpleAuthor {
  id: string
  firstName: string | null
  lastName: string | null
  unitNumber?: string | null
  building?: { id: string; name: string } | null
}

// ─── Structure ────────────────────────────────────────────────────────────────

export interface Complex {
  id: string
  name: string
  address: string
  city: string
  createdAt: string
  updatedAt: string
}

export interface Building {
  id: string
  name: string
  address: string
  city: string
  complexId?: string | null
  createdAt: string
  updatedAt: string
}

export interface UnitResident {
  id: string
  username: string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  accountType: AccountType
}

export interface Unit {
  id: string
  buildingId: string
  unitNumber: string
  floor?: number | null
  type: UnitType
  areaSqm?: string | null
  residentCount: number
  userId?: string | null
  user?: UnitResident | null
  createdAt: string
  updatedAt: string
}

// ─── Content ──────────────────────────────────────────────────────────────────

export interface Announcement {
  id: string
  buildingId: string
  authorId: string
  title: string
  body: string
  isPinned: boolean
  createdAt: string
  updatedAt: string
  author?: Author
  building?: { id: string; name: string }
}

export interface Document {
  id: string
  buildingId: string
  uploadedBy: string
  title: string
  /** Legacy external link; uploaded files have fileId instead. */
  fileUrl: string | null
  fileId: string | null
  fileType?: string | null
  category: DocumentCategory
  createdAt: string
  uploader?: Author
}

export interface Thread {
  id: string
  buildingId: string
  authorId: string
  title: string
  body: string
  category: ThreadCategory
  status: ThreadStatus
  createdAt: string
  updatedAt: string
  author?: Author
  building?: { id: string; name: string }
  replies?: ThreadReply[]
  _count?: { replies: number }
}

export interface ThreadReply {
  id: string
  threadId: string
  authorId: string
  body: string
  createdAt: string
  author?: Author
}

export interface ComplexThreadReply {
  id: string
  threadId: string
  authorId: string
  body: string
  createdAt: string
  author?: SimpleAuthor
}

export interface ComplexThread {
  id: string
  complexId: string
  authorId: string
  title: string
  body: string
  category: ThreadCategory
  status: ThreadStatus
  createdAt: string
  updatedAt: string
  author?: SimpleAuthor
  replies?: ComplexThreadReply[]
  _count?: { replies: number }
}

export interface TicketAuthor {
  id: string
  firstName: string | null
  lastName: string | null
  unit?: { id: string; unitNumber: string; floor?: number | null } | null
}

export interface Ticket {
  id: string
  buildingId: string
  authorId: string
  title: string
  body: string
  category: TicketCategory
  status: TicketStatus
  createdAt: string
  updatedAt: string
  author?: TicketAuthor
  building?: { id: string; name: string }
  replies?: TicketReply[]
  _count?: { replies: number }
  isUnread?: boolean
}

export interface TicketReply {
  id: string
  ticketId: string
  authorId: string
  body: string
  createdAt: string
  author?: TicketAuthor
}

export interface Notification {
  id: string
  userId: string
  title: string
  body: string
  isRead: boolean
  link?: string | null
  createdAt: string
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface LoginDto {
  username: string
  password: string
}

export interface CreateAnnouncementDto {
  title: string
  body: string
  isPinned?: boolean
}

export interface CreateThreadDto {
  title: string
  body: string
  category: ThreadCategory
}

export interface CreateReplyDto {
  body: string
}

export interface CreateTicketDto {
  title: string
  body: string
  category: TicketCategory
}

export interface CreateDocumentDto {
  title: string
  fileUrl: string
  fileType?: string
  category: DocumentCategory
}

export interface CreateUnitDto {
  unitNumber: string
  floor?: number
  type: UnitType
  areaSqm?: number
}

export interface CreateUnitAccountDto {
  unitId: string
  unitNumber: string
  email?: string
  firstName?: string
  lastName?: string
  phone?: string
}

export interface CreateSystemUserDto {
  email: string
  password: string
  firstName?: string
  lastName?: string
  role: Role
}

export interface ResetPasswordDto {
  newPassword: string
}

export interface CreateComplexDto {
  name: string
  address: string
  city: string
}

export interface CreateBuildingDto {
  name: string
  address: string
  city: string
  complexId?: string
}

// ─── Bulk Create ──────────────────────────────────────────────────────────────

export interface BulkCreateUnitDto {
  unitNumber: string
  floor?: number
  type: UnitType
  areaSqm?: number
}

export interface BulkCreateBuildingDto {
  name: string
  address: string
  city: string
  units: BulkCreateUnitDto[]
}

export interface BulkCreateDto {
  complex?: { name: string; address: string; city: string }
  buildings: BulkCreateBuildingDto[]
}

export interface BulkCreateResponse {
  complex?: { id: string; name: string }
  buildings: { id: string; name: string; unitCount: number }[]
  totalUnits: number
}

// ─── Finance ──────────────────────────────────────────────────────────────────
// Money arrives as decimal strings ("3000" or "3000.00"); never sum it as floats.

export type FinanceDirection = 'INCOME' | 'EXPENSE'
export type FinanceFund =
  | 'TEKUCE_ODRZAVANJE'
  | 'INVESTICIONO_ODRZAVANJE'
  | 'UPRAVLJANJE'
  | 'HITNE_INTERVENCIJE'
  | 'OSTALO'
export type InvoiceStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED'

export interface FinanceEntity {
  id: string
  buildingId: string | null
  legalName: string
  pib: string
  maticniBroj: string
  address: string | null
  booksStartDate: string
  paymentTermDays: number
  autoGenerateCharges: boolean
  createdAt: string
  updatedAt: string
}

export interface BankAccount {
  id: string
  bankName: string
  accountNumber: string
  isPrimary: boolean
  isActive: boolean
  openingBalance: string
  balance: string
  /** Column mapping saved by the last statement import. */
  importMapping: CsvMapping | null
  createdAt: string
}

export type FinanceOverview =
  | { configured: false }
  | {
      configured: true
      entity: FinanceEntity
      bankAccounts: BankAccount[]
      totalBalance: string
      // Owner payments without a unit, not reversed.
      unassignedPayments: number
    }

export interface FinanceSummary {
  from: string
  to: string
  openingBalance: string
  closingBalance: string
  income: string
  expense: string
  net: string
  marketIncome: string
  /** A budget exists for a year the range touches; planned amounts are whole-year. */
  hasBudget: boolean
  plannedIncome: string
  plannedExpense: string
  byFund: {
    fund: FinanceFund | null
    income: string
    expense: string
    plannedIncome: string
    plannedExpense: string
  }[]
  byCategory: {
    categoryId: string
    name: string
    direction: FinanceDirection
    fund: FinanceFund | null
    amount: string
    planned: string | null
  }[]
}

export interface FinanceCategory {
  id: string
  direction: FinanceDirection
  fund: FinanceFund | null
  name: string
  isOwnerPayment: boolean
  isMarketIncome: boolean
  isActive: boolean
}

export interface Supplier {
  id: string
  name: string
  pib: string | null
  maticniBroj: string | null
  bankAccount: string | null
  isActive: boolean
}

export interface FinanceTransaction {
  id: string
  bankAccountId: string
  direction: FinanceDirection
  amount: string
  valueDate: string
  /** Absent for residents on owner payments. */
  description?: string
  counterpartyName?: string | null
  counterpartyAccount?: string | null
  reference?: string | null
  unitId: string | null
  reversesId: string | null
  createdAt: string
  displayName: string
  category: Pick<
    FinanceCategory,
    'id' | 'name' | 'direction' | 'fund' | 'isOwnerPayment' | 'isMarketIncome'
  >
  bankAccount: { id: string; bankName: string; accountNumber: string }
  unit: { id: string; unitNumber: string } | null
  reversedBy: { id: string; valueDate: string } | null
  /** The transaction this storno cancels. */
  reverses: { id: string; valueDate: string } | null
  invoicePayments: {
    amount: string
    invoice: { id: string; number: string; supplier: { id: string; name: string } }
  }[]
}

export interface StoredFileInfo {
  id: string
  fileName: string
  mimeType: string
  sizeBytes: number
}

export interface Invoice {
  id: string
  supplierId: string
  number: string
  issueDate: string
  dueDate: string | null
  amount: string
  categoryId: string
  description: string | null
  fileId: string | null
  cancelledAt: string | null
  cancelReason: string | null
  createdAt: string
  supplier: { id: string; name: string; pib: string | null }
  category: { id: string; name: string; fund: FinanceFund | null }
  file: StoredFileInfo | null
  status: InvoiceStatus
  paidAmount: string
  openAmount: string
  isOverdue: boolean
}

export interface InvoiceDetail extends Invoice {
  payments: {
    amount: string
    isReversed: boolean
    transaction: { id: string; valueDate: string; amount: string; description: string }
  }[]
}

export interface TransactionsQuery {
  from?: string
  to?: string
  direction?: FinanceDirection
  categoryId?: string
  bankAccountId?: string
  fund?: FinanceFund
  /** Text search; see the API docs for the searched fields. */
  q?: string
  take?: number
  skip?: number
}

export interface InvoicesQuery {
  status?: InvoiceStatus
  supplierId?: string
  from?: string
  to?: string
  /** Text search; see the API docs for the searched fields. */
  q?: string
  take?: number
  skip?: number
}

export interface UpsertFinanceProfileDto {
  legalName: string
  pib: string
  maticniBroj: string
  address?: string
  booksStartDate: string
  paymentTermDays?: number
  autoGenerateCharges?: boolean
}

export interface CreateBankAccountDto {
  bankName: string
  accountNumber: string
  openingBalance: string
  isPrimary?: boolean
}

export interface UpdateBankAccountDto {
  bankName?: string
  /** Locked once the account has transactions or a report is published. */
  accountNumber?: string
  openingBalance?: string
  isPrimary?: boolean
  isActive?: boolean
}

export interface CreateSupplierDto {
  name: string
  pib?: string
  maticniBroj?: string
  bankAccount?: string
}

/** null clears an optional field. */
export interface UpdateSupplierDto {
  name?: string
  pib?: string | null
  maticniBroj?: string | null
  bankAccount?: string | null
  isActive?: boolean
}

export interface CreateCategoryDto {
  name: string
  direction: FinanceDirection
  fund?: FinanceFund
  isOwnerPayment?: boolean
  isMarketIncome?: boolean
}

export interface UpdateCategoryDto extends Partial<Omit<CreateCategoryDto, 'direction' | 'fund'>> {
  /** null removes the fund. */
  fund?: FinanceFund | null
  isActive?: boolean
}

export interface CreateTransactionDto {
  bankAccountId: string
  categoryId: string
  amount: string
  valueDate: string
  description: string
  counterpartyName?: string
  counterpartyAccount?: string
  reference?: string
  unitId?: string
  invoicePayments?: { invoiceId: string; amount: string }[]
}

export interface CreateInvoiceDto {
  supplierId: string
  number: string
  issueDate: string
  dueDate?: string
  amount: string
  categoryId: string
  description?: string
  fileId?: string
}

/** The supplier is fixed once the invoice exists. */
export type UpdateInvoiceDto = Partial<Omit<CreateInvoiceDto, 'supplierId'>>

// ─── Unit charges (zaduženja) ─────────────────────────────────────────────────

export type FeeMethod = 'PER_UNIT' | 'PER_SQM'
export type UnitChargeType = 'MONTHLY' | 'OPENING' | 'ADJUSTMENT'

export interface FeeRule {
  id: string
  fund: FinanceFund
  method: FeeMethod
  amount: string
  /** null = default rule for every unit type. */
  unitType: UnitType | null
  /** "YYYY-MM", inclusive. */
  validFrom: string
  validTo: string | null
  decisionDocumentId: string | null
  decisionDocument: { id: string; title: string } | null
}

export interface FeeRuleDto {
  fund: FinanceFund
  method: FeeMethod
  amount: string
  unitType?: UnitType | null
  validFrom: string
  validTo?: string | null
  decisionDocumentId?: string | null
}

/** NEW: not issued · ISSUED: issued, same amount · CHANGED: issued, amount differs · CANCELLED: cancelled by hand */
export type ChargeLineStatus = 'NEW' | 'ISSUED' | 'CHANGED' | 'CANCELLED'

export interface ChargesPreview {
  period: string
  issueDate: string
  units: {
    unitId: string
    unitNumber: string
    type: UnitType
    areaSqm: string | null
    lines: {
      fund: FinanceFund
      method: FeeMethod | null
      rate: string | null
      /** null when a per-m² rule meets a unit without an area. */
      amount: string | null
      issuedAmount: string | null
      status: ChargeLineStatus
    }[]
    total: string
    missingArea: boolean
  }[]
  total: string
  missingArea: string[]
  canGenerate: boolean
  /** The month falls inside a published report. */
  isLocked: boolean
}

export interface ChargesResult {
  period: string
  issuedCount: number
  cancelledCount: number
  unitCount: number
  total: string
}

export type LedgerEntry =
  | {
      kind: 'CHARGE'
      id: string
      date: string
      type: UnitChargeType
      fund: FinanceFund | null
      period: string
      description: string | null
      amount: string
      cancelledAt: string | null
      cancelReason: string | null
      balanceAfter: string
    }
  | {
      kind: 'PAYMENT'
      id: string
      date: string
      isReversal: boolean
      /** Effect on the debt: negative for a payment. */
      amount: string
      balanceAfter: string
    }

export interface UnitLedger {
  unit: { id: string; unitNumber: string; type: UnitType; areaSqm: string | null }
  payTo: { recipient: string; accountNumber: string | null; model: '97'; reference: string | null }
  paymentTermDays: number
  /** Positive = debt, negative = prepaid. */
  balance: string
  overdueAmount: string
  overdueSince: string | null
  /** Newest first. */
  entries: LedgerEntry[]
}

export interface ArrearsUnit {
  unitId: string
  unitNumber: string
  type: UnitType
  balance: string
  overdueAmount: string
  overdueSince: string | null
}

export interface Arrears {
  totalCharged: string
  totalPaid: string
  totalOutstanding: string
  totalOverdue: string
  unitsInArrears: number
  unitCount: number
  collectionRate: number | null
  /** Staff only. */
  units?: ArrearsUnit[]
}

// ─── Bank statement import ───────────────────────────────────────

export type StatementImportStatus = 'DRAFT' | 'COMMITTED' | 'DISCARDED'
export type CsvDateFormat = 'DD.MM.YYYY' | 'YYYY-MM-DD' | 'DD/MM/YYYY'

/** How a bank's CSV export maps onto statement lines. Columns are 0-based. */
export interface CsvMapping {
  encoding: 'utf-8' | 'windows-1250'
  delimiter: string
  /** Rows before the first data row (the header counts). */
  skipRows: number
  dateFormat: CsvDateFormat
  decimalSeparator: ',' | '.'
  columns: {
    date: number
    /** Either one signed amount (negative = expense) or a debit/credit pair. */
    amount?: number
    debit?: number
    credit?: number
    counterpartyName?: number
    counterpartyAccount?: number
    reference?: number
    purpose?: number
    id?: number
  }
}

interface StatementImportBase {
  id: string
  bankAccountId: string
  fileId: string
  statementNumber: string | null
  openingBalance: string | null
  closingBalance: string | null
  status: StatementImportStatus
  createdAt: string
  committedAt: string | null
  bankAccount: { id: string; bankName: string; accountNumber: string }
  file: { id: string; fileName: string; sizeBytes: number }
  creator: Author
}

export interface StatementImportListItem extends StatementImportBase {
  _count: { lines: number }
}

export interface StatementLine {
  id: string
  lineNo: number
  externalId: string
  direction: FinanceDirection
  amount: string
  valueDate: string
  counterpartyName: string | null
  counterpartyAccount: string | null
  reference: string | null
  purpose: string
  categoryId: string | null
  unitId: string | null
  invoiceId: string | null
  skip: boolean
  /** Already booked on this account (earlier statement); never booked again. */
  isDuplicate: boolean
  transactionId: string | null
  category: Pick<FinanceCategory, 'id' | 'name' | 'direction' | 'fund' | 'isOwnerPayment'> | null
  unit: { id: string; unitNumber: string } | null
  invoice: { id: string; number: string; supplier: { id: string; name: string } } | null
  /** Why the line cannot be booked as it stands (drafts only). */
  issues: string[]
}

export interface StatementImport extends StatementImportBase {
  summary: {
    lineCount: number
    toBookCount: number
    duplicateCount: number
    skippedCount: number
    income: string
    expense: string
  }
  warnings: string[]
  lines: StatementLine[]
}

export interface UploadStatementDto {
  bankAccountId: string
  /** Omit to reuse the account's saved mapping. */
  mapping?: CsvMapping
  statementNumber?: string
  openingBalance?: string
  closingBalance?: string
}

export interface UpdateStatementLineDto {
  categoryId?: string | null
  unitId?: string | null
  invoiceId?: string | null
  skip?: boolean
}

// ─── Budget and reports ──────────────────────────────────────────

export interface Budget {
  id: string
  entityId: string
  year: number
  adoptedAt: string | null
  decisionDocumentId: string | null
  createdAt: string
  updatedAt: string
  decisionDocument: { id: string; title: string } | null
  lines: {
    id: string
    categoryId: string
    plannedAmount: string
    note: string | null
    category: Pick<FinanceCategory, 'id' | 'name' | 'direction' | 'fund'>
  }[]
}

export interface UpsertBudgetDto {
  adoptedAt?: string | null
  decisionDocumentId?: string | null
  lines: { categoryId: string; plannedAmount: string; note?: string }[]
}

export interface FinanceReport {
  id: string
  entityId: string
  from: string
  to: string
  documentId: string
  publishedBy: string
  publishedAt: string
  document: { id: string; title: string; fileId: string }
  publisher: Author
}
