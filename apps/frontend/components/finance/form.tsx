'use client'

import { isAxiosError } from 'axios'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/** The server's message for a failed request (Nest sends a string or a list of strings). */
export function errorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const message = (err.response?.data as { message?: string | string[] } | undefined)?.message
    if (Array.isArray(message)) return message.join(' · ')
    if (message) return message
    if (err.response?.status === 413) return 'Fajl je veći od 10 MB.'
  }
  return 'Greška na serveru. Pokušajte ponovo.'
}

export function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

// Native select styled like <Input>; the UI kit has no select yet.
export function NativeSelect({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 md:text-sm dark:bg-input/30',
        className
      )}
      {...props}
    />
  )
}

export function FormError({ error }: { error: unknown }) {
  if (!error) return null
  return (
    <p role="alert" className="text-sm text-destructive">
      {errorMessage(error)}
    </p>
  )
}

/** Segmented control, same look as the theme switcher. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex gap-1 p-1 rounded-lg bg-muted max-w-full overflow-x-auto"
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'h-8 px-3 rounded-md text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
