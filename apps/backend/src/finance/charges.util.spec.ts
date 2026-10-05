import { FeeMethod, FinanceFund, Prisma, UnitType } from '../prisma';
import {
  chargeAmount,
  rangesOverlap,
  rulesFor,
  unitStatus,
} from './charges.util';
import { model97Reference, toDate } from './finance.util';

const d = (value: string | number) => new Prisma.Decimal(value);

const rule = (over: Partial<Parameters<typeof rulesFor>[0][number]> = {}) => ({
  fund: FinanceFund.TEKUCE_ODRZAVANJE,
  method: FeeMethod.PER_UNIT,
  amount: d('1000'),
  unitType: null as UnitType | null,
  validFrom: '2026-01',
  validTo: null as string | null,
  ...over,
});

describe('rulesFor', () => {
  it('prefers a rule for the unit type over the default', () => {
    const base = rule();
    const office = rule({ unitType: UnitType.OFFICE, amount: d('2000') });
    expect(
      rulesFor([office, base], '2026-05', UnitType.OFFICE).get(base.fund),
    ).toBe(office);
    expect(
      rulesFor([base, office], '2026-05', UnitType.OFFICE).get(base.fund),
    ).toBe(office);
    expect(
      rulesFor([base, office], '2026-05', UnitType.APARTMENT).get(base.fund),
    ).toBe(base);
  });

  it('applies only within the validity range, inclusive', () => {
    const r = rule({ validFrom: '2026-03', validTo: '2026-06' });
    expect(rulesFor([r], '2026-02', UnitType.APARTMENT).size).toBe(0);
    expect(rulesFor([r], '2026-03', UnitType.APARTMENT).size).toBe(1);
    expect(rulesFor([r], '2026-06', UnitType.APARTMENT).size).toBe(1);
    expect(rulesFor([r], '2026-07', UnitType.APARTMENT).size).toBe(0);
  });

  it('keeps one rule per fund', () => {
    const invest = rule({ fund: FinanceFund.INVESTICIONO_ODRZAVANJE });
    expect(rulesFor([rule(), invest], '2026-05', UnitType.APARTMENT).size).toBe(
      2,
    );
  });
});

describe('rangesOverlap', () => {
  it('treats a missing end as open-ended', () => {
    expect(rangesOverlap(rule(), rule({ validFrom: '2030-01' }))).toBe(true);
    expect(
      rangesOverlap(
        rule({ validTo: '2026-05' }),
        rule({ validFrom: '2026-06' }),
      ),
    ).toBe(false);
    expect(
      rangesOverlap(
        rule({ validTo: '2026-06' }),
        rule({ validFrom: '2026-06' }),
      ),
    ).toBe(true);
  });
});

describe('chargeAmount', () => {
  it('charges the flat amount per unit', () => {
    expect(chargeAmount(rule(), null)?.toFixed(2)).toBe('1000.00');
  });

  it('multiplies by area and rounds half-up to 0.01', () => {
    const perSqm = rule({ method: FeeMethod.PER_SQM, amount: d('3.45') });
    expect(chargeAmount(perSqm, d('52.30'))?.toFixed(2)).toBe('180.44'); // 180.435
    expect(chargeAmount(perSqm, d('100'))?.toFixed(2)).toBe('345.00');
  });

  it('returns null for a per-m² rule without an area', () => {
    expect(chargeAmount(rule({ method: FeeMethod.PER_SQM }), null)).toBeNull();
  });
});

describe('unitStatus', () => {
  const today = toDate('2026-06-15');
  const charge = (date: string, amount: string) => ({
    issueDate: toDate(date),
    amount: d(amount),
  });

  it('settles the oldest charges first', () => {
    const charges = [
      charge('2026-03-01', '1000'),
      charge('2026-04-01', '1000'),
      charge('2026-05-01', '1000'),
      charge('2026-06-01', '1000'),
    ];
    const status = unitStatus(charges, d('1500'), 30, today);
    expect(status.balance.toFixed(2)).toBe('2500.00');
    // March paid, April half paid (overdue), May overdue, June not yet due.
    expect(status.overdueAmount.toFixed(2)).toBe('1500.00');
    expect(status.overdueSince?.toISOString().slice(0, 10)).toBe('2026-05-01');
  });

  it('counts credits like payments and allows a prepaid balance', () => {
    const charges = [
      charge('2026-03-01', '1000'),
      charge('2026-04-01', '-300'),
    ];
    const status = unitStatus(charges, d('1000'), 30, today);
    expect(status.balance.toFixed(2)).toBe('-300.00');
    expect(status.overdueAmount.toFixed(2)).toBe('0.00');
    expect(status.overdueSince).toBeNull();
  });

  it('is not overdue within the payment term', () => {
    const status = unitStatus([charge('2026-06-01', '1000')], d(0), 30, today);
    expect(status.balance.toFixed(2)).toBe('1000.00');
    expect(status.overdueAmount.toFixed(2)).toBe('0.00');
  });
});

describe('model97Reference', () => {
  it('prefixes ISO 7064 MOD 97-10 control digits', () => {
    expect(model97Reference('1234')).toBe('82-1234');
    expect(model97Reference('0001')).toBe('95-0001');
  });
});
