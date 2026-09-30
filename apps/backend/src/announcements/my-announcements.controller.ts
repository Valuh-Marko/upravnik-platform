import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AnyUser, CurrentUser } from '../auth/access/access.decorators';
import type { AuthUser } from '../auth/access/auth-user';
import { BuildingFilterQueryDto } from '../common/dto/my-list-query.dto';
import { AnnouncementsService } from './announcements.service';

@ApiTags('announcements')
@ApiBearerAuth()
@Controller('announcements')
export class MyAnnouncementsController {
  constructor(private announcementsService: AnnouncementsService) {}

  @Get()
  @AnyUser()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: BuildingFilterQueryDto,
  ) {
    return this.announcementsService.findAllForUser(user, query.buildingId);
  }
}
