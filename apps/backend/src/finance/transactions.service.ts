import {
  ConflictException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction, FinanceDirection, Prisma } from '../prisma';
import { Access } from '../auth/access/auth-user';
import { canSeeRawBankData } from '../auth/access/policies';
import { NotificationsService } from '../notifications/notifications.service';
import { audit } from './finance-audit';
import { FinanceService } from './finance.service';
import { InvoicesService } from './invoices.service';
import {
  formatRSD,
  normaliseAccountNumber,
  resolveRange,
  toDate,
  today,
} from './finance.util';
import {
  CreateTransactionDto,
  ReverseTransactionDto,
  TransactionsQueryDto,
} from './dto/transaction.dto';

const ZERO = new Prisma.Decimal(0);

const TRANSACTION_INCLUDE = {
  category: {
    select: {
      id: true,
      name: true,
      direction: true,
      fund: true,
      isOwnerPayment: true,
      isMarketIncome: true,
    },
  },
  bankAccount: { select: { id: true, bankName: true, accountNumber: true } },
  unit: { select: { id: true, unitNumber: true } },
  reversedBy: { select: { id: true, valueDate: true } },
  reverses: { select: { id: true, valueDate: true } },
  invoicePayments: {
    select: {
      amount: true,
      invoice: {
        select: {
          id: true,
          number: true,
          supplier: { select: { id: true, name: true } },
        },
      },
    },
  },
} satisfies Prisma.FinanceTransactionInclude;

type TransactionRow = Prisma.FinanceTransactionGetPayload<{
  include: typeof TRANSACTION_INCLUDE;
}>;

@Injectable()
export class TransactionsService {
  constructor(
    private prisma: PrismaService,
    private finance: FinanceService,
    private invoices: InvoicesService,
    private notifications: NotificationsService,
  ) {}

  async list(buildingId: string, access: Access, query: TransactionsQueryDto) {
    const entity = await this.finance.entityFor(buildingId);
    const { from, to } = resolveRange(query);
    const raw = canSeeRawBankData(access);
    const q = query.q?.trim();

    const rows = await this.prisma.financeTransaction.findMany({
      where: {
        bankAccount: { entityId: entity.id },
        valueDate: { gte: from, lte: to },
        direction: query.direction,
        categoryId: query.categoryId,
        bankAccountId: query.bankAccountId,
        category: query.fund && { fund: query.fund },
        AND: q ? [searchWhere(q, raw)] : undefined,
      },
      include: TRANSACTION_INCLUDE,
      // `id` keeps paging stable: an import commit gives its rows one createdAt.
      orderBy: [{ valueDate: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      take: query.take,
      skip: query.skip,
    });
    return rows.map((row) => present(row, raw));
  }

  async create(buildingId: string, userId: string, dto: CreateTransactionDto) {
    const entity = await this.finance.entityFor(buildingId);
    const valueDate = toDate(dto.valueDate);
    if (valueDate < entity.booksStartDate) {
      throw new UnprocessableEntityException(
        'Datum transakcije je pre početka knjiženja',
      );
    }
    if (valueDate > today()) {
      throw new UnprocessableEntityException(
        'Datum transakcije ne može biti u budućnosti',
      );
    }

    const transaction = await this.prisma.$transaction(async (tx) => {
      await this.finance.assertPeriodOpen(tx, entity.id, valueDate);
      const account = await tx.bankAccount.findFirstOrThrow({
        where: { id: dto.bankAccountId, entityId: entity.id },
      });
      if (!account.isActive) {
        throw new UnprocessableEntityException('Račun nije aktivan');
      }
      const category = await tx.financeCategory.findFirstOrThrow({
        where: { id: dto.categoryId, entityId: entity.id },
      });
      if (!category.isActive) {
        throw new UnprocessableEntityException('Kategorija nije aktivna');
      }

      if (dto.unitId) {
        if (!category.isOwnerPayment) {
          throw new UnprocessableEntityException(
            'Stan se može navesti samo uz uplatu vlasnika',
          );
        }
        await tx.unit.findFirstOrThrow({
          where: { id: dto.unitId, buildingId },
        });
      }

      const payments = dto.invoicePayments ?? [];
      if (payments.length > 0) {
        await this.assertInvoicePayments(
          tx,
          entity.id,
          category.direction,
          dto.amount,
          payments,
        );
      }

      const created = await tx.financeTransaction.create({
        data: {
          bankAccountId: account.id,
          direction: category.direction,
          amount: dto.amount,
          valueDate,
          categoryId: category.id,
          description: dto.description,
          counterpartyName: dto.counterpartyName,
          counterpartyAccount:
            dto.counterpartyAccount &&
            normaliseAccountNumber(dto.counterpartyAccount),
          reference: dto.reference,
          unitId: dto.unitId,
          createdBy: userId,
          invoicePayments: { create: payments },
        },
        include: TRANSACTION_INCLUDE,
      });
      await audit(
        tx,
        userId,
        AuditAction.CREATED,
        'FinanceTransaction',
        created,
      );
      return present(created, true);
    });

    if (transaction.unit && transaction.direction === FinanceDirection.INCOME) {
      await this.notifyPayment(transaction.unit.id, transaction.amount);
    }
    return transaction;
  }

  // Tells the unit account its payment was booked.
  async notifyPayment(unitId: string, amount: Prisma.Decimal) {
    const unit = await this.prisma.unit.findUniqueOrThrow({
      where: { id: unitId },
    });
    if (!unit.userId) return;
    await this.notifications.create(
      unit.userId,
      'Uplata evidentirana',
      `Evidentirana je uplata od ${formatRSD(amount)} za stan ${unit.unitNumber}.`,
      '/finances',
    );
  }

  /** Storno: a mirror entry dated today; the original stays untouched. */
  async reverse(
    buildingId: string,
    userId: string,
    id: string,
    dto: ReverseTransactionDto,
  ) {
    const entity = await this.finance.entityFor(buildingId);

    return this.prisma.$transaction(async (tx) => {
      await this.finance.assertPeriodOpen(tx, entity.id, today());
      const original = await tx.financeTransaction.findFirstOrThrow({
        where: { id, bankAccount: { entityId: entity.id } },
        include: { reversedBy: { select: { id: true } } },
      });
      if (original.reversesId) {
        throw new ConflictException('Storno se ne može stornirati');
      }
      if (original.reversedBy) {
        throw new ConflictException('Transakcija je već stornirana');
      }

      const reason = dto.reason ? ` (${dto.reason})` : '';
      const reversal = await tx.financeTransaction.create({
        data: {
          bankAccountId: original.bankAccountId,
          direction:
            original.direction === FinanceDirection.INCOME
              ? FinanceDirection.EXPENSE
              : FinanceDirection.INCOME,
          amount: original.amount,
          valueDate: today(),
          categoryId: original.categoryId,
          description: `Storno: ${original.description}${reason}`,
          counterpartyName: original.counterpartyName,
          counterpartyAccount: original.counterpartyAccount,
          reference: original.reference,
          unitId: original.unitId,
          reversesId: original.id,
          createdBy: userId,
        },
        include: TRANSACTION_INCLUDE,
      });
      await audit(
        tx,
        userId,
        AuditAction.CREATED,
        'FinanceTransaction',
        reversal,
      );
      return present(reversal, true);
    });
  }

  private async assertInvoicePayments(
    tx: Prisma.TransactionClient,
    entityId: string,
    direction: FinanceDirection,
    amount: string,
    payments: { invoiceId: string; amount: string }[],
  ) {
    if (direction !== FinanceDirection.EXPENSE) {
      throw new UnprocessableEntityException(
        'Fakture se mogu plaćati samo rashodom',
      );
    }
    const ids = payments.map((p) => p.invoiceId);
    if (new Set(ids).size !== ids.length) {
      throw new UnprocessableEntityException(
        'Ista faktura je navedena više puta',
      );
    }
    const total = payments.reduce((sum, p) => sum.add(p.amount), ZERO);
    if (total.gt(amount)) {
      throw new UnprocessableEntityException(
        'Zbir plaćanja po fakturama je veći od iznosa transakcije',
      );
    }

    const paid = await this.invoices.paidAmounts(ids, tx);
    for (const payment of payments) {
      const invoice = await tx.invoice.findFirstOrThrow({
        where: { id: payment.invoiceId, entityId },
      });
      if (invoice.cancelledAt) {
        throw new UnprocessableEntityException(
          `Faktura ${invoice.number} je stornirana`,
        );
      }
      const open = invoice.amount.sub(paid.get(invoice.id) ?? ZERO);
      if (open.lt(payment.amount)) {
        throw new UnprocessableEntityException(
          `Iznos za fakturu ${invoice.number} je veći od neplaćenog dela (${open.toFixed(2)})`,
        );
      }
    }
  }
}

// Residents see owner payments as "Uplata – stan X", without the payer's
// name, account, reference or the free-text description (which may name them).
// Counterparty, purpose, reference or invoice number. Without raw bank data the
// payer fields of owner payments are hidden, so they are not searchable either.
function searchWhere(
  q: string,
  raw: boolean,
): Prisma.FinanceTransactionWhereInput {
  const contains = { contains: q, mode: 'insensitive' } as const;
  const text = {
    OR: [
      { counterpartyName: contains },
      { description: contains },
      { reference: contains },
    ],
  };
  return {
    OR: [
      raw ? text : { ...text, category: { isOwnerPayment: false } },
      { invoicePayments: { some: { invoice: { number: contains } } } },
    ],
  };
}

function present(row: TransactionRow, raw: boolean) {
  const { category, unit } = row;
  if (!category.isOwnerPayment) {
    const displayName = row.reversesId
      ? row.description
      : (row.counterpartyName ?? row.description);
    return { ...row, displayName };
  }
  const payment = unit ? `Uplata – stan ${unit.unitNumber}` : 'Uplata vlasnika';
  const displayName = row.reversesId ? `Storno: ${payment}` : payment;
  if (raw) return { ...row, displayName };
  const {
    counterpartyName,
    counterpartyAccount,
    reference,
    description,
    ...rest
  } = row;
  return { ...rest, displayName };
}
