import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { createTestApp, Fixture, idOf, seed } from './fixtures';

interface Body {
  id: string;
  [key: string]: unknown;
}
const body = (res: { body: unknown }) => res.body as Body;
const list = (res: { body: unknown }) => res.body as Body[];

const year = new Date().getUTCFullYear();
const todayIso = new Date().toISOString().slice(0, 10);
const PDF = Buffer.from('%PDF-1.4\n%test\n');

// Ledger, invoices and files for building A, plus who may see and do what.
describe('Finance (e2e)', () => {
  let app: INestApplication<App>;
  let f: Fixture;
  let base: string;

  let accountId: string;
  let ownerCategoryId: string;
  let liftCategoryId: string;
  let supplierId: string;
  let invoiceId: string;
  let incomeId: string;
  let expenseId: string;
  let unitA1: string;

  beforeAll(async () => {
    app = await createTestApp();
    f = await seed(app);
    base = `/buildings/${f.buildingA}/finance`;
    unitA1 = (
      await f.prisma.unit.findFirstOrThrow({
        where: { unitNumber: 'residentA1' },
      })
    ).id;
  });

  afterAll(() => app.close());

  const profile = {
    legalName: 'Stambena zajednica A',
    pib: '100002887',
    maticniBroj: '17542303',
    address: 'A 1, Beograd',
    booksStartDate: `${year}-01-01`,
  };

  const balance = async () => body(await f.as('boardA').get(base)).totalBalance;

  describe('setup', () => {
    it('reports an unconfigured building', async () => {
      const res = await f.as('residentA1').get(base).expect(200);
      expect(body(res)).toEqual({ configured: false });
      await f.as('upravnikA').get(`${base}/transactions`).expect(404);
    });

    it('lets only the upravnik create the profile', async () => {
      await f.as('boardA').put(`${base}/profile`, profile).expect(403);
      await f.as('residentA1').put(`${base}/profile`, profile).expect(403);
    });

    it('validates PIB and matični broj', async () => {
      await f
        .as('upravnikA')
        .put(`${base}/profile`, { ...profile, pib: '100002888' })
        .expect(400);
      await f
        .as('upravnikA')
        .put(`${base}/profile`, { ...profile, maticniBroj: '123' })
        .expect(400);
    });

    it('creates the profile with default categories', async () => {
      await f.as('upravnikA').put(`${base}/profile`, profile).expect(200);
      const categories = list(
        await f.as('residentA1').get(`${base}/categories`).expect(200),
      );
      expect(categories.length).toBeGreaterThan(10);
      ownerCategoryId = categories.find(
        (c) => c.name === 'Uplate vlasnika – tekuće održavanje',
      )!.id;
      liftCategoryId = categories.find(
        (c) => c.name === 'Održavanje lifta',
      )!.id;
    });

    it('validates and normalises bank account numbers', async () => {
      await f
        .as('upravnikA')
        .post(`${base}/bank-accounts`, {
          bankName: 'Banka',
          accountNumber: '840-742221843-58',
          openingBalance: '100000.00',
        })
        .expect(400);

      const res = await f
        .as('upravnikA')
        .post(`${base}/bank-accounts`, {
          bankName: 'Banca Intesa',
          accountNumber: '840-742221843-57',
          openingBalance: '100000.00',
        })
        .expect(201);
      accountId = idOf(res);
      expect(body(res)).toMatchObject({
        accountNumber: '840000074222184357',
        isPrimary: true,
      });
    });

    it('keeps exactly one primary account', async () => {
      const second = await f
        .as('upravnikA')
        .post(`${base}/bank-accounts`, {
          bankName: 'AIK',
          accountNumber: '160-12345-95',
          openingBalance: '0',
        })
        .expect(201);
      expect(body(second).isPrimary).toBe(false);
      await f
        .as('upravnikA')
        .patch(`${base}/bank-accounts/${accountId}`, { isActive: false })
        .expect(409);
      await f
        .as('upravnikA')
        .patch(`${base}/bank-accounts/${accountId}`, { isPrimary: false })
        .expect(409);
    });

    it('shows HOA details and balances to residents', async () => {
      const res = await f.as('residentA1').get(base).expect(200);
      expect(body(res)).toMatchObject({
        configured: true,
        entity: { pib: '100002887' },
        totalBalance: '100000.00',
      });
      expect(body(res).bankAccounts).toHaveLength(2);
    });
  });

  describe('ledger', () => {
    it('creates a supplier and an invoice', async () => {
      supplierId = idOf(
        await f
          .as('upravnikA')
          .post(`${base}/suppliers`, { name: 'Lift Servis', pib: '104052135' })
          .expect(201),
      );
      const res = await f
        .as('upravnikA')
        .post(`${base}/invoices`, {
          supplierId,
          number: 'F-1',
          issueDate: `${year}-01-10`,
          dueDate: `${year}-01-20`,
          amount: '4000.00',
          categoryId: liftCategoryId,
        })
        .expect(201);
      invoiceId = idOf(res);
      expect(body(res)).toMatchObject({ status: 'UNPAID', isOverdue: true });
    });

    it('rejects an invoice on an income category', async () => {
      await f
        .as('upravnikA')
        .post(`${base}/invoices`, {
          supplierId,
          number: 'F-2',
          issueDate: `${year}-01-10`,
          amount: '100.00',
          categoryId: ownerCategoryId,
        })
        .expect(422);
    });

    it('records an owner payment and a partial invoice payment', async () => {
      incomeId = idOf(
        await f
          .as('upravnikA')
          .post(`${base}/transactions`, {
            bankAccountId: accountId,
            categoryId: ownerCategoryId,
            amount: '5000.00',
            valueDate: todayIso,
            description: 'Uplata Petar Petrović',
            counterpartyName: 'Petar Petrović',
            counterpartyAccount: '160-12345-95',
            reference: '97 12-345',
            unitId: unitA1,
          })
          .expect(201),
      );

      const expense = await f
        .as('upravnikA')
        .post(`${base}/transactions`, {
          bankAccountId: accountId,
          categoryId: liftCategoryId,
          amount: '3000.00',
          valueDate: todayIso,
          description: 'Servis lifta',
          counterpartyName: 'Lift Servis',
          invoicePayments: [{ invoiceId, amount: '3000.00' }],
        })
        .expect(201);
      expenseId = idOf(expense);
      expect(body(expense).direction).toBe('EXPENSE');

      expect(await balance()).toBe('102000.00');
      const invoice = body(
        await f
          .as('residentA1')
          .get(`${base}/invoices/${invoiceId}`)
          .expect(200),
      );
      expect(invoice).toMatchObject({
        status: 'PARTIALLY_PAID',
        paidAmount: '3000.00',
        openAmount: '1000.00',
      });
      expect(invoice.payments).toHaveLength(1);
    });

    it('rejects invalid transactions', async () => {
      const tx = {
        bankAccountId: accountId,
        categoryId: liftCategoryId,
        amount: '2000.00',
        valueDate: todayIso,
        description: 'X',
      };
      const upravnik = f.as('upravnikA');
      // More than the invoice's open amount.
      await upravnik
        .post(`${base}/transactions`, {
          ...tx,
          invoicePayments: [{ invoiceId, amount: '1500.00' }],
        })
        .expect(422);
      // Unit on a non-owner-payment category.
      await upravnik
        .post(`${base}/transactions`, { ...tx, unitId: unitA1 })
        .expect(422);
      // Before the books start.
      await upravnik
        .post(`${base}/transactions`, { ...tx, valueDate: `${year - 1}-12-31` })
        .expect(422);
      // Not a real date / not money.
      await upravnik
        .post(`${base}/transactions`, { ...tx, valueDate: `${year}-02-30` })
        .expect(400);
      await upravnik
        .post(`${base}/transactions`, { ...tx, amount: '-5' })
        .expect(400);
      // Unknown category.
      await upravnik
        .post(`${base}/transactions`, { ...tx, categoryId: randomUUID() })
        .expect(404);
    });

    it("rejects another HOA's category", async () => {
      const otherBase = `/buildings/${f.buildingS}/finance`;
      await f
        .as('superAdmin')
        .put(`${otherBase}/profile`, { ...profile, legalName: 'SZ S' })
        .expect(200);
      const foreign = list(
        await f.as('superAdmin').get(`${otherBase}/categories`).expect(200),
      )[0];
      await f
        .as('upravnikA')
        .post(`${base}/transactions`, {
          bankAccountId: accountId,
          categoryId: foreign.id,
          amount: '10.00',
          valueDate: todayIso,
          description: 'X',
        })
        .expect(404);
    });

    it('summarises the year by direction, fund and category', async () => {
      const res = await f.as('residentA1').get(`${base}/summary`).expect(200);
      expect(body(res)).toMatchObject({
        from: `${year}-01-01`,
        to: `${year}-12-31`,
        openingBalance: '100000.00',
        closingBalance: '102000.00',
        income: '5000.00',
        expense: '3000.00',
        net: '2000.00',
        marketIncome: '0.00',
      });
    });
  });

  describe('visibility', () => {
    const ownerPayment = (rows: Body[]) => rows.find((t) => t.id === incomeId)!;

    it('shows raw bank data to staff', async () => {
      const rows = list(
        await f.as('boardA').get(`${base}/transactions`).expect(200),
      );
      expect(ownerPayment(rows)).toMatchObject({
        displayName: 'Uplata – stan residentA1',
        counterpartyName: 'Petar Petrović',
        counterpartyAccount: '160000000001234595',
      });
    });

    it('hides the payer from residents', async () => {
      const rows = list(
        await f.as('residentA2').get(`${base}/transactions`).expect(200),
      );
      const row = ownerPayment(rows);
      expect(row.displayName).toBe('Uplata – stan residentA1');
      for (const key of [
        'counterpartyName',
        'counterpartyAccount',
        'reference',
        'description',
      ]) {
        expect(row).not.toHaveProperty(key);
      }
      // Supplier payments stay fully visible.
      expect(rows.find((t) => t.id === expenseId)).toMatchObject({
        counterpartyName: 'Lift Servis',
      });
    });

    it('blocks writes by board members and residents', async () => {
      const tx = { bankAccountId: accountId };
      await f.as('boardA').post(`${base}/transactions`, tx).expect(403);
      await f.as('residentA1').post(`${base}/transactions`, tx).expect(403);
      await f.as('boardA').post(`${base}/suppliers`, { name: 'X' }).expect(403);
    });

    it('blocks other buildings, outsiders and inactive members', async () => {
      for (const actor of ['residentB', 'outsider', 'inactiveA'] as const) {
        await f.as(actor).get(base).expect(403);
        await f.as(actor).get(`${base}/transactions`).expect(403);
      }
    });
  });

  describe('corrections', () => {
    it('refuses to cancel an invoice with payments', async () => {
      await f
        .as('upravnikA')
        .post(`${base}/invoices/${invoiceId}/cancel`, { reason: 'Greška' })
        .expect(409);
    });

    it('reverses a payment and reopens the invoice', async () => {
      const res = await f
        .as('upravnikA')
        .post(`${base}/transactions/${expenseId}/reverse`, {
          reason: 'Pogrešan iznos',
        })
        .expect(201);
      expect(body(res)).toMatchObject({
        direction: 'INCOME',
        amount: '3000',
        reversesId: expenseId,
        description: 'Storno: Servis lifta (Pogrešan iznos)',
      });

      expect(await balance()).toBe('105000.00');
      const invoice = body(
        await f.as('upravnikA').get(`${base}/invoices/${invoiceId}`),
      );
      expect(invoice).toMatchObject({ status: 'UNPAID', paidAmount: '0.00' });
      expect(invoice.payments).toMatchObject([{ isReversed: true }]);

      // The storno lowers the expense instead of counting as income.
      const summary = body(await f.as('upravnikA').get(`${base}/summary`));
      expect(summary).toMatchObject({ income: '5000.00', expense: '0.00' });

      await f
        .as('upravnikA')
        .post(`${base}/transactions/${expenseId}/reverse`)
        .expect(409);
      await f
        .as('upravnikA')
        .post(`${base}/transactions/${idOf(res)}/reverse`)
        .expect(409);
    });

    it('cancels an unpaid invoice once', async () => {
      const res = await f
        .as('upravnikA')
        .post(`${base}/invoices/${invoiceId}/cancel`, { reason: 'Greška' })
        .expect(201);
      expect(body(res).status).toBe('CANCELLED');
      await f
        .as('upravnikA')
        .post(`${base}/invoices/${invoiceId}/cancel`, { reason: 'Greška' })
        .expect(409);
      await f
        .as('upravnikA')
        .patch(`${base}/invoices/${invoiceId}`, { description: 'X' })
        .expect(409);
    });

    it('writes an audit trail', async () => {
      const count = await f.prisma.auditLog.count({
        where: { entityType: 'FinanceTransaction' },
      });
      expect(count).toBe(3);
    });
  });

  describe('files', () => {
    const upload = (buildingId: string, content: Buffer, name: string) =>
      f.http
        .post(`/api/buildings/${buildingId}/files`)
        .auth(f.tokens.upravnikA, { type: 'bearer' })
        .attach('file', content, name);

    it('accepts PDFs only', async () => {
      await upload(f.buildingA, Buffer.from('hello'), 'a.txt').expect(422);
      const res = await upload(f.buildingA, PDF, 'faktura.pdf').expect(201);
      expect(body(res)).toMatchObject({
        fileName: 'faktura.pdf',
        mimeType: 'application/pdf',
      });
      expect(body(res)).not.toHaveProperty('storageKey');
    });

    it('scopes downloads to the building', async () => {
      const fileId = idOf(await upload(f.buildingA, PDF, 'f.pdf'));
      const res = await f
        .as('residentA1')
        .get(`/buildings/${f.buildingA}/files/${fileId}/download`)
        .expect(200);
      expect(body(res).url).toContain('signed');

      await f
        .as('superAdmin')
        .get(`/buildings/${f.buildingB}/files/${fileId}/download`)
        .expect(404);
      await f
        .as('residentB')
        .get(`/buildings/${f.buildingA}/files/${fileId}/download`)
        .expect(403);
    });

    it("rejects attaching another building's file to an invoice", async () => {
      const res = await f.http
        .post(`/api/buildings/${f.buildingS}/files`)
        .auth(f.tokens.superAdmin, { type: 'bearer' })
        .attach('file', PDF, 's.pdf')
        .expect(201);
      await f
        .as('upravnikA')
        .post(`${base}/invoices`, {
          supplierId,
          number: 'F-3',
          issueDate: `${year}-01-10`,
          amount: '100.00',
          categoryId: liftCategoryId,
          fileId: idOf(res),
        })
        .expect(404);
    });
  });
});
