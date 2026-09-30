'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useBuildings } from '@/hooks/useBuildings'
import { useMyTickets } from '@/hooks/useTickets'
import { CreateTicketDialog } from '@/components/CreateTicketDialog'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Home,
  LayoutDashboard,
  Building2,
  Megaphone,
  MessagesSquare,
  FileText,
  Ticket,
  LogOut,
  User,
  MessageSquare,
  PlusCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTimestamp } from '@/lib/format'
import type { TicketStatus, TicketCategory } from '@/lib/types'

const statusClass: Record<TicketStatus, string> = {
  OPEN: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-stone-100 text-stone-500',
}
const statusLabel: Record<TicketStatus, string> = {
  OPEN: 'Otvoreno',
  CLOSED: 'Zatvoreno',
}
const categoryLabel: Record<TicketCategory, string> = {
  GENERAL: 'Opšte',
  MAINTENANCE: 'Održavanje',
  COMPLAINT: 'Žalba',
  PAYMENT: 'Plaćanje',
  REQUEST: 'Zahtjev',
}

function getInitials(username: string, firstName?: string | null, lastName?: string | null) {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase()
  return username.slice(0, 2).toUpperCase()
}

function getDisplayName(username: string, firstName?: string | null, lastName?: string | null) {
  if (firstName && lastName) return `${firstName} ${lastName[0]}.`
  return username
}

const linkClass =
  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-stone-100 hover:text-stone-900 transition-colors w-full text-left'

function MobileUserSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const { user, logout } = useAuth()
  const { data: buildings } = useBuildings()
  const { data: tickets } = useMyTickets()
  const [ticketOpen, setTicketOpen] = useState(false)

  const isResident = user?.accountType === 'UNIT_ACCOUNT'
  const canManageAnnouncements = user?.role === 'UPRAVNIK' || user?.role === 'BOARD_MEMBER'
  const threadHref = isResident ? '/forum' : '/threads'
  const buildingId = buildings?.[0]?.id ?? ''

  const initials = user ? getInitials(user.username, user.firstName, user.lastName) : '??'
  const displayName = user ? getDisplayName(user.username, user.firstName, user.lastName) : ''
  const subtitle = isResident ? `Stan ${user?.username}` : (user?.role ?? 'Upravnik')

  const recentTickets = [...(tickets ?? [])]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4)

  function close() {
    onOpenChange(false)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" showCloseButton className="max-h-[82vh] overflow-y-auto rounded-t-2xl px-0 gap-0 pb-8">
          {/* User header */}
          <div className="flex items-center gap-3 px-4 pt-2 pb-4 border-b border-border">
            <Avatar className="w-10 h-10 flex-shrink-0">
              <AvatarFallback className="bg-pine-50 text-pine-700 text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-foreground leading-tight">{displayName}</p>
              <p className="text-xs text-muted-foreground leading-tight">{subtitle}</p>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="px-2 py-3 space-y-0.5">
            {user?.role === 'SUPER_ADMIN' && (
              <Link href="/create" onClick={close} className={linkClass}>
                <PlusCircle className="w-4 h-4" />
                Kreiraj strukturu
              </Link>
            )}

            <Link href={threadHref} onClick={close} className={linkClass}>
              <MessagesSquare className="w-4 h-4" />
              Moje teme
            </Link>

            {!isResident && (
              <Link href="/tickets" onClick={close} className={linkClass}>
                <Ticket className="w-4 h-4" />
                Zahtjevi
              </Link>
            )}

            {canManageAnnouncements && (
              <Link href="/announcements" onClick={close} className={linkClass}>
                <Megaphone className="w-4 h-4" />
                Moje objave
              </Link>
            )}

            {isResident && buildingId && (
              <button
                className={linkClass}
                onClick={() => {
                  close()
                  setTicketOpen(true)
                }}
              >
                <PlusCircle className="w-4 h-4" />
                Novi zahtjev
              </button>
            )}
          </nav>

          {/* Resident tickets mini-list */}
          {isResident && (
            <div className="border-t border-border px-4 pt-3 pb-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-[0.06em]">
                  Moji zahtjevi
                </span>
                <Link
                  href="/tickets"
                  onClick={close}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Vidi sve
                </Link>
              </div>

              {recentTickets.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">Nemate zahtjeva.</p>
              ) : (
                <div className="space-y-1">
                  {recentTickets.map((t) => (
                    <Link
                      key={t.id}
                      href={`/tickets/${t.id}`}
                      onClick={close}
                      className="block rounded-md px-2 py-2 hover:bg-stone-100 transition-colors"
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusClass[t.status]}`}>
                          {statusLabel[t.status]}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {categoryLabel[t.category]}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-foreground truncate flex items-center gap-1">
                        {t.isUnread && <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
                        {t.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {formatTimestamp(t.createdAt)}
                        </span>
                        {t._count !== undefined && (
                          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground ml-auto">
                            <MessageSquare className="w-3 h-3" />
                            {t._count.replies}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Logout */}
          <div className="px-2 pt-2 border-t border-border">
            <button
              onClick={logout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-red-50 transition-colors w-full text-left"
            >
              <LogOut className="w-4 h-4" />
              Odjava
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {isResident && buildingId && (
        <CreateTicketDialog
          buildingId={buildingId}
          open={ticketOpen}
          onOpenChange={setTicketOpen}
        />
      )}
    </>
  )
}

const residentNav = [
  { href: '/home', label: 'Početna', icon: Home },
  { href: '/board', label: 'Tabla', icon: Megaphone },
  { href: '/forum', label: 'Forum', icon: MessagesSquare },
  { href: '/tickets', label: 'Zahtjevi', icon: Ticket },
  { href: '/documents', label: 'Dokumenta', icon: FileText },
]

const upravnikNav = [
  { href: '/dashboard', label: 'Početna', icon: LayoutDashboard },
  { href: '/buildings', label: 'Zgrade', icon: Building2 },
  { href: '/announcements', label: 'Oglasi', icon: Megaphone },
  { href: '/files', label: 'Dokumenta', icon: FileText },
]

export function AppBottomNav() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const pathname = usePathname()
  const { user } = useAuth()
  const isResident = user?.accountType === 'UNIT_ACCOUNT'
  const { data: myTickets } = useMyTickets()
  const unreadCount = isResident ? (myTickets ?? []).filter((t) => t.isUnread).length : 0

  const navItems = isResident ? residentNav : upravnikNav

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
        <div className="flex items-center justify-around px-1 py-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            const badge = href === '/tickets' && unreadCount > 0 ? unreadCount : 0
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex flex-col items-center gap-1 flex-1 py-2 rounded-lg transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center leading-none">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium">{label}</span>
              </Link>
            )
          })}

          <button
            onClick={() => setSheetOpen(true)}
            className="flex flex-col items-center gap-1 flex-1 py-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          >
            <User className="w-5 h-5" />
            <span className="text-xs font-medium">Nalog</span>
          </button>
        </div>
      </nav>

      <MobileUserSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  )
}
