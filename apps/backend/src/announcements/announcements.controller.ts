import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, InBuilding } from '../auth/access/access.decorators';
import type { AuthUser } from '../auth/access/auth-user';
import { Role } from '../prisma';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

@ApiTags('announcements')
@ApiBearerAuth()
@Controller('buildings/:buildingId/announcements')
export class AnnouncementsController {
  constructor(private announcementsService: AnnouncementsService) {}

  @Post()
  @InBuilding(Role.UPRAVNIK, Role.BOARD_MEMBER)
  create(
    @Param('buildingId') buildingId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateAnnouncementDto,
  ) {
    return this.announcementsService.create(buildingId, user.id, dto);
  }

  @Get()
  @InBuilding()
  findAll(@Param('buildingId') buildingId: string) {
    return this.announcementsService.findByBuilding(buildingId);
  }

  @Get(':id')
  @InBuilding()
  findOne(@Param('buildingId') buildingId: string, @Param('id') id: string) {
    return this.announcementsService.findOne(id, buildingId);
  }

  @Patch(':id')
  @InBuilding(Role.UPRAVNIK, Role.BOARD_MEMBER)
  update(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAnnouncementDto,
  ) {
    return this.announcementsService.update(id, buildingId, dto);
  }
}
