import { FeeMethod, FinanceFund, Prisma, UnitType } from '../prisma';
import { toDate } from './finance.util';

const { Decimal } = Prisma;
type Decimal = Prisma.Decimal;

const ZERO = new Decimal(0);
const OPEN_END = '9999-12';

// Periods are "YYYY-MM" strings, so they compare correctly as text.
export function periodOf(date: Date) {
  return date.toISOString().slice(0, 7);
}

export function periodStart(period: string) {
  return toDate(`${period}-01`);
}

export interface RuleLike {
  fund: FinanceFund;
  method: FeeMethod;
  amount: Decimal;
  unitType: UnitType | null;
  validFrom: string;
  validTo: string | null;
}

export function rangesOverlap(
  a: Pick<RuleLike, 'validFrom' | 'validTo'>,
  b: Pick<RuleLike, 'validFrom' | 'validTo'>,
) {
  return (
    a.validFrom <= (b.validTo ?? OPEN_END) &&
    b.validFrom <= (a.validTo ?? OPEN_END)
  );
}

/** The rule per fund for a unit type in a period; a type-specific rule beats the default. */
export function rulesFor<R extends RuleLike>(
  rules: R[],
  period: string,
  unitType: UnitType,
) {
  const result = new Map<FinanceFund, R>();
  for (const rule of rules) {
    if (rule.validFrom > period || (rule.validTo ?? OPEN_END) < period) {
      continue;
    }
    if (rule.unitType !== null && rule.unitType !== unitType) continue;
    const current = result.get(rule.fund);
    if (!current || current.unitType === null) result.set(rule.fund, rule);
  }
  return result;
}

/**
 * One unit's monthly amount under a rule. Per m² amounts round half-up to
 * 0.01 per unit; there is no remainder to spread because nothing is split.
 * Null when a per-m² rule meets a unit without an area.
 */
export function chargeAmount(
  rule: Pick<RuleLike, 'method' | 'amount'>,
  areaSqm: Decimal | null,
): Decimal | null {
  if (rule.method === FeeMethod.PER_UNIT) return rule.amount;
  if (areaSqm === null) return null;
  return rule.amount.mul(areaSqm).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export interface ChargeLike {
  issueDate: Date;
  amount: Decimal;
}

/**
 * A unit's balance and overdue debt. Payments and credits settle the oldest
 * charges first (FIFO); this is only for display, nothing is stored per charge.
 * `charges` must be active (not cancelled) and sorted oldest first.
 */
export function unitStatus(
  charges: ChargeLike[],
  paid: Decimal,
  paymentTermDays: number,
  today: Date,
) {
  let credit = paid;
  let charged = ZERO;
  for (const charge of charges) {
    charged = charged.add(charge.amount);
    if (charge.amount.lt(0)) credit = credit.sub(charge.amount);
  }

  let overdueAmount = ZERO;
  let overdueSince: Date | null = null;
  for (const charge of charges) {
    if (charge.amount.lte(0)) continue;
    const covered = Decimal.min(charge.amount, credit);
    credit = credit.sub(covered);
    const open = charge.amount.sub(covered);
    const dueDate = addDays(charge.issueDate, paymentTermDays);
    if (open.gt(0) && dueDate < today) {
      overdueAmount = overdueAmount.add(open);
      overdueSince ??= dueDate;
    }
  }

  return { balance: charged.sub(paid), overdueAmount, overdueSince };
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86_400_000);
}
