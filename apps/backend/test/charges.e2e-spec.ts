import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { UnitType } from '../src/prisma';
import { FinanceScheduler } from '../src/finance/finance.scheduler';
import { createTestApp, Fixture, idOf, seed } from './fixtures';

interface Body {
  id: string;
  [key: string]: unknown;
}
const body = (res: { body: unknown }) => res.body as Body;

const now = new Date();
const monthsFromNow = (n: number) =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + n, 1))
    .toISOString()
    .slice(0, 7);
const startPeriod = monthsFromNow(-3);
const todayIso = now.toISOString().slice(0, 10);

interface PreviewUnit {
  unitNumber: string;
  total: string;
  missingArea: boolean;
  lines: { fund: string; amount: string | null; status: string }[];
}
interface Ledger {
  balance: string;
  overdueAmount: string;
  overdueSince: string | null;
  payTo: { reference: string; accountNumber: string; model: string };
  entries: { kind: string; id: string; amount: string; type?: string }[];
}

// Fee rules, monthly charges, unit ledgers, arrears and reminders for building A.
describe('Unit charges (e2e)', () => {
  let app: INestApplication<App>;
  let f: Fixture;
  let base: string;
  let unitA1: string;
  let unitA2: string;
  let defaultRuleId: string;

  beforeAll(async () => {
    app = await createTestApp();
    f = await seed(app);
    base = `/buildings/${f.buildingA}/finance`;
    const unit = (unitNumber: string) =>
      f.prisma.unit.findFirstOrThrow({ where: { unitNumber } });
    unitA1 = (await unit('residentA1')).id;
    unitA2 = (await unit('residentA2')).id;
    await f.prisma.unit.update({
      where: { id: unitA1 },
      data: { areaSqm: '50.50' },
    });
    await f.prisma.unit.create({
      data: {
        buildingId: f.buildingA,
        unitNumber: 'L1',
        type: UnitType.COMMERCIAL,
        areaSqm: '40',
      },
    });

    await f
      .as('upravnikA')
      .put(`${base}/profile`, {
        legalName: 'Stambena zajednica A',
        pib: '100002887',
        maticniBroj: '17542303',
        booksStartDate: `${startPeriod}-01`,
      })
      .expect(200);
  });

  afterAll(() => app.close());

  const preview = async (period: string) =>
    (await f.as('boardA').get(`${base}/charges/preview?period=${period}`))
      .body as { units: PreviewUnit[]; missingArea: string[] };
  const ledger = async (unitId: string) =>
    (await f.as('upravnikA').get(`${base}/units/${unitId}/ledger`).expect(200))
      .body as Ledger;

  describe('fee rules', () => {
    it('lets only the upravnik write rules; everyone reads them', async () => {
      const rule = {
        fund: 'TEKUCE_ODRZAVANJE',
        method: 'PER_UNIT',
        amount: '1000',
        validFrom: startPeriod,
      };
      await f.as('boardA').post(`${base}/fee-rules`, rule).expect(403);
      await f.as('residentA1').post(`${base}/fee-rules`, rule).expect(403);
      defaultRuleId = idOf(
        await f.as('upravnikA').post(`${base}/fee-rules`, rule).expect(201),
      );
      await f.as('residentA1').get(`${base}/fee-rules`).expect(200);
    });

    it('rejects overlapping rules and backwards ranges', async () => {
      await f
        .as('upravnikA')
        .post(`${base}/fee-rules`, {
          fund: 'TEKUCE_ODRZAVANJE',
          method: 'PER_UNIT',
          amount: '900',
          validFrom: monthsFromNow(-1),
        })
        .expect(409);
      await f
        .as('upravnikA')
        .post(`${base}/fee-rules`, {
          fund: 'UPRAVLJANJE',
          method: 'PER_UNIT',
          amount: '900',
          validFrom: '2026-05',
          validTo: '2026-04',
        })
        .expect(422);
      await f
        .as('upravnikA')
        .post(`${base}/fee-rules`, {
          fund: 'UPRAVLJANJE',
          method: 'PER_UNIT',
          amount: '900',
          validFrom: '2026-13',
        })
        .expect(400);
    });

    it('adds a unit-type override and a per-m² rule', async () => {
      await f
        .as('upravnikA')
        .post(`${base}/fee-rules`, {
          fund: 'TEKUCE_ODRZAVANJE',
          method: 'PER_UNIT',
          amount: '3000',
          unitType: 'COMMERCIAL',
          validFrom: startPeriod,
        })
        .expect(201);
      await f
        .as('upravnikA')
        .post(`${base}/fee-rules`, {
          fund: 'INVESTICIONO_ODRZAVANJE',
          method: 'PER_SQM',
          amount: '10.00',
          validFrom: startPeriod,
        })
        .expect(201);
    });
  });

  describe('generation', () => {
    it('shows the preview to staff only', async () => {
      await f
        .as('residentA1')
        .get(`${base}/charges/preview?period=${startPeriod}`)
        .expect(403);
    });

    it('blocks generation while a per-m² unit has no area', async () => {
      const result = await preview(startPeriod);
      expect(result.missingArea).toEqual(
        expect.arrayContaining(['residentA2', 'inactiveA']),
      );
      await f
        .as('upravnikA')
        .post(`${base}/charges/generate`, { period: startPeriod })
        .expect(422);
    });

    it('computes per-unit, per-m² and override amounts', async () => {
      await f.prisma.unit.updateMany({
        where: { buildingId: f.buildingA, areaSqm: null },
        data: { areaSqm: '30' },
      });
      const { units, missingArea } = await preview(startPeriod);
      expect(missingArea).toEqual([]);
      const a1 = units.find((u) => u.unitNumber === 'residentA1')!;
      expect(a1.total).toBe('1505.00');
      const shop = units.find((u) => u.unitNumber === 'L1')!;
      expect(shop.lines).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fund: 'TEKUCE_ODRZAVANJE',
            amount: '3000',
          }),
          expect.objectContaining({ amount: '400', status: 'NEW' }),
        ]),
      );
    });

    it('generates once per unit and fund', async () => {
      const first = await f
        .as('upravnikA')
        .post(`${base}/charges/generate`, { period: startPeriod })
        .expect(201);
      expect(body(first)).toMatchObject({ issuedCount: 8, unitCount: 4 });

      const again = await f
        .as('upravnikA')
        .post(`${base}/charges/generate`, { period: startPeriod })
        .expect(201);
      expect(body(again)).toMatchObject({ issuedCount: 0, unitCount: 0 });
    });

    it('refuses future months and months before the books start', async () => {
      for (const period of [monthsFromNow(1), monthsFromNow(-4)]) {
        await f
          .as('upravnikA')
          .post(`${base}/charges/generate`, { period })
          .expect(422);
      }
    });

    it('notifies unit accounts with the amount and payment reference', async () => {
      const [notification] = await f.prisma.notification.findMany({
        where: { userId: f.ids.residentA1 },
      });
      expect(notification.title).toMatch(/^Novo zaduženje za /);
      expect(notification.body).toMatch(/1\.505,00.*97 \d{2}-\d{4}/);
    });

    it('regenerates only the charges whose amount changed', async () => {
      await f
        .as('upravnikA')
        .patch(`${base}/fee-rules/${defaultRuleId}`, { amount: '1200' })
        .expect(200);
      const a1 = (await preview(startPeriod)).units.find(
        (u) => u.unitNumber === 'residentA1',
      )!;
      expect(a1.lines.find((l) => l.fund === 'TEKUCE_ODRZAVANJE')!.status).toBe(
        'CHANGED',
      );

      const res = await f
        .as('upravnikA')
        .post(`${base}/charges/regenerate`, { period: startPeriod })
        .expect(201);
      // Three apartments change; the shop keeps its override.
      expect(body(res)).toMatchObject({ cancelledCount: 3, issuedCount: 3 });
    });
  });

  describe('unit ledger', () => {
    it('takes one opening balance per unit', async () => {
      await f
        .as('upravnikA')
        .post(`${base}/units/${unitA1}/opening-balance`, { amount: '2000.00' })
        .expect(201);
      await f
        .as('upravnikA')
        .post(`${base}/units/${unitA1}/opening-balance`, { amount: '100.00' })
        .expect(409);
      await f
        .as('boardA')
        .post(`${base}/units/${unitA2}/opening-balance`, { amount: '100.00' })
        .expect(403);
    });

    it('shows a resident their own unit only', async () => {
      await f
        .as('residentA1')
        .get(`${base}/units/${unitA1}/ledger`)
        .expect(200);
      await f
        .as('residentA1')
        .get(`${base}/units/${unitA2}/ledger`)
        .expect(403);
      await f.as('residentB').get(`${base}/units/${unitA1}/ledger`).expect(403);
      await f.as('boardA').get(`${base}/units/${unitA2}/ledger`).expect(200);
    });

    it('sums charges into an overdue balance with a payment reference', async () => {
      const result = await ledger(unitA1);
      // Opening 2000 + 1200 + 50.5 m² × 10.
      expect(result.balance).toBe('3705.00');
      expect(result.overdueAmount).toBe('3705.00');
      expect(result.payTo).toMatchObject({ model: '97' });
      expect(result.payTo.reference).toMatch(/^\d{2}-\d{4}$/);
      // The cancelled monthly charge stays visible.
      expect(result.entries.filter((e) => e.kind === 'CHARGE')).toHaveLength(4);
    });

    it('lowers the balance on an owner payment and notifies the unit', async () => {
      const account = await f
        .as('upravnikA')
        .post(`${base}/bank-accounts`, {
          bankName: 'Banca Intesa',
          accountNumber: '840-742221843-57',
          openingBalance: '0',
        })
        .expect(201);
      const categories = (await f.as('upravnikA').get(`${base}/categories`))
        .body as { id: string; name: string }[];
      await f
        .as('upravnikA')
        .post(`${base}/transactions`, {
          bankAccountId: idOf(account),
          categoryId: categories.find(
            (c) => c.name === 'Uplate vlasnika – tekuće održavanje',
          )!.id,
          amount: '2500.00',
          valueDate: todayIso,
          description: 'Uplata',
          unitId: unitA1,
        })
        .expect(201);

      const result = await ledger(unitA1);
      expect(result.balance).toBe('1205.00');
      expect(result.overdueAmount).toBe('1205.00');
      expect(result.payTo.accountNumber).toBe('840000074222184357');
      const titles = (
        await f.prisma.notification.findMany({
          where: { userId: f.ids.residentA1 },
        })
      ).map((n) => n.title);
      expect(titles).toContain('Uplata evidentirana');
    });

    it('applies adjustments and cancels charges once', async () => {
      const credit = await f
        .as('upravnikA')
        .post(`${base}/units/${unitA1}/charges`, {
          amount: '-205.00',
          description: 'Popust',
        })
        .expect(201);
      expect((await ledger(unitA1)).balance).toBe('1000.00');

      await f
        .as('upravnikA')
        .post(`${base}/charges/${idOf(credit)}/cancel`, { reason: 'Greška' })
        .expect(201);
      await f
        .as('upravnikA')
        .post(`${base}/charges/${idOf(credit)}/cancel`, { reason: 'Greška' })
        .expect(409);
      expect((await ledger(unitA1)).balance).toBe('1205.00');
    });
  });

  describe('arrears', () => {
    it('gives residents building totals only', async () => {
      const res = await f.as('residentA1').get(`${base}/arrears`).expect(200);
      expect(body(res)).not.toHaveProperty('units');
      expect(body(res)).toMatchObject({ unitCount: 4, unitsInArrears: 4 });
    });

    it('gives staff the per-unit list', async () => {
      const res = await f.as('boardA').get(`${base}/arrears`).expect(200);
      const units = body(res).units as {
        unitNumber: string;
        balance: string;
      }[];
      expect(units.find((u) => u.unitNumber === 'residentA1')!.balance).toBe(
        '1205.00',
      );
    });

    it('keeps other buildings out', async () => {
      await f.as('residentB').get(`${base}/arrears`).expect(403);
      await f.as('outsider').get(`${base}/arrears`).expect(403);
    });
  });

  describe('reminders', () => {
    it('reminds units with overdue debt at most once a week', async () => {
      const scheduler = app.get(FinanceScheduler);
      const reminders = () =>
        f.prisma.notification.count({
          where: {
            userId: f.ids.residentA1,
            title: 'Podsetnik: dospelo dugovanje',
          },
        });

      await scheduler.remindOverdue();
      expect(await reminders()).toBe(1);
      await scheduler.remindOverdue();
      expect(await reminders()).toBe(1);
    });
  });
});
