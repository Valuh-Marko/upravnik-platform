import {
  AlertTriangle,
  Ban,
  CircleCheck,
  CircleDashed,
  Clock,
  Contrast,
  HelpCircle,
  Inbox,
  Plus,
  RefreshCw,
  Undo2,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type {
  ChargeLineStatus,
  DocumentCategory,
  FinanceFund,
  InvoiceStatus,
  StatementImportStatus,
  ThreadCategory,
  TicketCategory,
  TicketStatus,
  UnitType,
} from '@/lib/types'

export type Chip = { label: string; className: string; icon?: LucideIcon }

// Category hues are their own palette (see DESIGN.md, Category Hue Rule):
// never the content-type colours, and always paired with an icon.
const GENERAL: Chip = { label: 'Opšte', className: 'border-border text-foreground' }
const MAINTENANCE: Chip = {
  label: 'Održavanje',
  className: 'bg-cat-maint-wash text-cat-maint-text border-cat-maint-edge',
  icon: Wrench,
}
const COMPLAINT: Chip = {
  label: 'Žalba',
  className: 'bg-cat-complaint-wash text-cat-complaint-text border-cat-complaint-edge',
  icon: AlertTriangle,
}

export const threadCategory: Record<ThreadCategory, Chip> = {
  GENERAL,
  MAINTENANCE,
  COMPLAINT,
  QUESTION: {
    label: 'Pitanje',
    className: 'bg-cat-ask-wash text-cat-ask-text border-cat-ask-edge',
    icon: HelpCircle,
  },
}

export const ticketCategory: Record<TicketCategory, Chip> = {
  GENERAL,
  MAINTENANCE,
  COMPLAINT,
  PAYMENT: {
    label: 'Plaćanje',
    className: 'bg-cat-payment-wash text-cat-payment-text border-cat-payment-edge',
    icon: Wallet,
  },
  REQUEST: {
    label: 'Zahtev',
    className: 'bg-cat-ask-wash text-cat-ask-text border-cat-ask-edge',
    icon: Inbox,
  },
}

export const ticketStatus: Record<TicketStatus, Chip> = {
  OPEN: { label: 'Otvoreno', className: 'bg-green-100 text-green-700 border-green-500/30' },
  CLOSED: { label: 'Zatvoreno', className: 'bg-stone-100 text-stone-500 border-stone-200' },
}

export const unitTypeLabel: Record<UnitType, string> = {
  APARTMENT: 'Stan',
  OFFICE: 'Kancelarija',
  COMMERCIAL: 'Lokal',
}

export const documentCategoryLabel: Record<DocumentCategory, string> = {
  CONTRACT: 'Ugovor',
  REPORT: 'Izveštaj',
  DECISION: 'Odluka',
  OTHER: 'Ostalo',
}

export const financeFundLabel: Record<FinanceFund, string> = {
  TEKUCE_ODRZAVANJE: 'Tekuće održavanje',
  INVESTICIONO_ODRZAVANJE: 'Investiciono održavanje',
  UPRAVLJANJE: 'Upravljanje',
  HITNE_INTERVENCIJE: 'Hitne intervencije',
  OSTALO: 'Ostalo',
}

// Finance status chips use the status tokens and always carry an icon, so status never rests on colour alone.
const UNSETTLED = 'bg-[var(--warning-subtle)] text-[var(--warning-text)] border-[var(--warning)]/30'
const PARTIAL = 'bg-[var(--info-subtle)] text-[var(--info-text)] border-[var(--info)]/30'
const SETTLED = 'bg-[var(--success-subtle)] text-[var(--success-text)] border-[var(--success)]/30'
const CLOSED = 'bg-muted text-muted-foreground border-border'

export const invoiceStatus: Record<InvoiceStatus, Chip> = {
  UNPAID: { label: 'Neplaćena', className: UNSETTLED, icon: Clock },
  PARTIALLY_PAID: { label: 'Delimično plaćena', className: PARTIAL, icon: Contrast },
  PAID: { label: 'Plaćena', className: SETTLED, icon: CircleCheck },
  CANCELLED: { label: 'Stornirana', className: CLOSED, icon: Ban },
}

export const statementImportStatus: Record<StatementImportStatus, Chip> = {
  DRAFT: { label: 'Na pregledu', className: UNSETTLED, icon: Clock },
  COMMITTED: { label: 'Proknjižen', className: SETTLED, icon: CircleCheck },
  DISCARDED: { label: 'Odbačen', className: CLOSED, icon: Ban },
}

/** A line in the monthly charges preview, compared with what was already issued. */
export const chargeLineStatus: Record<ChargeLineStatus, Chip> = {
  NEW: { label: 'novo', className: PARTIAL, icon: Plus },
  ISSUED: { label: 'izdato', className: CLOSED, icon: CircleCheck },
  CHANGED: { label: 'izmenjeno', className: UNSETTLED, icon: RefreshCw },
  CANCELLED: { label: 'stornirano', className: CLOSED, icon: Ban },
}

export const transactionStatus: Record<'REVERSED' | 'REVERSAL', Chip> = {
  REVERSED: { label: 'Stornirana', className: CLOSED, icon: Ban },
  REVERSAL: { label: 'Storno', className: CLOSED, icon: Undo2 },
}

/** Overdue debt is a warning everywhere: it can still be paid. Danger stays for errors and destructive actions. */
export const overdueText = 'text-[var(--warning-text)]'

/** Lines the upravnik still has to complete before an import can be posted. */
export const needsReview: Chip = { label: 'Za dopunu', className: UNSETTLED, icon: AlertTriangle }

export const unassignedPayment: Chip = { label: 'Bez stana', className: UNSETTLED, icon: CircleDashed }
