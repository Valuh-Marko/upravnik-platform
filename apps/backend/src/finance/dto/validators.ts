import { registerDecorator, ValidationOptions } from 'class-validator';
import {
  isValidAccountNumber,
  isValidMaticniBroj,
  isValidPib,
  normaliseAccountNumber,
} from '../finance.util';

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
      options: { message: `${propertyName} ${message}`, ...options },
      validator: { validate: test },
    });
}

const MONEY = /^\d{1,12}(\.\d{1,2})?$/;
const SIGNED_MONEY = /^-?\d{1,12}(\.\d{1,2})?$/;

/** Positive RSD amount as a string with up to 2 decimals, e.g. "12500.50". */
export const IsMoney = (options?: ValidationOptions) =>
  rule(
    'isMoney',
    'must be a positive amount with up to 2 decimals, e.g. "12500.50"',
    (v) => typeof v === 'string' && MONEY.test(v) && Number(v) > 0,
    options,
  );

/** RSD amount that may be zero or negative (opening balances). */
export const IsSignedMoney = (options?: ValidationOptions) =>
  rule(
    'isSignedMoney',
    'must be an amount with up to 2 decimals, e.g. "-1500.00"',
    (v) => typeof v === 'string' && SIGNED_MONEY.test(v),
    options,
  );

/** Calendar date "YYYY-MM-DD". */
export const IsDateOnly = (options?: ValidationOptions) =>
  rule(
    'isDateOnly',
    'must be a date in YYYY-MM-DD format',
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
    'must be a valid Serbian bank account number, e.g. "160-0000000012345-67"',
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
    'must be a valid 9-digit PIB',
    (v) => typeof v === 'string' && isValidPib(v),
    options,
  );

export const IsMaticniBroj = (options?: ValidationOptions) =>
  rule(
    'isMaticniBroj',
    'must be an 8-digit matični broj',
    (v) => typeof v === 'string' && isValidMaticniBroj(v),
    options,
  );

/** Zero or positive amount (fee rates; zero exempts a unit type). */
export const IsNonNegativeMoney = (options?: ValidationOptions) =>
  rule(
    'isNonNegativeMoney',
    'must be zero or a positive amount with up to 2 decimals, e.g. "1500.00"',
    (v) => typeof v === 'string' && MONEY.test(v),
    options,
  );

/** Non-zero amount that may be negative (a credit). */
export const IsNonZeroMoney = (options?: ValidationOptions) =>
  rule(
    'isNonZeroMoney',
    'must be a non-zero amount with up to 2 decimals, e.g. "-1500.00"',
    (v) => typeof v === 'string' && SIGNED_MONEY.test(v) && Number(v) !== 0,
    options,
  );

/** Calendar month "YYYY-MM". */
export const IsPeriod = (options?: ValidationOptions) =>
  rule(
    'isPeriod',
    'must be a month in YYYY-MM format',
    (v) => typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v),
    options,
  );
