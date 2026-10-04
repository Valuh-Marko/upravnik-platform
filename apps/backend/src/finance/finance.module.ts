import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { ChargesService } from './charges.service';
import { FinanceController } from './finance.controller';
import { FinanceScheduler } from './finance.scheduler';
import { FinanceService } from './finance.service';
import { InvoicesService } from './invoices.service';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [NotificationsModule],
  controllers: [FinanceController],
  providers: [
    FinanceService,
    TransactionsService,
    InvoicesService,
    ChargesService,
    FinanceScheduler,
  ],
})
export class FinanceModule {}
