import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { BudgetsService } from './budgets.service';
import { ChargesService } from './charges.service';
import { FinanceController } from './finance.controller';
import { FinanceScheduler } from './finance.scheduler';
import { FinanceService } from './finance.service';
import { ImportsService } from './imports.service';
import { InvoicesService } from './invoices.service';
import { ReportsService } from './reports.service';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [NotificationsModule],
  controllers: [FinanceController],
  providers: [
    FinanceService,
    TransactionsService,
    InvoicesService,
    ChargesService,
    ImportsService,
    BudgetsService,
    ReportsService,
    FinanceScheduler,
  ],
})
export class FinanceModule {}
