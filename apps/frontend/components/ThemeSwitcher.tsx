'use client'

import { useTheme } from 'next-themes'
import { Monitor, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

export const themeOptions = [
  { value: 'system', label: 'Sistem', icon: Monitor },
  { value: 'light', label: 'Svetla', icon: Sun },
  { value: 'dark', label: 'Tamna', icon: Moon },
]

/** Segmented control for surfaces that aren't menus (mobile account sheet). */
export function ThemeSegmented() {
  const { theme, setTheme } = useTheme()

  return (
    <div role="radiogroup" aria-label="Tema" className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-muted">
      {themeOptions.map(({ value, label, icon: Icon }) => {
        const active = theme === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(value)}
            className={cn(
              'flex items-center justify-center gap-1.5 h-9 rounded-md text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="w-3.5 h-3.5" aria-hidden="true" />
            {label}
          </button>
        )
      })}
    </div>
  )
}
