'use client'

import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type ControlProps = {
  id: string
  'aria-invalid'?: true
  'aria-describedby'?: string
}

/** Label, control and inline error, wired together by id. */
export function Field({
  label,
  error,
  action,
  className,
  children,
}: {
  label: string
  error?: string
  action?: React.ReactNode
  className?: string
  children: (control: ControlProps) => React.ReactNode
}) {
  const id = useId()
  const errorId = `${id}-error`
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex min-h-4 items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {action}
      </div>
      {children({
        id,
        ...(error ? { 'aria-invalid': true, 'aria-describedby': errorId } : {}),
      })}
      {error && (
        <p id={errorId} className="text-xs text-[var(--danger-text)]">
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * Integer input that can be cleared while typing. Values inside [min, max]
 * apply as you type; anything else is clamped when the field loses focus.
 */
export function NumberInput({
  value,
  onChange,
  min,
  max,
  ...props
}: Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange' | 'min' | 'max'> & {
  value: number
  onChange: (n: number) => void
  min: number
  max: number
}) {
  const [text, setText] = useState(String(value))
  const [synced, setSynced] = useState(value)
  if (value !== synced) {
    setSynced(value)
    setText(String(value))
  }

  return (
    <Input
      {...props}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      value={text}
      className={cn('font-mono tabular-nums', props.className)}
      onChange={(e) => {
        setText(e.target.value)
        const n = parseInt(e.target.value, 10)
        if (n >= min && n <= max) onChange(n)
      }}
      onBlur={() => {
        const n = parseInt(text, 10)
        const clamped = Number.isNaN(n) ? min : Math.min(max, Math.max(min, n))
        setText(String(clamped))
        if (clamped !== value) onChange(clamped)
      }}
    />
  )
}

/** Native select dressed as the system input. */
export function Select({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={cn(
          'h-9 w-full appearance-none rounded-md border border-input bg-transparent pl-2.5 pr-8 text-base shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 [&>option]:bg-popover [&>option]:text-popover-foreground',
          className,
        )}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  )
}
