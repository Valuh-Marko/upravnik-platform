import { FinanceDirection } from '../../prisma';
import {
  CsvError,
  CsvMapping,
  parseAmount,
  parseCsv,
  parseDate,
  parseStatement,
} from './csv';

const SIGNED: CsvMapping = {
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

const csv = (text: string) => Buffer.from(text, 'utf-8');

describe('parseCsv', () => {
  it('handles quoted delimiters, escaped quotes and newlines', () => {
    expect(parseCsv('a;"b;c";"say ""hi"""\r\n"multi\nline";x', ';')).toEqual([
      ['a', 'b;c', 'say "hi"'],
      ['multi\nline', 'x'],
    ]);
  });

  it('ignores a trailing newline', () => {
    expect(parseCsv('a,b\n', ',')).toEqual([['a', 'b']]);
  });
});

describe('parseAmount', () => {
  it('parses both separator styles', () => {
    expect(parseAmount('1.234,56', ',')?.toFixed(2)).toBe('1234.56');
    expect(parseAmount('1,234.56', '.')?.toFixed(2)).toBe('1234.56');
    expect(parseAmount('-500', ',')?.toFixed(2)).toBe('-500.00');
    expect(parseAmount('+1 000,5', ',')?.toFixed(2)).toBe('1000.50');
  });

  it('returns null for an empty cell', () => {
    expect(parseAmount('  ', ',')).toBeNull();
  });

  it('rejects garbage and more than two decimals', () => {
    expect(() => parseAmount('abc', ',')).toThrow('neispravan iznos');
    expect(() => parseAmount('1,234', '.')).not.toThrow();
    expect(() => parseAmount('1.2345', '.')).toThrow('neispravan iznos');
  });
});

describe('parseDate', () => {
  it('accepts every format, a trailing dot and 1-digit parts', () => {
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    expect(iso(parseDate('05.10.2026.', 'DD.MM.YYYY'))).toBe('2026-10-05');
    expect(iso(parseDate('5.1.2026', 'DD.MM.YYYY'))).toBe('2026-01-05');
    expect(iso(parseDate('2026-10-05', 'YYYY-MM-DD'))).toBe('2026-10-05');
    expect(iso(parseDate('05/10/2026', 'DD/MM/YYYY'))).toBe('2026-10-05');
  });

  it('rejects impossible dates and the wrong format', () => {
    expect(() => parseDate('31.02.2026', 'DD.MM.YYYY')).toThrow();
    expect(() => parseDate('2026-10-05', 'DD.MM.YYYY')).toThrow();
  });
});

describe('parseStatement', () => {
  it('maps a signed amount column to direction and amount', () => {
    const lines = parseStatement(
      csv(
        'Datum;Iznos;Naziv;Račun;Poziv;Svrha\n' +
          '01.10.2026;3.500,00;Petar Petrović;160-5100-12;97 1234;Uplata\n' +
          '02.10.2026;-12.000,00;Lift Servis;840-742221843-57;;Servis\n',
      ),
      SIGNED,
    );
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({
      lineNo: 2,
      direction: FinanceDirection.INCOME,
      counterpartyName: 'Petar Petrović',
      counterpartyAccount: '160000000000510012',
      reference: '97 1234',
      purpose: 'Uplata',
    });
    expect(lines[0].amount.toFixed(2)).toBe('3500.00');
    expect(lines[1].direction).toBe(FinanceDirection.EXPENSE);
    expect(lines[1].amount.toFixed(2)).toBe('12000.00');
    expect(lines[1].reference).toBeNull();
  });

  it('reads debit/credit pairs and rejects both filled', () => {
    const mapping: CsvMapping = {
      ...SIGNED,
      columns: { date: 0, debit: 1, credit: 2, purpose: 3 },
    };
    const lines = parseStatement(
      csv('h\n01.10.2026;;100,00;in\n01.10.2026;50,00;;out\n'),
      mapping,
    );
    expect(lines.map((l) => [l.direction, l.amount.toFixed(2)])).toEqual([
      [FinanceDirection.INCOME, '100.00'],
      [FinanceDirection.EXPENSE, '50.00'],
    ]);

    expect(() =>
      parseStatement(csv('h\n01.10.2026;1,00;2,00;x\n'), mapping),
    ).toThrow('Red 2: popunjeni su i duguje i potražuje');
  });

  it('skips rows without a date and zero-amount rows', () => {
    const lines = parseStatement(
      csv('h\n01.10.2026;0,00;;;;fee\n;9.999,00;;;;Ukupno\n\n'),
      SIGNED,
    );
    expect(lines).toEqual([]);
  });

  it('decodes windows-1250', () => {
    // "Đorđe" in windows-1250: Đ = 0xD0, đ = 0xF0.
    const buffer = Buffer.concat([
      Buffer.from('h\n01.10.2026;1,00;'),
      Buffer.from([0xd0, 0x6f, 0x72, 0xf0, 0x65]),
      Buffer.from(';;;x\n'),
    ]);
    const [line] = parseStatement(buffer, {
      ...SIGNED,
      encoding: 'windows-1250',
    });
    expect(line.counterpartyName).toBe('Đorđe');
  });

  it('gives stable hash ids that tell identical lines apart', () => {
    const text =
      'h\n01.10.2026;100,00;A;;;x\n01.10.2026;100,00;A;;;x\n01.10.2026;100,00;B;;;x\n';
    const first = parseStatement(csv(text), SIGNED).map((l) => l.externalId);
    const again = parseStatement(csv(text), SIGNED).map((l) => l.externalId);
    expect(again).toEqual(first);
    expect(new Set(first).size).toBe(3);
    expect(first[0]).toMatch(/:1$/);
    expect(first[1]).toMatch(/:2$/);
    expect(first[0].split(':')[0]).toBe(first[1].split(':')[0]);
  });

  it('uses the bank id column and rejects repeats', () => {
    const mapping: CsvMapping = {
      ...SIGNED,
      columns: { ...SIGNED.columns, id: 6 },
    };
    const [line] = parseStatement(
      csv('h\n01.10.2026;1,00;;;;x;TX-1\n'),
      mapping,
    );
    expect(line.externalId).toBe('TX-1');
    expect(() =>
      parseStatement(
        csv('h\n01.10.2026;1,00;;;;x;TX-1\n02.10.2026;2,00;;;;y;TX-1\n'),
        mapping,
      ),
    ).toThrow('ID stavke "TX-1" se ponavlja');
  });

  it('collects problems from several rows', () => {
    try {
      parseStatement(
        csv('h\n32.10.2026;1,00;;;;x\n01.10.2026;abc;;;;y\n'),
        SIGNED,
      );
      fail('expected CsvError');
    } catch (error) {
      expect(error).toBeInstanceOf(CsvError);
      expect((error as CsvError).problems).toEqual([
        'Red 2: neispravan datum "32.10.2026"',
        'Red 3: neispravan iznos "abc"',
      ]);
    }
  });
});
