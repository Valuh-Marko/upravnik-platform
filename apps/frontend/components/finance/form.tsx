'use client'

import { cloneElement, isValidElement, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { isAxiosError } from 'axios'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDocuments } from '@/hooks/useDocuments'
import { cn } from '@/lib/utils'

/** Finance cards: the 20px card radius from DESIGN.md. */
export const financeCard = 'rounded-xl border border-border bg-card p-4 md:p-5'
/** Section eyebrow, the DESIGN.md Label style. */
export const eyebrow = 'text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground'

/**
 * Serbian text for a failed request. Only 409/422 messages are shown as sent:
 * finance services write those in Serbian, while 400s come from the validation pipe.
 */
export function errorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const status = err.response?.status
    const message = (err.response?.data as { message?: string | string[] } | undefined)?.message
    if (status === 400) {
      if (process.env.NODE_ENV === 'development') console.error(message)
      return 'Proverite unete podatke.'
    }
    if (status === 403) return 'Nemate dozvolu za ovu radnju.'
    if (status === 404) return 'Podatak nije pronađen.'
    if (status === 413) return 'Fajl je veći od 10 MB.'
    if ((status === 409 || status === 422) && typeof message === 'string') return message
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
  // The hint is linked to the control so screen readers read it with the label.
  const hintId = hint ? `${id}-hint` : undefined
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {hintId && isValidElement<{ 'aria-describedby'?: string }>(children)
        ? cloneElement(children, { 'aria-describedby': hintId })
        : children}
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
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

/** Says why account-bound actions are disabled, and where to add the account. */
export function NoAccountHint() {
  const pathname = usePathname()
  return (
    <p className="text-xs text-muted-foreground">
      Prvo dodajte tekući račun zgrade na kartici{' '}
      <Link href={`${pathname}?tab=overview`} className="font-medium text-foreground underline underline-offset-2">
        Pregled
      </Link>
      .
    </p>
  )
}

/** Assembly-decision picker: DECISION documents only, plus the linked one even if it was recategorised. */
export function DecisionSelect({
  id,
  buildingId,
  value,
  onChange,
}: {
  id: string
  buildingId: string
  value: string
  onChange: (id: string) => void
}) {
  const { data: documents } = useDocuments(buildingId)
  const decisions = (documents ?? []).filter((d) => d.category === 'DECISION' || d.id === value)
  return (
    <NativeSelect id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{documents && decisions.length === 0 ? 'Nema odluka. Otpremite odluku u Dokumentima.' : '—'}</option>
      {decisions.map((d) => (
        <option key={d.id} value={d.id}>
          {d.title}
        </option>
      ))}
    </NativeSelect>
  )
}

/**
 * onOpenChange for a dialog holding a form: while it has unsaved input, a click outside or Escape
 * doesn't close it. The close button and "Otkaži" still do.
 */
export function guardDirty(setOpen: (open: boolean) => void, dirty: boolean) {
  return (open: boolean, details: { reason: string }) => {
    if (!open && dirty && (details.reason === 'outside-press' || details.reason === 'escape-key')) return
    setOpen(open)
  }
}

export function FormError({ error }: { error: unknown }) {
  if (!error) return null
  return (
    <p role="alert" className="text-sm text-destructive">
      {errorMessage(error)}
    </p>
  )
}

/** A query that failed to load: Serbian message and a retry. `inline` fits it into one line. */
export function QueryError({
  message = 'Podaci trenutno nisu dostupni.',
  onRetry,
  inline,
}: {
  message?: string
  onRetry: () => unknown
  inline?: boolean
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-2 text-sm',
        !inline && 'flex-col justify-center py-8 text-center'
      )}
    >
      <p className="text-destructive">{message}</p>
      <Button type="button" variant="outline" size="sm" onClick={() => onRetry()}>
        Pokušaj ponovo
      </Button>
    </div>
  )
}

/** Search box that reports its trimmed text 300ms after the user stops typing. */
export function SearchInput({ label, onSearch }: { label: string; onSearch: (q: string) => void }) {
  const [text, setText] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => onSearch(text.trim()), 300)
    return () => clearTimeout(timer)
  }, [text, onSearch])
  return (
    <Input
      type="search"
      aria-label={label}
      placeholder={`${label}…`}
      value={text}
      onChange={(e) => setText(e.target.value)}
      className="w-full sm:w-56"
    />
  )
}

/** Calendar years from the start of the books to this one, newest first. `allLabel` adds a "" option. */
export function YearSelect({
  booksStartDate,
  value,
  onChange,
  allLabel,
}: {
  booksStartDate: string
  value: string
  onChange: (year: string) => void
  allLabel?: string
}) {
  const current = new Date().getFullYear()
  const first = Math.min(Number(booksStartDate.slice(0, 4)), current)
  const years = Array.from({ length: current - first + 1 }, (_, i) => String(current - i))
  return (
    <NativeSelect
      aria-label="Godina"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-auto"
    >
      {allLabel && <option value="">{allLabel}</option>}
      {years.map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </NativeSelect>
  )
}

/** "Učitaj još" for a paged list; hidden once the last page is in. */
export function LoadMore({
  hasMore,
  loading,
  onLoad,
}: {
  hasMore: boolean
  loading: boolean
  onLoad: () => unknown
}) {
  if (!hasMore) return null
  return (
    <div className="flex justify-center">
      <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => onLoad()}>
        {loading ? 'Učitavam…' : 'Učitaj još'}
      </Button>
    </div>
  )
}

/** Where an arrow, Home or End key moves focus in a row of `count` items, or null for other keys. */
export function rovingIndex(key: string, i: number, count: number): number | null {
  const last = count - 1
  if (key === 'ArrowRight') return i === last ? 0 : i + 1
  if (key === 'ArrowLeft') return i === 0 ? last : i - 1
  if (key === 'Home') return 0
  if (key === 'End') return last
  return null
}

/** Segmented control, same look as the theme switcher. One Tab stop; arrows move and select. */
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
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const trackRef = useRef<HTMLDivElement>(null)
  // A strip that scrolls sideways fades at the right edge until it is scrolled to the end.
  const [clipped, setClipped] = useState(false)
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const measure = () => setClipped(track.scrollLeft + track.clientWidth < track.scrollWidth - 1)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(track)
    track.addEventListener('scroll', measure)
    return () => {
      observer.disconnect()
      track.removeEventListener('scroll', measure)
    }
  }, [])

  function onKeyDown(e: React.KeyboardEvent, i: number) {
    const next = rovingIndex(e.key, i, options.length)
    if (next === null) return
    e.preventDefault()
    onChange(options[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div
      ref={trackRef}
      role="radiogroup"
      aria-label={label}
      className={cn(
        'inline-flex gap-1 p-1 rounded-lg bg-muted max-w-full overflow-x-auto',
        clipped && '[mask-image:linear-gradient(to_right,black_calc(100%-2rem),transparent)]'
      )}
    >
      {options.map((o, i) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'h-8 px-3 rounded-md text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
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

/**
 * Copies `value`. Success swaps the icon and is announced; a refused clipboard (for example an
 * insecure context) says so in text.
 */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  useEffect(() => {
    if (state === 'idle') return
    const timer = setTimeout(() => setState('idle'), 2000)
    return () => clearTimeout(timer)
  }, [state])
  return (
    <>
      <button
        type="button"
        aria-label={label}
        onClick={() => {
          Promise.resolve()
            .then(() => navigator.clipboard.writeText(value))
            .then(
              () => setState('copied'),
              () => setState('failed')
            )
        }}
        className="inline-flex size-10 md:size-8 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {state === 'copied' ? (
          <Check className="size-3.5" aria-hidden="true" />
        ) : (
          <Copy className="size-3.5" aria-hidden="true" />
        )}
      </button>
      <span role="status" className={cn('text-xs', state === 'failed' ? 'text-destructive' : 'sr-only')}>
        {state === 'copied' ? 'Kopirano' : state === 'failed' ? 'Kopiranje nije uspelo' : ''}
      </span>
    </>
  )
}

const MONTHS = [
  'januar',
  'februar',
  'mart',
  'april',
  'maj',
  'jun',
  'jul',
  'avgust',
  'septembar',
  'oktobar',
  'novembar',
  'decembar',
]

/**
 * A "YYYY-MM" value as a month select and a year select; `type="month"` is poor in Firefox and
 * desktop Safari. `optional` adds an empty choice that clears the value to "".
 */
export function MonthInput({
  id,
  value,
  onChange,
  optional,
  invalid,
  'aria-describedby': describedBy,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  optional?: boolean
  invalid?: boolean
  'aria-describedby'?: string
}) {
  const current = new Date().getFullYear()
  const [year = '', month = ''] = value ? value.split('-') : []
  const first = Math.min(current - 5, Number(year) || current)
  const last = Math.max(current + 5, Number(year) || current)
  const years = Array.from({ length: last - first + 1 }, (_, i) => String(last - i))
  const set = (y: string, m: string) => onChange(y && m ? `${y}-${m}` : '')
  return (
    <div className="flex gap-2">
      <NativeSelect
        id={id}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        value={month}
        onChange={(e) => set(year || String(current), e.target.value)}
      >
        {optional && <option value="">—</option>}
        {MONTHS.map((name, i) => (
          <option key={name} value={String(i + 1).padStart(2, '0')}>
            {name}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect
        aria-label="Godina"
        aria-invalid={invalid}
        aria-describedby={describedBy}
        value={year}
        onChange={(e) => set(e.target.value, month || '01')}
        className="w-24 flex-shrink-0"
      >
        {optional && <option value="">—</option>}
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </NativeSelect>
    </div>
  )
}
