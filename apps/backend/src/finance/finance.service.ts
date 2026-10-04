import {
  ConflictException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction, FinanceDirection, FinanceFund, Prisma } from '../prisma';
import { DEFAULT_CATEGORIES } from './default-categories';
import { audit } from './finance-audit';
import { normaliseAccountNumber, resolveRange, toDate } from './finance.util';
import { UpsertFinanceProfileDto } from './dto/profile.dto';
import {
  CreateBankAccountDto,
  UpdateBankAccountDto,
} from './dto/bank-account.dto';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';
import { DateRangeQueryDto } from './dto/summary-query.dto';

const { Decimal } = Prisma;
type Decimal = Prisma.Decimal;

const ZERO = new Decimal(0);

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  /** The building's HOA; 404 when finances are not set up yet. */
  entityFor(buildingId: string) {
    return this.prisma.financeEntity.findUniqueOrThrow({
      where: { buildingId },
    });
  }

  // ─── Profile & bank accounts ───────────────────────────────────

  async overview(buildingId: string) {
    const entity = await this.prisma.financeEntity.findUnique({
      where: { buildingId },
      include: {
        bankAccounts: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });
    if (!entity) return { configured: false };

    const { bankAccounts, ...profile } = entity;
    const movements = await this.movementsByAccount(entity.id);
    const accounts = bankAccounts.map((account) => ({
      ...account,
      balance: account.openingBalance
        .add(movements.get(account.id) ?? ZERO)
        .toFixed(2),
    }));
    const totalBalance = accounts
      .reduce((sum, a) => sum.add(a.balance), ZERO)
      .toFixed(2);

    return {
      configured: true,
      entity: profile,
      bankAccounts: accounts,
      totalBalance,
    };
  }

  upsertProfile(
    buildingId: string,
    userId: string,
    dto: UpsertFinanceProfileDto,
  ) {
    const data = {
      legalName: dto.legalName,
      pib: dto.pib,
      maticniBroj: dto.maticniBroj,
      address: dto.address,
      booksStartDate: toDate(dto.booksStartDate),
      paymentTermDays: dto.paymentTermDays,
      autoGenerateCharges: dto.autoGenerateCharges,
    };

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.financeEntity.findUnique({
        where: { buildingId },
      });

      if (!existing) {
        const created = await tx.financeEntity.create({
          data: {
            buildingId,
            ...data,
            categories: { create: DEFAULT_CATEGORIES },
          },
        });
        await audit(tx, userId, AuditAction.CREATED, 'FinanceEntity', created);
        return created;
      }

      if (existing.booksStartDate.getTime() !== data.booksStartDate.getTime()) {
        const transactions = await tx.financeTransaction.count({
          where: { bankAccount: { entityId: existing.id } },
        });
        if (transactions > 0) {
          throw new ConflictException(
            'Datum početka knjiženja se ne može menjati nakon prve transakcije',
          );
        }
      }

      const updated = await tx.financeEntity.update({
        where: { id: existing.id },
        data,
      });
      await audit(tx, userId, AuditAction.UPDATED, 'FinanceEntity', updated);
      return updated;
    });
  }

  async createBankAccount(
    buildingId: string,
    userId: string,
    dto: CreateBankAccountDto,
  ) {
    const entity = await this.entityFor(buildingId);

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.bankAccount.count({
        where: { entityId: entity.id },
      });
      const isPrimary = dto.isPrimary === true || existing === 0;
      if (isPrimary) {
        await tx.bankAccount.updateMany({
          where: { entityId: entity.id },
          data: { isPrimary: false },
        });
      }

      const account = await tx.bankAccount.create({
        data: {
          entityId: entity.id,
          bankName: dto.bankName,
          accountNumber: normaliseAccountNumber(dto.accountNumber)!,
          openingBalance: dto.openingBalance,
          isPrimary,
        },
      });
      await audit(tx, userId, AuditAction.CREATED, 'BankAccount', account);
      return account;
    });
  }

  async updateBankAccount(
    buildingId: string,
    userId: string,
    id: string,
    dto: UpdateBankAccountDto,
  ) {
    const entity = await this.entityFor(buildingId);

    return this.prisma.$transaction(async (tx) => {
      const account = await tx.bankAccount.findFirstOrThrow({
        where: { id, entityId: entity.id },
      });

      const accountNumber =
        dto.accountNumber && normaliseAccountNumber(dto.accountNumber)!;
      const changesBooks =
        (accountNumber !== undefined &&
          accountNumber !== account.accountNumber) ||
        (dto.openingBalance !== undefined &&
          !account.openingBalance.equals(dto.openingBalance));
      if (changesBooks) {
        const transactions = await tx.financeTransaction.count({
          where: { bankAccountId: id },
        });
        if (transactions > 0) {
          throw new ConflictException(
            'Broj računa i početno stanje se ne mogu menjati nakon prve transakcije',
          );
        }
      }

      if (account.isPrimary && dto.isPrimary === false) {
        throw new ConflictException(
          'Postavite drugi račun kao primarni umesto ovoga',
        );
      }
      const isPrimary = dto.isPrimary ?? account.isPrimary;
      const isActive = dto.isActive ?? account.isActive;
      if (isPrimary && !isActive) {
        throw new ConflictException('Primarni račun ne može biti deaktiviran');
      }
      if (dto.isPrimary && !account.isPrimary) {
        await tx.bankAccount.updateMany({
          where: { entityId: entity.id },
          data: { isPrimary: false },
        });
      }

      const updated = await tx.bankAccount.update({
        where: { id },
        data: {
          bankName: dto.bankName,
          accountNumber,
          openingBalance: dto.openingBalance,
          isPrimary: dto.isPrimary,
          isActive: dto.isActive,
        },
      });
      await audit(tx, userId, AuditAction.UPDATED, 'BankAccount', updated);
      return updated;
    });
  }

  // ─── Summary ───────────────────────────────────────────────────

  async summary(buildingId: string, query: DateRangeQueryDto) {
    const entity = await this.entityFor(buildingId);
    const { from, to } = resolveRange(query);

    const [accounts, before, upTo, grouped, categories] = await Promise.all([
      this.prisma.bankAccount.aggregate({
        where: { entityId: entity.id },
        _sum: { openingBalance: true },
      }),
      this.movementsByAccount(entity.id, { lt: from }),
      this.movementsByAccount(entity.id, { lte: to }),
      this.prisma.financeTransaction.groupBy({
        by: ['categoryId', 'direction'],
        where: {
          bankAccount: { entityId: entity.id },
          valueDate: { gte: from, lte: to },
        },
        _sum: { amount: true },
      }),
      this.prisma.financeCategory.findMany({ where: { entityId: entity.id } }),
    ]);

    const openingTotal = accounts._sum.openingBalance ?? ZERO;
    const sumOf = (m: Map<string, Decimal>) =>
      [...m.values()].reduce((sum, v) => sum.add(v), ZERO);

    // A category is netted in its own direction, so a storno of an expense
    // lowers that expense instead of showing up as income.
    const netByCategory = new Map<string, Decimal>();
    const byId = new Map(categories.map((c) => [c.id, c]));
    for (const row of grouped) {
      const category = byId.get(row.categoryId)!;
      const amount = row._sum.amount ?? ZERO;
      const signed =
        row.direction === category.direction ? amount : amount.neg();
      netByCategory.set(
        row.categoryId,
        (netByCategory.get(row.categoryId) ?? ZERO).add(signed),
      );
    }

    let income = ZERO;
    let expense = ZERO;
    let marketIncome = ZERO;
    const funds = new Map<
      FinanceFund | null,
      { income: Decimal; expense: Decimal }
    >();
    const byCategory = [...netByCategory].map(([categoryId, amount]) => {
      const category = byId.get(categoryId)!;
      const isIncome = category.direction === FinanceDirection.INCOME;
      if (isIncome) income = income.add(amount);
      else expense = expense.add(amount);
      if (category.isMarketIncome) marketIncome = marketIncome.add(amount);

      const fund = funds.get(category.fund) ?? { income: ZERO, expense: ZERO };
      if (isIncome) fund.income = fund.income.add(amount);
      else fund.expense = fund.expense.add(amount);
      funds.set(category.fund, fund);

      return {
        categoryId,
        name: category.name,
        direction: category.direction,
        fund: category.fund,
        amount: amount.toFixed(2),
      };
    });

    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      openingBalance: openingTotal.add(sumOf(before)).toFixed(2),
      closingBalance: openingTotal.add(sumOf(upTo)).toFixed(2),
      income: income.toFixed(2),
      expense: expense.toFixed(2),
      net: income.sub(expense).toFixed(2),
      marketIncome: marketIncome.toFixed(2),
      byFund: [...funds].map(([fund, totals]) => ({
        fund,
        income: totals.income.toFixed(2),
        expense: totals.expense.toFixed(2),
      })),
      byCategory: byCategory.sort((a, b) => a.name.localeCompare(b.name, 'sr')),
    };
  }

  /** Σ income − Σ expense per bank account, optionally limited by value date. */
  private async movementsByAccount(
    entityId: string,
    valueDate?: Prisma.DateTimeFilter,
  ) {
    const rows = await this.prisma.financeTransaction.groupBy({
      by: ['bankAccountId', 'direction'],
      where: { bankAccount: { entityId }, valueDate },
      _sum: { amount: true },
    });
    const result = new Map<string, Decimal>();
    for (const row of rows) {
      const amount = row._sum.amount ?? ZERO;
      const signed =
        row.direction === FinanceDirection.INCOME ? amount : amount.neg();
      result.set(
        row.bankAccountId,
        (result.get(row.bankAccountId) ?? ZERO).add(signed),
      );
    }
    return result;
  }

  // ─── Categories ────────────────────────────────────────────────

  async categories(buildingId: string) {
    const entity = await this.entityFor(buildingId);
    return this.prisma.financeCategory.findMany({
      where: { entityId: entity.id },
      orderBy: [{ direction: 'asc' }, { name: 'asc' }],
    });
  }

  async createCategory(
    buildingId: string,
    userId: string,
    dto: CreateCategoryDto,
  ) {
    const entity = await this.entityFor(buildingId);
    assertIncomeFlags(dto.direction, dto);

    return this.prisma.$transaction(async (tx) => {
      const category = await tx.financeCategory.create({
        data: { entityId: entity.id, ...dto },
      });
      await audit(tx, userId, AuditAction.CREATED, 'FinanceCategory', category);
      return category;
    });
  }

  async updateCategory(
    buildingId: string,
    userId: string,
    id: string,
    dto: UpdateCategoryDto,
  ) {
    const entity = await this.entityFor(buildingId);

    return this.prisma.$transaction(async (tx) => {
      const category = await tx.financeCategory.findFirstOrThrow({
        where: { id, entityId: entity.id },
      });
      assertIncomeFlags(category.direction, dto);

      const updated = await tx.financeCategory.update({
        where: { id },
        data: dto,
      });
      await audit(tx, userId, AuditAction.UPDATED, 'FinanceCategory', updated);
      return updated;
    });
  }

  // ─── Suppliers ─────────────────────────────────────────────────

  async suppliers(buildingId: string) {
    const entity = await this.entityFor(buildingId);
    return this.prisma.supplier.findMany({
      where: { entityId: entity.id },
      orderBy: { name: 'asc' },
    });
  }

  async createSupplier(
    buildingId: string,
    userId: string,
    dto: CreateSupplierDto,
  ) {
    const entity = await this.entityFor(buildingId);

    return this.prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.create({
        data: {
          entityId: entity.id,
          ...dto,
          bankAccount:
            dto.bankAccount && normaliseAccountNumber(dto.bankAccount),
        },
      });
      await audit(tx, userId, AuditAction.CREATED, 'Supplier', supplier);
      return supplier;
    });
  }

  async updateSupplier(
    buildingId: string,
    userId: string,
    id: string,
    dto: UpdateSupplierDto,
  ) {
    const entity = await this.entityFor(buildingId);

    return this.prisma.$transaction(async (tx) => {
      await tx.supplier.findFirstOrThrow({
        where: { id, entityId: entity.id },
      });
      const updated = await tx.supplier.update({
        where: { id },
        data: {
          ...dto,
          bankAccount:
            dto.bankAccount && normaliseAccountNumber(dto.bankAccount),
        },
      });
      await audit(tx, userId, AuditAction.UPDATED, 'Supplier', updated);
      return updated;
    });
  }
}

function assertIncomeFlags(
  direction: FinanceDirection,
  flags: { isOwnerPayment?: boolean; isMarketIncome?: boolean },
) {
  if (
    direction !== FinanceDirection.INCOME &&
    (flags.isOwnerPayment || flags.isMarketIncome)
  ) {
    throw new UnprocessableEntityException(
      'Samo kategorije prihoda mogu biti uplate vlasnika ili tržišni prihod',
    );
  }
}
