import { join } from 'path';
import PDFDocument from 'pdfkit';
import { FinanceDirection, FinanceFund, Prisma } from '../../prisma';
import { formatAccountNumber, formatDate } from '../finance.util';

// Geist (SIL OFL, see fonts/LICENSE.txt) covers č ć đ š ž, unlike pdfkit's built-in Helvetica.
const FONTS = join(__dirname, 'fonts');
const REGULAR = 'Geist';
const BOLD = 'Geist-SemiBold';

const MARGIN = 50;
const FONT_SIZE = 9;
const MUTED = '#666666';
const RULE = '#d4d4d4';

const FUND_LABEL: Record<FinanceFund, string> = {
  TEKUCE_ODRZAVANJE: 'Tekuće održavanje',
  INVESTICIONO_ODRZAVANJE: 'Investiciono održavanje',
  UPRAVLJANJE: 'Upravljanje',
  HITNE_INTERVENCIJE: 'Hitne intervencije',
  OSTALO: 'Ostalo',
};

const INVOICE_STATUS: Record<string, string> = {
  UNPAID: 'Neplaćena',
  PARTIALLY_PAID: 'Delimično plaćena',
  PAID: 'Plaćena',
  CANCELLED: 'Stornirana',
};

type Money = Prisma.Decimal | string;

export interface ReportData {
  entity: {
    legalName: string;
    pib: string;
    maticniBroj: string;
    address: string | null;
  };
  from: Date;
  to: Date;
  // null for a preview that is not published.
  publishedBy: string | null;
  publishedAt: Date;
  accounts: {
    bankName: string;
    accountNumber: string;
    opening: Money;
    closing: Money;
  }[];
  summary: {
    openingBalance: string;
    closingBalance: string;
    income: string;
    expense: string;
    net: string;
    marketIncome: string;
    hasBudget: boolean;
    plannedIncome: string;
    plannedExpense: string;
    byFund: {
      fund: FinanceFund | null;
      income: string;
      expense: string;
      plannedIncome: string;
      plannedExpense: string;
    }[];
    byCategory: {
      name: string;
      direction: FinanceDirection;
      fund: FinanceFund | null;
      amount: string;
      planned: string | null;
    }[];
  };
  invoices: {
    number: string;
    supplier: { name: string };
    issueDate: Date;
    amount: Money;
    paidAmount: string;
    status: string;
  }[];
  arrears: {
    totalCharged: string;
    totalPaid: string;
    totalOutstanding: string;
    totalOverdue: string;
    unitsInArrears: number;
    unitCount: number;
    collectionRate: number | null;
  };
}

interface Column {
  header: string;
  width: number;
  align?: 'left' | 'right';
}

const number = new Intl.NumberFormat('sr-Latn-RS', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function money(value: Money) {
  return number.format(Number(value));
}

function percent(actual: string, planned: string | null) {
  if (!planned || Number(planned) === 0) return '—';
  return `${Math.round((Number(actual) / Number(planned)) * 100)}%`;
}

function fundLabel(fund: FinanceFund | null) {
  return fund ? FUND_LABEL[fund] : 'Bez fonda';
}

/** The financial report (izveštaj o prihodima i rashodima) as a PDF. */
export function renderReport(data: ReportData): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margin: MARGIN,
    bufferPages: true,
    info: {
      Title: `Finansijski izveštaj ${formatDate(data.from)} – ${formatDate(data.to)}`,
      Author: data.entity.legalName,
    },
  });
  doc.registerFont(REGULAR, join(FONTS, 'Geist-Regular.ttf'));
  doc.registerFont(BOLD, join(FONTS, 'Geist-SemiBold.ttf'));

  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const width = doc.page.width - 2 * MARGIN;
  const { entity, summary } = data;

  // ─── Header
  doc.font(BOLD).fontSize(16).text('Finansijski izveštaj');
  doc
    .font(REGULAR)
    .fontSize(11)
    .text(`Period: ${formatDate(data.from)} – ${formatDate(data.to)}`);
  if (!data.publishedBy) {
    doc.fillColor('#b45309').text('NACRT – izveštaj nije objavljen');
    doc.fillColor('black');
  }
  doc.moveDown(0.5);
  doc.fontSize(FONT_SIZE).fillColor(MUTED);
  doc.text(entity.legalName);
  if (entity.address) doc.text(entity.address);
  doc.text(`PIB ${entity.pib} · Matični broj ${entity.maticniBroj}`);
  doc.fillColor('black');

  // ─── Balances
  section(doc, 'Stanje računa');
  table(
    doc,
    [
      { header: 'Račun', width: width - 200 },
      {
        header: `Stanje ${formatDate(dayBefore(data.from))}`,
        width: 100,
        align: 'right',
      },
      { header: `Stanje ${formatDate(data.to)}`, width: 100, align: 'right' },
    ],
    data.accounts.map((a) => [
      `${a.bankName}, ${formatAccountNumber(a.accountNumber)}`,
      money(a.opening),
      money(a.closing),
    ]),
    ['Ukupno', money(summary.openingBalance), money(summary.closingBalance)],
  );

  // ─── Totals
  section(doc, 'Prihodi i rashodi po fondovima');
  const planned = summary.hasBudget;
  table(
    doc,
    [
      { header: 'Fond', width: width - (planned ? 400 : 200) },
      { header: 'Prihodi', width: 100, align: 'right' },
      ...(planned
        ? [{ header: 'Plan prihoda', width: 100, align: 'right' as const }]
        : []),
      { header: 'Rashodi', width: 100, align: 'right' },
      ...(planned
        ? [{ header: 'Plan rashoda', width: 100, align: 'right' as const }]
        : []),
    ],
    summary.byFund.map((f) => [
      fundLabel(f.fund),
      money(f.income),
      ...(planned ? [money(f.plannedIncome)] : []),
      money(f.expense),
      ...(planned ? [money(f.plannedExpense)] : []),
    ]),
    [
      'Ukupno',
      money(summary.income),
      ...(planned ? [money(summary.plannedIncome)] : []),
      money(summary.expense),
      ...(planned ? [money(summary.plannedExpense)] : []),
    ],
  );
  doc
    .font(REGULAR)
    .fontSize(FONT_SIZE)
    .text(`Razlika prihoda i rashoda: ${money(summary.net)} RSD`, MARGIN);
  if (planned) note(doc, planNote(data.from, data.to));

  // ─── Categories
  for (const direction of [FinanceDirection.INCOME, FinanceDirection.EXPENSE]) {
    const rows = summary.byCategory.filter((c) => c.direction === direction);
    section(
      doc,
      direction === FinanceDirection.INCOME
        ? 'Prihodi po kategorijama'
        : 'Rashodi po kategorijama',
    );
    if (rows.length === 0) {
      note(doc, 'Nema stavki u ovom periodu.');
      continue;
    }
    table(
      doc,
      [
        { header: 'Kategorija', width: width - 330 },
        { header: 'Fond', width: 110 },
        { header: 'Ostvareno', width: 80, align: 'right' },
        { header: 'Plan', width: 80, align: 'right' },
        { header: '%', width: 60, align: 'right' },
      ],
      rows.map((c) => [
        c.name,
        fundLabel(c.fund),
        money(c.amount),
        c.planned ? money(c.planned) : '—',
        percent(c.amount, c.planned),
      ]),
    );
  }

  // ─── Market income
  section(doc, 'Prihodi od tržišne delatnosti');
  doc
    .font(REGULAR)
    .fontSize(FONT_SIZE)
    .text(`Ukupno: ${money(summary.marketIncome)} RSD`, MARGIN);
  note(
    doc,
    'Zakup zajedničkih delova zgrade i slični prihodi; osnov za prijavu PBN-1 ako ih ima.',
  );

  // ─── Invoices
  section(doc, 'Fakture dobavljača u periodu');
  if (data.invoices.length === 0) {
    note(doc, 'Nema faktura u ovom periodu.');
  } else {
    table(
      doc,
      [
        { header: 'Broj', width: 80 },
        { header: 'Dobavljač', width: width - 380 },
        { header: 'Datum', width: 65 },
        { header: 'Iznos', width: 80, align: 'right' },
        { header: 'Plaćeno', width: 80, align: 'right' },
        { header: 'Status', width: 75 },
      ],
      data.invoices.map((i) => [
        i.number,
        i.supplier.name,
        formatDate(i.issueDate),
        money(i.amount),
        money(i.paidAmount),
        INVOICE_STATUS[i.status] ?? i.status,
      ]),
    );
  }

  // ─── Arrears
  const { arrears } = data;
  section(doc, `Dugovanja vlasnika na dan ${formatDate(data.to)}`);
  table(
    doc,
    [
      { header: 'Stavka', width: width - 150 },
      { header: 'Iznos', width: 150, align: 'right' },
    ],
    [
      ['Ukupno zaduženo', money(arrears.totalCharged)],
      ['Ukupno uplaćeno', money(arrears.totalPaid)],
      ['Ukupno dugovanje', money(arrears.totalOutstanding)],
      ['Od toga dospelo', money(arrears.totalOverdue)],
      ['Stanova u docnji', `${arrears.unitsInArrears} od ${arrears.unitCount}`],
      [
        'Procenat naplate',
        arrears.collectionRate === null
          ? '—'
          : `${number.format(arrears.collectionRate)}%`,
      ],
    ],
  );

  // ─── Signature
  doc.moveDown(1.5);
  doc.font(REGULAR).fontSize(FONT_SIZE).fillColor(MUTED);
  doc.text(
    data.publishedBy
      ? `Izveštaj objavio: ${data.publishedBy}, ${formatDate(data.publishedAt)}`
      : `Pregled napravljen ${formatDate(data.publishedAt)}`,
    MARGIN,
  );
  doc.text('Iznosi su u dinarima (RSD).');

  footer(doc, data);
  doc.end();
  return done;
}

function section(doc: PDFKit.PDFDocument, title: string) {
  doc.moveDown(1.2);
  ensureSpace(doc, 60);
  doc.font(BOLD).fontSize(11).fillColor('black').text(title, MARGIN);
  doc.moveDown(0.3);
}

function note(doc: PDFKit.PDFDocument, text: string) {
  doc.font(REGULAR).fontSize(8).fillColor(MUTED).text(text, MARGIN);
  doc.fillColor('black');
}

function ensureSpace(doc: PDFKit.PDFDocument, height: number) {
  if (doc.y + height > doc.page.height - MARGIN) doc.addPage();
}

/** Rows grow to fit wrapped text; the header repeats on every new page. */
function table(
  doc: PDFKit.PDFDocument,
  columns: Column[],
  rows: string[][],
  total?: string[],
) {
  const draw = (cells: string[], font: string, color = 'black') => {
    doc.font(font).fontSize(FONT_SIZE);
    const height =
      Math.max(
        ...cells.map((cell, i) =>
          doc.heightOfString(cell, { width: columns[i].width - 6 }),
        ),
      ) + 6;
    if (doc.y + height > doc.page.height - MARGIN) {
      doc.addPage();
      if (cells !== headers) draw(headers, BOLD, MUTED);
    }
    const y = doc.y;
    let x = MARGIN;
    doc.fillColor(color);
    cells.forEach((cell, i) => {
      doc.text(cell, x + 3, y + 3, {
        width: columns[i].width - 6,
        align: columns[i].align ?? 'left',
      });
      x += columns[i].width;
    });
    doc
      .moveTo(MARGIN, y + height)
      .lineTo(x, y + height)
      .lineWidth(0.5)
      .strokeColor(RULE)
      .stroke();
    doc.x = MARGIN;
    doc.y = y + height;
    doc.fillColor('black');
  };
  const headers = columns.map((c) => c.header);

  draw(headers, BOLD, MUTED);
  rows.forEach((row) => draw(row, REGULAR));
  if (total) draw(total, BOLD);
}

function footer(doc: PDFKit.PDFDocument, data: ReportData) {
  const range = doc.bufferedPageRange();
  const label = `${data.entity.legalName} · Finansijski izveštaj ${formatDate(data.from)} – ${formatDate(data.to)}`;
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    // Writing inside the bottom margin would otherwise start a new page.
    const bottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc
      .font(REGULAR)
      .fontSize(7)
      .fillColor(MUTED)
      .text(
        `${label} · strana ${i + 1} od ${range.count}`,
        MARGIN,
        doc.page.height - 30,
        {
          width: doc.page.width - 2 * MARGIN,
          align: 'center',
          lineBreak: false,
        },
      );
    doc.page.margins.bottom = bottom;
  }
}

function dayBefore(date: Date) {
  return new Date(date.getTime() - 86_400_000);
}

function planNote(from: Date, to: Date) {
  const first = from.getUTCFullYear();
  const last = to.getUTCFullYear();
  const years = first === last ? `${first}.` : `${first}–${last}.`;
  return `Plan je ceo godišnji program održavanja (${years}); ne deli se kada izveštaj obuhvata deo godine.`;
}
