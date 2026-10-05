// Client mirrors of the backend's finance.util checks, so bad numbers are caught before the request.

/** "160-12345-95" or 18 digits → 18 digits, or null when the shape is wrong. */
export function normaliseAccountNumber(input: string): string | null {
  const value = input.replace(/\s/g, '')
  const parts = value.split('-')
  if (parts.length === 3) {
    const [bank, account, control] = parts
    if (!/^\d{3}$/.test(bank) || !/^\d{1,13}$/.test(account) || !/^\d{2}$/.test(control)) return null
    return bank + account.padStart(13, '0') + control
  }
  return /^\d{18}$/.test(value) ? value : null
}

/** A Serbian current account: 3-13-2 digits with a mod-97 control number. */
export function isValidAccountNumber(input: string) {
  const normalised = normaliseAccountNumber(input)
  if (!normalised) return false
  const control = 98 - Number((BigInt(normalised.slice(0, 16)) * BigInt(100)) % BigInt(97))
  return control === Number(normalised.slice(16))
}

/** PIB: 9 digits, the last an ISO 7064 MOD 11,10 check digit. */
export function isValidPib(pib: string) {
  if (!/^\d{9}$/.test(pib)) return false
  let a = 10
  for (let i = 0; i < 8; i++) {
    a = (a + Number(pib[i])) % 10
    if (a === 0) a = 10
    a = (a * 2) % 11
  }
  return (11 - a) % 10 === Number(pib[8])
}

/** Matični broj: 8 digits. */
export function isValidMaticniBroj(mb: string) {
  return /^\d{8}$/.test(mb)
}
