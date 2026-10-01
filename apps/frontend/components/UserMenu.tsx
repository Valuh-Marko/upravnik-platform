'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useBuildings } from '@/hooks/useBuildings'
import { CreateTicketDialog } from '@/components/CreateTicketDialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { themeOptions } from '@/components/ThemeSwitcher'
import { useTheme } from 'next-themes'
import { LogOut, ChevronUp, PlusCircle, Ticket, SunMoon } from 'lucide-react'

function getInitials(username: string, firstName?: string | null, lastName?: string | null) {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase()
  return username.slice(0, 2).toUpperCase()
}

function getDisplayName(username: string, firstName?: string | null, lastName?: string | null) {
  if (firstName && lastName) return `${firstName} ${lastName[0]}.`
  return username
}

export function UserMenu() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const { data: buildings } = useBuildings()
  const [ticketOpen, setTicketOpen] = useState(false)
  const { theme, setTheme } = useTheme()

  const initials = user ? getInitials(user.username, user.firstName, user.lastName) : '??'
  const displayName = user ? getDisplayName(user.username, user.firstName, user.lastName) : ''
  const subtitle =
    user?.accountType === 'UNIT_ACCOUNT'
      ? `Stan ${user.username}`
      : (user?.role ?? 'Upravnik')

  const isResident = user?.accountType === 'UNIT_ACCOUNT'
  const buildingId = buildings?.[0]?.id ?? ''

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-3 w-full p-2 rounded-[var(--radius-md)] hover:bg-[var(--surface-hover)] aria-expanded:bg-[var(--surface-hover)] transition-colors duration-150 text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar className="w-9 h-9 flex-shrink-0">
            <AvatarFallback className="bg-pine-50 text-pine-700 text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-foreground truncate leading-tight">
              {displayName}
            </p>
            <p className="text-[11px] text-stone-500 leading-tight">{subtitle}</p>
          </div>
          <ChevronUp className="w-4 h-4 text-stone-400 flex-shrink-0" />
        </DropdownMenuTrigger>

        <DropdownMenuContent
          side="top"
          align="start"
          sideOffset={8}
          className="rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)] shadow-md before:hidden p-0"
        >
          {user?.role === 'SUPER_ADMIN' && (
            <>
              <div className="p-1">
                <DropdownMenuItem onClick={() => router.push('/create')}>
                  <PlusCircle />
                  Kreiraj strukturu
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator />
            </>
          )}

          {isResident && buildingId && (
            <>
              <div className="p-1">
                <DropdownMenuItem onClick={() => setTicketOpen(true)}>
                  <Ticket />
                  Novi zahtev
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuGroup className="flex items-center justify-between gap-2 py-1.5 pr-1.5 pl-3">
            <DropdownMenuLabel className="flex items-center gap-2 p-0 text-sm font-normal text-popover-foreground">
              <SunMoon className="size-4" aria-hidden="true" />
              Tema
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={theme}
              onValueChange={setTheme}
              className="flex gap-0.5 rounded-lg bg-muted p-0.5"
            >
              {themeOptions.map(({ value, label, icon: Icon }) => (
                <DropdownMenuRadioItem
                  key={value}
                  value={value}
                  aria-label={label}
                  title={label}
                  className="size-7 justify-center rounded-md p-0 text-muted-foreground data-checked:bg-card data-checked:text-foreground data-checked:shadow-xs *:data-[slot=dropdown-menu-radio-item-indicator]:hidden"
                >
                  <Icon className="size-3.5" />
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />

          <div className="p-1">
            <DropdownMenuItem variant="destructive" onClick={logout}>
              <LogOut />
              Odjava
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

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
