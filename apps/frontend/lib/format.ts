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
