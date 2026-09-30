import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  CurrentAccess,
  CurrentUser,
  InBuilding,
} from '../auth/access/access.decorators';
import type { Access, AuthUser } from '../auth/access/auth-user';
import { ThreadsService } from './threads.service';
import { CreateThreadDto } from './dto/create-thread.dto';
import { CreateReplyDto } from './dto/create-reply.dto';

@ApiTags('threads')
@ApiBearerAuth()
@Controller('buildings/:buildingId/threads')
export class ThreadsController {
  constructor(private threadsService: ThreadsService) {}

  @Post()
  @InBuilding()
  create(
    @Param('buildingId') buildingId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateThreadDto,
  ) {
    return this.threadsService.createThread(buildingId, user.id, dto);
  }

  @Get()
  @InBuilding()
  findAll(@Param('buildingId') buildingId: string) {
    return this.threadsService.findByBuilding(buildingId);
  }

  @Get(':id')
  @InBuilding()
  findOne(@Param('buildingId') buildingId: string, @Param('id') id: string) {
    return this.threadsService.findOne(id, buildingId);
  }

  @Post(':id/replies')
  @InBuilding()
  createReply(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateReplyDto,
  ) {
    return this.threadsService.createReply(id, buildingId, user.id, dto);
  }

  @Patch(':id/close')
  @InBuilding()
  close(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @CurrentAccess() access: Access,
  ) {
    return this.threadsService.closeThread(id, buildingId, user.id, access);
  }
}
