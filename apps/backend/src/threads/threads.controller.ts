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
import { ThreadsService } from './threads.service';
import { CreateThreadDto } from './dto/create-thread.dto';
import { CreateReplyDto } from './dto/create-reply.dto';

@ApiTags('threads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('buildings/:buildingId/threads')
export class ThreadsController {
  constructor(private threadsService: ThreadsService) {}

  @Post()
  create(
    @Param('buildingId') buildingId: string,
    @Request() req: any,
    @Body() dto: CreateThreadDto,
  ) {
    return this.threadsService.createThread(
      buildingId,
      req.user.id,
      dto,
      req.user.systemRole,
    );
  }

  @Get()
  findAll(@Param('buildingId') buildingId: string, @Request() req: any) {
    return this.threadsService.findByBuilding(
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
    return this.threadsService.findOne(
      id,
      buildingId,
      req.user.id,
      req.user.systemRole,
    );
  }

  @Post(':id/replies')
  createReply(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: CreateReplyDto,
  ) {
    return this.threadsService.createReply(
      id,
      buildingId,
      req.user.id,
      dto,
      req.user.systemRole,
    );
  }

  @Patch(':id/close')
  @UseGuards(RolesGuard)
  @Roles(Role.UPRAVNIK, Role.BOARD_MEMBER)
  close(@Param('buildingId') buildingId: string, @Param('id') id: string) {
    return this.threadsService.closeThread(id, buildingId);
  }
}
