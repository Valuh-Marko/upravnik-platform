/**
 * NBS IPS QR payload for a payment order ("K:PR"), the code Serbian m-banking apps scan.
 * Tags in the spec's order; values may not contain "|", and N and S have length caps.
 * `amount` is a decimal string ("12500.00"); the spec writes it with a decimal comma.
 */
export function ipsPayload(p: {
  account: string
  payee: string
  amount: string
  purpose: string
  model: string
  reference: string | null
}): string {
  const clean = (s: string, max: number) => s.replace(/[|\r\n]+/g, ' ').trim().slice(0, max)
  const tags = [
    'K:PR',
    'V:01',
    'C:1',
    `R:${p.account.replace(/\D/g, '')}`,
    `N:${clean(p.payee, 70)}`,
    `I:RSD${p.amount.replace('.', ',')}`,
    // 289: "Transakcije po nalogu građana".
    'SF:289',
    `S:${clean(p.purpose, 35)}`,
  ]
  if (p.reference) tags.push(`RO:${p.model}${p.reference.replace(/\s/g, '')}`)
  return tags.join('|')
}
