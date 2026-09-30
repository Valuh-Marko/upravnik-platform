import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnnouncementsService } from './announcements.service';

@ApiTags('announcements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('announcements')
export class MyAnnouncementsController {
  constructor(private announcementsService: AnnouncementsService) {}

  @Get()
  @ApiQuery({ name: 'buildingId', required: false })
  findAll(@Request() req: any, @Query('buildingId') buildingId?: string) {
    return this.announcementsService.findAllForUser(req.user.id, buildingId);
  }
}
