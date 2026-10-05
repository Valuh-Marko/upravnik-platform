import type { Author } from '@/lib/types'

export function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const time = date.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })

  if (diffDays === 0) return `danas, ${time}`
  if (diffDays === 1) return `juče, ${time}`
  return date.toLocaleDateString('sr-RS', { day: 'numeric', month: 'short' })
}

export function getAuthorName(author?: Author | null): string {
  if (!author) return 'Nepoznat'
  if (author.firstName && author.lastName) return `${author.firstName} ${author.lastName[0]}.`
  return author.username
}

/** Serbian plural form: one (1, 21…), few (2–4, 22–24…), many (0, 5–20, 25…). */
export function plural(n: number, one: string, few: string, many: string): string {
  const d = n % 10
  const dd = n % 100
  if (d === 1 && dd !== 11) return one
  if (d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return few
  return many
}

const rsd = new Intl.NumberFormat('sr-Latn-RS', {
  style: 'currency',
  currency: 'RSD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** "12500.5" → "12.500,50 RSD". Display only; amounts stay strings everywhere else. */
export function formatRSD(value: string): string {
  return rsd.format(Number(value))
}

/** "160000000001234595" → "160-0000000012345-95" (bank 3, account 13, control 2). */
export function formatAccountNumber(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 18) return value
  return `${digits.slice(0, 3)}-${digits.slice(3, 16)}-${digits.slice(16)}`
}

/** A date-only field ("2026-10-03") → "3. 10. 2026." Timestamps go through formatDateTime. */
export function formatDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('sr-Latn-RS')
}

/** A timestamp ("2026-03-14T23:30:00Z") → its day in Belgrade, "15. 3. 2026." */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('sr-Latn-RS', { timeZone: 'Europe/Belgrade' })
}

/** Today as "YYYY-MM-DD" in local time. */
export function todayISO(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * Accepts "12.500,50", "12500,50", "12500.50" or "12.500" and returns "12500.50", or null if invalid.
 * Without a comma, dots in groups of three are thousands separators; "12.5" stays 12.50.
 */
export function parseMoneyInput(input: string): string | null {
  let s = input.replace(/\s/g, '')
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '')
  if (!/^-?\d{1,12}(\.\d{1,2})?$/.test(s)) return null
  return s.includes('.') ? s.padEnd(s.indexOf('.') + 3, '0') : `${s}.00`
}

/** "1234.56" → 123456 paras. Exact, for sums and comparisons of decimal amounts. */
export function toParas(amount: string): bigint {
  const [whole, fraction = ''] = amount.replace('-', '').split('.')
  const paras = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, '0').slice(0, 2))
  return amount.startsWith('-') ? -paras : paras
}

/** 123456 paras → "1234.56". */
export function fromParas(paras: bigint): string {
  const abs = paras < 0 ? -paras : paras
  const cents = String(abs % BigInt(100)).padStart(2, '0')
  return `${paras < 0 ? '-' : ''}${abs / BigInt(100)}.${cents}`
}

/** "2026-10" → "oktobar 2026." */
export function formatPeriod(period: string): string {
  return new Date(`${period}-01T00:00:00`).toLocaleDateString('sr-Latn-RS', { month: 'long', year: 'numeric' })
}
