import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction, Prisma } from '../prisma';
import { audit } from './finance-audit';
import { FinanceService } from './finance.service';
import { toDate } from './finance.util';
import { UpsertBudgetDto } from './dto/budget.dto';

const BUDGET_INCLUDE = {
  decisionDocument: { select: { id: true, title: true } },
  lines: {
    include: {
      category: {
        select: { id: true, name: true, direction: true, fund: true },
      },
    },
    orderBy: { category: { name: 'asc' } },
  },
} satisfies Prisma.BudgetInclude;

/** Program održavanja: the yearly plan per category. */
@Injectable()
export class BudgetsService {
  constructor(
    private prisma: PrismaService,
    private finance: FinanceService,
  ) {}

  async list(buildingId: string) {
    const entity = await this.finance.entityFor(buildingId);
    return this.prisma.budget.findMany({
      where: { entityId: entity.id },
      include: BUDGET_INCLUDE,
      orderBy: { year: 'desc' },
    });
  }

  async findOne(buildingId: string, year: number) {
    const entity = await this.finance.entityFor(buildingId);
    return this.prisma.budget.findUniqueOrThrow({
      where: { entityId_year: { entityId: entity.id, year } },
      include: BUDGET_INCLUDE,
    });
  }

  async upsert(
    buildingId: string,
    userId: string,
    year: number,
    dto: UpsertBudgetDto,
  ) {
    const entity = await this.finance.entityFor(buildingId);
    if (year < 2000 || year > 2100) {
      throw new UnprocessableEntityException('Neispravna godina');
    }
    const ids = dto.lines.map((l) => l.categoryId);
    if (new Set(ids).size !== ids.length) {
      throw new UnprocessableEntityException(
        'Ista kategorija je navedena više puta',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const found = await tx.financeCategory.count({
        where: { id: { in: ids }, entityId: entity.id },
      });
      if (found !== ids.length) {
        throw new UnprocessableEntityException('Nepoznata kategorija');
      }
      if (dto.decisionDocumentId) {
        await tx.document.findFirstOrThrow({
          where: { id: dto.decisionDocumentId, buildingId },
        });
      }

      // PUT replaces the whole budget, so omitted fields are cleared.
      const data = {
        adoptedAt: dto.adoptedAt ? toDate(dto.adoptedAt) : null,
        decisionDocumentId: dto.decisionDocumentId ?? null,
      };
      const existing = await tx.budget.findUnique({
        where: { entityId_year: { entityId: entity.id, year } },
      });
      const budget = existing
        ? await tx.budget.update({ where: { id: existing.id }, data })
        : await tx.budget.create({
            data: { entityId: entity.id, year, ...data },
          });
      await tx.budgetLine.deleteMany({ where: { budgetId: budget.id } });
      await tx.budgetLine.createMany({
        data: dto.lines.map((line) => ({ budgetId: budget.id, ...line })),
      });

      const saved = await tx.budget.findUniqueOrThrow({
        where: { id: budget.id },
        include: BUDGET_INCLUDE,
      });
      await audit(
        tx,
        userId,
        existing ? AuditAction.UPDATED : AuditAction.CREATED,
        'Budget',
        saved,
      );
      return saved;
    });
  }
}
