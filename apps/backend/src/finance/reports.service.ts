import { randomUUID } from 'crypto';
import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AuditAction,
  DocumentCategory,
  FinanceEntity,
  Prisma,
} from '../prisma';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';
import { audit } from './finance-audit';
import { ChargesService } from './charges.service';
import { FinanceService } from './finance.service';
import { InvoicesService } from './invoices.service';
import { formatDate, toDate, today } from './finance.util';
import { renderReport } from './reports/report-pdf';
import { ReportRangeDto } from './dto/report.dto';

const REPORT_INCLUDE = {
  document: { select: { id: true, title: true, fileId: true } },
  publisher: {
    select: { id: true, username: true, firstName: true, lastName: true },
  },
} satisfies Prisma.FinanceReportInclude;

/** Published financial reports. Publishing locks the report's period. */
@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private finance: FinanceService,
    private invoices: InvoicesService,
    private charges: ChargesService,
    private notifications: NotificationsService,
  ) {}

  async list(buildingId: string) {
    const entity = await this.finance.entityFor(buildingId);
    return this.prisma.financeReport.findMany({
      where: { entityId: entity.id },
      include: REPORT_INCLUDE,
      orderBy: [{ from: 'desc' }, { publishedAt: 'desc' }],
    });
  }

  /** The PDF as it would be published, without saving or locking anything. */
  async preview(buildingId: string, dto: ReportRangeDto) {
    const entity = await this.finance.entityFor(buildingId);
    const { from, to } = rangeOf(entity, dto);
    return this.render(buildingId, entity, from, to, null);
  }

  async publish(buildingId: string, userId: string, dto: ReportRangeDto) {
    const entity = await this.finance.entityFor(buildingId);
    const { from, to } = rangeOf(entity, dto);
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const name =
      [user.firstName, user.lastName].filter(Boolean).join(' ') ||
      user.username;
    const pdf = await this.render(buildingId, entity, from, to, name);

    const period = `${formatDate(from)} – ${formatDate(to)}`;
    const storageKey = `buildings/${buildingId}/${randomUUID()}.pdf`;
    await this.storage.put(storageKey, pdf, 'application/pdf');

    const report = await this.prisma.$transaction(async (tx) => {
      const file = await tx.storedFile.create({
        data: {
          buildingId,
          uploadedBy: userId,
          storageKey,
          fileName: `finansijski-izvestaj-${dto.from}-${dto.to}.pdf`,
          mimeType: 'application/pdf',
          sizeBytes: pdf.length,
        },
      });
      const document = await tx.document.create({
        data: {
          buildingId,
          uploadedBy: userId,
          title: `Finansijski izveštaj ${period}`,
          fileId: file.id,
          fileType: 'pdf',
          category: DocumentCategory.REPORT,
        },
      });
      const created = await tx.financeReport.create({
        data: {
          entityId: entity.id,
          from,
          to,
          documentId: document.id,
          publishedBy: userId,
        },
        include: REPORT_INCLUDE,
      });
      await audit(tx, userId, AuditAction.CREATED, 'FinanceReport', created);
      return created;
    });

    const members = await this.prisma.buildingMember.findMany({
      where: { buildingId, isActive: true, userId: { not: userId } },
      select: { userId: true },
    });
    await Promise.all(
      members.map((m) =>
        this.notifications.create(
          m.userId,
          'Objavljen finansijski izveštaj',
          `Izveštaj o prihodima i rashodima za period ${period} je dostupan.`,
          '/finances',
        ),
      ),
    );
    return report;
  }

  private async render(
    buildingId: string,
    entity: FinanceEntity,
    from: Date,
    to: Date,
    publishedBy: string | null,
  ) {
    const range = { from: iso(from), to: iso(to) };
    const [summary, accounts, invoices, arrears] = await Promise.all([
      this.finance.summary(buildingId, range),
      this.finance.accountBalances(entity.id, from, to),
      this.invoices.list(buildingId, range),
      this.charges.arrearsAsOf(entity, to),
    ]);
    return renderReport({
      entity,
      from,
      to,
      publishedBy,
      publishedAt: new Date(),
      accounts,
      summary,
      invoices: invoices.reverse(),
      arrears,
    });
  }
}

function rangeOf(entity: FinanceEntity, dto: ReportRangeDto) {
  const from = toDate(dto.from);
  const to = toDate(dto.to);
  if (from > to) {
    throw new UnprocessableEntityException(
      'Datum „od“ ne može biti posle datuma „do“',
    );
  }
  if (from < entity.booksStartDate) {
    throw new UnprocessableEntityException(
      'Izveštaj ne može početi pre početka knjiženja',
    );
  }
  if (to > today()) {
    throw new UnprocessableEntityException(
      'Izveštaj ne može obuhvatiti budući period',
    );
  }
  return { from, to };
}

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}
