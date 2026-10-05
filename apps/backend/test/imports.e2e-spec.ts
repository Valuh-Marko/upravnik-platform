import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { StorageService } from '../src/storage/storage.service';
import { createTestApp, FakeStorage, Fixture, idOf, seed } from './fixtures';

interface Line {
  id: string;
  lineNo: number;
  direction: string;
  amount: string;
  categoryId: string | null;
  unitId: string | null;
  invoiceId: string | null;
  isDuplicate: boolean;
  skip: boolean;
  transactionId: string | null;
  issues: string[];
}
interface Statement {
  id: string;
  status: string;
  fileId: string;
  summary: Record<string, string | number>;
  warnings: string[];
  lines: Line[];
}
const statement = (res: { body: unknown }) => res.body as Statement;

const body = (res: { body: unknown }) => res.body as Record<string, unknown>;

const year = new Date().getUTCFullYear();
const MAPPING = {
  encoding: 'utf-8',
  delimiter: ';',
  skipRows: 1,
  dateFormat: 'DD.MM.YYYY',
  decimalSeparator: ',',
  columns: {
    date: 0,
    amount: 1,
    counterpartyName: 2,
    counterpartyAccount: 3,
    reference: 4,
    purpose: 5,
  },
};
const CSV = Buffer.from(
  [
    'Datum;Iznos;Naziv;Račun;Poziv na broj;Svrha',
    `01.02.${year};3.500,00;Petar Petrović;;97 12-0001;Uplata za februar`,
    `01.02.${year};-4.000,00;Lift Servis;160-12345-95;;Plaćanje fakture F-7`,
    `02.02.${year};-150,00;Banka;;;Provizija`,
    `02.02.${year};1.000,00;Nepoznat;;;Uplata`,
  ].join('\r\n'),
);

// Bank statement (izvod) upload, matching, review and commit for building A.
describe('Statement import (e2e)', () => {
  let app: INestApplication<App>;
  let f: Fixture;
  let base: string;
  let storage: FakeStorage;

  let accountId: string;
  let unitA1: string;
  let ownerCategoryId: string;
  let liftCategoryId: string;
  let feeCategoryId: string;
  let invoiceF7: string;
  let importId: string;
  let lines: Line[];

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
        booksStartDate: `${year}-01-01`,
      })
      .expect(200);
    accountId = idOf(
      await up
        .post(`${base}/bank-accounts`, {
          bankName: 'Banca Intesa',
          accountNumber: '840-742221843-57',
          openingBalance: '100000.00',
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
    feeCategoryId = category('Bankarske provizije');

    const supplierId = idOf(
      await up
        .post(`${base}/suppliers`, {
          name: 'Lift Servis',
          bankAccount: '160-12345-95',
        })
        .expect(201),
    );
    const invoice = (number: string, amount: string) =>
      up
        .post(`${base}/invoices`, {
          supplierId,
          number,
          issueDate: `${year}-01-10`,
          amount,
          categoryId: liftCategoryId,
        })
        .expect(201);
    invoiceF7 = idOf(await invoice('F-7', '4000.00'));
    await invoice('F-8', '1000.00');

    unitA1 = (
      await f.prisma.unit.findFirstOrThrow({
        where: { unitNumber: 'residentA1' },
      })
    ).id;
    await f.prisma.unit.update({
      where: { id: unitA1 },
      data: { paymentReference: '12-0001' },
    });
  });

  afterAll(() => app.close());

  const upload = (
    fields: Record<string, string>,
    content = CSV,
    actor: 'upravnikA' | 'boardA' = 'upravnikA',
  ) => {
    const req = f.http
      .post(`/api${base}/imports`)
      .auth(f.tokens[actor], { type: 'bearer' })
      .field('bankAccountId', accountId);
    for (const [key, value] of Object.entries(fields)) req.field(key, value);
    return req.attach('file', content, 'izvod.csv');
  };
  const mapping = JSON.stringify(MAPPING);

  describe('upload', () => {
    it('is upravnik-only; statements are staff-only to read', async () => {
      await upload({ mapping }, CSV, 'boardA').expect(403);
      await f.as('residentA1').get(`${base}/imports`).expect(403);
      await f.as('boardA').get(`${base}/imports`).expect(200);
    });

    it('needs a mapping the first time and validates it', async () => {
      const none = await upload({}).expect(422);
      expect(body(none).message).toContain('mapiranje');
      await upload({
        mapping: JSON.stringify({
          ...MAPPING,
          columns: { ...MAPPING.columns, debit: 6, credit: 7 },
        }),
      }).expect(422);
      await upload({
        mapping: JSON.stringify({ ...MAPPING, dateFormat: 'MM-DD' }),
      }).expect(422);
    });

    it('rejects binary files and unparseable rows', async () => {
      await upload({ mapping }, Buffer.from([0x25, 0x50, 0x00, 0x01])).expect(
        422,
      );
      const res = await upload(
        { mapping },
        Buffer.from(`h\n31.02.${year};1,00;;;;x\n`),
      ).expect(422);
      expect(body(res).message).toContain('Red 2: neispravan datum');
    });

    it('creates a draft with proposed matches', async () => {
      const res = await upload({
        mapping,
        statementNumber: '2',
        openingBalance: '100000.00',
        closingBalance: '100350.00',
      }).expect(201);
      const draft = statement(res);
      importId = draft.id;
      lines = draft.lines;

      expect(draft.status).toBe('DRAFT');
      expect(draft.warnings).toEqual([]);
      expect(draft.summary).toMatchObject({
        lineCount: 4,
        toBookCount: 4,
        duplicateCount: 0,
        income: '4500.00',
        expense: '4150.00',
      });
      expect(lines.map((l) => l.lineNo)).toEqual([2, 3, 4, 5]);
      // Owner payment by poziv na broj.
      expect(lines[0]).toMatchObject({
        unitId: unitA1,
        categoryId: ownerCategoryId,
        issues: [],
      });
      // Supplier by account, invoice by number in the purpose.
      expect(lines[1]).toMatchObject({
        direction: 'EXPENSE',
        invoiceId: invoiceF7,
        categoryId: liftCategoryId,
      });
      expect(lines[2].issues).toEqual(['nedostaje kategorija']);

      const stored = await f.prisma.storedFile.findUniqueOrThrow({
        where: { id: draft.fileId },
      });
      expect(stored.mimeType).toBe('text/csv');
      expect(storage.objects.get(stored.storageKey)).toEqual(CSV);
    });

    it('warns when the statement balances do not add up', async () => {
      const res = await upload({
        openingBalance: '90000.00',
        closingBalance: '1.00',
      }).expect(201);
      const { warnings } = statement(res);
      expect(warnings).toHaveLength(2);
      expect(warnings[0]).toContain('Početno stanje izvoda');
      await f
        .as('upravnikA')
        .post(`${base}/imports/${statement(res).id}/discard`)
        .expect(201);
    });
  });

  describe('review and commit', () => {
    const line = (n: number) =>
      `${base}/imports/${importId}/lines/${lines[n].id}`;

    it('refuses to commit lines without a category', async () => {
      const res = await f
        .as('upravnikA')
        .post(`${base}/imports/${importId}/commit`)
        .expect(422);
      expect(body(res).message).toBe(
        'Red 4: nedostaje kategorija; Red 5: nedostaje kategorija',
      );
      const after = statement(
        await f.as('boardA').get(`${base}/imports/${importId}`),
      );
      expect(after.status).toBe('DRAFT');
    });

    it('validates line edits', async () => {
      const up = f.as('upravnikA');
      await f
        .as('boardA')
        .patch(line(2), { categoryId: feeCategoryId })
        .expect(403);
      // Income category on an expense line.
      await up.patch(line(2), { categoryId: ownerCategoryId }).expect(422);
      // A unit only goes with an owner payment.
      await up
        .patch(line(2), { categoryId: feeCategoryId, unitId: unitA1 })
        .expect(422);
      // Invoices are paid by expenses only.
      await up.patch(line(3), { invoiceId: invoiceF7 }).expect(422);
    });

    it('applies line edits', async () => {
      const up = f.as('upravnikA');
      const fee = await up
        .patch(line(2), { categoryId: feeCategoryId })
        .expect(200);
      expect(fee.body).toMatchObject({ categoryId: feeCategoryId });
      await up.patch(line(3), { skip: true }).expect(200);

      const draft = statement(await up.get(`${base}/imports/${importId}`));
      expect(draft.summary).toMatchObject({
        toBookCount: 3,
        skippedCount: 1,
        income: '3500.00',
      });
      expect(draft.lines.every((l) => l.issues.length === 0)).toBe(true);
    });

    it('books the lines, pays the invoice and notifies the owner', async () => {
      const res = await f
        .as('upravnikA')
        .post(`${base}/imports/${importId}/commit`)
        .expect(201);
      const done = statement(res);
      expect(done.status).toBe('COMMITTED');
      expect(done.lines.filter((l) => l.transactionId)).toHaveLength(3);

      const transactions = await f.prisma.financeTransaction.findMany({
        where: { importId },
      });
      expect(transactions).toHaveLength(3);
      expect(transactions.every((t) => t.source === 'IMPORT')).toBe(true);

      const summary = await f.as('boardA').get(base).expect(200);
      expect(body(summary).totalBalance).toBe('99350.00');
      const invoice = await f
        .as('boardA')
        .get(`${base}/invoices/${invoiceF7}`)
        .expect(200);
      expect(body(invoice).status).toBe('PAID');
      expect(
        await f.prisma.notification.count({
          where: { userId: f.ids.residentA1, title: 'Uplata evidentirana' },
        }),
      ).toBe(1);
    });

    it('cannot be committed, discarded or edited twice', async () => {
      const up = f.as('upravnikA');
      await up.post(`${base}/imports/${importId}/commit`).expect(409);
      await up.post(`${base}/imports/${importId}/discard`).expect(409);
      await up.patch(line(3), { skip: false }).expect(409);
    });
  });

  describe('re-import', () => {
    it('reuses the saved mapping and flags booked lines', async () => {
      const res = await upload({}).expect(201);
      const again = statement(res);
      expect(again.lines.map((l) => l.isDuplicate)).toEqual([
        true,
        true,
        true,
        false,
      ]);
      expect(again.summary).toMatchObject({
        duplicateCount: 3,
        toBookCount: 1,
      });
      await f
        .as('upravnikA')
        .patch(`${base}/imports/${again.id}/lines/${again.lines[0].id}`, {
          skip: true,
        })
        .expect(409);

      const discarded = await f
        .as('upravnikA')
        .post(`${base}/imports/${again.id}/discard`)
        .expect(201);
      expect(statement(discarded).status).toBe('DISCARDED');
    });

    it('lists imports for staff', async () => {
      const res = await f.as('boardA').get(`${base}/imports`).expect(200);
      expect(
        (res.body as { status: string }[]).map((s) => s.status).sort(),
      ).toEqual(['COMMITTED', 'DISCARDED', 'DISCARDED']);
    });
  });
});
