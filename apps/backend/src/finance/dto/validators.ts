import { registerDecorator, ValidationOptions } from 'class-validator';
import {
  isValidAccountNumber,
  isValidMaticniBroj,
  isValidPib,
  normaliseAccountNumber,
} from '../finance.util';

// Serbian labels for messages; an unlisted property falls back to its name.
const FIELD_LABELS: Record<string, string> = {
  accountNumber: 'Broj računa',
  adoptedAt: 'Datum usvajanja',
  amount: 'Iznos',
  bankAccount: 'Račun',
  booksStartDate: 'Početak knjiženja',
  closingBalance: 'Završno stanje',
  counterpartyAccount: 'Račun druge strane',
  dueDate: 'Rok plaćanja',
  from: 'Datum od',
  issueDate: 'Datum izdavanja',
  maticniBroj: 'Matični broj',
  openingBalance: 'Početno stanje',
  period: 'Period',
  pib: 'PIB',
  plannedAmount: 'Planirani iznos',
  to: 'Datum do',
  validFrom: 'Važi od',
  validTo: 'Važi do',
  valueDate: 'Datum transakcije',
};

function rule(
  name: string,
  message: string,
  test: (value: unknown) => boolean,
  options?: ValidationOptions,
) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name,
      target: object.constructor,
      propertyName,
      options: {
        message: `${FIELD_LABELS[propertyName] ?? propertyName} ${message}`,
        ...options,
      },
      validator: { validate: test },
    });
}

const MONEY = /^\d{1,12}(\.\d{1,2})?$/;
const SIGNED_MONEY = /^-?\d{1,12}(\.\d{1,2})?$/;

/** Positive RSD amount as a string with up to 2 decimals, e.g. "12500.50". */
export const IsMoney = (options?: ValidationOptions) =>
  rule(
    'isMoney',
    'mora biti pozitivan iznos sa najviše 2 decimale, npr. "12500.50"',
    (v) => typeof v === 'string' && MONEY.test(v) && Number(v) > 0,
    options,
  );

/** RSD amount that may be zero or negative (opening balances). */
export const IsSignedMoney = (options?: ValidationOptions) =>
  rule(
    'isSignedMoney',
    'mora biti iznos sa najviše 2 decimale, npr. "-1500.00"',
    (v) => typeof v === 'string' && SIGNED_MONEY.test(v),
    options,
  );

/** Calendar date "YYYY-MM-DD". */
export const IsDateOnly = (options?: ValidationOptions) =>
  rule(
    'isDateOnly',
    'mora biti datum u formatu GGGG-MM-DD',
    (v) => {
      if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
      const date = new Date(`${v}T00:00:00Z`);
      // Rejects impossible dates like 2026-02-30, which Date rolls over.
      return !isNaN(date.getTime()) && date.toISOString().startsWith(v);
    },
    options,
  );

/** Serbian bank account, short or 18-digit form, with a valid control number. */
export const IsAccountNumber = (options?: ValidationOptions) =>
  rule(
    'isAccountNumber',
    'mora biti ispravan broj računa, npr. "160-0000000012345-67"',
    (v) => {
      if (typeof v !== 'string') return false;
      const normalised = normaliseAccountNumber(v);
      return normalised !== null && isValidAccountNumber(normalised);
    },
    options,
  );

export const IsPib = (options?: ValidationOptions) =>
  rule(
    'isPib',
    'mora biti ispravan PIB od 9 cifara',
    (v) => typeof v === 'string' && isValidPib(v),
    options,
  );

export const IsMaticniBroj = (options?: ValidationOptions) =>
  rule(
    'isMaticniBroj',
    'mora biti matični broj od 8 cifara',
    (v) => typeof v === 'string' && isValidMaticniBroj(v),
    options,
  );

/** Zero or positive amount (fee rates; zero exempts a unit type). */
export const IsNonNegativeMoney = (options?: ValidationOptions) =>
  rule(
    'isNonNegativeMoney',
    'mora biti nula ili pozitivan iznos sa najviše 2 decimale, npr. "1500.00"',
    (v) => typeof v === 'string' && MONEY.test(v),
    options,
  );

/** Non-zero amount that may be negative (a credit). */
export const IsNonZeroMoney = (options?: ValidationOptions) =>
  rule(
    'isNonZeroMoney',
    'mora biti iznos različit od nule sa najviše 2 decimale, npr. "-1500.00"',
    (v) => typeof v === 'string' && SIGNED_MONEY.test(v) && Number(v) !== 0,
    options,
  );

/** Calendar month "YYYY-MM". */
export const IsPeriod = (options?: ValidationOptions) =>
  rule(
    'isPeriod',
    'mora biti mesec u formatu GGGG-MM',
    (v) => typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v),
    options,
  );
