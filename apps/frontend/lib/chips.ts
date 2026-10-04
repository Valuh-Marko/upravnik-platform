import { AlertTriangle, HelpCircle, Inbox, Wallet, Wrench, type LucideIcon } from 'lucide-react'
import type {
  DocumentCategory,
  FinanceFund,
  InvoiceStatus,
  ThreadCategory,
  TicketCategory,
  TicketStatus,
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

// Status hues (warning / success / muted), like ticketStatus.
const UNSETTLED = 'bg-[var(--warning-subtle)] text-[var(--warning-text)] border-[var(--warning)]/30'

export const invoiceStatus: Record<InvoiceStatus, Chip> = {
  UNPAID: { label: 'Neplaćena', className: UNSETTLED },
  PARTIALLY_PAID: { label: 'Delimično plaćena', className: UNSETTLED },
  PAID: { label: 'Plaćena', className: 'bg-green-100 text-green-700 border-green-500/30' },
  CANCELLED: { label: 'Stornirana', className: 'bg-stone-100 text-stone-500 border-stone-200' },
}
