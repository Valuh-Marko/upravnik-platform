import { randomUUID } from 'crypto';
import {
  ConflictException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync, ValidationError } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import {
  AuditAction,
  FinanceDirection,
  FinanceEntity,
  FinanceFund,
  Prisma,
  StatementImportStatus,
  TransactionSource,
} from '../prisma';
import { StorageService } from '../storage/storage.service';
import { audit } from './finance-audit';
import { FinanceService } from './finance.service';
import { InvoicesService } from './invoices.service';
import { TransactionsService } from './transactions.service';
import { formatDate, formatRSD, today } from './finance.util';
import { CsvError, CsvMapping, ParsedLine, parseStatement } from './import/csv';
import {
  CsvMappingDto,
  UpdateStatementLineDto,
  UploadStatementDto,
} from './dto/import.dto';

const ZERO = new Prisma.Decimal(0);

// Large statements book hundreds of lines in one transaction.
const COMMIT_TIMEOUT_MS = 60_000;

const LINE_INCLUDE = {
  category: {
    select: {
      id: true,
      name: true,
      direction: true,
      fund: true,
      isOwnerPayment: true,
    },
  },
  unit: { select: { id: true, unitNumber: true } },
  invoice: {
    select: {
      id: true,
      number: true,
      supplier: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.BankStatementLineInclude;

const IMPORT_INCLUDE = {
  bankAccount: { select: { id: true, bankName: true, accountNumber: true } },
  file: { select: { id: true, fileName: true, sizeBytes: true } },
  creator: {
    select: { id: true, username: true, firstName: true, lastName: true },
  },
} satisfies Prisma.BankStatementImportInclude;

type ImportWithLines = Prisma.BankStatementImportGetPayload<{
  include: typeof IMPORT_INCLUDE & {
    lines: { include: typeof LINE_INCLUDE };
  };
}>;

/** Bank statement (izvod) import: upload → review a draft → commit. Staff only. */
@Injectable()
export class ImportsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private finance: FinanceService,
    private invoices: InvoicesService,
    private transactions: TransactionsService,
  ) {}

  async list(buildingId: string) {
    const entity = await this.finance.entityFor(buildingId);
    return this.prisma.bankStatementImport.findMany({
      where: { bankAccount: { entityId: entity.id } },
      include: { ...IMPORT_INCLUDE, _count: { select: { lines: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(buildingId: string, id: string) {
    const entity = await this.finance.entityFor(buildingId);
    const found = await this.prisma.bankStatementImport.findFirstOrThrow({
      where: { id, bankAccount: { entityId: entity.id } },
      include: {
        ...IMPORT_INCLUDE,
        lines: { include: LINE_INCLUDE, orderBy: { lineNo: 'asc' } },
      },
    });
    return this.present(entity, found);
  }

  async upload(
    buildingId: string,
    userId: string,
    dto: UploadStatementDto,
    file: Express.Multer.File,
  ) {
    const entity = await this.finance.entityFor(buildingId);
    const account = await this.prisma.bankAccount.findFirstOrThrow({
      where: { id: dto.bankAccountId, entityId: entity.id },
    });
    if (!account.isActive) {
      throw new UnprocessableEntityException('Račun nije aktivan');
    }
    const mapping = resolveMapping(dto.mapping, account.importMapping);
    if (file.buffer.includes(0)) {
      throw new UnprocessableEntityException('Fajl nije CSV');
    }

    let parsed: ParsedLine[];
    try {
      parsed = parseStatement(file.buffer, mapping);
    } catch (error) {
      if (error instanceof CsvError) {
        throw new UnprocessableEntityException(error.message);
      }
      throw error;
    }
    if (parsed.length === 0) {
      throw new UnprocessableEntityException(
        'U fajlu nema stavki; proverite mapiranje kolona',
      );
    }

    const lines = await this.propose(buildingId, entity.id, account.id, parsed);
    const storageKey = `buildings/${buildingId}/${randomUUID()}.csv`;
    await this.storage.put(storageKey, file.buffer, 'text/csv');

    const created = await this.prisma.$transaction(async (tx) => {
      const stored = await tx.storedFile.create({
        data: {
          buildingId,
          uploadedBy: userId,
          storageKey,
          // Multer decodes the multipart filename as latin1; restore UTF-8.
          fileName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
          mimeType: 'text/csv',
          sizeBytes: file.size,
        },
      });
      const statement = await tx.bankStatementImport.create({
        data: {
          bankAccountId: account.id,
          fileId: stored.id,
          statementNumber: dto.statementNumber,
          openingBalance: dto.openingBalance,
          closingBalance: dto.closingBalance,
          createdBy: userId,
          lines: { create: lines },
        },
      });
      // The next statement from this bank reuses it.
      await tx.bankAccount.update({
        where: { id: account.id },
        data: { importMapping: mapping as unknown as Prisma.InputJsonValue },
      });
      await audit(
        tx,
        userId,
        AuditAction.CREATED,
        'BankStatementImport',
        statement,
      );
      return statement;
    });
    return this.findOne(buildingId, created.id);
  }

  async updateLine(
    buildingId: string,
    importId: string,
    lineId: string,
    dto: UpdateStatementLineDto,
  ) {
    const entity = await this.finance.entityFor(buildingId);

    return this.prisma.$transaction(async (tx) => {
      const statement = await tx.bankStatementImport.findFirstOrThrow({
        where: { id: importId, bankAccount: { entityId: entity.id } },
      });
      if (statement.status !== StatementImportStatus.DRAFT) {
        throw new ConflictException('Izvod više nije u nacrtu');
      }
      const line = await tx.bankStatementLine.findFirstOrThrow({
        where: { id: lineId, importId },
      });
      if (line.isDuplicate) {
        throw new ConflictException('Stavka je već proknjižena');
      }

      const categoryId =
        dto.categoryId === undefined ? line.categoryId : dto.categoryId;
      const invoiceId =
        dto.invoiceId === undefined ? line.invoiceId : dto.invoiceId;
      let unitId = dto.unitId === undefined ? line.unitId : dto.unitId;

      const category = categoryId
        ? await tx.financeCategory.findFirstOrThrow({
            where: { id: categoryId, entityId: entity.id },
          })
        : null;
      if (category && category.direction !== line.direction) {
        throw new UnprocessableEntityException(
          'Kategorija ne odgovara smeru stavke',
        );
      }
      if (category && !category.isActive) {
        throw new UnprocessableEntityException('Kategorija nije aktivna');
      }
      // Switching away from an owner-payment category drops the unit.
      if (!category?.isOwnerPayment) {
        if (dto.unitId) {
          throw new UnprocessableEntityException(
            'Stan se može navesti samo uz uplatu vlasnika',
          );
        }
        unitId = null;
      }
      if (dto.unitId) {
        await tx.unit.findFirstOrThrow({
          where: { id: dto.unitId, buildingId },
        });
      }
      if (dto.invoiceId) {
        if (line.direction !== FinanceDirection.EXPENSE) {
          throw new UnprocessableEntityException(
            'Fakture se mogu plaćati samo rashodom',
          );
        }
        const invoice = await tx.invoice.findFirstOrThrow({
          where: { id: dto.invoiceId, entityId: entity.id },
        });
        if (invoice.cancelledAt) {
          throw new UnprocessableEntityException(
            `Faktura ${invoice.number} je stornirana`,
          );
        }
      }

      return tx.bankStatementLine.update({
        where: { id: lineId },
        data: { categoryId, unitId, invoiceId, skip: dto.skip },
        include: LINE_INCLUDE,
      });
    });
  }

  /** Books every line that is neither skipped nor already booked, all or nothing. */
  async commit(buildingId: string, userId: string, id: string) {
    const entity = await this.finance.entityFor(buildingId);

    const booked = await this.prisma.$transaction(
      async (tx) => {
        await this.claim(tx, entity.id, id, StatementImportStatus.COMMITTED);
        const statement = await tx.bankStatementImport.findUniqueOrThrow({
          where: { id },
          include: {
            bankAccount: true,
            lines: {
              include: { category: true, invoice: true },
              orderBy: { lineNo: 'asc' },
            },
          },
        });
        if (!statement.bankAccount.isActive) {
          throw new UnprocessableEntityException('Račun nije aktivan');
        }

        // Booked by another statement since this draft was made.
        const candidates = statement.lines.filter(
          (l) => !l.isDuplicate && !l.skip,
        );
        const existing = await tx.financeTransaction.findMany({
          where: {
            bankAccountId: statement.bankAccountId,
            externalId: { in: candidates.map((l) => l.externalId) },
          },
          select: { id: true, externalId: true },
        });
        for (const tr of existing) {
          await tx.bankStatementLine.updateMany({
            where: { importId: id, externalId: tr.externalId! },
            data: { isDuplicate: true, transactionId: tr.id },
          });
        }
        const known = new Set(existing.map((tr) => tr.externalId));
        const pending = candidates.filter((l) => !known.has(l.externalId));

        const reports = await tx.financeReport.findMany({
          where: { entityId: entity.id },
        });
        const problems: string[] = [];
        for (const line of pending) {
          const issue =
            lineIssues(entity, reports, line)[0] ??
            (line.category && !line.category.isActive
              ? 'kategorija nije aktivna'
              : null);
          if (issue) problems.push(`Red ${line.lineNo}: ${issue}`);
        }

        // Several lines may pay the same invoice; never past its open amount.
        const paid = await this.invoices.paidAmounts(
          pending.flatMap((l) => (l.invoiceId ? [l.invoiceId] : [])),
          tx,
        );
        const payments = new Map<string, Prisma.Decimal>();
        for (const line of pending) {
          if (!line.invoice) continue;
          const open = line.invoice.amount.sub(
            paid.get(line.invoice.id) ?? ZERO,
          );
          if (line.invoice.cancelledAt || open.lte(0)) {
            problems.push(
              `Red ${line.lineNo}: faktura ${line.invoice.number} je ${line.invoice.cancelledAt ? 'stornirana' : 'već plaćena'}`,
            );
            continue;
          }
          const amount = Prisma.Decimal.min(line.amount, open);
          payments.set(line.id, amount);
          paid.set(
            line.invoice.id,
            (paid.get(line.invoice.id) ?? ZERO).add(amount),
          );
        }
        if (problems.length > 0) {
          throw new UnprocessableEntityException(problems.join('; '));
        }

        const created: {
          unitId: string | null;
          amount: Prisma.Decimal;
          direction: FinanceDirection;
        }[] = [];
        for (const line of pending) {
          const payment = payments.get(line.id);
          const transaction = await tx.financeTransaction.create({
            data: {
              bankAccountId: statement.bankAccountId,
              direction: line.direction,
              amount: line.amount,
              valueDate: line.valueDate,
              categoryId: line.categoryId!,
              description:
                line.purpose ||
                line.counterpartyName ||
                `Stavka izvoda, red ${line.lineNo}`,
              counterpartyName: line.counterpartyName,
              counterpartyAccount: line.counterpartyAccount,
              reference: line.reference,
              unitId: line.unitId,
              createdBy: userId,
              source: TransactionSource.IMPORT,
              importId: id,
              externalId: line.externalId,
              invoicePayments: payment
                ? { create: [{ invoiceId: line.invoiceId!, amount: payment }] }
                : undefined,
            },
          });
          await tx.bankStatementLine.update({
            where: { id: line.id },
            data: { transactionId: transaction.id },
          });
          await audit(
            tx,
            userId,
            AuditAction.CREATED,
            'FinanceTransaction',
            transaction,
          );
          created.push(transaction);
        }

        const committed = await tx.bankStatementImport.findUniqueOrThrow({
          where: { id },
        });
        await audit(
          tx,
          userId,
          AuditAction.UPDATED,
          'BankStatementImport',
          committed,
        );
        return created;
      },
      { timeout: COMMIT_TIMEOUT_MS },
    );

    for (const tr of booked) {
      if (tr.unitId && tr.direction === FinanceDirection.INCOME) {
        await this.transactions.notifyPayment(tr.unitId, tr.amount);
      }
    }
    return this.findOne(buildingId, id);
  }

  async discard(buildingId: string, userId: string, id: string) {
    const entity = await this.finance.entityFor(buildingId);
    await this.prisma.$transaction(async (tx) => {
      await this.claim(tx, entity.id, id, StatementImportStatus.DISCARDED);
      const discarded = await tx.bankStatementImport.findUniqueOrThrow({
        where: { id },
      });
      await audit(
        tx,
        userId,
        AuditAction.UPDATED,
        'BankStatementImport',
        discarded,
      );
    });
    return this.findOne(buildingId, id);
  }

  // Moves a draft on; a second commit or discard of the same import gets 409.
  private async claim(
    tx: Prisma.TransactionClient,
    entityId: string,
    id: string,
    status: StatementImportStatus,
  ) {
    const { count } = await tx.bankStatementImport.updateMany({
      where: {
        id,
        status: StatementImportStatus.DRAFT,
        bankAccount: { entityId },
      },
      data: {
        status,
        committedAt:
          status === StatementImportStatus.COMMITTED ? new Date() : undefined,
      },
    });
    if (count === 0) {
      await tx.bankStatementImport.findFirstOrThrow({
        where: { id, bankAccount: { entityId } },
      });
      throw new ConflictException('Izvod je već proknjižen ili odbačen');
    }
  }

  /**
   * Draft lines with proposed matches: lines already booked on this account,
   * owner payments by poziv na broj, supplier payments by account number and
   * invoice number in the purpose text.
   */
  private async propose(
    buildingId: string,
    entityId: string,
    bankAccountId: string,
    parsed: ParsedLine[],
  ) {
    const [existing, units, categories, suppliers, invoices] =
      await Promise.all([
        this.prisma.financeTransaction.findMany({
          where: {
            bankAccountId,
            externalId: { in: parsed.map((l) => l.externalId) },
          },
          select: { id: true, externalId: true },
        }),
        this.prisma.unit.findMany({
          where: { buildingId, paymentReference: { not: null } },
          select: { id: true, paymentReference: true },
        }),
        this.prisma.financeCategory.findMany({
          where: { entityId, isActive: true, isOwnerPayment: true },
        }),
        this.prisma.supplier.findMany({
          where: { entityId, bankAccount: { not: null } },
        }),
        this.prisma.invoice.findMany({
          where: { entityId, cancelledAt: null },
          orderBy: { issueDate: 'asc' },
        }),
      ]);

    const booked = new Map(existing.map((t) => [t.externalId, t.id]));
    // One payment usually covers every fund; book it as tekuće održavanje.
    const ownerCategory =
      categories.find((c) => c.fund === FinanceFund.TEKUCE_ODRZAVANJE) ??
      categories[0];
    const paid = await this.invoices.paidAmounts(invoices.map((i) => i.id));
    const openInvoices = invoices.filter((i) =>
      i.amount.gt(paid.get(i.id) ?? ZERO),
    );

    return parsed.map((line) => {
      const draft = {
        ...line,
        isDuplicate: booked.has(line.externalId),
        transactionId: booked.get(line.externalId) ?? null,
        categoryId: null as string | null,
        unitId: null as string | null,
        invoiceId: null as string | null,
      };
      if (draft.isDuplicate) return draft;

      if (line.direction === FinanceDirection.INCOME) {
        const digits = line.reference?.replace(/\D/g, '');
        const unit =
          digits &&
          units.find((u) => {
            const own = u.paymentReference!.replace(/\D/g, '');
            return digits === own || digits === `97${own}`;
          });
        if (unit && ownerCategory) {
          draft.unitId = unit.id;
          draft.categoryId = ownerCategory.id;
        }
        return draft;
      }

      const supplier = suppliers.find(
        (s) => s.bankAccount === line.counterpartyAccount,
      );
      if (!supplier) return draft;
      const own = openInvoices.filter((i) => i.supplierId === supplier.id);
      const purpose = line.purpose.toLowerCase();
      const invoice =
        own.find((i) => purpose.includes(i.number.toLowerCase())) ??
        (own.length === 1 ? own[0] : undefined);
      if (invoice) {
        draft.invoiceId = invoice.id;
        draft.categoryId = invoice.categoryId;
      }
      return draft;
    });
  }

  private async present(entity: FinanceEntity, statement: ImportWithLines) {
    const { lines, ...rest } = statement;
    const isDraft = statement.status === StatementImportStatus.DRAFT;
    const toBook = lines.filter((l) => !l.isDuplicate && !l.skip);
    const signed = (l: {
      direction: FinanceDirection;
      amount: Prisma.Decimal;
    }) => (l.direction === FinanceDirection.INCOME ? l.amount : l.amount.neg());

    const reports = isDraft
      ? await this.prisma.financeReport.findMany({
          where: { entityId: entity.id },
        })
      : [];
    const warnings: string[] = [];
    if (isDraft && statement.openingBalance) {
      const first = lines.reduce(
        (min, l) => (l.valueDate < min ? l.valueDate : min),
        lines[0].valueDate,
      );
      const balances = await this.finance.accountBalances(
        entity.id,
        first,
        first,
      );
      const books = balances.find((b) => b.id === statement.bankAccountId)!;
      if (!books.opening.equals(statement.openingBalance)) {
        warnings.push(
          `Početno stanje izvoda (${formatRSD(statement.openingBalance)}) se razlikuje od stanja u knjigama pre ${formatDate(first)} (${formatRSD(books.opening)})`,
        );
      }
    }
    if (isDraft && statement.openingBalance && statement.closingBalance) {
      const computed = lines.reduce(
        (total, l) => total.add(signed(l)),
        statement.openingBalance,
      );
      if (!computed.equals(statement.closingBalance)) {
        warnings.push(
          `Početno stanje i promene daju ${formatRSD(computed)}, a krajnje stanje izvoda je ${formatRSD(statement.closingBalance)}`,
        );
      }
    }

    return {
      ...rest,
      summary: {
        lineCount: lines.length,
        toBookCount: toBook.length,
        duplicateCount: lines.filter((l) => l.isDuplicate).length,
        skippedCount: lines.filter((l) => l.skip && !l.isDuplicate).length,
        income: toBook
          .filter((l) => l.direction === FinanceDirection.INCOME)
          .reduce((total, l) => total.add(l.amount), ZERO)
          .toFixed(2),
        expense: toBook
          .filter((l) => l.direction === FinanceDirection.EXPENSE)
          .reduce((total, l) => total.add(l.amount), ZERO)
          .toFixed(2),
      },
      warnings,
      lines: lines.map((line) => ({
        ...line,
        issues:
          isDraft && !line.isDuplicate && !line.skip
            ? lineIssues(entity, reports, line)
            : [],
      })),
    };
  }
}

// Why a line cannot be booked as it stands.
function lineIssues(
  entity: FinanceEntity,
  reports: { from: Date; to: Date }[],
  line: { categoryId: string | null; valueDate: Date },
) {
  const issues: string[] = [];
  if (!line.categoryId) issues.push('nedostaje kategorija');
  if (line.valueDate < entity.booksStartDate) {
    issues.push('datum je pre početka knjiženja');
  }
  if (line.valueDate > today()) issues.push('datum je u budućnosti');
  if (reports.some((r) => r.from <= line.valueDate && line.valueDate <= r.to)) {
    issues.push('period je zaključen objavljenim izveštajem');
  }
  return issues;
}

function resolveMapping(
  raw: string | undefined,
  saved: Prisma.JsonValue,
): CsvMapping {
  const value: unknown = raw === undefined ? saved : JSON.parse(raw);
  if (!value) {
    throw new UnprocessableEntityException(
      'Za ovaj račun nije sačuvano mapiranje kolona',
    );
  }
  const dto = plainToInstance(CsvMappingDto, value);
  const errors = validateSync(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  if (errors.length > 0) {
    throw new UnprocessableEntityException(
      `Neispravno mapiranje kolona: ${messages(errors).join('; ')}`,
    );
  }
  const { amount, debit, credit } = dto.columns;
  const single = amount !== undefined;
  const pair = debit !== undefined && credit !== undefined;
  if (single === pair || (single && (debit ?? credit) !== undefined)) {
    throw new UnprocessableEntityException(
      'Mapiranje mora imati ili kolonu iznosa ili obe kolone duguje i potražuje',
    );
  }
  return JSON.parse(JSON.stringify(dto)) as CsvMapping;
}

function messages(errors: ValidationError[]): string[] {
  return errors.flatMap((e) => [
    ...Object.values(e.constraints ?? {}),
    ...messages(e.children ?? []),
  ]);
}
