import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { BudgetsController } from './budgets.controller';
import { BudgetsService } from './budgets.service';
import { ChargesController } from './charges.controller';
import { ChargesService } from './charges.service';
import { FinanceController } from './finance.controller';
import { FinanceScheduler } from './finance.scheduler';
import { FinanceService } from './finance.service';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [NotificationsModule],
  controllers: [
    FinanceController,
    TransactionsController,
    InvoicesController,
    ChargesController,
    ImportsController,
    BudgetsController,
    ReportsController,
  ],
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
