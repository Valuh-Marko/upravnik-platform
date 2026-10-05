import { createHash } from 'crypto';
import { FinanceDirection, Prisma } from '../../prisma';
import { normaliseAccountNumber, toDate } from '../finance.util';

export const DATE_FORMATS = ['DD.MM.YYYY', 'YYYY-MM-DD', 'DD/MM/YYYY'] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];

// How a bank's CSV export maps onto statement lines. Columns are 0-based.
export interface CsvMapping {
  encoding: 'utf-8' | 'windows-1250';
  delimiter: string;
  // Rows before the first data row (the header counts).
  skipRows: number;
  dateFormat: DateFormat;
  decimalSeparator: ',' | '.';
  columns: {
    date: number;
    // Either one signed amount (negative = expense) or a debit/credit pair.
    amount?: number;
    debit?: number;
    credit?: number;
    counterpartyName?: number;
    counterpartyAccount?: number;
    reference?: number;
    purpose?: number;
    // The bank's own line id, when the export has one.
    id?: number;
  };
}

export interface ParsedLine {
  lineNo: number;
  externalId: string;
  direction: FinanceDirection;
  amount: Prisma.Decimal;
  valueDate: Date;
  counterpartyName: string | null;
  counterpartyAccount: string | null;
  reference: string | null;
  purpose: string;
}

export class CsvError extends Error {
  constructor(readonly problems: string[]) {
    super(problems.join('; '));
  }
}

const MAX_PROBLEMS = 10;

/** RFC 4180 records: quoted fields may hold the delimiter, quotes ("") and newlines. */
export function parseCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"' && field === '') {
      quoted = true;
    } else if (c === delimiter) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function decode(buffer: Buffer, encoding: CsvMapping['encoding']) {
  return new TextDecoder(encoding).decode(buffer).replace(/^\uFEFF/, '');
}

/** "1.234,56" / "1,234.56" / "-500" → Decimal; null for an empty cell. */
export function parseAmount(
  value: string,
  separator: CsvMapping['decimalSeparator'],
): Prisma.Decimal | null {
  const thousands = separator === ',' ? '.' : ',';
  const cleaned = value
    .replace(/[\s\u00A0+]/g, '')
    .split(thousands)
    .join('')
    .replace(separator, '.');
  if (cleaned === '') return null;
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new Error(`neispravan iznos "${value}"`);
  }
  return new Prisma.Decimal(cleaned);
}

/** Banks print "05.10.2026." or "5.10.2026"; all formats accept 1-digit day and month. */
export function parseDate(value: string, format: DateFormat): Date {
  const v = value.trim().replace(/\.$/, '');
  const parts =
    format === 'YYYY-MM-DD'
      ? /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v)?.slice(1)
      : (format === 'DD.MM.YYYY'
          ? /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/
          : /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
        )
          .exec(v)
          ?.slice(1)
          .reverse();
  if (parts) {
    const [y, m, d] = parts;
    const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    const date = toDate(iso);
    if (!isNaN(date.getTime()) && date.toISOString().startsWith(iso)) {
      return date;
    }
  }
  throw new Error(`neispravan datum "${value}"`);
}

/**
 * Statement lines from a CSV export. Rows with an empty date cell (totals,
 * footers) and rows with a zero amount are skipped. lineNo is the 1-based row
 * in the file.
 */
export function parseStatement(buffer: Buffer, mapping: CsvMapping) {
  const rows = parseCsv(decode(buffer, mapping.encoding), mapping.delimiter);
  const { columns } = mapping;
  const cell = (row: string[], index?: number) =>
    index === undefined ? '' : (row[index] ?? '').trim();

  const lines: ParsedLine[] = [];
  const problems: string[] = [];
  const seen = new Map<string, number>();

  rows.forEach((row, index) => {
    if (index < mapping.skipRows || problems.length >= MAX_PROBLEMS) return;
    const lineNo = index + 1;
    if (cell(row, columns.date) === '') return;
    try {
      const valueDate = parseDate(cell(row, columns.date), mapping.dateFormat);
      let signed: Prisma.Decimal;
      if (columns.amount !== undefined) {
        signed =
          parseAmount(cell(row, columns.amount), mapping.decimalSeparator) ??
          new Prisma.Decimal(0);
      } else {
        const debit = parseAmount(
          cell(row, columns.debit),
          mapping.decimalSeparator,
        );
        const credit = parseAmount(
          cell(row, columns.credit),
          mapping.decimalSeparator,
        );
        if (debit && !debit.isZero() && credit && !credit.isZero()) {
          throw new Error('popunjeni su i duguje i potražuje');
        }
        signed =
          credit && !credit.isZero()
            ? credit
            : (debit?.neg() ?? new Prisma.Decimal(0));
      }
      if (signed.isZero()) return;

      const account = cell(row, columns.counterpartyAccount);
      const line = {
        lineNo,
        direction: signed.isNegative()
          ? FinanceDirection.EXPENSE
          : FinanceDirection.INCOME,
        amount: signed.abs(),
        valueDate,
        counterpartyName: cell(row, columns.counterpartyName) || null,
        counterpartyAccount: account
          ? (normaliseAccountNumber(account) ?? account)
          : null,
        reference: cell(row, columns.reference) || null,
        purpose: cell(row, columns.purpose),
      };

      let externalId = cell(row, columns.id);
      if (columns.id !== undefined) {
        if (!externalId) throw new Error('nedostaje ID stavke');
        if (seen.has(externalId)) {
          throw new Error(`ID stavke "${externalId}" se ponavlja`);
        }
        seen.set(externalId, 1);
      } else {
        // No bank id: hash the line. Identical lines on the same day are
        // told apart by their order, so re-importing a file matches again.
        const hash = lineHash(line);
        const occurrence = (seen.get(hash) ?? 0) + 1;
        seen.set(hash, occurrence);
        externalId = `${hash}:${occurrence}`;
      }
      lines.push({ ...line, externalId });
    } catch (error) {
      problems.push(`Red ${lineNo}: ${(error as Error).message}`);
    }
  });

  if (problems.length > 0) throw new CsvError(problems);
  return lines;
}

function lineHash(line: Omit<ParsedLine, 'externalId'>) {
  return createHash('sha256')
    .update(
      [
        line.valueDate.toISOString().slice(0, 10),
        line.direction,
        line.amount.toFixed(2),
        line.counterpartyAccount ?? '',
        line.counterpartyName ?? '',
        line.reference ?? '',
        line.purpose,
      ].join('\u001f'),
    )
    .digest('hex')
    .slice(0, 32);
}
