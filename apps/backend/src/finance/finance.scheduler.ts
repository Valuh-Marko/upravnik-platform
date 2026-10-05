import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../prisma';
import { NotificationsService } from '../notifications/notifications.service';
import { ChargesService } from './charges.service';
import { periodOf } from './charges.util';
import { today } from './finance.util';

const TIME_ZONE = 'Europe/Belgrade';

@Injectable()
export class FinanceScheduler {
  private readonly logger = new Logger(FinanceScheduler.name);

  constructor(
    private prisma: PrismaService,
    private charges: ChargesService,
    private notifications: NotificationsService,
  ) {}

  /** Monthly charges for HOAs that opted in; a failure is reported to the upravnik. */
  @Cron('0 6 1 * *', { timeZone: TIME_ZONE })
  async generateMonthlyCharges() {
    const period = periodOf(today());
    const entities = await this.prisma.financeEntity.findMany({
      where: { autoGenerateCharges: true, buildingId: { not: null } },
    });

    for (const entity of entities) {
      try {
        await this.charges.issue(entity, period, null, false);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Charges for ${entity.id} (${period}) failed: ${message}`,
        );
        const staff = await this.prisma.buildingMember.findMany({
          where: {
            buildingId: entity.buildingId!,
            role: Role.UPRAVNIK,
            isActive: true,
          },
        });
        await Promise.all(
          staff.map((member) =>
            this.notifications.create(
              member.userId,
              'Automatsko zaduženje nije izdato',
              `Zaduženje za ${period} nije izdato: ${message}`,
              `/buildings/${entity.buildingId}/finances`,
            ),
          ),
        );
      }
    }
  }

  @Cron('0 9 * * *', { timeZone: TIME_ZONE })
  async remindOverdue() {
    const sent = await this.charges.remindOverdue();
    if (sent > 0) this.logger.log(`Sent ${sent} overdue reminders`);
  }
}
