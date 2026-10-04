import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AuditAction,
  FeeMethod,
  FinanceDirection,
  FinanceEntity,
  FinanceFund,
  Prisma,
  UnitChargeType,
  UnitType,
} from '../prisma';
import { Access } from '../auth/access/auth-user';
import { canViewUnitLedger, isStaff } from '../auth/access/policies';
import { NotificationsService } from '../notifications/notifications.service';
import { audit } from './finance-audit';
import { FinanceService } from './finance.service';
import { formatRSD, model97Reference, today } from './finance.util';
import {
  chargeAmount,
  periodOf,
  periodStart,
  rangesOverlap,
  rulesFor,
  unitStatus,
} from './charges.util';
import { CreateFeeRuleDto, UpdateFeeRuleDto } from './dto/fee-rule.dto';
import {
  CancelChargeDto,
  CreateAdjustmentDto,
  OpeningBalanceDto,
} from './dto/charge.dto';

const { Decimal } = Prisma;
type Decimal = Prisma.Decimal;

const ZERO = new Decimal(0);
const REMINDER_INTERVAL_MS = 7 * 86_400_000;

/**
 * NEW: nothing issued yet. ISSUED: an active charge with this amount.
 * CHANGED: an active charge with a different amount (0 = no rule any more).
 * CANCELLED: the charge was cancelled by hand; only regenerate reissues it.
 */
type LineStatus = 'NEW' | 'ISSUED' | 'CHANGED' | 'CANCELLED';

interface PlanLine {
  fund: FinanceFund;
  method: FeeMethod | null;
  rate: Decimal | null;
  amount: Decimal | null;
  issuedAmount: Decimal | null;
  status: LineStatus;
  activeChargeId: string | null;
}

interface PlanUnit {
  unitId: string;
  unitNumber: string;
  type: UnitType;
  areaSqm: Decimal | null;
  userId: string | null;
  lines: PlanLine[];
}

// Floor first, then unit number in natural order ("2" before "10").
function byPosition(
  a: { floor: number | null; unitNumber: string },
  b: { floor: number | null; unitNumber: string },
) {
  return (
    (a.floor ?? 0) - (b.floor ?? 0) ||
    a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true })
  );
}

const monthName = new Intl.DateTimeFormat('sr-Latn-RS', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

@Injectable()
export class ChargesService {
  constructor(
    private prisma: PrismaService,
    private finance: FinanceService,
    private notifications: NotificationsService,
  ) {}

  // ─── Fee rules ─────────────────────────────────────────────────

  async feeRules(buildingId: string) {
    const entity = await this.finance.entityFor(buildingId);
    return this.prisma.feeRule.findMany({
      where: { entityId: entity.id },
      include: { decisionDocument: { select: { id: true, title: true } } },
      orderBy: [{ fund: 'asc' }, { unitType: 'asc' }, { validFrom: 'desc' }],
    });
  }

  async createFeeRule(
    buildingId: string,
    userId: string,
    dto: CreateFeeRuleDto,
  ) {
    const entity = await this.finance.entityFor(buildingId);
    const data = {
      fund: dto.fund,
      method: dto.method,
      amount: new Decimal(dto.amount),
      unitType: dto.unitType ?? null,
      validFrom: dto.validFrom,
      validTo: dto.validTo ?? null,
      decisionDocumentId: dto.decisionDocumentId ?? null,
    };

    return this.prisma.$transaction(async (tx) => {
      await this.assertFeeRule(tx, buildingId, entity.id, data, null);
      const created = await tx.feeRule.create({
        data: { entityId: entity.id, ...data },
      });
      await audit(tx, userId, AuditAction.CREATED, 'FeeRule', created);
      return created;
    });
  }

  async updateFeeRule(
    buildingId: string,
    userId: string,
    id: string,
    dto: UpdateFeeRuleDto,
  ) {
    const entity = await this.finance.entityFor(buildingId);

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.feeRule.findFirstOrThrow({
        where: { id, entityId: entity.id },
      });
      const data = {
        fund: dto.fund ?? existing.fund,
        method: dto.method ?? existing.method,
        amount: dto.amount ? new Decimal(dto.amount) : existing.amount,
        unitType: dto.unitType === undefined ? existing.unitType : dto.unitType,
        validFrom: dto.validFrom ?? existing.validFrom,
        validTo: dto.validTo === undefined ? existing.validTo : dto.validTo,
        decisionDocumentId:
          dto.decisionDocumentId === undefined
            ? existing.decisionDocumentId
            : dto.decisionDocumentId,
      };
      await this.assertFeeRule(tx, buildingId, entity.id, data, id);
      const updated = await tx.feeRule.update({ where: { id }, data });
      await audit(tx, userId, AuditAction.UPDATED, 'FeeRule', updated);
      return updated;
    });
  }

  // One rule per fund and unit type at any time, so a month never has two rates.
  private async assertFeeRule(
    tx: Prisma.TransactionClient,
    buildingId: string,
    entityId: string,
    rule: {
      fund: FinanceFund;
      unitType: UnitType | null;
      validFrom: string;
      validTo: string | null;
      decisionDocumentId: string | null;
    },
    excludeId: string | null,
  ) {
    if (rule.validTo !== null && rule.validTo < rule.validFrom) {
      throw new UnprocessableEntityException(
        'Kraj važenja ne može biti pre početka',
      );
    }
    if (rule.decisionDocumentId) {
      await tx.document.findFirstOrThrow({
        where: { id: rule.decisionDocumentId, buildingId },
      });
    }
    const siblings = await tx.feeRule.findMany({
      where: {
        entityId,
        fund: rule.fund,
        unitType: rule.unitType,
        id: excludeId ? { not: excludeId } : undefined,
      },
    });
    if (siblings.some((other) => rangesOverlap(rule, other))) {
      throw new ConflictException(
        'Za ovaj fond i tip jedinice već postoji pravilo u tom periodu',
      );
    }
  }

  // ─── Monthly charges ───────────────────────────────────────────

  async preview(buildingId: string, period: string) {
    const entity = await this.finance.entityFor(buildingId);
    const plan = await this.plan(this.prisma, entity, period);
    const missingArea = this.missingArea(plan);

    const units = plan.map((unit) => ({
      unitId: unit.unitId,
      unitNumber: unit.unitNumber,
      type: unit.type,
      areaSqm: unit.areaSqm,
      lines: unit.lines.map(({ activeChargeId: _, ...line }) => line),
      total: sum(unit.lines.map((l) => l.amount ?? ZERO)).toFixed(2),
      missingArea: unit.lines.some((l) => l.amount === null),
    }));
    return {
      period,
      issueDate: periodStart(period),
      units,
      total: sum(units.map((u) => new Decimal(u.total))).toFixed(2),
      missingArea,
      canGenerate: this.periodError(entity, period) === null,
    };
  }

  /** Issues the period's charges that were never issued. Safe to repeat. */
  async generate(buildingId: string, userId: string, period: string) {
    const entity = await this.finance.entityFor(buildingId);
    return this.issue(entity, period, userId, false);
  }

  /** Brings the period in line with the current rules: cancels changed charges and reissues. */
  async regenerate(buildingId: string, userId: string, period: string) {
    const entity = await this.finance.entityFor(buildingId);
    return this.issue(entity, period, userId, true);
  }

  /** userId is null when the scheduler issues the charges. */
  async issue(
    entity: FinanceEntity,
    period: string,
    userId: string | null,
    regenerate: boolean,
  ) {
    const error = this.periodError(entity, period);
    if (error) throw new UnprocessableEntityException(error);
    const buildingId = entity.buildingId!;

    const { changedUnits, issued, cancelled } = await this.prisma.$transaction(
      async (tx) => {
        await lockEntity(tx, entity.id);
        const plan = await this.plan(tx, entity, period);
        const missingArea = this.missingArea(plan);
        if (missingArea.length > 0) {
          throw new UnprocessableEntityException(
            `Nedostaje površina za stanove: ${missingArea.join(', ')}`,
          );
        }

        const toCancel: string[] = [];
        const toIssue: Prisma.UnitChargeCreateManyInput[] = [];
        const changedUnits = new Set<PlanUnit>();
        for (const unit of plan) {
          for (const line of unit.lines) {
            const reissue = regenerate
              ? line.status !== 'ISSUED'
              : line.status === 'NEW';
            if (!reissue) continue;
            if (line.activeChargeId) toCancel.push(line.activeChargeId);
            if (line.amount!.gt(0)) {
              toIssue.push({
                entityId: entity.id,
                unitId: unit.unitId,
                type: UnitChargeType.MONTHLY,
                period,
                issueDate: periodStart(period),
                fund: line.fund,
                amount: line.amount!,
                createdBy: userId,
              });
            }
            changedUnits.add(unit);
          }
        }

        const cancelled = await tx.unitCharge.updateManyAndReturn({
          where: { id: { in: toCancel } },
          data: {
            cancelledAt: new Date(),
            cancelReason: 'Ponovni obračun',
          },
        });
        const issued = await tx.unitCharge.createManyAndReturn({
          data: toIssue,
        });
        // Scheduler runs have no user to attribute an audit row to.
        if (userId) {
          await tx.auditLog.createMany({
            data: [
              ...cancelled.map((c) => auditRow(userId, AuditAction.UPDATED, c)),
              ...issued.map((c) => auditRow(userId, AuditAction.CREATED, c)),
            ],
          });
        }
        await this.assignPaymentReferences(tx, buildingId);
        return { changedUnits: [...changedUnits], issued, cancelled };
      },
    );

    await this.notifyCharges(buildingId, period, changedUnits, regenerate);
    return {
      period,
      issuedCount: issued.length,
      cancelledCount: cancelled.length,
      unitCount: changedUnits.length,
      total: sum(issued.map((c) => c.amount)).toFixed(2),
    };
  }

  private async plan(
    db: Prisma.TransactionClient,
    entity: FinanceEntity,
    period: string,
  ): Promise<PlanUnit[]> {
    // Sequential: inside a transaction they share one connection.
    const rules = await db.feeRule.findMany({
      where: { entityId: entity.id },
      orderBy: { fund: 'asc' },
    });
    const units = await db.unit.findMany({
      where: { buildingId: entity.buildingId! },
    });
    const charges = await db.unitCharge.findMany({
      where: { entityId: entity.id, period, type: UnitChargeType.MONTHLY },
    });

    return units.sort(byPosition).map((unit) => {
      const own = charges.filter((c) => c.unitId === unit.id);
      const lines: PlanLine[] = [];
      const funds = new Set<FinanceFund>();
      for (const rule of rulesFor(rules, period, unit.type).values()) {
        funds.add(rule.fund);
        const amount = rule.amount.isZero()
          ? ZERO
          : chargeAmount(rule, unit.areaSqm);
        lines.push(planLine(rule.fund, rule, amount, own));
      }
      // Active charges whose rule no longer applies: regenerate cancels them.
      for (const charge of own) {
        if (charge.cancelledAt || !charge.fund || funds.has(charge.fund)) {
          continue;
        }
        funds.add(charge.fund);
        lines.push(planLine(charge.fund, null, ZERO, own));
      }
      return {
        unitId: unit.id,
        unitNumber: unit.unitNumber,
        type: unit.type,
        areaSqm: unit.areaSqm,
        userId: unit.userId,
        // A zero rate exempts the unit; show it only if something was issued.
        lines: lines.filter(
          (l) => l.amount === null || !l.amount.isZero() || l.issuedAmount,
        ),
      };
    });
  }

  private missingArea(plan: PlanUnit[]) {
    return plan
      .filter((u) => u.lines.some((l) => l.amount === null))
      .map((u) => u.unitNumber);
  }

  // Charges can be issued from the month the books start up to the current month.
  private periodError(entity: FinanceEntity, period: string) {
    if (period < periodOf(entity.booksStartDate)) {
      return 'Period je pre početka knjiženja';
    }
    if (period > periodOf(today())) {
      return 'Zaduženje se ne može izdati za budući mesec';
    }
    return null;
  }

  private async notifyCharges(
    buildingId: string,
    period: string,
    units: PlanUnit[],
    regenerate: boolean,
  ) {
    const recipients = units.filter((u) => u.userId);
    if (recipients.length === 0) return;

    const [totals, references] = await Promise.all([
      this.prisma.unitCharge.groupBy({
        by: ['unitId'],
        where: {
          unitId: { in: recipients.map((u) => u.unitId) },
          period,
          type: UnitChargeType.MONTHLY,
          cancelledAt: null,
        },
        _sum: { amount: true },
      }),
      this.prisma.unit.findMany({
        where: { buildingId, id: { in: recipients.map((u) => u.unitId) } },
        select: { id: true, paymentReference: true },
      }),
    ]);
    const month = monthName.format(periodStart(period));
    const title = regenerate
      ? `Izmenjeno zaduženje za ${month}`
      : `Novo zaduženje za ${month}`;

    await Promise.all(
      recipients.map((unit) => {
        const total = totals.find((t) => t.unitId === unit.unitId)?._sum.amount;
        const reference = references.find(
          (r) => r.id === unit.unitId,
        )?.paymentReference;
        const body = `Iznos za stan ${unit.unitNumber}: ${formatRSD(total ?? ZERO)}. Poziv na broj: 97 ${reference}.`;
        return this.notifications.create(
          unit.userId!,
          title,
          body,
          '/finances',
        );
      }),
    );
  }

  // ─── Single unit ───────────────────────────────────────────────

  async cancelCharge(
    buildingId: string,
    userId: string,
    id: string,
    dto: CancelChargeDto,
  ) {
    const entity = await this.finance.entityFor(buildingId);
    return this.prisma.$transaction(async (tx) => {
      const charge = await tx.unitCharge.findFirstOrThrow({
        where: { id, entityId: entity.id },
      });
      if (charge.cancelledAt) {
        throw new ConflictException('Zaduženje je već stornirano');
      }
      const updated = await tx.unitCharge.update({
        where: { id },
        data: { cancelledAt: new Date(), cancelReason: dto.reason },
      });
      await audit(tx, userId, AuditAction.UPDATED, 'UnitCharge', updated);
      return updated;
    });
  }

  /** Debt (or prepayment) carried over from before the books start; one per unit. */
  async openingBalance(
    buildingId: string,
    userId: string,
    unitId: string,
    dto: OpeningBalanceDto,
  ) {
    const entity = await this.finance.entityFor(buildingId);
    return this.prisma.$transaction(async (tx) => {
      await tx.unit.findFirstOrThrow({ where: { id: unitId, buildingId } });
      await lockEntity(tx, entity.id);
      const existing = await tx.unitCharge.count({
        where: { unitId, type: UnitChargeType.OPENING, cancelledAt: null },
      });
      if (existing > 0) {
        throw new ConflictException(
          'Početno stanje za ovaj stan je već uneto; stornirajte ga da biste uneli novo',
        );
      }
      const created = await tx.unitCharge.create({
        data: {
          entityId: entity.id,
          unitId,
          type: UnitChargeType.OPENING,
          period: periodOf(entity.booksStartDate),
          issueDate: entity.booksStartDate,
          amount: dto.amount,
          description: 'Početno stanje',
          createdBy: userId,
        },
      });
      await audit(tx, userId, AuditAction.CREATED, 'UnitCharge', created);
      return created;
    });
  }

  /** A one-off charge or credit, issued today. */
  async adjustment(
    buildingId: string,
    userId: string,
    unitId: string,
    dto: CreateAdjustmentDto,
  ) {
    const entity = await this.finance.entityFor(buildingId);
    const issueDate = today();
    if (issueDate < entity.booksStartDate) {
      throw new UnprocessableEntityException('Knjiženje još nije počelo');
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.unit.findFirstOrThrow({ where: { id: unitId, buildingId } });
      const created = await tx.unitCharge.create({
        data: {
          entityId: entity.id,
          unitId,
          type: UnitChargeType.ADJUSTMENT,
          period: periodOf(issueDate),
          issueDate,
          fund: dto.fund,
          amount: dto.amount,
          description: dto.description,
          createdBy: userId,
        },
      });
      await audit(tx, userId, AuditAction.CREATED, 'UnitCharge', created);
      return created;
    });
  }

  async ledger(
    buildingId: string,
    userId: string,
    access: Access,
    unitId: string,
  ) {
    const entity = await this.finance.entityFor(buildingId);
    const found = await this.prisma.unit.findFirstOrThrow({
      where: { id: unitId, buildingId },
      include: { buildingMember: { select: { userId: true } } },
    });
    if (!canViewUnitLedger(access, found, userId)) {
      throw new ForbiddenException('Možete videti samo zaduženja svog stana');
    }

    const unit = found.paymentReference
      ? found
      : await this.prisma.$transaction(async (tx) => {
          await lockEntity(tx, entity.id);
          await this.assignPaymentReferences(tx, buildingId);
          return tx.unit.findUniqueOrThrow({ where: { id: unitId } });
        });

    const [charges, payments, account] = await Promise.all([
      this.prisma.unitCharge.findMany({
        where: { unitId },
        orderBy: [{ issueDate: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.financeTransaction.findMany({
        where: {
          unitId,
          bankAccount: { entityId: entity.id },
          category: { isOwnerPayment: true },
        },
        orderBy: [{ valueDate: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.bankAccount.findFirst({
        where: { entityId: entity.id, isActive: true },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      }),
    ]);

    const entries = [
      ...charges.map((c) => ({
        kind: 'CHARGE' as const,
        id: c.id,
        date: c.issueDate,
        createdAt: c.createdAt,
        type: c.type,
        fund: c.fund,
        period: c.period,
        description: c.description,
        amount: c.amount,
        cancelledAt: c.cancelledAt,
        cancelReason: c.cancelReason,
      })),
      ...payments.map((p) => ({
        kind: 'PAYMENT' as const,
        id: p.id,
        date: p.valueDate,
        createdAt: p.createdAt,
        isReversal: p.reversesId !== null,
        // Effect on the debt: a payment lowers it, its storno raises it back.
        amount:
          p.direction === FinanceDirection.INCOME ? p.amount.neg() : p.amount,
      })),
    ].sort(
      (a, b) =>
        a.date.getTime() - b.date.getTime() ||
        a.createdAt.getTime() - b.createdAt.getTime(),
    );

    let running = ZERO;
    const withBalance = entries.map((entry) => {
      const cancelled = entry.kind === 'CHARGE' && entry.cancelledAt !== null;
      if (!cancelled) running = running.add(entry.amount);
      return { ...entry, balanceAfter: running.toFixed(2) };
    });

    const status = unitStatus(
      charges.filter((c) => !c.cancelledAt),
      paidAmount(payments),
      entity.paymentTermDays,
      today(),
    );

    return {
      unit: {
        id: unit.id,
        unitNumber: unit.unitNumber,
        type: unit.type,
        areaSqm: unit.areaSqm,
      },
      payTo: {
        recipient: entity.legalName,
        accountNumber: account?.accountNumber ?? null,
        model: '97',
        reference: unit.paymentReference,
      },
      paymentTermDays: entity.paymentTermDays,
      balance: status.balance.toFixed(2),
      overdueAmount: status.overdueAmount.toFixed(2),
      overdueSince: status.overdueSince,
      entries: withBalance.reverse(),
    };
  }

  // ─── Arrears ───────────────────────────────────────────────────

  /** Staff get every unit; residents only the building totals. */
  async arrears(buildingId: string, access: Access) {
    const entity = await this.finance.entityFor(buildingId);
    const units = await this.unitStatuses(entity);

    const totalCharged = sum(units.map((u) => u.charged));
    const totalPaid = sum(units.map((u) => u.paid));
    const summary = {
      totalCharged: totalCharged.toFixed(2),
      totalPaid: totalPaid.toFixed(2),
      totalOutstanding: sum(
        units.map((u) => Decimal.max(u.balance, ZERO)),
      ).toFixed(2),
      totalOverdue: sum(units.map((u) => u.overdueAmount)).toFixed(2),
      unitsInArrears: units.filter((u) => u.overdueAmount.gt(0)).length,
      unitCount: units.length,
      // Share of everything charged so far that has been paid, in percent.
      collectionRate: totalCharged.gt(0)
        ? Decimal.min(totalPaid.div(totalCharged).mul(100), 100)
            .toDecimalPlaces(1)
            .toNumber()
        : null,
    };
    if (!isStaff(access)) return summary;

    return {
      ...summary,
      units: units.map((u) => ({
        unitId: u.unitId,
        unitNumber: u.unitNumber,
        type: u.type,
        balance: u.balance.toFixed(2),
        overdueAmount: u.overdueAmount.toFixed(2),
        overdueSince: u.overdueSince,
      })),
    };
  }

  private async unitStatuses(entity: FinanceEntity) {
    const [units, charges, payments] = await Promise.all([
      this.prisma.unit.findMany({
        where: { buildingId: entity.buildingId! },
      }),
      this.prisma.unitCharge.findMany({
        where: { entityId: entity.id, cancelledAt: null },
        orderBy: [{ issueDate: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.financeTransaction.groupBy({
        by: ['unitId', 'direction'],
        where: {
          unitId: { not: null },
          bankAccount: { entityId: entity.id },
          category: { isOwnerPayment: true },
        },
        _sum: { amount: true },
      }),
    ]);

    const now = today();
    return units.sort(byPosition).map((unit) => {
      const own = charges.filter((c) => c.unitId === unit.id);
      const paid = paidAmount(
        payments
          .filter((p) => p.unitId === unit.id)
          .map((p) => ({ direction: p.direction, amount: p._sum.amount! })),
      );
      return {
        unitId: unit.id,
        unitNumber: unit.unitNumber,
        type: unit.type,
        userId: unit.userId,
        lastReminderAt: unit.lastReminderAt,
        charged: sum(own.map((c) => c.amount)),
        paid,
        ...unitStatus(own, paid, entity.paymentTermDays, now),
      };
    });
  }

  // ─── Reminders ─────────────────────────────────────────────────

  /** Notifies unit accounts with overdue debt, at most once a week per unit. */
  async remindOverdue() {
    const entities = await this.prisma.financeEntity.findMany({
      where: { buildingId: { not: null } },
    });
    const cutoff = new Date(Date.now() - REMINDER_INTERVAL_MS);
    let sent = 0;

    for (const entity of entities) {
      const due = (await this.unitStatuses(entity)).filter(
        (u) =>
          u.userId &&
          u.overdueAmount.gt(0) &&
          (!u.lastReminderAt || u.lastReminderAt < cutoff),
      );
      for (const unit of due) {
        await this.notifications.create(
          unit.userId!,
          'Podsetnik: dospelo dugovanje',
          `Stan ${unit.unitNumber} ima dospelo dugovanje od ${formatRSD(unit.overdueAmount)}.`,
          '/finances',
        );
        await this.prisma.unit.update({
          where: { id: unit.unitId },
          data: { lastReminderAt: new Date() },
        });
        sent++;
      }
    }
    return sent;
  }

  // ─── Payment references ────────────────────────────────────────

  /**
   * Gives every unit without one a stable poziv na broj: a per-building
   * sequence in floor/unit order, with model 97 control digits.
   * Callers hold the entity lock, so two requests never pick the same number.
   */
  private async assignPaymentReferences(
    tx: Prisma.TransactionClient,
    buildingId: string,
  ) {
    const units = await tx.unit.findMany({ where: { buildingId } });
    const missing = units.filter((u) => !u.paymentReference).sort(byPosition);
    if (missing.length === 0) return;

    let last = Math.max(
      0,
      ...units
        .filter((u) => u.paymentReference)
        .map((u) => Number(u.paymentReference!.split('-')[1])),
    );
    for (const unit of missing) {
      last++;
      await tx.unit.update({
        where: { id: unit.id },
        data: {
          paymentReference: model97Reference(String(last).padStart(4, '0')),
        },
      });
    }
  }
}

function planLine(
  fund: FinanceFund,
  rule: { method: FeeMethod; amount: Decimal } | null,
  amount: Decimal | null,
  charges: {
    id: string;
    fund: FinanceFund | null;
    amount: Decimal;
    cancelledAt: Date | null;
  }[],
): PlanLine {
  const ofFund = charges.filter((c) => c.fund === fund);
  const active = ofFund.find((c) => !c.cancelledAt) ?? null;
  let status: LineStatus;
  if (active) {
    status = amount !== null && active.amount.eq(amount) ? 'ISSUED' : 'CHANGED';
  } else {
    status = ofFund.length > 0 ? 'CANCELLED' : 'NEW';
  }
  return {
    fund,
    method: rule?.method ?? null,
    rate: rule?.amount ?? null,
    amount,
    issuedAmount: active?.amount ?? null,
    status,
    activeChargeId: active?.id ?? null,
  };
}

function sum(values: Decimal[]) {
  return values.reduce((total, v) => total.add(v), ZERO);
}

// Owner payments net of their stornos.
function paidAmount(
  payments: { direction: FinanceDirection; amount: Decimal }[],
) {
  return payments.reduce(
    (total, p) =>
      p.direction === FinanceDirection.INCOME
        ? total.add(p.amount)
        : total.sub(p.amount),
    ZERO,
  );
}

function auditRow(
  performedBy: string,
  action: AuditAction,
  charge: { id: string },
) {
  return {
    entityType: 'UnitCharge',
    entityId: charge.id,
    action,
    performedBy,
    snapshot: JSON.parse(JSON.stringify(charge)) as Prisma.InputJsonValue,
  };
}

// Serialises charge generation and payment-reference assignment per HOA.
function lockEntity(tx: Prisma.TransactionClient, entityId: string) {
  return tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'finance-charges:' + entityId}))`;
}
