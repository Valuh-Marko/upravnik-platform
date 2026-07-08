import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { MyTicketsController } from './my-tickets.controller';
import { TicketsService } from './tickets.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [TicketsController, MyTicketsController],
  providers: [TicketsService],
})
export class TicketsModule {}
