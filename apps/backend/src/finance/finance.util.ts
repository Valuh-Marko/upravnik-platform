import { UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '../prisma';

// Serbian bank account numbers: 3-digit bank code, 13-digit account, 2 control
// digits (ISO 7064 MOD 97-10). Banks print a short form with the middle part
// unpadded, e.g. "840-742221843-57" = "840000074222184357".

// Returns the 18-digit form, or null when the input is not shaped like an account number.
export function normaliseAccountNumber(input: string): string | null {
  const value = input.replace(/\s/g, '');
  const parts = value.split('-');
  if (parts.length === 3) {
    const [bank, account, control] = parts;
    if (
      !/^\d{3}$/.test(bank) ||
      !/^\d{1,13}$/.test(account) ||
      !/^\d{2}$/.test(control)
    ) {
      return null;
    }
    return bank + account.padStart(13, '0') + control;
  }
  return /^\d{18}$/.test(value) ? value : null;
}

export function isValidAccountNumber(normalised: string) {
  const control = 98 - Number((BigInt(normalised.slice(0, 16)) * 100n) % 97n);
  return control === Number(normalised.slice(16));
}

// PIB: 9 digits, the last is an ISO 7064 MOD 11,10 check digit.
export function isValidPib(pib: string) {
  if (!/^\d{9}$/.test(pib)) return false;
  let a = 10;
  for (let i = 0; i < 8; i++) {
    a = (a + Number(pib[i])) % 10;
    if (a === 0) a = 10;
    a = (a * 2) % 11;
  }
  return (11 - a) % 10 === Number(pib[8]);
}

export function isValidMaticniBroj(mb: string) {
  return /^\d{8}$/.test(mb);
}

// "YYYY-MM-DD" → Date at UTC midnight (how Prisma stores @db.Date).
export function toDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function today() {
  return toDate(new Date().toISOString().slice(0, 10));
}

// Inclusive date range; defaults to the current calendar year.
export function resolveRange(query: { from?: string; to?: string }) {
  const year = new Date().getUTCFullYear();
  const from = toDate(query.from ?? `${year}-01-01`);
  const to = toDate(query.to ?? `${year}-12-31`);
  if (from > to) {
    throw new UnprocessableEntityException(
      'Datum „od“ ne može biti posle datuma „do“',
    );
  }
  return { from, to };
}

// Poziv na broj, model 97: two ISO 7064 MOD 97-10 control digits, then the number.
export function model97Reference(number: string) {
  const control = 98 - Number((BigInt(number) * 100n) % 97n);
  return `${String(control).padStart(2, '0')}-${number}`;
}

const rsd = new Intl.NumberFormat('sr-Latn-RS', {
  style: 'currency',
  currency: 'RSD',
});

// For notification text, e.g. "4.500,00 RSD".
export function formatRSD(value: Prisma.Decimal | string) {
  return rsd.format(Number(value));
}

// "15.10.2026." — how Serbian documents print dates.
export function formatDate(date: Date) {
  const [y, m, d] = date.toISOString().slice(0, 10).split('-');
  return `${d}.${m}.${y}.`;
}

// "840000074222184357" → "840-0000742221843-57"
export function formatAccountNumber(value: string) {
  return value.length === 18
    ? `${value.slice(0, 3)}-${value.slice(3, 16)}-${value.slice(16)}`
    : value;
}
