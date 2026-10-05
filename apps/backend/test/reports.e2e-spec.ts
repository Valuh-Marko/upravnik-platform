import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { Response } from 'superagent';
import { App } from 'supertest/types';
import { StorageService } from '../src/storage/storage.service';
import { createTestApp, FakeStorage, Fixture, idOf, seed } from './fixtures';

const body = (res: { body: unknown }) => res.body as Record<string, unknown>;

const year = new Date().getUTCFullYear();
const nextMonth = new Date(
  Date.UTC(year, new Date().getUTCMonth() + 1, 1),
).toISOString();

// Collects a binary response body (supertest leaves PDFs unparsed).
const binary = (res: Response, done: (err: null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(chunk));
  res.on('end', () => done(null, Buffer.concat(chunks)));
};

// Yearly budgets, plan vs actual, and published reports that lock their period.
describe('Budgets and reports (e2e)', () => {
  let app: INestApplication<App>;
  let f: Fixture;
  let base: string;
  let storage: FakeStorage;

  let accountId: string;
  let ownerCategoryId: string;
  let liftCategoryId: string;
  let supplierId: string;
  let febInvoiceId: string;
  let febTransactionId: string;

  beforeAll(async () => {
    app = await createTestApp();
    f = await seed(app);
    storage = app.get<FakeStorage>(StorageService);
    base = `/buildings/${f.buildingA}/finance`;

    const up = f.as('upravnikA');
    await up
      .put(`${base}/profile`, {
        legalName: 'Stambena zajednica A',
        pib: '100002887',
        maticniBroj: '17542303',
        address: 'A 1, Beograd',
        booksStartDate: `${year}-01-01`,
      })
      .expect(200);
    accountId = idOf(
      await up
        .post(`${base}/bank-accounts`, {
          bankName: 'Banca Intesa',
          accountNumber: '840-742221843-57',
          openingBalance: '50000.00',
        })
        .expect(201),
    );
    const categories = (await up.get(`${base}/categories`)).body as {
      id: string;
      name: string;
    }[];
    const category = (name: string) =>
      categories.find((c) => c.name === name)!.id;
    ownerCategoryId = category('Uplate vlasnika – tekuće održavanje');
    liftCategoryId = category('Održavanje lifta');

    supplierId = idOf(
      await up.post(`${base}/suppliers`, { name: 'Lift Servis' }).expect(201),
    );
    febInvoiceId = idOf(
      await up
        .post(`${base}/invoices`, {
          supplierId,
          number: 'F-1',
          issueDate: `${year}-02-03`,
          amount: '1000.00',
          categoryId: liftCategoryId,
        })
        .expect(201),
    );
    febTransactionId = idOf(
      await up
        .post(`${base}/transactions`, {
          bankAccountId: accountId,
          categoryId: ownerCategoryId,
          amount: '3000.00',
          valueDate: `${year}-02-01`,
          description: 'Uplata',
        })
        .expect(201),
    );
    await up
      .post(`${base}/transactions`, {
        bankAccountId: accountId,
        categoryId: liftCategoryId,
        amount: '1000.00',
        valueDate: `${year}-02-05`,
        description: 'Faktura F-1',
        invoicePayments: [{ invoiceId: febInvoiceId, amount: '1000.00' }],
      })
      .expect(201);
  });

  afterAll(() => app.close());

  describe('budgets', () => {
    const budget = {
      adoptedAt: `${year}-01-20`,
      lines: [
        { categoryId: '', plannedAmount: '36000.00' },
        { categoryId: '', plannedAmount: '12000.00', note: 'Servis lifta' },
      ],
    };
    beforeAll(() => {
      budget.lines[0].categoryId = ownerCategoryId;
      budget.lines[1].categoryId = liftCategoryId;
    });

    it('lets only the upravnik adopt a budget', async () => {
      await f.as('boardA').put(`${base}/budgets/${year}`, budget).expect(403);
      await f
        .as('residentA1')
        .put(`${base}/budgets/${year}`, budget)
        .expect(403);
    });

    it('validates the year and the lines', async () => {
      const up = f.as('upravnikA');
      await up.put(`${base}/budgets/1999`, budget).expect(422);
      await up.put(`${base}/budgets/abc`, budget).expect(400);
      await up
        .put(`${base}/budgets/${year}`, {
          lines: [budget.lines[0], budget.lines[0]],
        })
        .expect(422);
      await up
        .put(`${base}/budgets/${year}`, {
          lines: [{ categoryId: randomUUID(), plannedAmount: '1.00' }],
        })
        .expect(422);
      await up
        .put(`${base}/budgets/${year}`, {
          lines: [{ categoryId: liftCategoryId, plannedAmount: '-1.00' }],
        })
        .expect(400);
      await up
        .put(`${base}/budgets/${year}`, {
          lines: [],
          decisionDocumentId: randomUUID(),
        })
        .expect(404);
    });

    it('creates the budget; every member can read it', async () => {
      await f
        .as('upravnikA')
        .put(`${base}/budgets/${year}`, budget)
        .expect(200);
      const res = await f
        .as('residentA1')
        .get(`${base}/budgets/${year}`)
        .expect(200);
      expect(res.body).toMatchObject({
        year,
        adoptedAt: `${year}-01-20T00:00:00.000Z`,
      });
      expect(body(res).lines).toHaveLength(2);
      await f
        .as('residentA1')
        .get(`${base}/budgets/${year - 1}`)
        .expect(404);
    });

    it('replaces the lines on update', async () => {
      const res = await f
        .as('upravnikA')
        .put(`${base}/budgets/${year}`, {
          lines: [{ categoryId: liftCategoryId, plannedAmount: '12000.00' }],
        })
        .expect(200);
      expect(body(res).lines).toHaveLength(1);
      expect(body(res).adoptedAt).toBeNull();
      await f
        .as('upravnikA')
        .put(`${base}/budgets/${year}`, budget)
        .expect(200);
      const all = await f.as('boardA').get(`${base}/budgets`).expect(200);
      expect(all.body).toHaveLength(1);
    });

    it('shows plan next to actuals in the summary', async () => {
      const res = await f
        .as('residentA1')
        .get(`${base}/summary?from=${year}-01-01&to=${year}-12-31`)
        .expect(200);
      expect(res.body).toMatchObject({
        hasBudget: true,
        income: '3000.00',
        plannedIncome: '36000.00',
        expense: '1000.00',
        plannedExpense: '12000.00',
      });
      const lift = (
        body(res).byCategory as { categoryId: string; planned: string }[]
      ).find((c) => c.categoryId === liftCategoryId);
      expect(lift).toMatchObject({ amount: '1000.00', planned: '12000.00' });
    });
  });

  describe('reports', () => {
    const range = { from: `${year}-01-01`, to: `${year}-02-28` };
    let reportFileId: string;

    it('previews a PDF for staff only', async () => {
      const url = `${base}/reports/preview?from=${range.from}&to=${range.to}`;
      await f.as('residentA1').get(url).expect(403);
      const res = await f
        .as('boardA')
        .get(url)
        .buffer(true)
        .parse(binary)
        .expect(200)
        .expect('Content-Type', 'application/pdf');
      expect((res.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
    });

    it('validates the range', async () => {
      const preview = (from: string, to: string) =>
        f.as('boardA').get(`${base}/reports/preview?from=${from}&to=${to}`);
      await preview(`${year - 1}-12-01`, range.to).expect(422);
      await preview(range.to, range.from).expect(422);
      await preview(range.from, nextMonth.slice(0, 10)).expect(422);
      await f
        .as('boardA')
        .get(`${base}/reports/preview?from=${range.from}`)
        .expect(400);
    });

    it('lets only the upravnik publish', async () => {
      await f.as('boardA').post(`${base}/reports`, range).expect(403);
    });

    it('publishes the PDF as a building document and notifies members', async () => {
      const res = await f
        .as('upravnikA')
        .post(`${base}/reports`, range)
        .expect(201);
      expect(res.body).toMatchObject({
        from: `${range.from}T00:00:00.000Z`,
        to: `${range.to}T00:00:00.000Z`,
        publisher: { id: f.ids.upravnikA },
      });
      const published = body(res).document as { id: string; fileId: string };
      reportFileId = published.fileId;

      const document = await f.prisma.document.findUniqueOrThrow({
        where: { id: published.id },
        include: { file: true },
      });
      expect(document).toMatchObject({
        category: 'REPORT',
        fileUrl: null,
        buildingId: f.buildingA,
      });
      const pdf = storage.objects.get(document.file!.storageKey)!;
      expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');

      const notified = await f.prisma.notification.findMany({
        where: { title: 'Objavljen finansijski izveštaj' },
      });
      expect(notified.map((n) => n.userId).sort()).toEqual(
        [f.ids.boardA, f.ids.residentA1, f.ids.residentA2].sort(),
      );
    });

    it('is listed and downloadable for residents', async () => {
      const res = await f.as('residentA1').get(`${base}/reports`).expect(200);
      expect(res.body).toHaveLength(1);
      await f
        .as('residentA1')
        .get(`/buildings/${f.buildingA}/files/${reportFileId}/download`)
        .expect(200);
    });
  });

  describe('period lock', () => {
    const up = () => f.as('upravnikA');

    it('blocks bookings dated inside a published period', async () => {
      const res = await up()
        .post(`${base}/transactions`, {
          bankAccountId: accountId,
          categoryId: ownerCategoryId,
          amount: '10.00',
          valueDate: `${year}-02-10`,
          description: 'Kasna uplata',
        })
        .expect(409);
      expect(body(res).message).toContain('zaključen');
      await up()
        .post(`${base}/transactions`, {
          bankAccountId: accountId,
          categoryId: ownerCategoryId,
          amount: '10.00',
          valueDate: `${year}-03-01`,
          description: 'Uplata',
        })
        .expect(201);
    });

    it('still allows a storno, which is dated today', async () => {
      await up()
        .post(`${base}/transactions/${febTransactionId}/reverse`, {
          reason: 'Pogrešan račun',
        })
        .expect(201);
    });

    it('blocks invoices dated inside the period', async () => {
      await up()
        .post(`${base}/invoices`, {
          supplierId,
          number: 'F-2',
          issueDate: `${year}-02-10`,
          amount: '100.00',
          categoryId: liftCategoryId,
        })
        .expect(409);
      await up()
        .patch(`${base}/invoices/${febInvoiceId}`, { number: 'F-1a' })
        .expect(409);
      await up()
        .post(`${base}/invoices/${febInvoiceId}/cancel`, { reason: 'x' })
        .expect(409);
    });

    it('blocks charges for a locked month', async () => {
      const preview = await f
        .as('boardA')
        .get(`${base}/charges/preview?period=${year}-02`)
        .expect(200);
      expect(preview.body).toMatchObject({
        isLocked: true,
        canGenerate: false,
      });
      await up()
        .post(`${base}/charges/generate`, { period: `${year}-02` })
        .expect(409);
    });

    it('freezes the books start date', async () => {
      await up()
        .put(`${base}/profile`, {
          legalName: 'Stambena zajednica A',
          pib: '100002887',
          maticniBroj: '17542303',
          booksStartDate: `${year}-01-15`,
        })
        .expect(409);
    });
  });
});
