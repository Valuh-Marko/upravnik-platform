import {
  ConflictException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction, FinanceDirection, Prisma } from '../prisma';
import { audit } from './finance-audit';
import { FinanceService } from './finance.service';
import { toDate, today } from './finance.util';
import {
  CancelInvoiceDto,
  CreateInvoiceDto,
  InvoicesQueryDto,
  InvoiceStatus,
  UpdateInvoiceDto,
} from './dto/invoice.dto';

const ZERO = new Prisma.Decimal(0);

const INVOICE_INCLUDE = {
  supplier: { select: { id: true, name: true, pib: true } },
  category: { select: { id: true, name: true, fund: true } },
  file: {
    select: { id: true, fileName: true, mimeType: true, sizeBytes: true },
  },
} satisfies Prisma.InvoiceInclude;

// Payments made by transactions that were later reversed no longer count.
const ACTIVE_PAYMENT = {
  transaction: { reversedBy: { is: null } },
} satisfies Prisma.InvoicePaymentWhereInput;

type Db = Prisma.TransactionClient | PrismaService;

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private finance: FinanceService,
  ) {}

  /** Σ active payments per invoice. */
  async paidAmounts(invoiceIds: string[], db: Db = this.prisma) {
    const rows = await db.invoicePayment.groupBy({
      by: ['invoiceId'],
      where: { invoiceId: { in: invoiceIds }, ...ACTIVE_PAYMENT },
      _sum: { amount: true },
    });
    return new Map(rows.map((r) => [r.invoiceId, r._sum.amount ?? ZERO]));
  }

  async list(buildingId: string, query: InvoicesQueryDto) {
    const entity = await this.finance.entityFor(buildingId);
    const invoices = await this.prisma.invoice.findMany({
      where: {
        entityId: entity.id,
        supplierId: query.supplierId,
        issueDate: {
          gte: query.from && toDate(query.from),
          lte: query.to && toDate(query.to),
        },
      },
      include: INVOICE_INCLUDE,
      orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
    });
    const paid = await this.paidAmounts(invoices.map((i) => i.id));
    const result = invoices.map((i) => present(i, paid.get(i.id) ?? ZERO));
    return query.status
      ? result.filter((i) => i.status === query.status)
      : result;
  }

  async findOne(buildingId: string, id: string) {
    const entity = await this.finance.entityFor(buildingId);
    const invoice = await this.prisma.invoice.findFirstOrThrow({
      where: { id, entityId: entity.id },
      include: {
        ...INVOICE_INCLUDE,
        payments: {
          include: {
            transaction: {
              select: {
                id: true,
                valueDate: true,
                amount: true,
                description: true,
                reversedBy: { select: { id: true } },
              },
            },
          },
          orderBy: { transaction: { valueDate: 'asc' } },
        },
      },
    });
    const paid = await this.paidAmounts([id]);
    const { payments, ...rest } = invoice;
    return {
      ...present(rest, paid.get(id) ?? ZERO),
      payments: payments.map(({ transaction, amount }) => {
        const { reversedBy, ...tx } = transaction;
        return { amount, transaction: tx, isReversed: reversedBy !== null };
      }),
    };
  }

  async create(buildingId: string, userId: string, dto: CreateInvoiceDto) {
    const entity = await this.finance.entityFor(buildingId);
    assertDueDate(dto.issueDate, dto.dueDate);

    return this.prisma.$transaction(async (tx) => {
      await tx.supplier.findFirstOrThrow({
        where: { id: dto.supplierId, entityId: entity.id },
      });
      await this.assertRefs(tx, buildingId, entity.id, dto);

      const invoice = await tx.invoice.create({
        data: {
          entityId: entity.id,
          supplierId: dto.supplierId,
          number: dto.number,
          issueDate: toDate(dto.issueDate),
          dueDate: dto.dueDate && toDate(dto.dueDate),
          amount: dto.amount,
          categoryId: dto.categoryId,
          description: dto.description,
          fileId: dto.fileId,
          createdBy: userId,
        },
        include: INVOICE_INCLUDE,
      });
      await audit(tx, userId, AuditAction.CREATED, 'Invoice', invoice);
      return present(invoice, ZERO);
    });
  }

  async update(
    buildingId: string,
    userId: string,
    id: string,
    dto: UpdateInvoiceDto,
  ) {
    const entity = await this.finance.entityFor(buildingId);

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirstOrThrow({
        where: { id, entityId: entity.id },
      });
      if (invoice.cancelledAt) {
        throw new ConflictException('Stornirana faktura se ne može menjati');
      }
      const paid = (await this.paidAmounts([id], tx)).get(id) ?? ZERO;
      if (
        dto.amount !== undefined &&
        !invoice.amount.equals(dto.amount) &&
        paid.gt(0)
      ) {
        throw new ConflictException(
          'Iznos fakture se ne može menjati dok postoje uplate po njoj',
        );
      }
      assertDueDate(
        dto.issueDate ?? isoDate(invoice.issueDate),
        dto.dueDate ?? (invoice.dueDate && isoDate(invoice.dueDate)),
      );
      await this.assertRefs(tx, buildingId, entity.id, dto);

      const updated = await tx.invoice.update({
        where: { id },
        data: {
          number: dto.number,
          issueDate: dto.issueDate && toDate(dto.issueDate),
          dueDate: dto.dueDate && toDate(dto.dueDate),
          amount: dto.amount,
          categoryId: dto.categoryId,
          description: dto.description,
          fileId: dto.fileId,
        },
        include: INVOICE_INCLUDE,
      });
      await audit(tx, userId, AuditAction.UPDATED, 'Invoice', updated);
      return present(updated, paid);
    });
  }

  async cancel(
    buildingId: string,
    userId: string,
    id: string,
    dto: CancelInvoiceDto,
  ) {
    const entity = await this.finance.entityFor(buildingId);

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirstOrThrow({
        where: { id, entityId: entity.id },
      });
      if (invoice.cancelledAt) {
        throw new ConflictException('Faktura je već stornirana');
      }
      const paid = (await this.paidAmounts([id], tx)).get(id) ?? ZERO;
      if (paid.gt(0)) {
        throw new ConflictException(
          'Faktura sa uplatama se ne može stornirati; prvo stornirajte uplate',
        );
      }

      const updated = await tx.invoice.update({
        where: { id },
        data: { cancelledAt: new Date(), cancelReason: dto.reason },
        include: INVOICE_INCLUDE,
      });
      await audit(tx, userId, AuditAction.UPDATED, 'Invoice', updated);
      return present(updated, ZERO);
    });
  }

  // Category must be an expense of this HOA; the file must belong to this building.
  private async assertRefs(
    tx: Prisma.TransactionClient,
    buildingId: string,
    entityId: string,
    dto: { categoryId?: string; fileId?: string },
  ) {
    if (dto.categoryId) {
      const category = await tx.financeCategory.findFirstOrThrow({
        where: { id: dto.categoryId, entityId },
      });
      if (category.direction !== FinanceDirection.EXPENSE) {
        throw new UnprocessableEntityException(
          'Faktura mora imati kategoriju rashoda',
        );
      }
    }
    if (dto.fileId) {
      await tx.storedFile.findFirstOrThrow({
        where: { id: dto.fileId, buildingId },
      });
    }
  }
}

function present<
  T extends {
    amount: Prisma.Decimal;
    cancelledAt: Date | null;
    dueDate: Date | null;
  },
>(invoice: T, paid: Prisma.Decimal) {
  const status = invoice.cancelledAt
    ? InvoiceStatus.CANCELLED
    : paid.gte(invoice.amount)
      ? InvoiceStatus.PAID
      : paid.gt(0)
        ? InvoiceStatus.PARTIALLY_PAID
        : InvoiceStatus.UNPAID;
  const isOpen =
    status === InvoiceStatus.UNPAID || status === InvoiceStatus.PARTIALLY_PAID;
  return {
    ...invoice,
    status,
    paidAmount: paid.toFixed(2),
    openAmount: invoice.cancelledAt
      ? '0.00'
      : invoice.amount.sub(paid).toFixed(2),
    isOverdue: isOpen && invoice.dueDate !== null && invoice.dueDate < today(),
  };
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function assertDueDate(issueDate: string, dueDate?: string | null) {
  if (dueDate && dueDate < issueDate) {
    throw new UnprocessableEntityException(
      'Rok plaćanja ne može biti pre datuma izdavanja',
    );
  }
}
