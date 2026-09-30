import { Module } from '@nestjs/common';
import { AnnouncementsController } from './announcements.controller';
import { MyAnnouncementsController } from './my-announcements.controller';
import { AnnouncementsService } from './announcements.service';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  controllers: [AnnouncementsController, MyAnnouncementsController],
  providers: [AnnouncementsService, RolesGuard],
})
export class AnnouncementsModule {}
