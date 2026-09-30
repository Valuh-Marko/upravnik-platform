import { Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AnyUser, CurrentUser } from '../auth/access/access.decorators';
import type { AuthUser } from '../auth/access/auth-user';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  @AnyUser()
  findAll(@CurrentUser() user: AuthUser) {
    return this.notificationsService.findForUser(user.id);
  }

  @Patch(':id/read')
  @AnyUser()
  markRead(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.notificationsService.markRead(id, user.id);
  }

  @Patch('read-all')
  @AnyUser()
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notificationsService.markAllRead(user.id);
  }
}
