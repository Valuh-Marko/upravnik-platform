import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../prisma';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

@ApiTags('announcements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('buildings/:buildingId/announcements')
export class AnnouncementsController {
  constructor(private announcementsService: AnnouncementsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.UPRAVNIK, Role.BOARD_MEMBER)
  create(
    @Param('buildingId') buildingId: string,
    @Request() req: any,
    @Body() dto: CreateAnnouncementDto,
  ) {
    return this.announcementsService.create(buildingId, req.user.id, dto);
  }

  @Get()
  findAll(@Param('buildingId') buildingId: string, @Request() req: any) {
    return this.announcementsService.findByBuilding(
      buildingId,
      req.user.id,
      req.user.systemRole,
    );
  }

  @Get(':id')
  findOne(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.announcementsService.findOne(
      id,
      buildingId,
      req.user.id,
      req.user.systemRole,
    );
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.UPRAVNIK, Role.BOARD_MEMBER)
  update(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAnnouncementDto,
  ) {
    return this.announcementsService.update(id, buildingId, dto);
  }
}
